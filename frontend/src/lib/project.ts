import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api'
import type {
  ProjectsResponse,
  Member,
  Task,
  TaskDetail,
  ProjectLabel,
  ProjectDetail,
} from '@/types'

// ── Project collection ────────────────────────────────────────────────

export function useProjects(workspaceId: number, filters?: {
  status?: string
  sort?: string
  direction?: string
  page?: number
}) {
  const queryKey = makeQueryKey(['/workspaces', workspaceId, 'projects'], filters)
  return useQuery<ProjectsResponse>({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(filters?.page ?? 1) })
      if (filters?.status) params.set('status', filters.status)
      if (filters?.sort) params.set('sort', filters.sort)
      if (filters?.direction) params.set('direction', filters.direction)
      const res = await api.get(`/workspaces/${workspaceId}/projects?${params.toString()}`)
      return res.data
    },
  })
}

// ── Project detail ────────────────────────────────────────────────────

export function useProjectDetail(projectId: number, workspaceId: number) {
  const queryKey = makeQueryKey(['/projects', projectId, 'detail', workspaceId])
  return useQuery<ProjectDetail>({
    queryKey,
    queryFn: async () => {
      const res = await api.get(`/projects/${projectId}`)
      return res.data
    },
    enabled: !!projectId && !!workspaceId,
  })
}

export function useProjectMembers(workspaceId: number) {
  const queryKey = makeQueryKey(['/workspaces', workspaceId, 'members'])
  return useQuery<Member[]>({
    queryKey,
    queryFn: async () => {
      const res = await api.get(`/workspaces/${workspaceId}/members`)
      return res.data.data
    },
    enabled: !!workspaceId,
  })
}

export function useProjectLabels(workspaceId: number) {
  const queryKey = makeQueryKey(['/workspaces', workspaceId, 'labels'])
  return useQuery<ProjectLabel[]>({
    queryKey,
    queryFn: async () => {
      const res = await api.get(`/workspaces/${workspaceId}/labels`)
      return res.data.data
    },
    enabled: !!workspaceId,
  })
}

// ── Project analytics ─────────────────────────────────────────────────

export function useProjectAnalytics(projectId: number) {
  const queryKey = makeQueryKey(['/projects', projectId, 'analytics'])
  return useQuery({
    queryKey,
    queryFn: async () => {
      const res = await api.get(`/projects/${projectId}/analytics`)
      return res.data.data
    },
    enabled: !!projectId,
  })
}

// ── Task collection ───────────────────────────────────────────────────

export function useTasks(projectId: number, filters?: {
  status?: string
  priority?: string
  assignee_id?: number
  page?: number
}) {
  const queryKey = makeQueryKey(['/projects', projectId, 'tasks'], filters)
  return useQuery<{ data: Task[]; current_page: number; last_page: number; total: number }>({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(filters?.page ?? 1) })
      if (filters?.status) params.set('status', filters.status)
      if (filters?.priority) params.set('priority', filters.priority)
      if (filters?.assignee_id) params.set('assignee_id', String(filters.assignee_id))
      const res = await api.get(`/projects/${projectId}/tasks?${params.toString()}`)
      return res.data
    },
  })
}

// ── Task detail ───────────────────────────────────────────────────────

export function useTaskDetail(taskId: number, projectId: number) {
  const queryKey = makeQueryKey(['/tasks', taskId, 'detail', projectId])
  return useQuery<TaskDetail>({
    queryKey,
    queryFn: async () => {
      const res = await api.get(`/tasks/${taskId}`)
      return res.data
    },
    enabled: !!taskId,
  })
}

// ── Dependency mutation ───────────────────────────────────────────────

export function useDependencies(taskId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (dependencyIds: number[]) => {
      const res = await api.put(`/tasks/${taskId}/dependencies`, { dependency_ids: dependencyIds })
      return res.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: makeQueryKey(['/tasks', taskId, 'detail']) })
      qc.invalidateQueries({ queryKey: makeQueryKey(['/projects', taskId, 'tasks']) })
    },
  })
}

// ── Comment mutation ──────────────────────────────────────────────────

export function useAddComment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ taskId, body }: { taskId: number; body: string }) => {
      const res = await api.post(`/tasks/${taskId}/comments`, { body })
      return res.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: makeQueryKey(['comments']) })
    },
  })
}

// ── Attachment mutation ───────────────────────────────────────────────

export function useAddAttachment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ taskId, file }: { taskId: number; file: File }) => {
      const formData = new FormData()
      formData.append('attachment', file)
      const res = await api.post(`/tasks/${taskId}/attachments`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      return res.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: makeQueryKey(['attachments']) })
    },
  })
}

// ── Helpers ───────────────────────────────────────────────────────────

function makeQueryKey(...keys: unknown[]): unknown[] {
  return keys
}
