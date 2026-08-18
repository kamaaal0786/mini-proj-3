/**
 * ProtectedRoute — wraps a route with auth + optional role check.
 * Unauthenticated users → /login
 * Wrong role → /unauthorized
 */
import { Navigate } from 'react-router-dom'
import authService from '../services/auth'

export default function ProtectedRoute({ children, allowedRoles }) {
  if (!authService.isAuthenticated()) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const role = authService.getRole()
    if (!allowedRoles.includes(role)) {
      return <Navigate to="/unauthorized" replace />
    }
  }

  return children
}
