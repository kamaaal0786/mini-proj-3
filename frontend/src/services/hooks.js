/**
 * Shared API hooks for Phase 2 data fetching.
 * NOTE: All paths are relative to the Axios baseURL ('/api').
 * Do NOT include '/api' in the path — it is already the base.
 */
import { useState, useEffect, useCallback } from 'react'
import api from './api'

/** Generic hook: fetches data from a URL on mount. */
export function useFetch(path) {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  const fetch_ = useCallback(async () => {
    if (!path) return
    setLoading(true)
    setError(null)
    try {
      const res = await api.get(path)
      setData(res.data)
    } catch (e) {
      setError(e.response?.data?.detail || e.message)
    } finally {
      setLoading(false)
    }
  }, [path])

  useEffect(() => { fetch_() }, [fetch_])

  return { data, loading, error, refetch: fetch_ }
}

/** Dashboard summary KPIs */
export function useDashboard() {
  return useFetch('/dashboard/summary')
}

/** Student list (role-filtered by backend) */
export function useStudents() {
  return useFetch('/students')
}

/** Single student */
export function useStudent(id) {
  return useFetch(id ? `/students/${id}` : null)
}

/** Current risk for a student */
export function useCurrentRisk(studentId) {
  return useFetch(studentId ? `/risk/${studentId}/current` : null)
}

/** Risk history (for sparkline) */
export function useRiskHistory(studentId) {
  return useFetch(studentId ? `/risk/${studentId}/history` : null)
}

/** SHAP explanation */
export function useExplanation(studentId) {
  return useFetch(studentId ? `/risk/${studentId}/explanation` : null)
}

/** Credit status */
export function useCredits(studentId) {
  return useFetch(studentId ? `/credits/${studentId}` : null)
}

/** Interventions (role-filtered) */
export function useInterventions(studentId) {
  const path = studentId ? `/interventions?student_id=${studentId}` : '/interventions'
  return useFetch(path)
}

/** Courses (all roles) */
export function useCourses() {
  return useFetch('/courses')
}
