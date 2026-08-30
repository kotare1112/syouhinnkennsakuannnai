import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

// Firebaseのウェブアプリ設定は秘密情報ではない（Firebase Authenticationの許可済みドメイン設定や
// Firestoreセキュリティルールでアクセスを制御する前提の、クライアントに公開して問題ない値）。
const firebaseConfig = {
  apiKey: 'AIzaSyCvQmI6EKds6uDa0TYlUAYUcfD7zvkw7_Y',
  authDomain: 'syouhinnkennsakuannnai.firebaseapp.com',
  projectId: 'syouhinnkennsakuannnai',
  storageBucket: 'syouhinnkennsakuannnai.firebasestorage.app',
  messagingSenderId: '150585052044',
  appId: '1:150585052044:web:4d8292fbde095a7cd564a9',
};

const app = initializeApp(firebaseConfig);
export const firebaseAuth = getAuth(app);
