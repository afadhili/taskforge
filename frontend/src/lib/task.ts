import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api'
import type { TaskDetail } from '@/types'

// ── Task detail ───────────────────────────────────────────────────────

export function useTaskDetail(taskId: number) {
  const queryKey = makeQueryKey(['/tasks', taskId])
  return useQuery<TaskDetail>({
    queryKey,
    queryFn: async () => {
      const res = await api.get(`/tasks/${taskId}`)
      return res.data
    },
    enabled: !!taskId,
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

// ── Helpers ───────────────────────────────────────────────────────────

function makeQueryKey(...keys: unknown[]): unknown[] {
  return keys
}
