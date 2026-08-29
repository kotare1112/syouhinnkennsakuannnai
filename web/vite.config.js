import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'
import { defineConfig } from 'vite'

// カメラ（QRコード読み取り・AR）はブラウザの制約でHTTPS（またはlocalhost）でないと動作しないため、
// スマートフォン実機からLAN経由でアクセスして検証できるよう開発サーバーを常時HTTPS化する。
// 初回アクセス時に自己署名証明書の警告が出るが、進んで問題ない。
export default defineConfig({
  plugins: [react(), basicSsl()],
  server: {
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
})
