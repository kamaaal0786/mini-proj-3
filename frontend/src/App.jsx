/**
 * Root application router.
 * Full route tree per SDK Section 13.
 * Protected routes use ProtectedRoute with role checks.
 */
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import authService from './services/auth'

import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'

// Public
import Login from './pages/Login'
import UnauthorizedPage from './pages/UnauthorizedPage'

// Admin
import AdminDashboard       from './pages/admin/AdminDashboard'
import UsersPage            from './pages/admin/UsersPage'
import StudentsPage         from './pages/admin/StudentsPage'
import AssignmentsPage      from './pages/admin/AssignmentsPage'
import CoursesPage          from './pages/admin/CoursesPage'
import UploadsPage          from './pages/admin/UploadsPage'

// Faculty
import FacultyDashboard         from './pages/faculty/FacultyDashboard'
import FacultyStudentsPage      from './pages/faculty/FacultyStudentsPage'
import StudentDetailPage        from './pages/faculty/StudentDetailPage'
import StudentAcademicPage      from './pages/faculty/StudentAcademicPage'
import FacultyInterventionsPage from './pages/faculty/FacultyInterventionsPage'

// Mentor
import MentorDashboard          from './pages/mentor/MentorDashboard'
import AtRiskPage               from './pages/mentor/AtRiskPage'
import MentorStudentDetailPage  from './pages/mentor/MentorStudentDetailPage'
import MentorInterventionsPage  from './pages/mentor/MentorInterventionsPage'

// Student
import StudentDashboard     from './pages/student/StudentDashboard'
import StudentRiskPage      from './pages/student/StudentRiskPage'
import StudentCreditsPage   from './pages/student/StudentCreditsPage'
import StudentActionsPage   from './pages/student/StudentActionsPage'
import StudentProgressPage  from './pages/student/StudentProgressPage'

function RootRedirect() {
  if (!authService.isAuthenticated()) return <Navigate to="/login" replace />
  const role = authService.getRole()
  const map = { admin: '/admin', faculty: '/faculty', mentor: '/mentor', student: '/student' }
  return <Navigate to={map[role] || '/login'} replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* ── Public ──────────────────────────────────────────────── */}
        <Route path="/login"        element={<Login />} />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />
        <Route index element={<RootRedirect />} />

        {/* ── Protected shell ──────────────────────────────────────── */}
        <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>

          {/* Admin */}
          <Route path="/admin"       element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
          <Route path="/users"       element={<ProtectedRoute allowedRoles={['admin']}><UsersPage /></ProtectedRoute>} />
          <Route path="/assignments" element={<ProtectedRoute allowedRoles={['admin']}><AssignmentsPage /></ProtectedRoute>} />
          <Route path="/courses"     element={<ProtectedRoute allowedRoles={['admin', 'faculty', 'mentor']}><CoursesPage /></ProtectedRoute>} />
          <Route path="/uploads"     element={<ProtectedRoute allowedRoles={['admin', 'faculty']}><UploadsPage /></ProtectedRoute>} />

          {/* Admin students list (admin-specific view) */}
          <Route path="/admin/students" element={<ProtectedRoute allowedRoles={['admin']}><StudentsPage /></ProtectedRoute>} />

          {/* Faculty */}
          <Route path="/faculty"          element={<ProtectedRoute allowedRoles={['faculty']}><FacultyDashboard /></ProtectedRoute>} />
          <Route path="/students"         element={<ProtectedRoute allowedRoles={['admin', 'faculty', 'mentor']}><FacultyStudentsPage /></ProtectedRoute>} />
          <Route path="/students/:id"     element={<ProtectedRoute allowedRoles={['admin', 'faculty', 'mentor']}><StudentDetailPage /></ProtectedRoute>} />
          <Route path="/students/:id/academic" element={<ProtectedRoute allowedRoles={['admin', 'faculty']}><StudentAcademicPage /></ProtectedRoute>} />
          <Route path="/interventions"    element={<ProtectedRoute allowedRoles={['admin', 'faculty', 'mentor']}><FacultyInterventionsPage /></ProtectedRoute>} />

          {/* Mentor */}
          <Route path="/mentor"               element={<ProtectedRoute allowedRoles={['mentor']}><MentorDashboard /></ProtectedRoute>} />
          <Route path="/at-risk"              element={<ProtectedRoute allowedRoles={['mentor']}><AtRiskPage /></ProtectedRoute>} />
          <Route path="/mentor/students/:id"  element={<ProtectedRoute allowedRoles={['mentor']}><MentorStudentDetailPage /></ProtectedRoute>} />
          <Route path="/mentor/interventions" element={<ProtectedRoute allowedRoles={['mentor']}><MentorInterventionsPage /></ProtectedRoute>} />

          {/* Student */}
          <Route path="/student"          element={<ProtectedRoute allowedRoles={['student']}><StudentDashboard /></ProtectedRoute>} />
          <Route path="/student/risk"     element={<ProtectedRoute allowedRoles={['student']}><StudentRiskPage /></ProtectedRoute>} />
          <Route path="/student/credits"  element={<ProtectedRoute allowedRoles={['student']}><StudentCreditsPage /></ProtectedRoute>} />
          <Route path="/student/actions"  element={<ProtectedRoute allowedRoles={['student']}><StudentActionsPage /></ProtectedRoute>} />
          <Route path="/student/progress" element={<ProtectedRoute allowedRoles={['student']}><StudentProgressPage /></ProtectedRoute>} />

        </Route>

        {/* ── Fallback ─────────────────────────────────────────────── */}
        <Route path="*" element={<Navigate to="/" replace />} />

      </Routes>
    </BrowserRouter>
  )
}
