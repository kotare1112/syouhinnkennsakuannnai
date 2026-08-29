import { useCallback, useEffect, useRef, useState } from 'react';
import { describeCameraError } from '../../utils/cameraError.js';

// WebXR(immersive-ar)に対応していない端末向けの簡易AR代替表示。
// カメラ映像を背景にし、端末の方位センサー（コンパス）から算出した相対角度で矢印アイコンを回転させる。
// 案内開始時点の向きを基準(0°)として、bearingDeg（入店口基準の方位）との差分だけ矢印を回転させる簡易実装。
// 実際の歩行による距離の変化はセンサーだけでは追跡できないため、距離は「目安」の静的表示とする。
export default function ArCompassFallback({ bearingDeg, distanceM, productName, onExit }) {
  const videoRef = useRef(null);
  const headingOffsetRef = useRef(null);
  const [arrowRotation, setArrowRotation] = useState(0);
  const [cameraError, setCameraError] = useState(null);
  const [retryKey, setRetryKey] = useState(0);
  const [orientationSupported, setOrientationSupported] = useState(true);
  const [orientationError, setOrientationError] = useState(null);

  const retryCamera = useCallback(() => {
    setCameraError(null);
    setRetryKey((k) => k + 1);
  }, []);

  useEffect(() => {
    let stream;
    let cancelled = false;

    async function start() {
      // 背面カメラを優先しつつ、無ければ前面カメラなど利用可能なカメラにフォールバックする。
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
        });
      } catch (err) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: true });
        } catch (err2) {
          if (!cancelled) setCameraError(describeCameraError(err2 || err));
          return;
        }
      }
      if (cancelled) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      if (videoRef.current) videoRef.current.srcObject = stream;
    }

    start();

    return () => {
      cancelled = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [retryKey]);

  useEffect(() => {
    function handleOrientation(e) {
      const heading = e.webkitCompassHeading ?? (e.absolute ? e.alpha : null);
      if (heading == null) {
        setOrientationSupported(false);
        return;
      }
      if (headingOffsetRef.current === null) {
        headingOffsetRef.current = heading;
      }
      const relative = heading - headingOffsetRef.current;
      const angle = ((bearingDeg + relative) % 360 + 360) % 360;
      setArrowRotation(angle);
    }

    async function setup() {
      if (typeof DeviceOrientationEvent !== 'undefined' && DeviceOrientationEvent.requestPermission) {
        try {
          const result = await DeviceOrientationEvent.requestPermission();
          if (result !== 'granted') {
            setOrientationError('方位センサーの利用が許可されませんでした。');
            return;
          }
        } catch {
          setOrientationError('方位センサーの利用許可を取得できませんでした。');
          return;
        }
      }
      window.addEventListener('deviceorientationabsolute', handleOrientation, true);
      window.addEventListener('deviceorientation', handleOrientation, true);
    }
    setup();

    return () => {
      window.removeEventListener('deviceorientationabsolute', handleOrientation, true);
      window.removeEventListener('deviceorientation', handleOrientation, true);
    };
  }, [bearingDeg]);

  return (
    <div className="ar-compass-view">
      <video ref={videoRef} autoPlay muted playsInline className="ar-compass-view__video" />
      <div className="ar-compass-view__overlay">
        <div className="xr-overlay__info">
          <div className="xr-overlay__product">{productName}</div>
          <div className="xr-overlay__distance">残り距離（目安）: 約{distanceM}m</div>
          {!orientationSupported && (
            <p className="error-text">この端末は方位センサーに対応していません。</p>
          )}
          {orientationError && <p className="error-text">{orientationError}</p>}
          {cameraError && (
            <div className="error-text">
              <p>{cameraError}</p>
              <button onClick={retryCamera}>再試行する</button>
            </div>
          )}
        </div>
        <div className="compass-arrow" style={{ transform: `rotate(${arrowRotation}deg)` }}>
          ▲
        </div>
        <button className="xr-overlay__exit" onClick={onExit}>
          退店QRを読み取る
        </button>
      </div>
    </div>
  );
}
