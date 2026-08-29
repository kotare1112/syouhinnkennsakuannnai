import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../api/client.js';

const EMPTY_DRAFT = { id: null, name: '', category: '', price: 0, stockQty: 0 };

export default function ProductManage() {
  const { branchId } = useParams();
  const [branch, setBranch] = useState(null);
  const [products, setProducts] = useState([]);
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  function load() {
    api.adminGetProducts(branchId).then(setProducts).catch((e) => setError(e.message));
  }

  useEffect(() => {
    load();
    api
      .adminGetBranches()
      .then((branches) => setBranch(branches.find((b) => b.id === branchId)))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId]);

  function selectProduct(p) {
    setDraft({
      id: p.id,
      name: p.name,
      category: p.category || '',
      price: p.price,
      stockQty: p.stockQty,
    });
  }

  function update(key) {
    return (e) => {
      const value = e.target.type === 'number' ? Number(e.target.value) : e.target.value;
      setDraft((d) => ({ ...d, [key]: value }));
    };
  }

  async function handleSave(e) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    try {
      if (draft.id) {
        await api.adminUpdateProduct(draft.id, draft);
      } else {
        await api.adminCreateProduct(branchId, draft);
      }
      setMessage('保存しました。');
      setDraft(EMPTY_DRAFT);
      load();
    } catch (e2) {
      setError(e2.message);
    }
  }

  async function handleDelete(id) {
    if (!confirm('この商品を削除しますか？')) return;
    try {
      await api.adminDeleteProduct(id);
      if (draft.id === id) setDraft(EMPTY_DRAFT);
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div className="screen">
      <Link to="/admin/branches" className="back-link">
        ← 支店一覧に戻る
      </Link>
      <h1>商品管理：{branch?.name}</h1>

      <form className="form" onSubmit={handleSave}>
        <h2>{draft.id ? '商品を編集' : '新しい商品を登録'}</h2>
        <label>
          商品名
          <input value={draft.name} onChange={update('name')} required />
        </label>
        <label>
          カテゴリ
          <input value={draft.category} onChange={update('category')} />
        </label>
        <label>
          価格
          <input type="number" min="0" value={draft.price} onChange={update('price')} />
        </label>
        <label>
          在庫数
          <input type="number" min="0" value={draft.stockQty} onChange={update('stockQty')} />
        </label>
        {error && <p className="error-text">{error}</p>}
        {message && <p className="success-text">{message}</p>}
        <div className="form--inline">
          <button type="submit">{draft.id ? '更新する' : '登録する'}</button>
          {draft.id && (
            <button type="button" onClick={() => setDraft(EMPTY_DRAFT)}>
              新規登録に切り替え
            </button>
          )}
        </div>
      </form>

      <p className="muted">
        商品の陳列位置（AR案内の目的地）は、「店舗内装・AR設定」画面のAR登録機能で、実際に店舗を歩きながら登録してください。
      </p>
      <Link to={`/admin/branches/${branchId}/layout`}>→ 店舗内装・AR設定を開く</Link>

      <h2>登録済み商品</h2>
      <ul className="select-list">
        {products.map((p) => (
          <li key={p.id}>
            <div className="branch-row">
              <span>
                {p.name} ・ ¥{p.price} ・ 在庫{p.stockQty} ・ 位置
                {p.bearingDeg != null ? `: ${Math.round(p.bearingDeg)}°/${p.distanceM.toFixed(1)}m` : '未登録'}
              </span>
              <span className="branch-row__actions">
                <button onClick={() => selectProduct(p)}>編集</button>
                <button onClick={() => handleDelete(p.id)}>削除</button>
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
