import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client.js';

export default function CompanySelect() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    api
      .getCompanies()
      .then(setCompanies)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="screen">
      <h1>お店を選択してください</h1>
      {error && <p className="error-text">{error}</p>}
      <ul className="select-list">
        {companies.map((c) => (
          <li key={c.id}>
            <button onClick={() => navigate(`/companies/${c.id}/branches`)}>{c.name}</button>
          </li>
        ))}
      </ul>
      {loading && <p className="muted">読み込み中...</p>}
      {!loading && !error && companies.length === 0 && (
        <p className="muted">利用可能なお店がありません。</p>
      )}
    </div>
  );
}
