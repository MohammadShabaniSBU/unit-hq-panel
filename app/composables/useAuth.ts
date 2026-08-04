export function useAuth() {
  const store = useAuthStore()

  return {
    token: computed(() => store.token),
    employee: computed(() => store.employee),
    isAuthenticated: computed(() => store.isAuthenticated),
    initialised: computed(() => store.initialised),
    login: store.login,
    logout: store.logout,
    fetchUser: store.fetchUser,
    clearSession: store.clearSession,
    setSession: store.setSession,
    setEmployee: store.setEmployee
  }
}
