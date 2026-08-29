import { Router } from 'express';
import { pool } from '../db.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

export const rankingRouter = Router();

// ハンバーガーメニューから開く検索ランキング。直近30日の検索キーワード・商品タップ数を集計する。
rankingRouter.get(
  '/branches/:branchId/ranking',
  asyncHandler(async (req, res) => {
    const { branchId } = req.params;

    const { rows: topKeywords } = await pool.query(
      `SELECT keyword, COUNT(*)::int AS count
       FROM search_logs
       WHERE branch_id = $1 AND keyword IS NOT NULL AND created_at >= NOW() - INTERVAL '30 days'
       GROUP BY keyword
       ORDER BY count DESC
       LIMIT 10`,
      [branchId]
    );

    const { rows: topProducts } = await pool.query(
      `SELECT p.id, p.name, COUNT(*)::int AS count
       FROM search_logs s
       JOIN products p ON p.id = s.product_id
       WHERE s.branch_id = $1 AND s.product_id IS NOT NULL AND s.created_at >= NOW() - INTERVAL '30 days'
       GROUP BY p.id, p.name
       ORDER BY count DESC
       LIMIT 10`,
      [branchId]
    );

    res.json({ topKeywords, topProducts });
  })
);
