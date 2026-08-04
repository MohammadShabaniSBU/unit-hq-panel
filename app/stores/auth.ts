import { defineStore } from 'pinia'
import type { AuthEmployee, LoginResponse } from '~/types/auth'

const TOKEN_KEY = 'unit-hq.auth.token'
const EMPLOYEE_KEY = 'unit-hq.auth.employee'

function readStoredToken(): string | null {
  if (!import.meta.client) {
    return null
  }

  return localStorage.getItem(TOKEN_KEY)
}

function readStoredEmployee(): AuthEmployee | null {
  if (!import.meta.client) {
    return null
  }

  const raw = localStorage.getItem(EMPLOYEE_KEY)
  if (!raw) {
    return null
  }

  try {
    return JSON.parse(raw) as AuthEmployee
  } catch {
    return null
  }
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(readStoredToken())
  const employee = ref<AuthEmployee | null>(readStoredEmployee())

  const isAuthenticated = computed(() => Boolean(token.value))

  function setSession(nextToken: string, nextEmployee: AuthEmployee) {
    token.value = nextToken
    employee.value = nextEmployee

    if (import.meta.client) {
      localStorage.setItem(TOKEN_KEY, nextToken)
      localStorage.setItem(EMPLOYEE_KEY, JSON.stringify(nextEmployee))
    }
  }

  function setEmployee(nextEmployee: AuthEmployee) {
    employee.value = nextEmployee

    if (import.meta.client) {
      localStorage.setItem(EMPLOYEE_KEY, JSON.stringify(nextEmployee))
    }
  }

  function clearSession() {
    token.value = null
    employee.value = null

    if (import.meta.client) {
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(EMPLOYEE_KEY)
    }
  }

  async function login(email: string, password: string) {
    const { post } = useApi()
    const response = await post<LoginResponse>('/api/login', { email, password })
    setSession(response.data.token, response.data.employee)
    return response.data
  }

  async function fetchUser() {
    if (!token.value) {
      return null
    }

    const { get } = useApi()
    const response = await get<AuthEmployee>('/api/user')
    setEmployee(response.data)
    return response.data
  }

  async function logout() {
    const { post } = useApi()

    try {
      if (token.value) {
        await post('/api/logout', {})
      }
    } finally {
      clearSession()
    }
  }

  return {
    token,
    employee,
    isAuthenticated,
    setSession,
    setEmployee,
    clearSession,
    login,
    fetchUser,
    logout
  }
})
