import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { api } from '../../api/client.js';
import { useStore } from '../../context/StoreContext.jsx';
import HamburgerMenu from '../../components/HamburgerMenu.jsx';

export default function ProductSearch() {
  const { branchId } = useParams();
  const [branch, setBranch] = useState(null);
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { isEntered } = useStore();

  useEffect(() => {
    api.getBranch(branchId).then(setBranch).catch((e) => setError(e.message));
  }, [branchId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      api
        .searchProducts(branchId, q)
        .then(setResults)
        .catch((e) => setError(e.message));
    }, 250);
    return () => clearTimeout(timer);
  }, [branchId, q]);

  const entered = branch?.arEnabled && isEntered(branchId);

  return (
    <div className="screen">
      <div className="topbar">
        <HamburgerMenu branchId={branchId} />
        <h1>{branch?.name || '商品検索'}</h1>
      </div>
      <Link to={`/companies/${branch?.companyId}/branches`} className="back-link">
        ← 支店選択に戻る
      </Link>

      {branch?.arEnabled && (
        <div className={`ar-status ${entered ? 'ar-status--active' : ''}`}>
          {entered ? (
            <span>AR案内 利用可能（入店済み）</span>
          ) : (
            <>
              <span>この店舗はAR対応です。入店QRを読み取るとAR案内が使えます。</span>
              <button onClick={() => navigate(`/branches/${branchId}/scan/entry`)}>
                入店QRを読み取る
              </button>
            </>
          )}
        </div>
      )}

      <input
        className="search-input"
        placeholder="商品名で検索"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />

      {error && <p className="error-text">{error}</p>}

      <ul className="product-list">
        {results.map((p) => (
          <li key={p.id}>
            <button onClick={() => navigate(`/branches/${branchId}/products/${p.id}`)}>
              <span className="product-name">{p.name}</span>
              <span className="product-meta">
                {p.category} ・ ¥{p.price}
              </span>
            </button>
          </li>
        ))}
        {results.length === 0 && <p className="muted">該当する商品がありません</p>}
      </ul>
    </div>
  );
}
