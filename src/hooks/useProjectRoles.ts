'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

interface ProjectRole {
  id: string
  projectId: string
  roleId: string
  memberId: string | null
  role: { id: string; name: string }
  member: { id: string; name: string } | null
}

interface CreateProjectRoleInput {
  projectId: string
  roleId: string
  memberId?: string | null
}

interface UpdateProjectRoleInput {
  roleId?: string
  memberId?: string | null
}

export function useProjectRoles(projectId?: string) {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['projectRoles', projectId],
    queryFn: async (): Promise<ProjectRole[]> => {
      const url = projectId
        ? `/api/project-roles?projectId=${projectId}`
        : '/api/project-roles'
      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed to fetch project roles')
      return res.json()
    },
  })

  const createMutation = useMutation({
    mutationFn: async (data: CreateProjectRoleInput) => {
      const res = await fetch('/api/project-roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to create project role')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectRoles'] })
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateProjectRoleInput }) => {
      const res = await fetch(`/api/project-roles/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to update project role')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectRoles'] })
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/project-roles/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete project role')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectRoles'] })
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
  })

  return {
    data: query.data,
    isLoading: query.isLoading,
    error: query.error,
    create: createMutation.mutate,
    update: updateMutation.mutate,
    remove: deleteMutation.mutate,
  }
}
