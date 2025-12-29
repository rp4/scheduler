'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

interface Role {
  id: string
  name: string
}

export function useRoles() {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['roles'],
    queryFn: async (): Promise<Role[]> => {
      const res = await fetch('/api/roles')
      if (!res.ok) throw new Error('Failed to fetch roles')
      return res.json()
    },
  })

  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch('/api/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      if (!res.ok) throw new Error('Failed to create role')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] })
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const res = await fetch(`/api/roles/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      if (!res.ok) throw new Error('Failed to update role')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/roles/${id}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to delete role')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] })
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
