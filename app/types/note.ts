export interface ApiNote {
  id: number
  content: string
  created_at: string
  employee?: {
    id: number
    name: string
  } | null
}
