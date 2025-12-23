'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

interface Team {
  id: string
  name: string
}

export function useTeams() {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['teams'],
    queryFn: async (): Promise<Team[]> => {
      const res = await fetch('/api/teams')
      if (!res.ok) throw new Error('Failed to fetch teams')
      return res.json()
    },
  })

  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      if (!res.ok) throw new Error('Failed to create team')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] })
    },
  })

  return {
    data: query.data,
    isLoading: query.isLoading,
    error: query.error,
    create: createMutation.mutate,
  }
}
