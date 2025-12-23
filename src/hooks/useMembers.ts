'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

interface Member {
  id: string
  name: string
  roleId: string | null
  role: { id: string; name: string } | null
  teamId: string | null
  team: { id: string; name: string } | null
  maxHours: number
  color: string
  skills: string
  isTemplate: boolean
}

interface CreateMemberInput {
  name: string
  roleId?: string
  teamId?: string
  maxHours?: number
  color?: string
  skills?: Record<string, string>
  isTemplate?: boolean
}

export function useMembers(options?: { includeTemplates?: boolean }) {
  const queryClient = useQueryClient()
  const includeTemplates = options?.includeTemplates ?? true

  const query = useQuery({
    queryKey: ['members', includeTemplates],
    queryFn: async (): Promise<Member[]> => {
      const res = await fetch(`/api/members?includeTemplates=${includeTemplates}`)
      if (!res.ok) throw new Error('Failed to fetch members')
      return res.json()
    },
  })

  const createMutation = useMutation({
    mutationFn: async (data: CreateMemberInput) => {
      const res = await fetch('/api/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to create member')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] })
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CreateMemberInput> }) => {
      const res = await fetch(`/api/members/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to update member')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/members/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete member')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] })
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
