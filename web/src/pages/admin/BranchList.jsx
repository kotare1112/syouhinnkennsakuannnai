import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';

export default function BranchList() {
  const [branches, setBranches] = useState([]);
  const [newName, setNewName] = useState('');
  const [error, setError] = useState(null);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function load() {
    api.adminGetBranches().then(setBranches).catch((e) => setError(e.message));
  }

  useEffect(load, []);

  async function handleCreate(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    try {
      await api.adminCreateBranch(newName.trim());
      setNewName('');
      load();
    } catch (e2) {
      setError(e2.message);
    }
  }

  async function handleLogout() {
    await logout();
    navigate('/admin/login');
  }

  return (
    <div className="screen">
      <div className="topbar">
        <h1>管理者ダッシュボード</h1>
        <button onClick={handleLogout}>ログアウト</button>
      </div>
      <p className="muted">{user?.email} でログイン中</p>
      <Link to="/" className="back-link">
        ← 消費者向け画面（店舗選択）へ
      </Link>

      <form className="form form--inline" onSubmit={handleCreate}>
        <input
          placeholder="新しい支店名"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <button type="submit">支店を追加</button>
      </form>

      {error && <p className="error-text">{error}</p>}

      <ul className="select-list">
        {branches.map((b) => (
          <li key={b.id}>
            <div className="branch-row">
              <span>
                {b.name} {b.arEnabled ? <span className="badge">AR対応</span> : null}
              </span>
              <span className="branch-row__actions">
                <Link to={`/admin/branches/${b.id}/layout`}>店舗内装・AR設定</Link>
                <Link to={`/admin/branches/${b.id}/products`}>商品管理</Link>
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
