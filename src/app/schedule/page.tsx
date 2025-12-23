'use client'

import React, { useState, useMemo, useCallback, useEffect } from 'react'
import { useScheduleData } from '@/hooks/useScheduleData'
import { generateSchedule, optimizeSchedule } from '@/services/scheduleEngine'
import { ScheduleTable, ViewMode } from '@/components/ScheduleTable'
import { ProjectList } from '@/components/ProjectList'
import { TeamMemberList } from '@/components/TeamMemberList'
import { SkillList } from '@/components/SkillList'
import { ConfigurationPanel } from '@/components/ConfigurationPanel'
import type { ProjectInput, StaffType, SkillLevel } from '@/types/schedule'
import { Calendar, Users, Award, LayoutGrid, Loader2, Filter } from 'lucide-react'
import { parseISO, startOfDay, endOfDay } from 'date-fns'

const CURRENT_YEAR = 2026

export default function SchedulePage() {
  const {
    projects: dbProjects,
    config,
    teams,
    isLoading,
    configId,
    projectOps,
    memberOps,
    skillOps,
    configOps,
    dbTeams,
  } = useScheduleData({ year: CURRENT_YEAR })

  // Local state for projects (allows editing before auto-save)
  const [localProjects, setLocalProjects] = useState<ProjectInput[]>([])
  const [viewMode, setViewMode] = useState<ViewMode>('project')
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [isConfigOpen, setIsConfigOpen] = useState(false)

  // Filter state
  const [fromDate, setFromDate] = useState(`${CURRENT_YEAR}-01-01`)
  const [toDate, setToDate] = useState(`${CURRENT_YEAR}-12-31`)
  const [selectedTeam, setSelectedTeam] = useState('All Teams')

  // Sync local projects with database projects
  useEffect(() => {
    if (dbProjects.length > 0 && localProjects.length === 0) {
      setLocalProjects(dbProjects)
    }
  }, [dbProjects, localProjects.length])

  // Filter projects by team for display in sidebar (project and skill views)
  const projectsDisplay = useMemo(() => {
    if (selectedTeam === 'All Teams') return localProjects
    return localProjects.filter(p => p.team === selectedTeam)
  }, [localProjects, selectedTeam])

  // Filter config for member view - only show members from selected team
  const filteredConfig = useMemo(() => {
    if (selectedTeam === 'All Teams' || viewMode !== 'member') return config
    return {
      ...config,
      staffTypes: config.staffTypes.filter(s => s.team === selectedTeam)
    }
  }, [config, selectedTeam, viewMode])

  // Generate schedule data using memo with filters applied
  const scheduleData = useMemo(() => {
    if (localProjects.length === 0 || config.staffTypes.length === 0) {
      return { headers: [], rows: [] }
    }

    // For member view, we generate schedule from all projects but filter rows by member's team
    // For project/skill view, we filter projects by team before generating
    let projectsToProcess = localProjects
    if (selectedTeam !== 'All Teams' && viewMode !== 'member') {
      projectsToProcess = localProjects.filter(p => p.team === selectedTeam)
    }

    const fullData = generateSchedule(projectsToProcess, config)

    // Filter rows by member's team for member view
    let processedRows = fullData.rows
    if (selectedTeam !== 'All Teams' && viewMode === 'member') {
      const teamMemberIds = config.staffTypes
        .filter(s => s.team === selectedTeam)
        .map(s => s.id)
      processedRows = processedRows.filter(r => teamMemberIds.includes(r.staffTypeId))
    }

    // Apply date range filter
    if (!fromDate || !toDate) {
      return { headers: fullData.headers, rows: processedRows }
    }

    try {
      const start = startOfDay(parseISO(fromDate))
      const end = endOfDay(parseISO(toDate))

      const validIndices: number[] = []
      const filteredHeaders = fullData.headers.filter((h, i) => {
        const date = parseISO(h)
        const isValid = date >= start && date <= end
        if (isValid) validIndices.push(i)
        return isValid
      })

      if (validIndices.length === fullData.headers.length) {
        return { headers: filteredHeaders, rows: processedRows }
      }

      const filteredRows = processedRows.map(row => ({
        ...row,
        cells: row.cells.filter((_, i) => validIndices.includes(i))
      }))

      return { headers: filteredHeaders, rows: filteredRows }
    } catch (e) {
      console.error('Error filtering dates', e)
      return { headers: fullData.headers, rows: processedRows }
    }
  }, [localProjects, config, fromDate, toDate, selectedTeam, viewMode])

  // Handle project updates
  const handleSetProjects = useCallback((newProjects: ProjectInput[]) => {
    setLocalProjects(newProjects)

    // Debounced save to database
    newProjects.forEach(project => {
      const originalProject = dbProjects.find(p => p.id === project.id)
      if (originalProject) {
        // Update existing project
        projectOps.update({
          id: project.id,
          data: {
            name: project.name,
            budgetHours: project.budgetHours,
            startWeek: project.startWeekOffset,
            locked: project.locked,
            phasesConfig: project.phasesConfig,
            overrides: project.overrides,
            requiredSkills: project.requiredSkills,
          }
        })
      } else {
        // Create new project
        const teamId = dbTeams?.find(t => t.name === project.team)?.id
        projectOps.create({
          name: project.name,
          budgetHours: project.budgetHours,
          startWeek: project.startWeekOffset,
          teamId,
          configurationId: configId,
          requiredSkills: project.requiredSkills,
          phasesConfig: project.phasesConfig,
        })
      }
    })
  }, [dbProjects, projectOps, dbTeams, configId])

  // Handle cell updates
  const handleCellUpdate = useCallback((
    projectId: string,
    staffTypeId: string,
    staffIndex: number,
    date: string,
    value: any,
    type: 'hours' | 'phase'
  ) => {
    setLocalProjects(prev => prev.map(project => {
      if (project.id !== projectId) return project

      const overrides = { ...project.overrides }

      if (type === 'phase') {
        if (!overrides.phase) overrides.phase = {}
        overrides.phase[date] = value
      } else {
        if (!overrides.staff) overrides.staff = {}
        const staffKey = `${staffTypeId}-${staffIndex}`
        if (!overrides.staff[staffKey]) overrides.staff[staffKey] = {}
        overrides.staff[staffKey][date] = value
      }

      return { ...project, overrides }
    }))
  }, [])

  // Handle assignment changes
  const handleAssignmentChange = useCallback((
    projectId: string,
    oldStaffTypeId: string,
    newStaffTypeId: string
  ) => {
    setLocalProjects(prev => prev.map(project => {
      if (project.id !== projectId) return project

      const phasesConfig = project.phasesConfig.map(phase => ({
        ...phase,
        staffAllocation: phase.staffAllocation.map(alloc =>
          alloc.staffTypeId === oldStaffTypeId
            ? { ...alloc, staffTypeId: newStaffTypeId }
            : alloc
        )
      }))

      return { ...project, phasesConfig }
    }))
  }, [])

  // Handle add assignment
  const handleAddAssignment = useCallback((projectId: string) => {
    setLocalProjects(prev => prev.map(project => {
      if (project.id !== projectId) return project

      // Find first unassigned staff member
      const assignedStaffIds = new Set<string>()
      project.phasesConfig.forEach(phase => {
        phase.staffAllocation.forEach(alloc => {
          assignedStaffIds.add(alloc.staffTypeId)
        })
      })

      const availableStaff = config.staffTypes.find(s =>
        !s.id.startsWith('tmpl-') &&
        s.id !== 'placeholder' &&
        !assignedStaffIds.has(s.id)
      )

      if (!availableStaff) return project

      const phasesConfig = project.phasesConfig.map(phase => ({
        ...phase,
        staffAllocation: [...phase.staffAllocation, { staffTypeId: availableStaff.id, percentage: 10 }]
      }))

      return { ...project, phasesConfig }
    }))
  }, [config.staffTypes])

  // Handle remove assignment
  const handleRemoveAssignment = useCallback((
    projectId: string,
    staffTypeId: string,
    staffIndex: number
  ) => {
    setLocalProjects(prev => prev.map(project => {
      if (project.id !== projectId) return project

      const phasesConfig = project.phasesConfig.map(phase => ({
        ...phase,
        staffAllocation: phase.staffAllocation.filter(alloc => alloc.staffTypeId !== staffTypeId)
      }))

      // Also remove overrides for this staff
      const overrides = { ...project.overrides }
      if (overrides.staff) {
        const staffKey = `${staffTypeId}-${staffIndex}`
        delete overrides.staff[staffKey]
      }

      return { ...project, phasesConfig, overrides }
    }))
  }, [])

  // Handle optimize
  const handleOptimize = useCallback(async () => {
    setIsOptimizing(true)

    // Run optimization (simulated async for UI feedback)
    setTimeout(() => {
      const { optimizedProjects, warnings } = optimizeSchedule(localProjects, config, selectedTeam)
      setLocalProjects(optimizedProjects)

      if (warnings.length > 0) {
        console.warn('Optimization warnings:', warnings)
        const uniqueWarnings = Array.from(new Set(warnings))
        const count = uniqueWarnings.length
        const msg = uniqueWarnings.slice(0, 5).join('\n')
        const remaining = count - 5
        alert(`Optimization Completed with Warnings:\n\n${msg}${remaining > 0 ? `\n...and ${remaining} more.` : ''}\n\nSome placeholders were not filled because all eligible team members are already assigned to these projects.`)
      }

      setIsOptimizing(false)
    }, 500)
  }, [localProjects, config, selectedTeam])

  // Handle config update
  const handleConfigUpdate = useCallback((phasesJson: string) => {
    if (configId) {
      configOps.update({ id: configId, phases: phasesJson })
    }
  }, [configId, configOps])

  // Handle add member
  const handleAddMember = useCallback((member: Partial<StaffType>) => {
    const teamId = dbTeams?.find(t => t.name === member.team)?.id
    memberOps.create({
      name: member.name || 'New Member',
      roleId: undefined, // Would need to lookup role ID
      teamId,
      maxHours: member.maxHoursPerWeek || 40,
      skills: member.skills,
    })
  }, [memberOps, dbTeams])

  // Handle update member
  const handleUpdateMember = useCallback((id: string, data: Partial<StaffType>) => {
    const teamId = dbTeams?.find(t => t.name === data.team)?.id
    memberOps.update({
      id,
      data: {
        name: data.name,
        teamId,
        maxHours: data.maxHoursPerWeek,
        skills: data.skills,
      }
    })
  }, [memberOps, dbTeams])

  // Handle remove member
  const handleRemoveMember = useCallback((id: string) => {
    memberOps.remove(id)
  }, [memberOps])

  // Handle add skill
  const handleAddSkill = useCallback((name: string) => {
    skillOps.create(name)
  }, [skillOps])

  // Handle remove skill
  const handleRemoveSkill = useCallback((name: string) => {
    skillOps.remove(name)
  }, [skillOps])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
          <p className="text-slate-600 font-medium">Loading schedule data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* Header */}
      <header className="bg-slate-900 text-white px-6 py-4 shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center font-bold text-white shadow-lg">
              AS
            </div>
            <h1 className="text-xl font-bold tracking-tight">
              AuditScheduler <span className="font-light text-indigo-300">Pro</span>
            </h1>
          </div>

          {/* View Mode Toggle */}
          <div className="flex bg-slate-800 p-1 rounded-lg border border-slate-700">
            <button
              onClick={() => setViewMode('project')}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                viewMode === 'project'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              By Project
            </button>
            <button
              onClick={() => setViewMode('member')}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                viewMode === 'member'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              By Member
            </button>
            <button
              onClick={() => setViewMode('skill')}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                viewMode === 'skill'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              By Skill
            </button>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-3">
            {/* Date Range Filter */}
            <div className="hidden md:flex items-center bg-slate-800 rounded-lg p-1 border border-slate-700">
              <div className="flex items-center gap-2 px-2 border-r border-slate-700">
                <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                <span className="text-xs text-slate-400 font-medium">From:</span>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="bg-transparent text-xs text-white focus:outline-none w-[110px] [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:opacity-50 [&::-webkit-calendar-picker-indicator]:hover:opacity-100 cursor-pointer"
                />
              </div>
              <div className="flex items-center gap-2 px-2">
                <span className="text-xs text-slate-400 font-medium">To:</span>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="bg-transparent text-xs text-white focus:outline-none w-[110px] [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:opacity-50 [&::-webkit-calendar-picker-indicator]:hover:opacity-100 cursor-pointer"
                />
              </div>
            </div>

            {/* Team Filter */}
            <div className="relative">
              <Filter className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                value={selectedTeam}
                onChange={(e) => setSelectedTeam(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 hover:border-slate-600 transition-all cursor-pointer appearance-none min-w-[120px]"
              >
                <option value="All Teams">All Teams</option>
                {teams.map(team => (
                  <option key={team} value={team}>{team}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex p-6 gap-6 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-80 shrink-0 flex flex-col gap-4">
          {viewMode === 'project' && (
            <div className="flex-1 min-h-0">
              <ProjectList
                projects={projectsDisplay}
                setProjects={handleSetProjects}
                currentConfig={config}
                teams={teams}
                onOptimize={handleOptimize}
                isOptimizing={isOptimizing}
                onConfigure={() => setIsConfigOpen(true)}
              />
            </div>
          )}
          {viewMode === 'member' && (
            <div className="flex-1 min-h-0">
              <TeamMemberList
                config={filteredConfig}
                teams={teams}
                onAddMember={handleAddMember}
                onUpdateMember={handleUpdateMember}
                onRemoveMember={handleRemoveMember}
              />
            </div>
          )}
          {viewMode === 'skill' && (
            <div className="flex-1 min-h-0">
              <SkillList
                config={config}
                onAddSkill={handleAddSkill}
                onRemoveSkill={handleRemoveSkill}
              />
            </div>
          )}
        </aside>

        {/* Schedule Table */}
        <main className="flex-1 min-w-0 min-h-0">
          <ScheduleTable
            data={scheduleData}
            projects={projectsDisplay}
            config={config}
            onCellUpdate={handleCellUpdate}
            onAssignmentChange={handleAssignmentChange}
            onAddAssignment={handleAddAssignment}
            onRemoveAssignment={handleRemoveAssignment}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
          />
        </main>
      </div>

      {/* Configuration Panel */}
      <ConfigurationPanel
        config={config}
        teams={teams}
        onUpdateConfig={handleConfigUpdate}
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
      />
    </div>
  )
}
