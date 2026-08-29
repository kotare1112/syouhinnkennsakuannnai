import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../api/client.js';
import ArAdminCapture from '../../components/ar/ArAdminCapture.jsx';

export default function BranchLayoutEditor() {
  const { branchId } = useParams();
  const [branch, setBranch] = useState(null);
  const [products, setProducts] = useState([]);
  const [capturing, setCapturing] = useState(false);
  const [entranceRegisteredThisSession, setEntranceRegisteredThisSession] = useState(false);
  const [qr, setQr] = useState(null);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  function load() {
    api
      .adminGetBranches()
      .then((branches) => {
        const b = branches.find((x) => x.id === branchId);
        if (!b) {
          setError('店舗が見つかりません。');
          return;
        }
        setBranch(b);
      })
      .catch((e) => setError(e.message));

    api.adminGetProducts(branchId).then(setProducts).catch(() => {});
  }

  useEffect(load, [branchId]);

  function handleRegisterProduct(productId, { bearingDeg, distanceM }) {
    api.adminSetProductPosition(productId, { bearingDeg, distanceM }).catch((e) => setError(e.message));
  }

  async function handleExitCapture() {
    setCapturing(false);
    if (entranceRegisteredThisSession) {
      try {
        await api.adminSetArEnabled(branchId, true);
        setMessage('入店口・商品位置を登録し、AR案内を有効にしました。');
      } catch (e) {
        setError(e.message);
      }
    }
    setEntranceRegisteredThisSession(false);
    load();
  }

  async function handleDisableAr() {
    try {
      await api.adminSetArEnabled(branchId, false);
      setMessage('AR案内を無効にしました。');
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleShowQr() {
    try {
      const data = await api.adminGetQrCodes(branchId);
      setQr(data);
    } catch (e) {
      setError(e.message);
    }
  }

  if (capturing) {
    return (
      <ArAdminCapture
        products={products}
        onRegisterProduct={handleRegisterProduct}
        onEntranceRegistered={() => setEntranceRegisteredThisSession(true)}
        onExit={handleExitCapture}
      />
    );
  }

  return (
    <div className="screen">
      <Link to="/admin/branches" className="back-link">
        ← 支店一覧に戻る
      </Link>
      <h1>店舗内装登録・AR設定：{branch?.name}</h1>

      <div className="ar-status">
        <span>AR案内: {branch?.arEnabled ? '有効' : '無効'}</span>
        {branch?.arEnabled && <button onClick={handleDisableAr}>AR案内を無効にする</button>}
      </div>

      <p className="muted">
        スマートフォンを持って実際に店舗を歩き、入店口と各商品の場所をその場でAR登録します。
        商品の登録がまだの場合は、先に「商品管理」で商品を登録してください。
      </p>
      <button onClick={() => setCapturing(true)}>AR登録を開始する</button>

      {error && <p className="error-text">{error}</p>}
      {message && <p className="success-text">{message}</p>}

      <h2>登録済みの商品位置</h2>
      <ul className="select-list">
        {products.map((p) => (
          <li key={p.id}>
            <div className="branch-row">
              <span>{p.name}</span>
              <span className="muted">
                {p.bearingDeg != null ? `${Math.round(p.bearingDeg)}° / ${p.distanceM.toFixed(1)}m` : '未登録'}
              </span>
            </div>
          </li>
        ))}
      </ul>

      <hr />
      <h2>入店・退店QRコード</h2>
      <p className="muted">
        店舗の入口・出口に掲示するQRコードを発行します。入店口用は入口に、退店用は出口に設置してください。
      </p>
      <button onClick={handleShowQr}>QRコードを表示する</button>
      {qr && (
        <div className="qr-pair">
          <div>
            <p>入店用QR</p>
            <img src={qr.entryQr} alt="入店用QRコード" />
          </div>
          <div>
            <p>退店用QR</p>
            <img src={qr.exitQr} alt="退店用QRコード" />
          </div>
        </div>
      )}
    </div>
  );
}
