import { createContext, useContext, useEffect, useState } from 'react';
import { onIdTokenChanged, signInWithCustomToken, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { firebaseAuth } from '../firebase.js';
import { api } from '../api/client.js';

const AuthContext = createContext(null);

function describeAuthError(err) {
  switch (err?.code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'メールアドレスまたはパスワードが正しくありません。';
    case 'auth/too-many-requests':
      return '試行回数が多すぎます。しばらくしてから再度お試しください。';
    case 'auth/invalid-email':
      return 'メールアドレスの形式が正しくありません。';
    default:
      return 'ログインに失敗しました。';
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    // ページ再読み込み直後はFirebaseのセッション復元が非同期のため、
    // 復元が終わるまでinitializingで管理者ページへのリダイレクトを保留する。
    const unsubscribe = onIdTokenChanged(firebaseAuth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setInitializing(false);
        return;
      }
      try {
        const { user: profile } = await api.getMe();
        setUser(profile);
      } catch {
        setUser(null);
      }
      setInitializing(false);
    });
    return unsubscribe;
  }, []);

  async function login(email, password) {
    try {
      await signInWithEmailAndPassword(firebaseAuth, email, password);
    } catch (err) {
      throw new Error(describeAuthError(err));
    }
    const { user: profile } = await api.getMe();
    setUser(profile);
  }

  async function register(payload) {
    const { customToken, user: profile } = await api.register(payload);
    await signInWithCustomToken(firebaseAuth, customToken);
    setUser(profile);
  }

  async function logout() {
    await signOut(firebaseAuth);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, initializing, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
