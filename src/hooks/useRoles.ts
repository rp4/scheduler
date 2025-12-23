'use client'

import { useQuery } from '@tanstack/react-query'

interface Role {
  id: string
  name: string
}

export function useRoles() {
  const query = useQuery({
    queryKey: ['roles'],
    queryFn: async (): Promise<Role[]> => {
      const res = await fetch('/api/roles')
      if (!res.ok) throw new Error('Failed to fetch roles')
      return res.json()
    },
  })

  return {
    data: query.data,
    isLoading: query.isLoading,
    error: query.error,
  }
}
