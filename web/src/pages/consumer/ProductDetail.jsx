import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link, useLocation } from 'react-router-dom';
import { api } from '../../api/client.js';
import { useStore } from '../../context/StoreContext.jsx';

export default function ProductDetail() {
  const { branchId, productId } = useParams();
  const [product, setProduct] = useState(null);
  const [branch, setBranch] = useState(null);
  const [stockResult, setStockResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { isEntered } = useStore();

  useEffect(() => {
    api.getProduct(productId).then(setProduct).catch((e) => setError(e.message));
    api.getBranch(branchId).then(setBranch).catch((e) => setError(e.message));
  }, [branchId, productId]);

  useEffect(() => {
    setLoading(true);
    api
      .checkStock(productId)
      .then(setStockResult)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [productId]);

  const entered = isEntered(branchId);

  function goScanEntry() {
    navigate(`/branches/${branchId}/scan/entry`, { state: { returnTo: location.pathname } });
  }

  return (
    <div className="screen">
      <Link to={`/branches/${branchId}`} className="back-link">
        ← 検索に戻る
      </Link>
      <h1>{product?.name || '商品詳細'}</h1>
      {product && (
        <p className="product-meta">
          {product.category} ・ ¥{product.price}
        </p>
      )}

      {error && <p className="error-text">{error}</p>}
      {loading && <p className="muted">AIが在庫を確認しています...</p>}

      {stockResult && !stockResult.inStock && (
        <div className="stock-result stock-result--out">
          <p>在庫がありません。</p>
        </div>
      )}

      {stockResult && stockResult.inStock && (
        <div className="stock-result stock-result--in">
          <p>{stockResult.message}</p>
          {!branch?.arEnabled && <p className="muted">この店舗はAR案内に対応していません。</p>}
          {branch?.arEnabled && entered && (
            <button onClick={() => navigate(`/branches/${branchId}/ar/${productId}`)}>
              AR案内を開始する
            </button>
          )}
          {branch?.arEnabled && !entered && (
            <>
              <p className="muted">
                AR案内を利用するには、店舗の入店QRコードを読み取ってください。
              </p>
              <button onClick={goScanEntry}>入店QRを読み取る</button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
