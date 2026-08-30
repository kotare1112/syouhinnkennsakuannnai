import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuid } from 'uuid';
import { companiesCol, usersCol } from '../db.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

export const authRouter = Router();

// 新規登録：企業アカウントを新規作成し、管理者ユーザーを1件登録する。
authRouter.post(
  '/register',
  asyncHandler(async (req, res) => {
    const { email, password, name, companyName } = req.body || {};
    if (!email || !password || !companyName) {
      return res.status(400).json({ error: 'email, password, companyName は必須です。' });
    }

    const existing = await usersCol.where('email', '==', email).limit(1).get();
    if (!existing.empty) {
      return res.status(409).json({ error: 'このメールアドレスは既に登録されています。' });
    }

    const companyId = uuid();
    const userId = uuid();
    const passwordHash = bcrypt.hashSync(password, 10);

    await companiesCol.doc(companyId).set({ name: companyName });
    await usersCol.doc(userId).set({ email, passwordHash, name: name || null, companyId });

    const token = issueToken({ id: userId, email, companyId });
    res.status(201).json({ token, user: { id: userId, email, name, companyId } });
  })
);

authRouter.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { email, password } = req.body || {};
    const snapshot = await usersCol.where('email', '==', email).limit(1).get();
    const doc = snapshot.docs[0];
    const user = doc?.data();
    if (!user || !bcrypt.compareSync(password || '', user.passwordHash)) {
      return res.status(401).json({ error: 'メールアドレスまたはパスワードが正しくありません。' });
    }
    const token = issueToken({ id: doc.id, email: user.email, companyId: user.companyId });
    res.json({
      token,
      user: { id: doc.id, email: user.email, name: user.name, companyId: user.companyId },
    });
  })
);

// ログアウトはクライアント側でトークンを破棄するだけで完結する（サーバー側は無状態）。
authRouter.post('/logout', (_req, res) => {
  res.json({ ok: true });
});

function issueToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET || 'dev-secret', { expiresIn: '7d' });
}
