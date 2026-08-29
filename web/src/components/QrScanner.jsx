import { useCallback, useEffect, useRef, useState } from 'react';
import QrScanner from 'qr-scanner';
import { describeCameraError } from '../utils/cameraError.js';

// qr-scanner内部は権限エラー等を握りつぶして常に「Camera not found.」を投げるため、
// 先に自前でgetUserMediaを呼び、DOMExceptionの種類ごとに具体的な案内を出す。

// カメラ映像からQRコードを読み取り、デコードできた文字列を onResult に渡す。
export default function QrCameraScanner({ onResult, active = true }) {
  const videoRef = useRef(null);
  const scannerRef = useRef(null);
  const [error, setError] = useState(null);
  const [retryKey, setRetryKey] = useState(0);

  const retry = useCallback(() => {
    setError(null);
    setRetryKey((k) => k + 1);
  }, []);

  useEffect(() => {
    if (!active || !videoRef.current) return undefined;
    let cancelled = false;
    let scanner = null;

    async function start() {
      try {
        // 権限ダイアログ・エラー種別を明確にするための事前チェック。
        const preflight = await navigator.mediaDevices.getUserMedia({ video: true });
        preflight.getTracks().forEach((t) => t.stop());
        if (cancelled) return;

        scanner = new QrScanner(videoRef.current, (result) => onResult(result.data), {
          highlightScanRegion: true,
          highlightCodeOutline: true,
        });
        scannerRef.current = scanner;
        await scanner.start();
      } catch (err) {
        console.error(err);
        if (!cancelled) setError(describeCameraError(err));
      }
    }

    start();

    return () => {
      cancelled = true;
      if (scanner) {
        scanner.stop();
        scanner.destroy();
      }
    };
  }, [active, onResult, retryKey]);

  return (
    <div className="qr-scanner">
      <video ref={videoRef} className="qr-scanner__video" muted playsInline />
      {error && (
        <div className="error-text">
          <p>{error}</p>
          <button onClick={retry}>再試行する</button>
        </div>
      )}
    </div>
  );
}
