import jwt from 'jsonwebtoken';
import { companiesCol } from '../db.js';

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: '認証が必要です。' });
  }

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret');
  } catch {
    return res.status(401).json({ error: 'トークンが無効です。再度ログインしてください。' });
  }

  try {
    // トークン自体は有効でも、紐づく会社アカウントが（DBリセット等で）既に存在しない場合がある。
    const doc = await companiesCol.doc(payload.companyId).get();
    if (!doc.exists) {
      return res.status(401).json({ error: 'アカウント情報が見つかりません。再度ログインしてください。' });
    }
  } catch (err) {
    return next(err);
  }

  req.user = payload;
  next();
}
