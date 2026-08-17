import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-slate-50">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-slate-900" />
      </div>
    );
  }

  if (!user || user.role !== 'ADMIN') {
    return <Navigate to="/login" replace />;
  }

  // İlk girişte şifre değiştirme zorunlu — yalnızca settings dışındaki sayfalarda yönlendir
  if (user.mustChangePassword && location.pathname !== '/admin/settings') {
    return <Navigate to="/admin/settings" replace />;
  }

  return <>{children}</>;
}
