'use client'

import { useMemo } from 'react'
import { useProjects } from './useProjects'
import { useMembers } from './useMembers'
import { useConfiguration } from './useConfiguration'
import { useSkills } from './useSkills'
import { useTeams } from './useTeams'
import type { GlobalConfig, ProjectInput, StaffType, PhaseConfig, PhaseName } from '@/types/schedule'

interface UseScheduleDataOptions {
  userId?: string
  configId?: string
  year?: number
}

const DEFAULT_PHASES: PhaseConfig[] = [
  { name: 'Pre-Planning' as PhaseName, percentBudget: 10, minWeeks: 1, maxWeeks: 2, staffAllocation: [] },
  { name: 'Planning' as PhaseName, percentBudget: 25, minWeeks: 2, maxWeeks: 4, staffAllocation: [] },
  { name: 'Fieldwork' as PhaseName, percentBudget: 50, minWeeks: 4, maxWeeks: 8, staffAllocation: [] },
  { name: 'Reporting' as PhaseName, percentBudget: 15, minWeeks: 2, maxWeeks: 3, staffAllocation: [] },
]

export function useScheduleData(options: UseScheduleDataOptions = {}) {
  const { userId, configId, year = 2026 } = options

  const { data: dbProjects, isLoading: projectsLoading, ...projectOps } = useProjects(configId)
  const { data: dbMembers, isLoading: membersLoading, ...memberOps } = useMembers({ includeTemplates: true })
  const { data: dbConfig, isLoading: configLoading, ...configOps } = useConfiguration(userId, year)
  const { data: dbSkills, isLoading: skillsLoading, ...skillOps } = useSkills()
  const { data: dbTeams, isLoading: teamsLoading } = useTeams()

  const isLoading = projectsLoading || membersLoading || configLoading || skillsLoading || teamsLoading

  // Transform database models to existing types for scheduleEngine
  const projects: ProjectInput[] = useMemo(() => {
    if (!dbProjects) return []
    return dbProjects.map((p) => ({
      id: p.id,
      name: p.name,
      budgetHours: p.budgetHours,
      startWeekOffset: p.startWeek,
      locked: p.locked,
      phasesConfig: p.phasesConfig ? JSON.parse(p.phasesConfig) : [],
      overrides: p.overrides ? JSON.parse(p.overrides) : undefined,
      team: p.team?.name,
      requiredSkills: p.requiredSkills ? JSON.parse(p.requiredSkills) : [],
    }))
  }, [dbProjects])

  const staffTypes: StaffType[] = useMemo(() => {
    if (!dbMembers) return []
    return dbMembers.map((m) => ({
      id: m.id,
      name: m.name,
      role: m.role?.name || '',
      maxHoursPerWeek: m.maxHours,
      color: m.color,
      team: m.team?.name,
      skills: m.skills ? JSON.parse(m.skills) : {},
    }))
  }, [dbMembers])

  const phases: PhaseConfig[] = useMemo(() => {
    if (!dbConfig?.phases) return DEFAULT_PHASES
    try {
      return JSON.parse(dbConfig.phases)
    } catch {
      return DEFAULT_PHASES
    }
  }, [dbConfig])

  const skills: string[] = useMemo(() => {
    if (!dbSkills) return []
    return dbSkills.map((s) => s.name)
  }, [dbSkills])

  const teams: string[] = useMemo(() => {
    if (!dbTeams) return []
    return dbTeams.map((t) => t.name)
  }, [dbTeams])

  const config: GlobalConfig = useMemo(() => ({
    year,
    phases,
    staffTypes,
    skills,
  }), [year, phases, staffTypes, skills])

  return {
    projects,
    config,
    teams,
    isLoading,
    configId: dbConfig?.id,
    // Pass through operations for mutations
    projectOps,
    memberOps,
    configOps,
    skillOps,
    // Raw DB data for reference
    dbProjects,
    dbMembers,
    dbTeams,
  }
}
