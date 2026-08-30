import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

// Firebase Admin SDKの認証情報。3つの環境変数（Vercel/ローカルの.env共通）から組み立てる。
// FIREBASE_PRIVATE_KEY はJSON鍵ファイル内の値をそのまま1行の文字列として保存し（改行は \n のまま）、
// ここで実際の改行に戻す。
function buildCredential() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      'FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY を設定してください。'
    );
  }
  return cert({ projectId, clientEmail, privateKey });
}

if (!getApps().length) {
  initializeApp({ credential: buildCredential() });
}

export const db = getFirestore();
export const auth = getAuth();
export { FieldValue };

export const companiesCol = db.collection('companies');
export const branchesCol = db.collection('branches');
export const productsCol = db.collection('products');
export const usersCol = db.collection('users');
export const searchLogsCol = db.collection('searchLogs');

// コレクション内の全ドキュメントを削除する（シード時のリセット用）。
export async function deleteAllDocs(collectionRef) {
  const snapshot = await collectionRef.get();
  if (snapshot.empty) return;
  const batch = db.batch();
  snapshot.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
}
