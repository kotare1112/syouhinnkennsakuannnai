import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { api } from '../../api/client.js';

export default function BranchSelect() {
  const { companyId } = useParams();
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    api
      .getBranches(companyId)
      .then(setBranches)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [companyId]);

  return (
    <div className="screen">
      <Link to="/" className="back-link">
        ← お店選択に戻る
      </Link>
      <h1>支店を選択してください</h1>
      {error && <p className="error-text">{error}</p>}
      <ul className="select-list">
        {branches.map((b) => (
          <li key={b.id}>
            <button onClick={() => navigate(`/branches/${b.id}`)}>
              {b.name}
              {b.arEnabled ? <span className="badge">AR対応</span> : null}
            </button>
          </li>
        ))}
      </ul>
      {loading && <p className="muted">読み込み中...</p>}
      {!loading && !error && branches.length === 0 && (
        <p className="muted">この店舗には支店が登録されていません。</p>
      )}
    </div>
  );
}
