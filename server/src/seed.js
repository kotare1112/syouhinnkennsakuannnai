import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { pool } from './db.js';

// 固定IDにしているのは、以前SQLite+Vercelサーバーレス環境でランダムUUIDを使っていた際に、
// インスタンスごとに異なるIDでシードされて整合性が壊れた反省から。Postgres移行後は必須ではないが、
// サンプルデータの参照しやすさのためそのまま維持している。
const IDS = {
  company: '00000000-0000-4000-8000-000000000001',
  branchA: '00000000-0000-4000-8000-000000000002',
  branchB: '00000000-0000-4000-8000-000000000003',
  branchAEntryQr: '00000000-0000-4000-8000-000000000004',
  branchAExitQr: '00000000-0000-4000-8000-000000000005',
  branchBEntryQr: '00000000-0000-4000-8000-000000000006',
  branchBExitQr: '00000000-0000-4000-8000-000000000007',
  adminUser: '00000000-0000-4000-8000-000000000008',
};

function productIds(branchKey) {
  return {
    milk: `00000000-0000-4000-8000-0000000001${branchKey}`,
    bread: `00000000-0000-4000-8000-0000000002${branchKey}`,
    eggs: `00000000-0000-4000-8000-0000000003${branchKey}`,
    noodles: `00000000-0000-4000-8000-0000000004${branchKey}`,
    battery: `00000000-0000-4000-8000-0000000005${branchKey}`,
  };
}

export async function seed() {
  await pool.query('DELETE FROM search_logs');
  await pool.query('DELETE FROM products');
  await pool.query('DELETE FROM users');
  await pool.query('DELETE FROM branches');
  await pool.query('DELETE FROM companies');

  await pool.query('INSERT INTO companies (id, name) VALUES ($1, $2)', [IDS.company, 'サンプルスーパー']);

  await pool.query(
    `INSERT INTO branches
     (id, company_id, name, ar_enabled, entry_qr_token, exit_qr_token)
     VALUES ($1, $2, $3, TRUE, $4, $5)`,
    [IDS.branchA, IDS.company, '駅前店（AR対応）', IDS.branchAEntryQr, IDS.branchAExitQr]
  );

  await pool.query(
    `INSERT INTO branches
     (id, company_id, name, ar_enabled, entry_qr_token, exit_qr_token)
     VALUES ($1, $2, $3, FALSE, $4, $5)`,
    [IDS.branchB, IDS.company, '郊外店（AR未対応）', IDS.branchBEntryQr, IDS.branchBExitQr]
  );

  // bearingDeg/distanceMは、実店舗で管理者がAR登録した想定のサンプル値。
  const products = [
    { key: 'milk', name: '牛乳', category: '乳製品', price: 210, stockQty: 12, bearingDeg: 20, distanceM: 12 },
    { key: 'bread', name: '食パン', category: 'パン', price: 168, stockQty: 5, bearingDeg: 60, distanceM: 18 },
    { key: 'eggs', name: '卵（10個パック）', category: '乳製品', price: 258, stockQty: 0, bearingDeg: 25, distanceM: 13 },
    { key: 'noodles', name: 'カップラーメン', category: 'インスタント食品', price: 128, stockQty: 30, bearingDeg: 340, distanceM: 8 },
    { key: 'battery', name: '乾電池 単3', category: '日用品', price: 480, stockQty: 8, bearingDeg: 300, distanceM: 20 },
  ];

  const insertProduct = (id, branchId, p) =>
    pool.query(
      `INSERT INTO products (id, branch_id, name, category, price, stock_qty, bearing_deg, distance_m)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [id, branchId, p.name, p.category, p.price, p.stockQty, p.bearingDeg, p.distanceM]
    );

  const branchAProductIds = productIds('1');
  const branchBProductIds = productIds('2');
  for (const p of products) {
    await insertProduct(branchAProductIds[p.key], IDS.branchA, p);
    await insertProduct(branchBProductIds[p.key], IDS.branchB, p);
  }

  const adminEmail = 'admin@example.com';
  await pool.query(
    'INSERT INTO users (id, email, password_hash, name, company_id) VALUES ($1, $2, $3, $4, $5)',
    [IDS.adminUser, adminEmail, bcrypt.hashSync('password123', 10), '管理者', IDS.company]
  );

  return { companyId: IDS.company, branchAId: IDS.branchA, branchBId: IDS.branchB, adminEmail };
}

// CLIから直接実行された場合（`npm run seed`）のみ実行する。
if (import.meta.url === `file://${process.argv[1]}`) {
  const { initDb } = await import('./db.js');
  await initDb();
  const result = await seed();
  console.log('Seed complete.');
  console.log(`admin login: ${result.adminEmail} / password123`);
  console.log(`AR-enabled branch id: ${result.branchAId}`);
  process.exit(0);
}
