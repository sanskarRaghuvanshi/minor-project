import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './components/common/Toast';
import ProtectedRoute from './components/common/ProtectedRoute';
import ErrorBoundary from './components/common/ErrorBoundary';
import OfflineBanner from './components/common/OfflineBanner';
import Skeleton from './components/common/Skeleton';

const LandingPage = lazy(() => import('./pages/LandingPage'));
const Login = lazy(() => import('./pages/Login'));
const FacultyRegister = lazy(() => import('./pages/FacultyRegister'));
const StudentRegister = lazy(() => import('./pages/StudentRegister'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const FacultyDashboardPage = lazy(() => import('./pages/FacultyDashboardPage'));
const StudentDashboardPage = lazy(() => import('./pages/StudentDashboardPage'));
const AdminDashboardPage = lazy(() => import('./pages/AdminDashboardPage'));
const CoordinatorDashboardPage = lazy(() => import('./pages/CoordinatorDashboardPage'));
const FacultyDashboard = lazy(() => import('./components/faculty/FacultyDashboard'));
const MarkAttendance = lazy(() => import('./components/faculty/MarkAttendance'));
const Defaulters = lazy(() => import('./components/faculty/Defaulters'));
const FeedbackHistory = lazy(() => import('./components/faculty/FeedbackHistory'));
const StudentDashboard = lazy(() => import('./components/student/StudentDashboard'));
const MyAttendance = lazy(() => import('./components/student/MyAttendance'));
const StatsView = lazy(() => import('./components/student/StatsView'));
const EligibilityView = lazy(() => import('./components/student/EligibilityView'));
const ApplyLeave = lazy(() => import('./components/student/ApplyLeave'));
const MyLeaves = lazy(() => import('./components/student/MyLeaves'));
const LeaveRequests = lazy(() => import('./components/faculty/LeaveRequests'));
const CoordinatorTeachers = lazy(() => import('./components/coordinator/CoordinatorTeachers'));
const CoordinatorStudents = lazy(() => import('./components/coordinator/CoordinatorStudents'));
const CoordinatorFeedback = lazy(() => import('./components/coordinator/CoordinatorFeedback'));
const AdminDashboard = lazy(() => import('./components/admin/AdminDashboard'));
const UserManagement = lazy(() => import('./components/admin/UserManagement'));

const Loading = () => <div className="page-loading"><Skeleton variant="card" height="400px" /></div>;

const App = () => (
  <ErrorBoundary>
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <Router>
            <OfflineBanner />
            <Suspense fallback={<Loading />}>
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register/faculty" element={<FacultyRegister />} />
                <Route path="/register/student" element={<StudentRegister />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password/:token" element={<ResetPassword />} />

                <Route
                  path="/faculty"
                  element={
                    <ProtectedRoute roles={['faculty']}>
                      <FacultyDashboardPage />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<Navigate to="dashboard" replace />} />
                  <Route path="dashboard" element={<FacultyDashboard />} />
                  <Route path="mark-attendance" element={<MarkAttendance />} />
                  <Route path="defaulters" element={<Defaulters />} />
                  <Route path="feedback-history" element={<FeedbackHistory />} />
                  <Route path="leave-requests" element={<LeaveRequests />} />
                </Route>

                <Route
                  path="/student"
                  element={
                    <ProtectedRoute roles={['student']}>
                      <StudentDashboardPage />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<Navigate to="dashboard" replace />} />
                  <Route path="dashboard" element={<StudentDashboard />} />
                  <Route path="my-attendance" element={<MyAttendance />} />
                  <Route path="stats" element={<StatsView />} />
                  <Route path="eligibility" element={<EligibilityView />} />
                  <Route path="apply-leave" element={<ApplyLeave />} />
                  <Route path="my-leaves" element={<MyLeaves />} />
                </Route>

                <Route
                  path="/coordinator"
                  element={
                    <ProtectedRoute roles={['coordinator']}>
                      <CoordinatorDashboardPage />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<Navigate to="dashboard" replace />} />
                  <Route path="dashboard" element={<FacultyDashboard />} />
                  <Route path="mark-attendance" element={<MarkAttendance />} />
                  <Route path="defaulters" element={<Defaulters />} />
                  <Route path="feedback-history" element={<FeedbackHistory />} />
                  <Route path="leave-requests" element={<LeaveRequests />} />
                  <Route path="teachers" element={<CoordinatorTeachers />} />
                  <Route path="students" element={<CoordinatorStudents />} />
                  <Route path="feedback" element={<CoordinatorFeedback />} />
                </Route>

                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute roles={['admin']}>
                      <AdminDashboardPage />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<Navigate to="dashboard" replace />} />
                  <Route path="dashboard" element={<AdminDashboard />} />
                  <Route path="users" element={<UserManagement />} />
                </Route>

                <Route path="*" element={
                  <div className="not-found">
                    <h1>404</h1>
                    <p>Page not found</p>
                    <a href="/" className="btn btn--primary">Go Home</a>
                  </div>
                } />
              </Routes>
            </Suspense>
          </Router>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  </ErrorBoundary>
);

export default App;
