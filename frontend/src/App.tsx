import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';

// Admin pages
import LoginPage from './pages/admin/LoginPage';
import DashboardPage from './pages/admin/DashboardPage';
import StudentListPage from './pages/admin/StudentListPage';
import AbsenteeismPage from './pages/admin/AbsenteeismPage';

// Parent pages
import ParentOTPLoginPage from './pages/parent/ParentOTPLoginPage';
import ParentTokenPage from './pages/parent/ParentTokenPage';
import ParentDashboardPage from './pages/parent/ParentDashboardPage';

// Layout
import AdminLayout from './components/AdminLayout';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/veli-otp" element={<ParentOTPLoginPage />} />
        <Route path="/veli/:token" element={<ParentTokenPage />} />
        <Route path="/veli-panel" element={<ParentDashboardPage />} />

        {/* Admin Routes */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="students" element={<StudentListPage />} />
          <Route path="absenteeism" element={<AbsenteeismPage />} />
        </Route>

        {/* Default redirect */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
