import { useCallback, useState } from 'react';
import { useNavigate, useParams, Link, useLocation } from 'react-router-dom';
import { api } from '../../api/client.js';
import { useStore } from '../../context/StoreContext.jsx';
import QrCameraScanner from '../../components/QrScanner.jsx';

// type: 'entry' | 'exit'
export default function QrScanPage({ type }) {
  const { branchId } = useParams();
  const [status, setStatus] = useState('scanning'); // scanning | error | done
  const [message, setMessage] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const { markEntered, markExited } = useStore();
  const returnTo = location.state?.returnTo || `/branches/${branchId}`;

  const handleResult = useCallback(
    async (raw) => {
      if (status !== 'scanning') return;
      let payload;
      try {
        payload = JSON.parse(raw);
      } catch {
        setStatus('error');
        setMessage('読み取ったQRコードの形式が正しくありません。');
        return;
      }

      if (payload.branchId !== branchId || payload.type !== type) {
        setStatus('error');
        setMessage('この店舗のQRコードではありません。');
        return;
      }

      try {
        await api.verifyQr(branchId, payload.token, type);
        setStatus('done');
        if (type === 'entry') {
          markEntered(branchId);
        } else {
          markExited(branchId);
        }
      } catch (e) {
        setStatus('error');
        setMessage(e.message);
      }
    },
    [status, branchId, type, markEntered, markExited]
  );

  if (status === 'done' && type === 'exit') {
    return (
      <div className="screen exit-warning">
        <h1>店舗外に出ました</h1>
        <p>AR案内を終了しました。</p>
        <button onClick={() => navigate(`/branches/${branchId}`)}>商品検索に戻る</button>
      </div>
    );
  }

  if (status === 'done' && type === 'entry') {
    return (
      <div className="screen">
        <h1>入店を確認しました</h1>
        <p>AR案内機能が利用できるようになりました。</p>
        <button onClick={() => navigate(returnTo)}>戻る</button>
      </div>
    );
  }

  return (
    <div className="screen">
      <Link to={returnTo} className="back-link">
        ← 戻る
      </Link>
      <h1>{type === 'entry' ? '入店QRコードを読み取ってください' : '退店QRコードを読み取ってください'}</h1>
      <QrCameraScanner active={status === 'scanning'} onResult={handleResult} />
      {status === 'error' && (
        <div className="error-text">
          <p>{message}</p>
          <button onClick={() => setStatus('scanning')}>もう一度読み取る</button>
        </div>
      )}
    </div>
  );
}
