import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import { StoreProvider } from './context/StoreContext.jsx';

import CompanySelect from './pages/consumer/CompanySelect.jsx';
import BranchSelect from './pages/consumer/BranchSelect.jsx';
import ProductSearch from './pages/consumer/ProductSearch.jsx';
import ProductDetail from './pages/consumer/ProductDetail.jsx';
import QrScanPage from './pages/consumer/QrScanPage.jsx';
import ArGuidance from './pages/consumer/ArGuidance.jsx';

import Login from './pages/admin/Login.jsx';
import Register from './pages/admin/Register.jsx';
import BranchList from './pages/admin/BranchList.jsx';
import BranchLayoutEditor from './pages/admin/BranchLayoutEditor.jsx';
import ProductManage from './pages/admin/ProductManage.jsx';
import RequireAdmin from './components/RequireAdmin.jsx';

export default function App() {
  return (
    <AuthProvider>
      <StoreProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<CompanySelect />} />
            <Route path="/companies/:companyId/branches" element={<BranchSelect />} />
            <Route path="/branches/:branchId" element={<ProductSearch />} />
            <Route path="/branches/:branchId/products/:productId" element={<ProductDetail />} />
            <Route path="/branches/:branchId/scan/entry" element={<QrScanPage type="entry" />} />
            <Route path="/branches/:branchId/scan/exit" element={<QrScanPage type="exit" />} />
            <Route path="/branches/:branchId/ar/:productId" element={<ArGuidance />} />

            <Route path="/admin/login" element={<Login />} />
            <Route path="/admin/register" element={<Register />} />
            <Route
              path="/admin/branches"
              element={
                <RequireAdmin>
                  <BranchList />
                </RequireAdmin>
              }
            />
            <Route
              path="/admin/branches/:branchId/layout"
              element={
                <RequireAdmin>
                  <BranchLayoutEditor />
                </RequireAdmin>
              }
            />
            <Route
              path="/admin/branches/:branchId/products"
              element={
                <RequireAdmin>
                  <ProductManage />
                </RequireAdmin>
              }
            />
          </Routes>
        </BrowserRouter>
      </StoreProvider>
    </AuthProvider>
  );
}
