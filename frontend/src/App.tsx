import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SettingsProvider } from './context/SettingsContext';

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
import ClassTeachersPage from './pages/admin/modules/ClassTeachersPage';
import ParentNotificationPage from './pages/admin/ParentNotificationPage';
import TebligPage from './pages/admin/TebligPage';
import SettingsPage from './pages/admin/SettingsPage';
import MatbuEvraklarPage from './pages/admin/MatbuEvraklarPage';

// Yeni Modüller
import DutySchedulePage from './pages/admin/modules/DutySchedulePage';
import BoardMeetingPage from './pages/admin/modules/BoardMeetingPage';
import CommissionPage from './pages/admin/modules/CommissionPage';
import AnnualPlanPage from './pages/admin/modules/AnnualPlanPage';
import CommemorativeDaysPage from './pages/admin/modules/CommemorativeDaysPage';
import SocialActivityPage from './pages/admin/modules/SocialActivityPage';
import ParentAssociationPage from './pages/admin/modules/ParentAssociationPage';
import FieldTripPage from './pages/admin/modules/FieldTripPage';
import ExtracurricularPage from './pages/admin/modules/ExtracurricularPage';
import TravelAllowancePage from './pages/admin/modules/TravelAllowancePage';
import StaffTransferPage from './pages/admin/modules/StaffTransferPage';
import StudentClubPage from './pages/admin/modules/StudentClubPage';
import OrderLetterPage from './pages/admin/modules/OrderLetterPage';
import HolidayPage from './pages/admin/modules/HolidayPage';
import AttendanceSheetPage from './pages/admin/modules/AttendanceSheetPage';
import SupplierPage from './pages/admin/modules/SupplierPage';
import ProcurementPage from './pages/admin/modules/ProcurementPage';

// Layout
import AdminLayout from './components/AdminLayout';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <AuthProvider>
      <SettingsProvider>
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
              <Route path="class-teachers" element={<ClassTeachersPage />} />
              <Route path="whatsapp" element={<WhatsAppPage />} />
              <Route path="grade-reports" element={<GradeReportPage />} />
              <Route path="parent-meeting" element={<ParentMeetingPage />} />
              <Route path="parent-notification" element={<ParentNotificationPage />} />
              <Route path="teblig" element={<TebligPage />} />
              <Route path="matbu-evraklar" element={<MatbuEvraklarPage />} />
              
              {/* Yeni Modüller */}
              <Route path="duty-schedule" element={<DutySchedulePage />} />
              <Route path="board-meeting" element={<BoardMeetingPage />} />
              <Route path="commission" element={<CommissionPage />} />
              <Route path="annual-plan" element={<AnnualPlanPage />} />
              <Route path="commemorative-days" element={<CommemorativeDaysPage />} />
              <Route path="social-activity" element={<SocialActivityPage />} />
              <Route path="parent-association" element={<ParentAssociationPage />} />
              <Route path="field-trip" element={<FieldTripPage />} />
              <Route path="extracurricular" element={<ExtracurricularPage />} />
              <Route path="travel-allowance" element={<TravelAllowancePage />} />
              <Route path="staff-transfer" element={<StaffTransferPage />} />
              <Route path="student-club" element={<StudentClubPage />} />
              <Route path="order-letter" element={<OrderLetterPage />} />
              <Route path="holidays" element={<HolidayPage />} />
              <Route path="attendance-sheet" element={<AttendanceSheetPage />} />
              <Route path="supplier" element={<SupplierPage />} />
              <Route path="procurement" element={<ProcurementPage />} />

              <Route path="settings" element={<SettingsPage />} />
            </Route>

            {/* Default redirect */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
      </SettingsProvider>
    </AuthProvider>
  );
}

export default App;
