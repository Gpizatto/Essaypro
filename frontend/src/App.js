import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Toaster } from './components/ui/sonner';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { StudentDashboard } from './pages/StudentDashboard';
import { TeacherDashboard } from './pages/TeacherDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { PromptsList } from './pages/PromptsList';
import { MyEssays } from './pages/MyEssays';
import { SubmitEssay } from './pages/SubmitEssay';
import { CorrectionView } from './pages/CorrectionView';
import { CorrectionQueue } from './pages/CorrectionQueue';
import { CorrectEssay } from './pages/CorrectEssay';
import { CreatePrompt } from './pages/CreatePrompt';
import { AdminUsers } from './pages/AdminUsers';
import { ManagePrompts } from './pages/ManagePrompts';
import { CourseSettings } from './pages/CourseSettings';
import { TeacherStudents } from './pages/TeacherStudents';
import { StudentProgress } from './pages/StudentProgress';
import { TeacherReport } from './pages/TeacherReport';
import { BrandingSettings } from './pages/BrandingSettings';
import { AdvancedReports } from './pages/AdvancedReports';
import { ActivityLogs } from './pages/ActivityLogs';
import { ManageCourses } from './pages/ManageCourses';
import './App.css';

const DashboardRouter = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (user.role === 'student') {
    return <StudentDashboard />;
  } else if (user.role === 'teacher') {
    return <TeacherDashboard />;
  } else if (user.role === 'admin') {
    return <AdminDashboard />;
  }

  return <Navigate to="/login" />;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardRouter />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/prompts"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <PromptsList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-essays"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <MyEssays />
              </ProtectedRoute>
            }
          />
          <Route
            path="/submit-essay/:promptId"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <SubmitEssay />
              </ProtectedRoute>
            }
          />
          <Route
            path="/essay/:essayId/correction"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <CorrectionView />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/correction-queue"
            element={
              <ProtectedRoute allowedRoles={['teacher', 'admin']}>
                <CorrectionQueue />
              </ProtectedRoute>
            }
          />
          <Route
            path="/correct-essay/:essayId"
            element={
              <ProtectedRoute allowedRoles={['teacher', 'admin']}>
                <CorrectEssay />
              </ProtectedRoute>
            }
          />
          <Route
            path="/create-prompt"
            element={
              <ProtectedRoute allowedRoles={['teacher', 'admin']}>
                <CreatePrompt />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminUsers />
              </ProtectedRoute>
            }
          />
          <Route
            path="/manage-prompts"
            element={
              <ProtectedRoute allowedRoles={['teacher', 'admin']}>
                <ManagePrompts />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <CourseSettings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher/students"
            element={
              <ProtectedRoute allowedRoles={['teacher', 'admin']}>
                <TeacherStudents />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher/student/:studentId"
            element={
              <ProtectedRoute allowedRoles={['teacher', 'admin']}>
                <StudentProgress />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher/report"
            element={
              <ProtectedRoute allowedRoles={['teacher', 'admin']}>
                <TeacherReport />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/branding"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <BrandingSettings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/reports"
            element={
              <ProtectedRoute allowedRoles={['teacher', 'admin']}>
                <AdvancedReports />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/logs"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <ActivityLogs />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/courses"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <ManageCourses />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/stats"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          
          <Route path="/" element={<Navigate to="/dashboard" />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="bottom-right" />
    </AuthProvider>
  );
}

export default App;
