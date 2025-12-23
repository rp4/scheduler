'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

interface Skill {
  id: string
  name: string
}

export function useSkills() {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['skills'],
    queryFn: async (): Promise<Skill[]> => {
      const res = await fetch('/api/skills')
      if (!res.ok) throw new Error('Failed to fetch skills')
      return res.json()
    },
  })

  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch('/api/skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      if (!res.ok) throw new Error('Failed to create skill')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skills'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch(`/api/skills?name=${encodeURIComponent(name)}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to delete skill')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skills'] })
    },
  })

  return {
    data: query.data,
    isLoading: query.isLoading,
    error: query.error,
    create: createMutation.mutate,
    remove: deleteMutation.mutate,
  }
}
