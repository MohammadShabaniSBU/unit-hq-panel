import { defineStore } from 'pinia'
import type { AuthEmployee, LoginResponse } from '~/types/auth'
import { clearAllClientState } from '~/utils/clearAllClientState'

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
  const initialised = ref(false)
  const resolvingSession = ref(false)

  let readyResolve: (() => void) | null = null
  const readyPromise = new Promise<void>((resolve) => {
    readyResolve = resolve
  })

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

  function markInitialised() {
    if (initialised.value) {
      return
    }

    initialised.value = true
    readyResolve?.()
  }

  async function waitUntilInitialised() {
    if (initialised.value) {
      return
    }

    await readyPromise
  }

  function beginSessionResolve() {
    resolvingSession.value = true
  }

  function endSessionResolve() {
    resolvingSession.value = false
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

    try {
      const { get } = useApi()
      const response = await get<AuthEmployee>('/api/user')
      setEmployee(response.data)
      return response.data
    } catch {
      clearSession()
      return null
    }
  }

  async function logout() {
    const { post } = useApi()

    try {
      if (token.value) {
        await post('/api/logout', {})
      }
    } finally {
      clearAllClientState()
    }
  }

  return {
    token,
    employee,
    initialised,
    resolvingSession,
    isAuthenticated,
    setSession,
    setEmployee,
    clearSession,
    markInitialised,
    waitUntilInitialised,
    beginSessionResolve,
    endSessionResolve,
    login,
    fetchUser,
    logout
  }
})
