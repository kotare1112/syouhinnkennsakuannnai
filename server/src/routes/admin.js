import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import QRCode from 'qrcode';
import { branchesCol, productsCol } from '../db.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

export const adminRouter = Router();
adminRouter.use(requireAuth);

async function ownedBranch(branchId, companyId) {
  const doc = await branchesCol.doc(branchId).get();
  if (!doc.exists || doc.data().companyId !== companyId) return null;
  return { id: doc.id, ...doc.data() };
}

async function ownedProduct(productId, companyId) {
  const doc = await productsCol.doc(productId).get();
  if (!doc.exists) return null;
  const product = { id: doc.id, ...doc.data() };
  const branch = await ownedBranch(product.branchId, companyId);
  if (!branch) return null;
  return product;
}

// --- 店舗（支店） ---

adminRouter.get(
  '/branches',
  asyncHandler(async (req, res) => {
    const snapshot = await branchesCol.where('companyId', '==', req.user.companyId).get();
    const rows = snapshot.docs
      .map((doc) => ({ id: doc.id, name: doc.data().name, arEnabled: Boolean(doc.data().arEnabled) }))
      .sort((a, b) => a.name.localeCompare(b.name, 'ja'));
    res.json(rows);
  })
);

adminRouter.post(
  '/branches',
  asyncHandler(async (req, res) => {
    const { name } = req.body || {};
    if (!name) return res.status(400).json({ error: '店舗名は必須です。' });

    const id = uuid();
    await branchesCol.doc(id).set({
      companyId: req.user.companyId,
      name,
      arEnabled: false,
      entryQrToken: uuid(),
      exitQrToken: uuid(),
    });

    res.status(201).json({ id, name, arEnabled: false });
  })
);

// AR対応可否の切り替え。店内AR登録（入店口・商品位置の実測登録）を行うと自動的にtrueになる。
adminRouter.put(
  '/branches/:branchId/ar-enabled',
  asyncHandler(async (req, res) => {
    const branch = await ownedBranch(req.params.branchId, req.user.companyId);
    if (!branch) return res.status(404).json({ error: '店舗が見つかりません。' });

    const { arEnabled } = req.body || {};
    await branchesCol.doc(branch.id).update({ arEnabled: Boolean(arEnabled) });

    res.json({ ok: true });
  })
);

adminRouter.get(
  '/branches/:branchId/qrcodes',
  asyncHandler(async (req, res) => {
    const branch = await ownedBranch(req.params.branchId, req.user.companyId);
    if (!branch) return res.status(404).json({ error: '店舗が見つかりません。' });

    const entryPayload = JSON.stringify({ branchId: branch.id, type: 'entry', token: branch.entryQrToken });
    const exitPayload = JSON.stringify({ branchId: branch.id, type: 'exit', token: branch.exitQrToken });

    const [entryQr, exitQr] = await Promise.all([
      QRCode.toDataURL(entryPayload),
      QRCode.toDataURL(exitPayload),
    ]);

    res.json({ entryQr, exitQr });
  })
);

// --- 商品 ---

adminRouter.get(
  '/branches/:branchId/products',
  asyncHandler(async (req, res) => {
    const branch = await ownedBranch(req.params.branchId, req.user.companyId);
    if (!branch) return res.status(404).json({ error: '店舗が見つかりません。' });

    const snapshot = await productsCol.where('branchId', '==', branch.id).get();
    const rows = snapshot.docs
      .map((doc) => {
        const p = doc.data();
        return {
          id: doc.id,
          name: p.name,
          category: p.category,
          price: p.price,
          stockQty: p.stockQty,
          bearingDeg: p.bearingDeg ?? null,
          distanceM: p.distanceM ?? null,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'ja'));
    res.json(rows);
  })
);

adminRouter.post(
  '/branches/:branchId/products',
  asyncHandler(async (req, res) => {
    const branch = await ownedBranch(req.params.branchId, req.user.companyId);
    if (!branch) return res.status(404).json({ error: '店舗が見つかりません。' });

    const { name, category, price, stockQty } = req.body || {};
    if (!name) return res.status(400).json({ error: '商品名は必須です。' });

    const id = uuid();
    await productsCol.doc(id).set({
      branchId: branch.id,
      name,
      category: category || null,
      price: price || 0,
      stockQty: stockQty || 0,
      bearingDeg: null,
      distanceM: null,
    });

    res.status(201).json({ id });
  })
);

adminRouter.put(
  '/products/:productId',
  asyncHandler(async (req, res) => {
    const product = await ownedProduct(req.params.productId, req.user.companyId);
    if (!product) return res.status(404).json({ error: '商品が見つかりません。' });

    const { name, category, price, stockQty } = req.body || {};
    await productsCol.doc(product.id).update({
      name: name ?? product.name,
      category: category ?? product.category,
      price: price ?? product.price,
      stockQty: stockQty ?? product.stockQty,
    });

    res.json({ ok: true });
  })
);

// AR実測登録：管理者がその場でタップした位置から算出した方位・距離をそのまま保存する。
adminRouter.put(
  '/products/:productId/position',
  asyncHandler(async (req, res) => {
    const product = await ownedProduct(req.params.productId, req.user.companyId);
    if (!product) return res.status(404).json({ error: '商品が見つかりません。' });

    const { bearingDeg, distanceM } = req.body || {};
    if (typeof bearingDeg !== 'number' || typeof distanceM !== 'number') {
      return res.status(400).json({ error: 'bearingDeg, distanceM は必須です。' });
    }

    await productsCol.doc(product.id).update({ bearingDeg, distanceM });

    res.json({ ok: true });
  })
);

adminRouter.delete(
  '/products/:productId',
  asyncHandler(async (req, res) => {
    const product = await ownedProduct(req.params.productId, req.user.companyId);
    if (!product) return res.status(404).json({ error: '商品が見つかりません。' });

    await productsCol.doc(product.id).delete();
    res.json({ ok: true });
  })
);
