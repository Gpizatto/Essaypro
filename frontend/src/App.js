import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Toaster } from './components/ui/sonner';
import './App.css';

// Lazy loading — cada página só carrega quando acessada
const Login = lazy(() => import('./pages/Login').then(m => ({ default: m.Login })));
const Register = lazy(() => import('./pages/Register').then(m => ({ default: m.Register })));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword').then(m => ({ default: m.ForgotPassword })));
const ResetPassword = lazy(() => import('./pages/ResetPassword').then(m => ({ default: m.ResetPassword })));
const PromptsCalendar = lazy(() => import('./pages/PromptsCalendar').then(m => ({ default: m.PromptsCalendar })));
const StudentDashboard = lazy(() => import('./pages/StudentDashboard').then(m => ({ default: m.StudentDashboard })));
const TeacherDashboard = lazy(() => import('./pages/TeacherDashboard').then(m => ({ default: m.TeacherDashboard })));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const PromptsList = lazy(() => import('./pages/PromptsList').then(m => ({ default: m.PromptsList })));
const MyEssays = lazy(() => import('./pages/MyEssays').then(m => ({ default: m.MyEssays })));
const SubmitEssay = lazy(() => import('./pages/SubmitEssay').then(m => ({ default: m.SubmitEssay })));
const CorrectionView = lazy(() => import('./pages/CorrectionView').then(m => ({ default: m.CorrectionView })));
const CorrectionQueue = lazy(() => import('./pages/CorrectionQueue').then(m => ({ default: m.CorrectionQueue })));
const CorrectEssay = lazy(() => import('./pages/CorrectEssay').then(m => ({ default: m.CorrectEssay })));
const CreatePrompt = lazy(() => import('./pages/CreatePrompt').then(m => ({ default: m.CreatePrompt })));
const AdminUsers = lazy(() => import('./pages/AdminUsers').then(m => ({ default: m.AdminUsers })));
const ManagePrompts = lazy(() => import('./pages/ManagePrompts').then(m => ({ default: m.ManagePrompts })));
const CourseSettings = lazy(() => import('./pages/CourseSettings').then(m => ({ default: m.CourseSettings })));
const TeacherStudents = lazy(() => import('./pages/TeacherStudents').then(m => ({ default: m.TeacherStudents })));
const StudentProgress = lazy(() => import('./pages/StudentProgress').then(m => ({ default: m.StudentProgress })));
const TeacherReport = lazy(() => import('./pages/TeacherReport').then(m => ({ default: m.TeacherReport })));
const BrandingSettings = lazy(() => import('./pages/BrandingSettings').then(m => ({ default: m.BrandingSettings })));
const AdvancedReports = lazy(() => import('./pages/AdvancedReports').then(m => ({ default: m.AdvancedReports })));
const ActivityLogs = lazy(() => import('./pages/ActivityLogs').then(m => ({ default: m.ActivityLogs })));
const ManageCourses = lazy(() => import('./pages/ManageCourses').then(m => ({ default: m.ManageCourses })));
const ChangePassword = lazy(() => import('./pages/ChangePassword').then(m => ({ default: m.ChangePassword })));

// Loading mínimo entre páginas
const PageLoader = () => (
  <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FDF3E8' }}>
    <div style={{ width: '32px', height: '32px', border: '3px solid #E8DDD0', borderTopColor: '#7C1805', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

const DashboardRouter = () => {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (user.role === 'student') return <StudentDashboard />;
  if (user.role === 'teacher' || user.role === 'corretor') return <TeacherDashboard />;
  if (user.role === 'admin') return <AdminDashboard />;
  return <Navigate to="/login" />;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/calendar" element={<ProtectedRoute allowedRoles={['student']}><PromptsCalendar /></ProtectedRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute><DashboardRouter /></ProtectedRoute>} />
            <Route path="/prompts" element={<ProtectedRoute allowedRoles={['student']}><PromptsList /></ProtectedRoute>} />
            <Route path="/my-essays" element={<ProtectedRoute allowedRoles={['student']}><MyEssays /></ProtectedRoute>} />
            <Route path="/submit-essay/:promptId" element={<ProtectedRoute allowedRoles={['student']}><SubmitEssay /></ProtectedRoute>} />
            <Route path="/essay/:essayId/correction" element={<ProtectedRoute allowedRoles={['student', 'teacher', 'corretor', 'admin']}><CorrectionView /></ProtectedRoute>} />
            <Route path="/correction-queue" element={<ProtectedRoute allowedRoles={['teacher', 'corretor', 'admin']}><CorrectionQueue /></ProtectedRoute>} />
            <Route path="/correct-essay/:essayId" element={<ProtectedRoute allowedRoles={['teacher', 'corretor', 'admin']}><CorrectEssay /></ProtectedRoute>} />
            <Route path="/create-prompt" element={<ProtectedRoute allowedRoles={['teacher', 'admin']}><CreatePrompt /></ProtectedRoute>} />
            <Route path="/admin/users" element={<ProtectedRoute allowedRoles={['admin']}><AdminUsers /></ProtectedRoute>} />
            <Route path="/manage-prompts" element={<ProtectedRoute allowedRoles={['teacher', 'admin']}><ManagePrompts /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute allowedRoles={['admin']}><CourseSettings /></ProtectedRoute>} />
            <Route path="/teacher/students" element={<ProtectedRoute allowedRoles={['teacher', 'corretor', 'admin']}><TeacherStudents /></ProtectedRoute>} />
            <Route path="/teacher/student/:studentId" element={<ProtectedRoute allowedRoles={['teacher', 'corretor', 'admin']}><StudentProgress /></ProtectedRoute>} />
            <Route path="/teacher/report" element={<ProtectedRoute allowedRoles={['teacher', 'corretor', 'admin']}><TeacherReport /></ProtectedRoute>} />
            <Route path="/admin/branding" element={<ProtectedRoute allowedRoles={['admin']}><BrandingSettings /></ProtectedRoute>} />
            <Route path="/admin/reports" element={<ProtectedRoute allowedRoles={['teacher', 'corretor', 'admin']}><AdvancedReports /></ProtectedRoute>} />
            <Route path="/admin/logs" element={<ProtectedRoute allowedRoles={['admin']}><ActivityLogs /></ProtectedRoute>} />
            <Route path="/admin/courses" element={<ProtectedRoute allowedRoles={['admin']}><ManageCourses /></ProtectedRoute>} />
            <Route path="/admin/stats" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
            <Route path="/change-password" element={<ProtectedRoute><ChangePassword /></ProtectedRoute>} />
            <Route path="/" element={<Navigate to="/dashboard" />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
      <Toaster position="bottom-right" />
    </AuthProvider>
  );
}

export default App;
