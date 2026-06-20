export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'

export type TaskStatus = 'open' | 'in_progress' | 'done' | 'cancelled'

export type TaskType = 'call' | 'email' | 'follow_up' | 'unit_tour' | 'other'

export interface ApiTask {
  id: number
  title: string
  description: string | null
  priority: TaskPriority
  status: TaskStatus
  type: TaskType | null
  due_date: string | null
  remind_at: string | null
  created_at: string
}

export const TASK_PRIORITIES: Array<TaskPriority> = [
  'low',
  'medium',
  'high',
  'urgent'
]

export const TASK_STATUSES: Array<TaskStatus> = [
  'open',
  'in_progress',
  'done',
  'cancelled'
]

export const TASK_TYPES: Array<TaskType> = [
  'call',
  'email',
  'follow_up',
  'unit_tour',
  'other'
]
