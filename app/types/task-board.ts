import type { ApiTaskAssignee, ApiTaskTaskable, TaskPriority, TaskStatus, TaskType } from '~/types/task'

export interface TaskCard {
  id: number
  title: string
  priority: TaskPriority
  status: TaskStatus
  type: TaskType | null
  due_date: string | null
  updated_at: string
  assignee?: ApiTaskAssignee | null
  taskable?: ApiTaskTaskable | null
}

export interface TaskBoardColumn {
  status: TaskStatus
  total: number
  cards: Array<TaskCard>
  next_cursor: string | null
  has_more: boolean
}

export interface TaskBoard {
  columns: Array<TaskBoardColumn>
}
