export function useAuth() {
  const store = useAuthStore()

  return {
    token: computed(() => store.token),
    employee: computed(() => store.employee),
    isAuthenticated: computed(() => store.isAuthenticated),
    login: store.login,
    logout: store.logout,
    clearSession: store.clearSession
  }
}
