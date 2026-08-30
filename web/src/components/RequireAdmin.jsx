import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function RequireAdmin({ children }) {
  const { user, initializing } = useAuth();
  if (initializing) return <div className="screen">読み込み中...</div>;
  if (!user) return <Navigate to="/admin/login" replace />;
  return children;
}
