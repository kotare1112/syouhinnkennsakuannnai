import { Router } from 'express';
import { searchLogsCol, productsCol } from '../db.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

export const rankingRouter = Router();

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

// ハンバーガーメニューから開く検索ランキング。直近30日の検索キーワード・商品タップ数を集計する。
// Firestoreは「等価条件＋別フィールドの範囲条件」の組み合わせに複合インデックスを要求するため、
// branchIdの等価条件のみでまとめて取得し、期間フィルタ・集計はアプリ側で行う。
rankingRouter.get(
  '/branches/:branchId/ranking',
  asyncHandler(async (req, res) => {
    const { branchId } = req.params;
    const cutoff = Date.now() - THIRTY_DAYS_MS;

    const snapshot = await searchLogsCol.where('branchId', '==', branchId).get();
    const recentLogs = snapshot.docs
      .map((doc) => doc.data())
      .filter((log) => (log.createdAt?.toMillis?.() ?? 0) >= cutoff);

    const keywordCounts = new Map();
    const productCounts = new Map();
    for (const log of recentLogs) {
      if (log.keyword != null) {
        keywordCounts.set(log.keyword, (keywordCounts.get(log.keyword) || 0) + 1);
      }
      if (log.productId != null) {
        productCounts.set(log.productId, (productCounts.get(log.productId) || 0) + 1);
      }
    }

    const topKeywords = [...keywordCounts.entries()]
      .map(([keyword, count]) => ({ keyword, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const topProductEntries = [...productCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    const topProducts = (
      await Promise.all(
        topProductEntries.map(async ([productId, count]) => {
          const doc = await productsCol.doc(productId).get();
          if (!doc.exists) return null;
          return { id: doc.id, name: doc.data().name, count };
        })
      )
    ).filter(Boolean);

    res.json({ topKeywords, topProducts });
  })
);
