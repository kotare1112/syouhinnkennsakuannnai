import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuid } from 'uuid';
import { pool } from '../db.js';
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

    const { rows: existingRows } = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingRows.length > 0) {
      return res.status(409).json({ error: 'このメールアドレスは既に登録されています。' });
    }

    const companyId = uuid();
    const userId = uuid();
    const passwordHash = bcrypt.hashSync(password, 10);

    await pool.query('INSERT INTO companies (id, name) VALUES ($1, $2)', [companyId, companyName]);
    await pool.query(
      'INSERT INTO users (id, email, password_hash, name, company_id) VALUES ($1, $2, $3, $4, $5)',
      [userId, email, passwordHash, name || null, companyId]
    );

    const token = issueToken({ id: userId, email, companyId });
    res.status(201).json({ token, user: { id: userId, email, name, companyId } });
  })
);

authRouter.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { email, password } = req.body || {};
    const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = rows[0];
    if (!user || !bcrypt.compareSync(password || '', user.password_hash)) {
      return res.status(401).json({ error: 'メールアドレスまたはパスワードが正しくありません。' });
    }
    const token = issueToken({ id: user.id, email: user.email, companyId: user.company_id });
    res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name, companyId: user.company_id },
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
