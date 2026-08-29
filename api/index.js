// Vercel Serverless Function: /api/* へのリクエストをすべてExpressアプリ（server/src/index.js）にそのまま渡す。
// サブパス（/api/companies/xxx等）もこの関数に届くよう、vercel.jsonのrewritesで /api/:path* をここに転送している。
import app from '../server/src/index.js';

export default app;
