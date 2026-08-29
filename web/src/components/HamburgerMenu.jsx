import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function HamburgerMenu({ branchId }) {
  const [open, setOpen] = useState(false);
  const [ranking, setRanking] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    if (open && branchId) {
      api.getRanking(branchId).then(setRanking).catch(() => setRanking(null));
    }
  }, [open, branchId]);

  return (
    <>
      <button className="hamburger-btn" onClick={() => setOpen(true)} aria-label="メニュー">
        <span />
        <span />
        <span />
      </button>

      {open && (
        <div className="drawer-backdrop" onClick={() => setOpen(false)}>
          <aside className="drawer" onClick={(e) => e.stopPropagation()}>
            <button className="drawer-close" onClick={() => setOpen(false)}>
              閉じる ×
            </button>

            <h2>検索ランキング</h2>
            {!ranking && <p>読み込み中...</p>}
            {ranking && (
              <>
                <h3>人気の検索キーワード</h3>
                {ranking.topKeywords.length === 0 && <p className="muted">まだデータがありません</p>}
                <ol>
                  {ranking.topKeywords.map((k) => (
                    <li key={k.keyword}>
                      {k.keyword} <span className="muted">({k.count}回)</span>
                    </li>
                  ))}
                </ol>

                <h3>人気商品</h3>
                {ranking.topProducts.length === 0 && <p className="muted">まだデータがありません</p>}
                <ol>
                  {ranking.topProducts.map((p) => (
                    <li key={p.id}>
                      {p.name} <span className="muted">({p.count}回)</span>
                    </li>
                  ))}
                </ol>
              </>
            )}

            <hr />
            {user ? (
              <Link to="/admin/branches" onClick={() => setOpen(false)}>
                管理者ダッシュボードへ
              </Link>
            ) : (
              <Link to="/admin/login" onClick={() => setOpen(false)}>
                管理者ログイン
              </Link>
            )}
          </aside>
        </div>
      )}
    </>
  );
}
