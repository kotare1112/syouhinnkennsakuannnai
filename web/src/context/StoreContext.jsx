import { createContext, useContext, useState } from 'react';

// 「入店QRを読み取ってAR機能が有効な状態か」を支店IDごとに保持する。
// タブを閉じる（＝店舗を離れる想定に近い）と自動的にリセットされるよう sessionStorage を使う。
const StoreContext = createContext(null);

const STORAGE_KEY = 'enteredBranches';

function loadEntered() {
  try {
    return new Set(JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '[]'));
  } catch {
    return new Set();
  }
}

function persist(set) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
}

export function StoreProvider({ children }) {
  const [entered, setEntered] = useState(loadEntered);

  function markEntered(branchId) {
    setEntered((prev) => {
      const next = new Set(prev);
      next.add(branchId);
      persist(next);
      return next;
    });
  }

  function markExited(branchId) {
    setEntered((prev) => {
      const next = new Set(prev);
      next.delete(branchId);
      persist(next);
      return next;
    });
  }

  function isEntered(branchId) {
    return entered.has(branchId);
  }

  return (
    <StoreContext.Provider value={{ markEntered, markExited, isEntered }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  return useContext(StoreContext);
}
