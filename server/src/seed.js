import 'dotenv/config';
import { auth, companiesCol, branchesCol, productsCol, usersCol, searchLogsCol, deleteAllDocs } from './db.js';

// Firebase Authenticationに登録された全ユーザーを削除する（シード時のリセット用）。
// Firestoreの削除だけではAuthenticationのアカウントは残ってしまうため、再シード時の
// email-already-exists衝突を避けるためにも両方をクリアする。
async function deleteAllAuthUsers() {
  const list = await auth.listUsers(1000);
  if (list.users.length === 0) return;
  await auth.deleteUsers(list.users.map((u) => u.uid));
}

// 固定IDにしているのは、以前SQLite+Vercelサーバーレス環境でランダムUUIDを使っていた際に、
// インスタンスごとに異なるIDでシードされて整合性が壊れた反省から。Firestore移行後も
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
  await deleteAllAuthUsers();
  await deleteAllDocs(searchLogsCol);
  await deleteAllDocs(productsCol);
  await deleteAllDocs(usersCol);
  await deleteAllDocs(branchesCol);
  await deleteAllDocs(companiesCol);

  await companiesCol.doc(IDS.company).set({ name: 'サンプルスーパー' });

  await branchesCol.doc(IDS.branchA).set({
    companyId: IDS.company,
    name: '駅前店（AR対応）',
    arEnabled: true,
    entryQrToken: IDS.branchAEntryQr,
    exitQrToken: IDS.branchAExitQr,
  });

  await branchesCol.doc(IDS.branchB).set({
    companyId: IDS.company,
    name: '郊外店（AR未対応）',
    arEnabled: false,
    entryQrToken: IDS.branchBEntryQr,
    exitQrToken: IDS.branchBExitQr,
  });

  // bearingDeg/distanceMは、実店舗で管理者がAR登録した想定のサンプル値。
  const products = [
    { key: 'milk', name: '牛乳', category: '乳製品', price: 210, stockQty: 12, bearingDeg: 20, distanceM: 12 },
    { key: 'bread', name: '食パン', category: 'パン', price: 168, stockQty: 5, bearingDeg: 60, distanceM: 18 },
    { key: 'eggs', name: '卵（10個パック）', category: '乳製品', price: 258, stockQty: 0, bearingDeg: 25, distanceM: 13 },
    { key: 'noodles', name: 'カップラーメン', category: 'インスタント食品', price: 128, stockQty: 30, bearingDeg: 340, distanceM: 8 },
    { key: 'battery', name: '乾電池 単3', category: '日用品', price: 480, stockQty: 8, bearingDeg: 300, distanceM: 20 },
  ];

  const insertProduct = (id, branchId, p) =>
    productsCol.doc(id).set({
      branchId,
      name: p.name,
      category: p.category,
      price: p.price,
      stockQty: p.stockQty,
      bearingDeg: p.bearingDeg,
      distanceM: p.distanceM,
    });

  const branchAProductIds = productIds('1');
  const branchBProductIds = productIds('2');
  for (const p of products) {
    await insertProduct(branchAProductIds[p.key], IDS.branchA, p);
    await insertProduct(branchBProductIds[p.key], IDS.branchB, p);
  }

  const adminEmail = 'admin@example.com';
  const adminPassword = 'password123';
  const userRecord = await auth.createUser({
    uid: IDS.adminUser,
    email: adminEmail,
    password: adminPassword,
    displayName: '管理者',
  });
  await usersCol.doc(userRecord.uid).set({
    email: adminEmail,
    name: '管理者',
    companyId: IDS.company,
  });

  return { companyId: IDS.company, branchAId: IDS.branchA, branchBId: IDS.branchB, adminEmail, adminPassword };
}

// CLIから直接実行された場合（`npm run seed`）のみ実行する。
if (import.meta.url === `file://${process.argv[1]}`) {
  const result = await seed();
  console.log('Seed complete.');
  console.log(`admin login: ${result.adminEmail} / password123`);
  console.log(`AR-enabled branch id: ${result.branchAId}`);
  process.exit(0);
}
