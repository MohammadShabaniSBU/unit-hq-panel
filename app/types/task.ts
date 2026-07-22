export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'

export type TaskStatus = 'open' | 'in_progress' | 'done' | 'cancelled'

export type TaskType = 'call' | 'email' | 'follow_up' | 'unit_tour' | 'other'

export type TaskStatusFilter = TaskStatus | 'all'

export interface ApiTaskAssignee {
  id: number
  name: string
}

export interface ApiTaskTaskable {
  type: string
  id: number
  label: string
}

export interface ApiTask {
  id: number
  title: string
  description: string | null
  priority: TaskPriority
  status: TaskStatus
  type: TaskType | null
  due_date: string | null
  remind_at: string | null
  assigned_to?: number | null
  completed_at?: string | null
  created_at: string
  updated_at?: string
  assignee?: ApiTaskAssignee | null
  taskable?: ApiTaskTaskable | null
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

export function taskStatusColor(status: TaskStatus) {
  if (status === 'done') {
    return 'success'
  }

  if (status === 'cancelled') {
    return 'error'
  }

  if (status === 'in_progress') {
    return 'warning'
  }

  return 'neutral'
}

export function taskPriorityColor(priority: TaskPriority) {
  if (priority === 'urgent' || priority === 'high') {
    return 'error'
  }

  if (priority === 'medium') {
    return 'warning'
  }

  return 'neutral'
}

export function taskablePath(taskable: ApiTaskTaskable | null | undefined): string | null {
  if (!taskable) {
    return null
  }

  if (taskable.type === 'contact') {
    return `/leasing/contacts/${taskable.id}`
  }

  if (taskable.type === 'deal') {
    return `/leasing/deals/${taskable.id}`
  }

  return null
}
