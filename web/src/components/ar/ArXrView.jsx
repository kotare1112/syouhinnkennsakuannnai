import { useEffect, useRef } from 'react';
import * as THREE from 'three';

const UP = new THREE.Vector3(0, 1, 0);

// WebXR (immersive-ar) を用いた矢印案内。
// 案内開始時点のカメラ位置・向きを基準に、bearingDeg/distanceM から目的地の世界座標を1度だけ計算し、
// 以降はXRの自己位置トラッキング（SLAM）によって、利用者が実際に歩いた分だけ目的地との相対位置が更新される。
// 矢印はカメラの子オブジェクトとして常に視界前方に表示し、毎フレーム「今どちらを向けば目的地に近づくか」を指す向きに回転させる。
export default function ArXrView({ bearingDeg, distanceM, productName, onExit, onUnavailable }) {
  const mountRef = useRef(null);
  const distanceLabelRef = useRef(null);

  useEffect(() => {
    const container = mountRef.current;
    const overlay = document.createElement('div');
    overlay.className = 'xr-overlay';
    overlay.innerHTML = `
      <div class="xr-overlay__info">
        <div class="xr-overlay__product">${escapeHtml(productName)}</div>
        <div class="xr-overlay__distance" id="xr-distance">残り距離: 計測中...</div>
      </div>
      <button class="xr-overlay__exit">退店QRを読み取る</button>
    `;
    container.appendChild(overlay);
    distanceLabelRef.current = overlay.querySelector('#xr-distance');
    overlay.querySelector('.xr-overlay__exit').addEventListener('click', onExit);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera();

    scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 3));

    const arrow = buildArrowMesh();
    arrow.position.set(0, -0.25, -1.2);
    camera.add(arrow);
    scene.add(camera);

    let targetPos = null;
    let calibrated = false;
    const bearingRad = (bearingDeg * Math.PI) / 180;
    const clampedDistance = Math.min(Math.max(distanceM, 1), 15);

    function calibrate() {
      const camPos = new THREE.Vector3();
      camera.getWorldPosition(camPos);
      const forward = new THREE.Vector3();
      camera.getWorldDirection(forward);
      forward.y = 0;
      if (forward.lengthSq() < 1e-6) forward.set(0, 0, -1);
      forward.normalize();

      const targetDir = forward.clone().applyAxisAngle(UP, -bearingRad).normalize();
      targetPos = camPos.clone().add(targetDir.multiplyScalar(clampedDistance));
      calibrated = true;
    }

    let session = null;
    let animationId = null;

    async function start() {
      if (!navigator.xr) {
        onUnavailable();
        return;
      }
      try {
        session = await navigator.xr.requestSession('immersive-ar', {
          requiredFeatures: ['local-floor'],
          domOverlay: { root: overlay },
          optionalFeatures: ['dom-overlay'],
        });
      } catch (err) {
        console.error('WebXR session request failed', err);
        onUnavailable();
        return;
      }

      renderer.xr.setReferenceSpaceType('local-floor');
      await renderer.xr.setSession(session);

      renderer.setAnimationLoop(() => {
        if (!calibrated) calibrate();

        const camPos = new THREE.Vector3();
        camera.getWorldPosition(camPos);
        const remaining = camPos.distanceTo(targetPos);

        if (distanceLabelRef.current) {
          distanceLabelRef.current.textContent =
            remaining < 1.5 ? '目的地付近です' : `残り距離: 約${remaining.toFixed(1)}m`;
        }

        const localTarget = targetPos.clone();
        camera.worldToLocal(localTarget);
        const angle = Math.atan2(localTarget.x, -localTarget.z);
        arrow.rotation.y = angle;

        renderer.render(scene, camera);
      });

      session.addEventListener('end', () => {
        renderer.setAnimationLoop(null);
      });
    }

    start();

    function handleResize() {
      renderer.setSize(window.innerWidth, window.innerHeight);
    }
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationId);
      if (session) session.end().catch(() => {});
      renderer.dispose();
      container.innerHTML = '';
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={mountRef} className="ar-xr-view" />;
}

function buildArrowMesh() {
  const group = new THREE.Group();
  const shaftGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.25, 12);
  const headGeo = new THREE.ConeGeometry(0.07, 0.18, 16);
  const material = new THREE.MeshStandardMaterial({ color: 0x2ecc71, emissive: 0x113322 });

  const shaft = new THREE.Mesh(shaftGeo, material);
  shaft.rotation.x = Math.PI / 2;
  shaft.position.z = -0.12;
  group.add(shaft);

  const head = new THREE.Mesh(headGeo, material);
  head.rotation.x = Math.PI / 2;
  head.position.z = -0.28;
  group.add(head);

  return group;
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[c]);
}
