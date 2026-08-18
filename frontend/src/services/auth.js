/**
 * Auth service — login, logout, token/user helpers.
 * JWT stored in localStorage (appropriate for demo/academic project).
 */
import api from './api'

export const authService = {
  /**
   * Login with email + password.
   * FastAPI's OAuth2PasswordRequestForm expects form-encoded data.
   */
  async login(email, password) {
    const formData = new URLSearchParams()
    formData.append('username', email)   // OAuth2 spec uses "username"
    formData.append('password', password)

    const response = await api.post('/auth/login', formData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })

    const { access_token, role, user_id, name, student_id } = response.data
    localStorage.setItem('access_token', access_token)
    localStorage.setItem('user', JSON.stringify({ role, user_id, name, email, student_id }))

    return response.data
  },

  logout() {
    localStorage.removeItem('access_token')
    localStorage.removeItem('user')
  },

  getToken() {
    return localStorage.getItem('access_token')
  },

  getUser() {
    try {
      return JSON.parse(localStorage.getItem('user'))
    } catch {
      return null
    }
  },

  isAuthenticated() {
    return !!this.getToken()
  },

  getRole() {
    return this.getUser()?.role || null
  },

  async fetchMe() {
    const response = await api.get('/auth/me')
    return response.data
  },
}

export default authService
