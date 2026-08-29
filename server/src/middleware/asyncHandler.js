// Express 4はasyncハンドラー内でのPromise rejectionを自動catchしないため、
// 明示的にnext(err)へ回すラッパーを介して全ルートに適用する。
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
