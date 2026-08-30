import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { companiesCol } from './db.js';
import { seed } from './seed.js';
import { authRouter } from './routes/auth.js';
import { companiesRouter } from './routes/companies.js';
import { branchesRouter } from './routes/branches.js';
import { productsRouter } from './routes/products.js';
import { rankingRouter } from './routes/ranking.js';
import { adminRouter } from './routes/admin.js';

// データが空であれば初回のみサンプルデータを投入する（Firestoreは常時永続化されるため、この起動時チェックだけで済む）。
const existing = await companiesCol.limit(1).get();
if (existing.empty) await seed();

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

// Vercel Serverless Functionsではapp.listen()せず、Expressアプリをそのままハンドラーとしてexportする（api/index.js参照）。
if (!process.env.VERCEL) {
  const port = process.env.PORT || 4000;
  app.listen(port, () => {
    console.log(`server listening on http://localhost:${port}`);
  });
}

export default app;
