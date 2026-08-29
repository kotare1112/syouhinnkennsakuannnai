// getUserMedia失敗時、DOMExceptionの種類ごとに日本語の案内文を返す。
export function describeCameraError(err) {
  if (!window.isSecureContext) {
    return 'このページが安全な接続（HTTPSまたはlocalhost）で開かれていないため、カメラを利用できません。URLをご確認ください。';
  }
  const name = err?.name;
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
    return 'カメラの利用が許可されていません。ブラウザのアドレスバー付近のカメラアイコン（Macの場合は システム設定 > プライバシーとセキュリティ > カメラ でこのブラウザを許可）から許可し、再試行してください。';
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
    return 'カメラが見つかりませんでした。カメラが搭載された端末でお試しください。';
  }
  if (name === 'NotReadableError' || name === 'TrackStartError') {
    return 'カメラに接続できませんでした。他のアプリがカメラを使用中の可能性があります。';
  }
  if (name === 'OverconstrainedError') {
    return 'この端末のカメラでは要求した条件を満たせませんでした。';
  }
  return 'カメラを起動できませんでした。ブラウザのカメラ許可設定を確認してください。';
}
