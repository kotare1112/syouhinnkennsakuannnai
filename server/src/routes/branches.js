import { Router } from 'express';
import { pool } from '../db.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

export const branchesRouter = Router();

branchesRouter.get(
  '/:branchId',
  asyncHandler(async (req, res) => {
    const { rows } = await pool.query(
      `SELECT id, company_id AS "companyId", name, ar_enabled AS "arEnabled"
       FROM branches WHERE id = $1`,
      [req.params.branchId]
    );
    const branch = rows[0];
    if (!branch) return res.status(404).json({ error: '店舗が見つかりません。' });
    res.json(branch);
  })
);

// AR案内用：管理者がAR実測登録した方位（bearing）と距離をそのまま返す。
branchesRouter.get(
  '/:branchId/nav/:productId',
  asyncHandler(async (req, res) => {
    const { rows: branchRows } = await pool.query('SELECT * FROM branches WHERE id = $1', [
      req.params.branchId,
    ]);
    const branch = branchRows[0];
    if (!branch) return res.status(404).json({ error: '店舗が見つかりません。' });
    if (!branch.ar_enabled) {
      return res.status(403).json({ error: 'この店舗はAR案内に対応していません。' });
    }

    const { rows: productRows } = await pool.query(
      'SELECT * FROM products WHERE id = $1 AND branch_id = $2',
      [req.params.productId, req.params.branchId]
    );
    const product = productRows[0];
    if (!product) return res.status(404).json({ error: '商品が見つかりません。' });
    if (product.bearing_deg == null || product.distance_m == null) {
      return res.status(400).json({ error: 'この商品の位置はまだAR登録されていません。' });
    }

    res.json({
      productName: product.name,
      bearingDeg: product.bearing_deg,
      distanceM: Math.round(product.distance_m * 10) / 10,
    });
  })
);

// 入店／退店QRコードの読み取り検証。フロントのQRスキャナが読み取った文字列をそのまま照合する。
branchesRouter.post(
  '/:branchId/qr/verify',
  asyncHandler(async (req, res) => {
    const { token, type } = req.body || {};
    const { rows } = await pool.query('SELECT * FROM branches WHERE id = $1', [req.params.branchId]);
    const branch = rows[0];
    if (!branch) return res.status(404).json({ error: '店舗が見つかりません。' });

    const expected = type === 'exit' ? branch.exit_qr_token : branch.entry_qr_token;
    if (!token || token !== expected) {
      return res.status(400).json({ ok: false, error: 'QRコードが一致しません。' });
    }
    res.json({ ok: true });
  })
);
