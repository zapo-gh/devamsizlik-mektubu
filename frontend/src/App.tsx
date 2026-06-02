import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';

// Admin pages
import LoginPage from './pages/admin/LoginPage';
import DashboardPage from './pages/admin/DashboardPage';
import StudentListPage from './pages/admin/StudentListPage';
import AbsenteeismPage from './pages/admin/AbsenteeismPage';
import WarningsPage from './pages/admin/WarningsPage';
import ViolationsPage from './pages/admin/ViolationsPage';
import StaffPage from './pages/admin/StaffPage';
import WhatsAppPage from './pages/admin/WhatsAppPage';
import GradeReportPage from './pages/admin/GradeReportPage';
import ParentMeetingPage from './pages/admin/ParentMeetingPage';
import ParentNotificationPage from './pages/admin/ParentNotificationPage';
import TebligPage from './pages/admin/TebligPage';
import SettingsPage from './pages/admin/SettingsPage';

// Layout
import AdminLayout from './components/AdminLayout';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<LoginPage />} />

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
          <Route path="warnings" element={<WarningsPage />} />
          <Route path="violations" element={<ViolationsPage />} />
          <Route path="staff" element={<StaffPage />} />
          <Route path="whatsapp" element={<WhatsAppPage />} />
          <Route path="grade-reports" element={<GradeReportPage />} />
          <Route path="parent-meeting" element={<ParentMeetingPage />} />
          <Route path="parent-notification" element={<ParentNotificationPage />} />
          <Route path="teblig" element={<TebligPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>

        {/* Default redirect */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
