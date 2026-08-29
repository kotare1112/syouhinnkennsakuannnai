import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import QRCode from 'qrcode';
import { pool } from '../db.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

export const adminRouter = Router();
adminRouter.use(requireAuth);

async function ownedBranch(branchId, companyId) {
  const { rows } = await pool.query('SELECT * FROM branches WHERE id = $1 AND company_id = $2', [
    branchId,
    companyId,
  ]);
  return rows[0];
}

async function ownedProduct(productId, companyId) {
  const { rows } = await pool.query(
    `SELECT p.* FROM products p
     JOIN branches b ON b.id = p.branch_id
     WHERE p.id = $1 AND b.company_id = $2`,
    [productId, companyId]
  );
  return rows[0];
}

// --- 店舗（支店） ---

adminRouter.get(
  '/branches',
  asyncHandler(async (req, res) => {
    const { rows } = await pool.query(
      `SELECT id, name, ar_enabled AS "arEnabled"
       FROM branches WHERE company_id = $1 ORDER BY name`,
      [req.user.companyId]
    );
    res.json(rows);
  })
);

adminRouter.post(
  '/branches',
  asyncHandler(async (req, res) => {
    const { name } = req.body || {};
    if (!name) return res.status(400).json({ error: '店舗名は必須です。' });

    const id = uuid();
    await pool.query(
      `INSERT INTO branches (id, company_id, name, ar_enabled, entry_qr_token, exit_qr_token)
       VALUES ($1, $2, $3, FALSE, $4, $5)`,
      [id, req.user.companyId, name, uuid(), uuid()]
    );

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
    await pool.query('UPDATE branches SET ar_enabled = $1 WHERE id = $2', [
      Boolean(arEnabled),
      branch.id,
    ]);

    res.json({ ok: true });
  })
);

adminRouter.get(
  '/branches/:branchId/qrcodes',
  asyncHandler(async (req, res) => {
    const branch = await ownedBranch(req.params.branchId, req.user.companyId);
    if (!branch) return res.status(404).json({ error: '店舗が見つかりません。' });

    const entryPayload = JSON.stringify({ branchId: branch.id, type: 'entry', token: branch.entry_qr_token });
    const exitPayload = JSON.stringify({ branchId: branch.id, type: 'exit', token: branch.exit_qr_token });

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

    const { rows } = await pool.query(
      `SELECT id, name, category, price, stock_qty AS "stockQty",
              bearing_deg AS "bearingDeg", distance_m AS "distanceM"
       FROM products WHERE branch_id = $1 ORDER BY name`,
      [branch.id]
    );
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
    await pool.query(
      `INSERT INTO products (id, branch_id, name, category, price, stock_qty)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, branch.id, name, category || null, price || 0, stockQty || 0]
    );

    res.status(201).json({ id });
  })
);

adminRouter.put(
  '/products/:productId',
  asyncHandler(async (req, res) => {
    const product = await ownedProduct(req.params.productId, req.user.companyId);
    if (!product) return res.status(404).json({ error: '商品が見つかりません。' });

    const { name, category, price, stockQty } = req.body || {};
    await pool.query(
      `UPDATE products SET name = $1, category = $2, price = $3, stock_qty = $4
       WHERE id = $5`,
      [
        name ?? product.name,
        category ?? product.category,
        price ?? product.price,
        stockQty ?? product.stock_qty,
        product.id,
      ]
    );

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

    await pool.query('UPDATE products SET bearing_deg = $1, distance_m = $2 WHERE id = $3', [
      bearingDeg,
      distanceM,
      product.id,
    ]);

    res.json({ ok: true });
  })
);

adminRouter.delete(
  '/products/:productId',
  asyncHandler(async (req, res) => {
    const product = await ownedProduct(req.params.productId, req.user.companyId);
    if (!product) return res.status(404).json({ error: '商品が見つかりません。' });

    await pool.query('DELETE FROM products WHERE id = $1', [product.id]);
    res.json({ ok: true });
  })
);
