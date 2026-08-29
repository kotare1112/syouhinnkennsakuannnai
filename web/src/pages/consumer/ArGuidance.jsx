import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../../api/client.js';
import { useStore } from '../../context/StoreContext.jsx';
import ArXrView from '../../components/ar/ArXrView.jsx';
import ArCompassFallback from '../../components/ar/ArCompassFallback.jsx';

export default function ArGuidance() {
  const { branchId, productId } = useParams();
  const navigate = useNavigate();
  const { isEntered } = useStore();

  const [nav, setNav] = useState(null);
  const [error, setError] = useState(null);
  const [xrSupported, setXrSupported] = useState(null); // null=判定中
  const [mode, setMode] = useState('idle'); // idle | xr | fallback

  useEffect(() => {
    if (!isEntered(branchId)) {
      navigate(`/branches/${branchId}`, { replace: true });
      return;
    }
    api.getNav(branchId, productId).then(setNav).catch((e) => setError(e.message));
  }, [branchId, productId, isEntered, navigate]);

  useEffect(() => {
    if (navigator.xr) {
      navigator.xr
        .isSessionSupported('immersive-ar')
        .then(setXrSupported)
        .catch(() => setXrSupported(false));
    } else {
      setXrSupported(false);
    }
  }, []);

  function handleExit() {
    navigate(`/branches/${branchId}/scan/exit`);
  }

  if (error) {
    return (
      <div className="screen">
        <p className="error-text">{error}</p>
      </div>
    );
  }

  if (!nav || xrSupported === null) {
    return (
      <div className="screen">
        <p className="muted">案内情報を読み込んでいます...</p>
      </div>
    );
  }

  if (mode === 'idle') {
    return (
      <div className="screen">
        <h1>{nav.productName} へ案内します</h1>
        <p className="muted">
          その場でお店の奥（入店した方向）を向いて「案内を開始」を押してください。
          その向きを基準に矢印を表示します。
        </p>
        <p>{xrSupported ? 'WebXR ARモードで案内します。' : 'この端末はWebXRに対応していないため、簡易AR表示で案内します。'}</p>
        <button onClick={() => setMode(xrSupported ? 'xr' : 'fallback')}>案内を開始</button>
      </div>
    );
  }

  if (mode === 'xr') {
    return (
      <ArXrView
        bearingDeg={nav.bearingDeg}
        distanceM={nav.distanceM}
        productName={nav.productName}
        onExit={handleExit}
        onUnavailable={() => setMode('fallback')}
      />
    );
  }

  return (
    <ArCompassFallback
      bearingDeg={nav.bearingDeg}
      distanceM={nav.distanceM}
      productName={nav.productName}
      onExit={handleExit}
    />
  );
}
