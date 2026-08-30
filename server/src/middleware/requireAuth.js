import { auth, usersCol } from '../db.js';

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const idToken = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!idToken) {
    return res.status(401).json({ error: '認証が必要です。' });
  }

  let decoded;
  try {
    decoded = await auth.verifyIdToken(idToken);
  } catch {
    return res.status(401).json({ error: 'トークンが無効です。再度ログインしてください。' });
  }

  try {
    // Firebase Authenticationのユーザー自体は有効でも、紐づく会社データが（DBリセット等で）
    // 既に存在しない場合がある。
    const doc = await usersCol.doc(decoded.uid).get();
    if (!doc.exists) {
      return res.status(401).json({ error: 'アカウント情報が見つかりません。再度ログインしてください。' });
    }
    req.user = { id: decoded.uid, email: decoded.email, companyId: doc.data().companyId };
  } catch (err) {
    return next(err);
  }

  next();
}
