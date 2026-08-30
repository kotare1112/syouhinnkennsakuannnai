import { firebaseAuth } from '../firebase.js';

const BASE = '/api';

async function authHeaders() {
  const idToken = await firebaseAuth.currentUser?.getIdToken();
  return idToken ? { Authorization: `Bearer ${idToken}` } : {};
}

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(await authHeaders()),
      ...(options.headers || {}),
    },
  });
  const isJson = res.headers.get('content-type')?.includes('application/json');
  const body = isJson ? await res.json() : null;
  if (!res.ok) {
    throw new Error(body?.error || `リクエストに失敗しました (${res.status})`);
  }
  return body;
}

export const api = {
  getCompanies: () => request('/companies'),
  getBranches: (companyId) => request(`/companies/${companyId}/branches`),
  getBranch: (branchId) => request(`/branches/${branchId}`),
  searchProducts: (branchId, q) =>
    request(`/branches/${branchId}/products?q=${encodeURIComponent(q || '')}`),
  getProduct: (productId) => request(`/products/${productId}`),
  checkStock: (productId) => request(`/products/${productId}/check-stock`, { method: 'POST' }),
  getNav: (branchId, productId) => request(`/branches/${branchId}/nav/${productId}`),
  verifyQr: (branchId, token, type) =>
    request(`/branches/${branchId}/qr/verify`, {
      method: 'POST',
      body: JSON.stringify({ token, type }),
    }),
  getRanking: (branchId) => request(`/branches/${branchId}/ranking`),

  register: (payload) =>
    request('/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
  getMe: () => request('/auth/me'),

  adminGetBranches: () => request('/admin/branches'),
  adminCreateBranch: (name) =>
    request('/admin/branches', { method: 'POST', body: JSON.stringify({ name }) }),
  adminSetArEnabled: (branchId, arEnabled) =>
    request(`/admin/branches/${branchId}/ar-enabled`, {
      method: 'PUT',
      body: JSON.stringify({ arEnabled }),
    }),
  adminGetQrCodes: (branchId) => request(`/admin/branches/${branchId}/qrcodes`),
  adminGetProducts: (branchId) => request(`/admin/branches/${branchId}/products`),
  adminCreateProduct: (branchId, payload) =>
    request(`/admin/branches/${branchId}/products`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  adminUpdateProduct: (productId, payload) =>
    request(`/admin/products/${productId}`, { method: 'PUT', body: JSON.stringify(payload) }),
  adminSetProductPosition: (productId, { bearingDeg, distanceM }) =>
    request(`/admin/products/${productId}/position`, {
      method: 'PUT',
      body: JSON.stringify({ bearingDeg, distanceM }),
    }),
  adminDeleteProduct: (productId) =>
    request(`/admin/products/${productId}`, { method: 'DELETE' }),
};
