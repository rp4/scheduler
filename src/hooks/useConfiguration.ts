'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

interface Configuration {
  id: string
  userId: string
  year: number
  phases: string
}

export function useConfiguration(userId?: string, year?: number) {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['configuration', userId, year],
    queryFn: async (): Promise<Configuration | null> => {
      const params = new URLSearchParams()
      if (userId) params.set('userId', userId)
      if (year) params.set('year', year.toString())

      const res = await fetch(`/api/configurations?${params}`)
      if (!res.ok) throw new Error('Failed to fetch configuration')
      const configs = await res.json()
      return configs[0] || null
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, phases }: { id: string; phases: string }) => {
      const res = await fetch(`/api/configurations/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phases }),
      })
      if (!res.ok) throw new Error('Failed to update configuration')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['configuration'] })
    },
  })

  return {
    data: query.data,
    isLoading: query.isLoading,
    error: query.error,
    update: updateMutation.mutate,
  }
}
