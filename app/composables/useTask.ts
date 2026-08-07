import type { ApiTask, TaskPriority, TaskStatus, TaskType } from '~/types/task'

export interface TaskUpdatePayload {
  title?: string
  description?: string | null
  priority?: TaskPriority
  type?: TaskType | null
  due_at?: string | null
  status?: TaskStatus
}

export function useTask() {
  const { get, patch } = useApi()

  async function fetchTask(id: number): Promise<ApiTask> {
    const response = await get<ApiTask>(`/api/tasks/${id}`)
    return response.data
  }

  async function updateTask(id: number, payload: TaskUpdatePayload): Promise<ApiTask> {
    const response = await patch<ApiTask>(
      `/api/tasks/${id}`,
      payload as Record<string, unknown>
    )
    return response.data
  }

  return {
    fetchTask,
    updateTask
  }
}
