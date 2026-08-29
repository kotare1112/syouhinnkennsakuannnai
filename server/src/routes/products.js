import { Router } from 'express';
import { pool } from '../db.js';
import { checkStockWithAI } from '../services/stockCheck.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

export const productsRouter = Router();

// 商品検索（支店単位）。検索キーワードはランキング集計のためログに記録する。
productsRouter.get(
  '/branches/:branchId/products',
  asyncHandler(async (req, res) => {
    const { branchId } = req.params;
    const q = (req.query.q || '').trim();

    const { rows } = q
      ? await pool.query(
          `SELECT id, name, category, price FROM products
           WHERE branch_id = $1 AND name ILIKE $2
           ORDER BY name`,
          [branchId, `%${q}%`]
        )
      : await pool.query(
          'SELECT id, name, category, price FROM products WHERE branch_id = $1 ORDER BY name',
          [branchId]
        );

    if (q) {
      await pool.query(
        'INSERT INTO search_logs (branch_id, keyword, product_id) VALUES ($1, $2, NULL)',
        [branchId, q]
      );
    }

    res.json(rows);
  })
);

productsRouter.get(
  '/products/:productId',
  asyncHandler(async (req, res) => {
    const { rows } = await pool.query('SELECT * FROM products WHERE id = $1', [req.params.productId]);
    const product = rows[0];
    if (!product) return res.status(404).json({ error: '商品が見つかりません。' });
    res.json({
      id: product.id,
      branchId: product.branch_id,
      name: product.name,
      category: product.category,
      price: product.price,
    });
  })
);

// 商品タップ時：AI（Gemini／未設定時はモック）による在庫判定を行う。
// 在庫あり: inStock=true + 案内用のbearing/distance。在庫なし: inStock=false のみ返す。
productsRouter.post(
  '/products/:productId/check-stock',
  asyncHandler(async (req, res) => {
    const { rows } = await pool.query('SELECT * FROM products WHERE id = $1', [req.params.productId]);
    const product = rows[0];
    if (!product) return res.status(404).json({ error: '商品が見つかりません。' });

    await pool.query('INSERT INTO search_logs (branch_id, keyword, product_id) VALUES ($1, NULL, $2)', [
      product.branch_id,
      product.id,
    ]);

    const result = await checkStockWithAI({ productName: product.name, stockQty: product.stock_qty });

    if (!result.inStock) {
      return res.json({ inStock: false, message: result.message });
    }

    res.json({
      inStock: true,
      message: result.message,
      product: {
        id: product.id,
        name: product.name,
        shelfX: product.shelf_x,
        shelfY: product.shelf_y,
      },
    });
  })
);
