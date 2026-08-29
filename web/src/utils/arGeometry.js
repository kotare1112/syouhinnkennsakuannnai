import * as THREE from 'three';

const UP = new THREE.Vector3(0, 1, 0);

// 入店口登録時の位置・向き（forward）を基準に、商品タップ時の現在位置から
// bearingDeg（forwardを0°とした時計回りの方位）とdistanceM（水平距離）を算出する。
// ArXrView.jsx の「targetDir = forward.applyAxisAngle(UP, -bearingRad)」という定義と整合させ、
// ここで登録した値をそのまま消費者向けAR案内で使っても向きがずれないようにしている。
export function computeBearingDistance({ originPos, forward, targetPos }) {
  const targetVec = new THREE.Vector3().subVectors(targetPos, originPos);
  targetVec.y = 0;
  const distanceM = targetVec.length();

  if (distanceM < 0.01) {
    return { bearingDeg: 0, distanceM: 0 };
  }

  const targetDir = targetVec.clone().normalize();
  const cross = new THREE.Vector3().crossVectors(forward, targetDir);
  const angle = Math.atan2(cross.dot(UP), forward.dot(targetDir));
  let bearingDeg = (-angle * 180) / Math.PI;
  bearingDeg = ((bearingDeg % 360) + 360) % 360;

  return { bearingDeg, distanceM };
}
