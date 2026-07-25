export interface AuthEmployee {
  id: number
  name: string
  email: string
  role: string
}

export interface LoginResponse {
  token: string
  employee: AuthEmployee
}
