import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import * as THREE from 'three';
import { computeBearingDistance } from '../../utils/arGeometry.js';

// 管理者向け：WebXRのカメラ映像を見ながら、その場でタップして
// 「入店口」と「各商品の陳列位置」を実測登録するコンポーネント。
// 入店口タップ時のカメラの位置・向きを基準(0°)とし、以降の商品タップは
// そのカメラ位置との相対的な方位・距離として算出する（マップ上でのクリックは不要）。
export default function ArAdminCapture({ products, onRegisterProduct, onEntranceRegistered, onExit }) {
  const mountRef = useRef(null);
  const overlayElRef = useRef(null);
  const cameraRef = useRef(null);
  const originRef = useRef(null);

  const [overlayReady, setOverlayReady] = useState(false);
  const [entranceSet, setEntranceSet] = useState(false);
  const [registered, setRegistered] = useState({});
  const [error, setError] = useState(null);

  useEffect(() => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    overlayElRef.current = el;
    setOverlayReady(true);
    return () => {
      document.body.removeChild(el);
    };
  }, []);

  useEffect(() => {
    if (!overlayReady) return undefined;
    const container = mountRef.current;
    let renderer = null;
    let session = null;
    let cancelled = false;

    async function start() {
      if (!navigator.xr) {
        setError('この端末はWebXRに対応していません。AR登録にはAndroid Chrome等の対応端末が必要です。');
        return;
      }
      const supported = await navigator.xr.isSessionSupported('immersive-ar').catch(() => false);
      if (!supported) {
        setError('この端末はWebXR ARに対応していません。AR登録にはAndroid Chrome等の対応端末が必要です。');
        return;
      }

      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.xr.enabled = true;
      container.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera();
      cameraRef.current = camera;
      scene.add(camera);

      try {
        session = await navigator.xr.requestSession('immersive-ar', {
          requiredFeatures: ['local-floor'],
          domOverlay: { root: overlayElRef.current },
          optionalFeatures: ['dom-overlay'],
        });
      } catch (err) {
        console.error(err);
        setError('ARセッションを開始できませんでした。');
        return;
      }

      if (cancelled) {
        session.end().catch(() => {});
        return;
      }

      renderer.xr.setReferenceSpaceType('local-floor');
      await renderer.xr.setSession(session);
      renderer.setAnimationLoop(() => {
        renderer.render(scene, camera);
      });
    }

    start();

    return () => {
      cancelled = true;
      if (session) session.end().catch(() => {});
      if (renderer) renderer.dispose();
      if (container) container.innerHTML = '';
    };
  }, [overlayReady]);

  const handleRegisterEntrance = useCallback(() => {
    const camera = cameraRef.current;
    if (!camera) return;
    const pos = new THREE.Vector3();
    camera.getWorldPosition(pos);
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0;
    if (forward.lengthSq() < 1e-6) forward.set(0, 0, -1);
    forward.normalize();
    originRef.current = { pos, forward };
    setEntranceSet(true);
    onEntranceRegistered();
  }, [onEntranceRegistered]);

  const handleRegisterProduct = useCallback(
    (product) => {
      const camera = cameraRef.current;
      const origin = originRef.current;
      if (!camera || !origin) return;
      const targetPos = new THREE.Vector3();
      camera.getWorldPosition(targetPos);
      const { bearingDeg, distanceM } = computeBearingDistance({
        originPos: origin.pos,
        forward: origin.forward,
        targetPos,
      });
      setRegistered((r) => ({ ...r, [product.id]: { bearingDeg, distanceM } }));
      onRegisterProduct(product.id, { bearingDeg, distanceM });
    },
    [onRegisterProduct]
  );

  if (error) {
    return (
      <div className="ar-admin-capture ar-admin-capture--error screen">
        <p className="error-text">{error}</p>
        <button onClick={onExit}>戻る</button>
      </div>
    );
  }

  return (
    <div ref={mountRef} className="ar-admin-capture">
      {overlayReady &&
        createPortal(
          <div className="ar-admin-overlay">
            {!entranceSet ? (
              <button className="ar-admin-overlay__primary" onClick={handleRegisterEntrance}>
                ① 入店口としてここを登録
              </button>
            ) : (
              <div className="ar-admin-overlay__panel">
                <p>② 各商品の場所まで歩いて「ここに登録」を押してください</p>
                <ul className="ar-admin-overlay__list">
                  {products.map((p) => (
                    <li key={p.id}>
                      <span>{p.name}</span>
                      {registered[p.id] ? (
                        <span className="ar-admin-overlay__done">
                          登録済み（{Math.round(registered[p.id].bearingDeg)}° / {registered[p.id].distanceM.toFixed(1)}m）
                        </span>
                      ) : (
                        <button onClick={() => handleRegisterProduct(p)}>ここに登録</button>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <button className="ar-admin-overlay__exit" onClick={onExit}>
              AR登録を終了
            </button>
          </div>,
          overlayElRef.current
        )}
    </div>
  );
}
