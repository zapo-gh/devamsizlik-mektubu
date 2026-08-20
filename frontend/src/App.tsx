import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SettingsProvider } from './context/SettingsContext';

// Layout & Core
import AdminLayout from './components/AdminLayout';
import ProtectedRoute from './components/ProtectedRoute';

// Lazy Loaded Pages
const LoginPage = React.lazy(() => import('./pages/admin/LoginPage'));
const DashboardPage = React.lazy(() => import('./pages/admin/DashboardPage'));
const StudentListPage = React.lazy(() => import('./pages/admin/StudentListPage'));
const AbsenteeismPage = React.lazy(() => import('./pages/admin/AbsenteeismPage'));
const WarningsPage = React.lazy(() => import('./pages/admin/WarningsPage'));
const ViolationsPage = React.lazy(() => import('./pages/admin/ViolationsPage'));
const StaffPage = React.lazy(() => import('./pages/admin/StaffPage'));
const WhatsAppPage = React.lazy(() => import('./pages/admin/WhatsAppPage'));
const GradeReportPage = React.lazy(() => import('./pages/admin/GradeReportPage'));
const ParentMeetingPage = React.lazy(() => import('./pages/admin/ParentMeetingPage'));
const ClassTeachersPage = React.lazy(() => import('./pages/admin/modules/ClassTeachersPage'));
const ParentNotificationPage = React.lazy(() => import('./pages/admin/ParentNotificationPage'));
const TebligPage = React.lazy(() => import('./pages/admin/TebligPage'));
const SettingsPage = React.lazy(() => import('./pages/admin/SettingsPage'));
const AuditLogPage = React.lazy(() => import('./pages/admin/AuditLogPage'));
const MatbuEvraklarPage = React.lazy(() => import('./pages/admin/MatbuEvraklarPage'));

const DutySchedulePage = React.lazy(() => import('./pages/admin/modules/DutySchedulePage'));
const BoardMeetingPage = React.lazy(() => import('./pages/admin/modules/BoardMeetingPage'));
const CommissionPage = React.lazy(() => import('./pages/admin/modules/CommissionPage'));
const AnnualPlanPage = React.lazy(() => import('./pages/admin/modules/AnnualPlanPage'));
const CommemorativeDaysPage = React.lazy(() => import('./pages/admin/modules/CommemorativeDaysPage'));
const SocialActivityPage = React.lazy(() => import('./pages/admin/modules/SocialActivityPage'));
const ParentAssociationPage = React.lazy(() => import('./pages/admin/modules/ParentAssociationPage'));
const FieldTripPage = React.lazy(() => import('./pages/admin/modules/FieldTripPage'));
const ExtracurricularPage = React.lazy(() => import('./pages/admin/modules/ExtracurricularPage'));
const TravelAllowancePage = React.lazy(() => import('./pages/admin/modules/TravelAllowancePage'));
const StaffTransferPage = React.lazy(() => import('./pages/admin/modules/StaffTransferPage'));
const StudentClubPage = React.lazy(() => import('./pages/admin/modules/StudentClubPage'));
const OrderLetterPage = React.lazy(() => import('./pages/admin/modules/OrderLetterPage'));
const HolidayPage = React.lazy(() => import('./pages/admin/modules/HolidayPage'));
const AttendanceSheetPage = React.lazy(() => import('./pages/admin/modules/AttendanceSheetPage'));
const SupplierPage = React.lazy(() => import('./pages/admin/modules/SupplierPage'));
const ProcurementPage = React.lazy(() => import('./pages/admin/modules/ProcurementPage'));

// Loader: sadece içerik alanı için (sidebar sabit kalır)
const PageLoader = () => (
  <div className="flex h-full w-full items-center justify-center min-h-[300px]">
    <div className="h-9 w-9 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent opacity-70"></div>
  </div>
);

function App() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <Routes>
          {/* Public Routes */}
          <Route
            path="/login"
            element={
              <Suspense fallback={
                <div className="flex h-screen w-full items-center justify-center bg-slate-950">
                  <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
                </div>
              }>
                <LoginPage />
              </Suspense>
            }
          />

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
              <Route path="audit-logs" element={<AuditLogPage />} />

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
