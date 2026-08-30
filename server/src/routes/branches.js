import { Router } from 'express';
import { branchesCol, productsCol } from '../db.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

export const branchesRouter = Router();

branchesRouter.get(
  '/:branchId',
  asyncHandler(async (req, res) => {
    const doc = await branchesCol.doc(req.params.branchId).get();
    if (!doc.exists) return res.status(404).json({ error: '店舗が見つかりません。' });
    const b = doc.data();
    res.json({ id: doc.id, companyId: b.companyId, name: b.name, arEnabled: Boolean(b.arEnabled) });
  })
);

// AR案内用：管理者がAR実測登録した方位（bearing）と距離をそのまま返す。
branchesRouter.get(
  '/:branchId/nav/:productId',
  asyncHandler(async (req, res) => {
    const branchDoc = await branchesCol.doc(req.params.branchId).get();
    if (!branchDoc.exists) return res.status(404).json({ error: '店舗が見つかりません。' });
    const branch = branchDoc.data();
    if (!branch.arEnabled) {
      return res.status(403).json({ error: 'この店舗はAR案内に対応していません。' });
    }

    const productDoc = await productsCol.doc(req.params.productId).get();
    const product = productDoc.exists ? productDoc.data() : null;
    if (!product || product.branchId !== req.params.branchId) {
      return res.status(404).json({ error: '商品が見つかりません。' });
    }
    if (product.bearingDeg == null || product.distanceM == null) {
      return res.status(400).json({ error: 'この商品の位置はまだAR登録されていません。' });
    }

    res.json({
      productName: product.name,
      bearingDeg: product.bearingDeg,
      distanceM: Math.round(product.distanceM * 10) / 10,
    });
  })
);

// 入店／退店QRコードの読み取り検証。フロントのQRスキャナが読み取った文字列をそのまま照合する。
branchesRouter.post(
  '/:branchId/qr/verify',
  asyncHandler(async (req, res) => {
    const { token, type } = req.body || {};
    const doc = await branchesCol.doc(req.params.branchId).get();
    if (!doc.exists) return res.status(404).json({ error: '店舗が見つかりません。' });
    const branch = doc.data();

    const expected = type === 'exit' ? branch.exitQrToken : branch.entryQrToken;
    if (!token || token !== expected) {
      return res.status(400).json({ ok: false, error: 'QRコードが一致しません。' });
    }
    res.json({ ok: true });
  })
);
