import { Router } from 'express';
import { productsCol, searchLogsCol, FieldValue } from '../db.js';
import { checkStockWithAI } from '../services/stockCheck.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

export const productsRouter = Router();

// 商品検索（支店単位）。Firestoreは部分一致検索を持たないため、支店内の全商品を取得しアプリ側で絞り込む。
// 検索キーワードはランキング集計のためログに記録する。
productsRouter.get(
  '/branches/:branchId/products',
  asyncHandler(async (req, res) => {
    const { branchId } = req.params;
    const q = (req.query.q || '').trim();

    const snapshot = await productsCol.where('branchId', '==', branchId).get();
    let rows = snapshot.docs.map((doc) => ({
      id: doc.id,
      name: doc.data().name,
      category: doc.data().category,
      price: doc.data().price,
    }));

    if (q) {
      const qLower = q.toLowerCase();
      rows = rows.filter((r) => r.name.toLowerCase().includes(qLower));
      await searchLogsCol.add({
        branchId,
        keyword: q,
        productId: null,
        createdAt: FieldValue.serverTimestamp(),
      });
    }

    rows.sort((a, b) => a.name.localeCompare(b.name, 'ja'));
    res.json(rows);
  })
);

productsRouter.get(
  '/products/:productId',
  asyncHandler(async (req, res) => {
    const doc = await productsCol.doc(req.params.productId).get();
    if (!doc.exists) return res.status(404).json({ error: '商品が見つかりません。' });
    const product = doc.data();
    res.json({
      id: doc.id,
      branchId: product.branchId,
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
    const doc = await productsCol.doc(req.params.productId).get();
    if (!doc.exists) return res.status(404).json({ error: '商品が見つかりません。' });
    const product = doc.data();

    await searchLogsCol.add({
      branchId: product.branchId,
      keyword: null,
      productId: doc.id,
      createdAt: FieldValue.serverTimestamp(),
    });

    const result = await checkStockWithAI({ productName: product.name, stockQty: product.stockQty });

    if (!result.inStock) {
      return res.json({ inStock: false, message: result.message });
    }

    res.json({
      inStock: true,
      message: result.message,
      product: { id: doc.id, name: product.name },
    });
  })
);
