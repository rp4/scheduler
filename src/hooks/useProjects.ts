'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

interface Project {
  id: string
  name: string
  budgetHours: number
  startWeek: number
  locked: boolean
  teamId: string | null
  team: { id: string; name: string } | null
  requiredSkills: string
  phasesConfig: string | null
  overrides: string | null
  configurationId: string | null
}

interface CreateProjectInput {
  name: string
  budgetHours: number
  startWeek?: number
  teamId?: string
  configurationId?: string
  requiredSkills?: string[]
  phasesConfig?: any[]
}

interface UpdateProjectInput {
  name?: string
  budgetHours?: number
  startWeek?: number
  locked?: boolean
  teamId?: string
  requiredSkills?: string[]
  phasesConfig?: any[]
  overrides?: any
}

export function useProjects(configId?: string) {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['projects', configId],
    queryFn: async (): Promise<Project[]> => {
      const url = configId ? `/api/projects?configId=${configId}` : '/api/projects'
      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed to fetch projects')
      return res.json()
    },
  })

  const createMutation = useMutation({
    mutationFn: async (data: CreateProjectInput) => {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to create project')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateProjectInput }) => {
      const res = await fetch(`/api/projects/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to update project')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/projects/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete project')
      return res.json()
    },
    onSuccess: () => {
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
