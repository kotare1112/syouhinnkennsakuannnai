import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { auth, companiesCol, usersCol } from '../db.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { requireAuth } from '../middleware/requireAuth.js';

export const authRouter = Router();

// 新規登録：Firebase Authenticationにユーザーを作成し、企業アカウント（Firestore）を紐づける。
// パスワードの検証・保管はFirebase Authenticationに任せるため、こちら側で扱うのは作成時のみ。
authRouter.post(
  '/register',
  asyncHandler(async (req, res) => {
    const { email, password, name, companyName } = req.body || {};
    if (!email || !password || !companyName) {
      return res.status(400).json({ error: 'email, password, companyName は必須です。' });
    }

    let userRecord;
    try {
      userRecord = await auth.createUser({ email, password, displayName: name || undefined });
    } catch (err) {
      if (err.code === 'auth/email-already-exists') {
        return res.status(409).json({ error: 'このメールアドレスは既に登録されています。' });
      }
      if (err.code === 'auth/invalid-password' || err.code === 'auth/invalid-email') {
        return res.status(400).json({ error: err.message });
      }
      throw err;
    }

    const companyId = uuid();
    await companiesCol.doc(companyId).set({ name: companyName });
    await usersCol.doc(userRecord.uid).set({ email, name: name || null, companyId });

    // フロントはこのカスタムトークンで signInWithCustomToken() し、以降はFirebaseのIDトークンを使う。
    const customToken = await auth.createCustomToken(userRecord.uid);
    res.status(201).json({ customToken, user: { id: userRecord.uid, email, name, companyId } });
  })
);

// ログイン自体はフロントエンドがFirebase Client SDK（signInWithEmailAndPassword）で直接行う
// （パスワード検証はFirebase側でのみ可能なため）。ログイン後はこのエンドポイントでプロフィールを取得する。
authRouter.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const doc = await usersCol.doc(req.user.id).get();
    const data = doc.data();
    res.json({ user: { id: req.user.id, email: data.email, name: data.name, companyId: data.companyId } });
  })
);

// ログアウトはクライアント側でFirebaseのセッションを破棄するだけで完結する（サーバー側は無状態）。
authRouter.post('/logout', (_req, res) => {
  res.json({ ok: true });
});
