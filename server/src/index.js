import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { pool, initDb } from './db.js';
import { seed } from './seed.js';
import { authRouter } from './routes/auth.js';
import { companiesRouter } from './routes/companies.js';
import { branchesRouter } from './routes/branches.js';
import { productsRouter } from './routes/products.js';
import { rankingRouter } from './routes/ranking.js';
import { adminRouter } from './routes/admin.js';

// テーブルが無ければ作成し、データが空であれば初回のみサンプルデータを投入する。
// Postgres(Neon)は常時永続化されるため、ローカル・Vercel問わずこの起動時チェックだけで済む。
await initDb();
const { rows } = await pool.query('SELECT COUNT(*)::int AS count FROM companies');
if (rows[0].count === 0) await seed();

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.use('/api/auth', authRouter);
app.use('/api/companies', companiesRouter);
app.use('/api/branches', branchesRouter);
app.use('/api', productsRouter);
app.use('/api', rankingRouter);
app.use('/api/admin', adminRouter);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'サーバーエラーが発生しました。' });
});

// Vercel Serverless Functionsではapp.listen()せず、Expressアプリをそのままハンドラーとしてexportする（api/[...slug].js参照）。
if (!process.env.VERCEL) {
  const port = process.env.PORT || 4000;
  app.listen(port, () => {
    console.log(`server listening on http://localhost:${port}`);
  });
}

export default app;
