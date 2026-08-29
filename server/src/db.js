import pg from 'pg';

const { Pool } = pg;

// Neonのpooled接続文字列を使用（サーバーレス・接続数の多いWebアプリ向け）。
// サーバーレス関数はインスタンスごとに独立したプールを持つため、1インスタンスあたりの上限は小さくしておく
// （Neon側の同時接続数枯渇を避けるため）。connectionTimeoutMillisは、Neonのコンピュートがスケールtoゼロから
// 復帰する際のコールドスタート（数百ms〜数秒）を許容しつつ、無限に待たないための上限。
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
  connectionTimeoutMillis: 10_000,
});

// アイドル中のクライアントでエラーが起きた場合、pgはpoolに'error'を発行する。
// 未処理のままだとNode プロセスごとクラッシュするため、ログだけ出して握りつぶす。
pool.on('error', (err) => {
  console.error('Unexpected error on idle Postgres client', err);
});

export async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS companies (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS branches (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL REFERENCES companies(id),
      name TEXT NOT NULL,
      ar_enabled BOOLEAN NOT NULL DEFAULT FALSE,
      entry_qr_token TEXT UNIQUE,
      exit_qr_token TEXT UNIQUE
    );

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      branch_id TEXT NOT NULL REFERENCES branches(id),
      name TEXT NOT NULL,
      category TEXT,
      price INTEGER NOT NULL DEFAULT 0,
      stock_qty INTEGER NOT NULL DEFAULT 0,
      bearing_deg DOUBLE PRECISION,
      distance_m DOUBLE PRECISION
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT,
      company_id TEXT NOT NULL REFERENCES companies(id)
    );

    CREATE TABLE IF NOT EXISTS search_logs (
      id SERIAL PRIMARY KEY,
      branch_id TEXT NOT NULL REFERENCES branches(id),
      keyword TEXT,
      product_id TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  // 店舗内装登録をマップクリック方式からAR実測登録方式に変更したための移行。
  // 既存テーブルにも追随できるよう明示的にALTERする（新規作成時はCREATE TABLE側で完結するため実質no-op）。
  await pool.query(`
    ALTER TABLE branches DROP COLUMN IF EXISTS scale_m_per_px;
    ALTER TABLE branches DROP COLUMN IF EXISTS entrance_x;
    ALTER TABLE branches DROP COLUMN IF EXISTS entrance_y;
    ALTER TABLE products DROP COLUMN IF EXISTS shelf_x;
    ALTER TABLE products DROP COLUMN IF EXISTS shelf_y;
    ALTER TABLE products ADD COLUMN IF NOT EXISTS bearing_deg DOUBLE PRECISION;
    ALTER TABLE products ADD COLUMN IF NOT EXISTS distance_m DOUBLE PRECISION;
  `);
}
