import {
  GlobalConfig,
  ProjectInput,
  ScheduleData,
  ScheduleRow,
  PhaseName,
  ScheduleCell,
} from '@/types/schedule';
import { startOfYear, addWeeks, startOfWeek } from 'date-fns';

const calculateWeeklyAggregates = (projects: ProjectInput[], config: GlobalConfig) => {
    const staffLoads: Record<string, number[]> = {};
    config.staffTypes.forEach(st => {
        staffLoads[st.id] = new Array(53).fill(0);
    });

    projects.forEach(project => {
        let currentWeekIndex = project.startWeekOffset;
        const phases = project.phasesConfig || config.phases;

        phases.forEach(phaseConfig => {
            const phaseTotalHours = (project.budgetHours * phaseConfig.percentBudget) / 100;
            let duration = phaseConfig.maxWeeks;

            if (duration <= 0) return;

            phaseConfig.staffAllocation.forEach(sa => {
                const staffHoursTotal = (phaseTotalHours * sa.percentage) / 100;
                if (staffHoursTotal <= 0) return;

                const rawWeekly = staffHoursTotal / duration;
                let baseWeekly = Math.round(rawWeekly / 4) * 4;
                if (baseWeekly === 0 && rawWeekly > 0) baseWeekly = 4;

                for (let w = 0; w < duration; w++) {
                    const weekIdx = currentWeekIndex + w;
                    if (weekIdx < 53 && weekIdx >= 0) {
                        if (!staffLoads[sa.staffTypeId]) staffLoads[sa.staffTypeId] = new Array(53).fill(0);
                         staffLoads[sa.staffTypeId][weekIdx] += baseWeekly;
                    }
                }
            });
            currentWeekIndex += duration;
        });
    });
    return staffLoads;
};

const assignStaffToPlaceholders = (projects: ProjectInput[], config: GlobalConfig, teamFilter: string = 'All Teams') => {
    const workingProjects = JSON.parse(JSON.stringify(projects));
    const warnings: string[] = [];

    const weeklyLoads = calculateWeeklyAggregates(workingProjects, config);

    interface Task {
        projectId: string;
        projectName: string;
        phaseIndex: number;
        allocIndex: number;
        startWeek: number;
        duration: number;
        hoursPerWeek: number;
        requiredSkills: string[];
        team: string;
        targetRole: string;
    }

    const tasks: Task[] = [];

    workingProjects.forEach((p: ProjectInput) => {
        const matchesFilter = teamFilter === 'All Teams' || p.team === teamFilter;
        if (!matchesFilter) return;

        const phases = p.phasesConfig || config.phases;
        let currentWeek = p.startWeekOffset;

        phases.forEach((phase: any, pIdx: number) => {
            const phaseTotalHours = (p.budgetHours * phase.percentBudget) / 100;
            const duration = phase.maxWeeks;

            if (duration > 0) {
                 phase.staffAllocation.forEach((alloc: any, aIdx: number) => {
                     const isFillable = alloc.staffTypeId.startsWith('tmpl-') || alloc.staffTypeId === 'placeholder';
                     if (isFillable && alloc.percentage > 0) {
                         const staffHoursTotal = (phaseTotalHours * alloc.percentage) / 100;
                         let hoursPerWeek = staffHoursTotal / duration;
                         hoursPerWeek = Math.round(hoursPerWeek / 4) * 4;
                         if (hoursPerWeek === 0 && staffHoursTotal > 0) hoursPerWeek = 4;

                         const staffConfig = config.staffTypes.find(s => s.id === alloc.staffTypeId);

                         tasks.push({
                             projectId: p.id,
                             projectName: p.name,
                             phaseIndex: pIdx,
                             allocIndex: aIdx,
                             startWeek: currentWeek,
                             duration: duration,
                             hoursPerWeek,
                             requiredSkills: p.requiredSkills || [],
                             team: p.team || 'General',
                             targetRole: staffConfig?.role || ''
                         });
                     }
                 });
            }
            currentWeek += duration;
        });
    });

    tasks.sort((a, b) => (b.hoursPerWeek * b.duration) - (a.hoursPerWeek * a.duration));

    tasks.forEach(task => {
        const project = workingProjects.find((p: ProjectInput) => p.id === task.projectId);
        const assignedStaff = new Set<string>();
        if (project && project.phasesConfig) {
             project.phasesConfig.forEach((ph: any) => {
                 ph.staffAllocation.forEach((sa: any) => {
                     const isReal = !sa.staffTypeId.startsWith('tmpl-') && sa.staffTypeId !== 'placeholder';
                     if (isReal) assignedStaff.add(sa.staffTypeId);
                 });
             });
        }

        const candidates = config.staffTypes.filter(s =>
            !s.id.startsWith('tmpl-') &&
            s.id !== 'placeholder' &&
            !assignedStaff.has(s.id) &&
            (task.targetRole ? s.role === task.targetRole : true)
        );

        let bestCandidate = null;
        let bestScore = -Infinity;

        candidates.forEach(candidate => {
            let score = 0;
            if (candidate.team === task.team) score += 50;

            if (task.requiredSkills.length > 0 && candidate.skills) {
                task.requiredSkills.forEach(skill => {
                    const level = candidate.skills?.[skill];
                    if (level === 'Beginner') score += 10;
                    if (level === 'Intermediate') score += 20;
                    if (level === 'Advanced') score += 30;
                });
            }

            let overtimePenalty = 0;
            let utilizationReward = 0;

            for (let w = 0; w < task.duration; w++) {
                const weekIdx = task.startWeek + w;
                if (weekIdx < 53) {
                    const currentLoad = weeklyLoads[candidate.id]?.[weekIdx] || 0;
                    const newLoad = currentLoad + task.hoursPerWeek;

                    if (newLoad > candidate.maxHoursPerWeek) {
                        overtimePenalty += Math.pow(newLoad - candidate.maxHoursPerWeek, 2);
                    } else {
                        utilizationReward += task.hoursPerWeek;
                    }
                }
            }

            score -= (overtimePenalty * 10);
            score += (utilizationReward * 1);

            if (score > bestScore) {
                bestScore = score;
                bestCandidate = candidate;
            }
        });

        if (bestCandidate) {
             const p = workingProjects.find((proj: any) => proj.id === task.projectId);
             if (p && p.phasesConfig) {
                 const candId = (bestCandidate as any).id;
                 p.phasesConfig[task.phaseIndex].staffAllocation[task.allocIndex].staffTypeId = candId;

                 for (let w = 0; w < task.duration; w++) {
                     const weekIdx = task.startWeek + w;
                     if (weekIdx < 53) {
                         if (!weeklyLoads[candId]) weeklyLoads[candId] = new Array(53).fill(0);
                         weeklyLoads[candId][weekIdx] += task.hoursPerWeek;
                     }
                 }
             }
        } else {
            warnings.push(`Could not fill '${task.targetRole}' for ${task.projectName}.`);
        }
    });

    return { projects: workingProjects, warnings };
};

const optimizeProjectTiming = (
  currentProjects: ProjectInput[],
  config: GlobalConfig,
  teamFilter: string = 'All Teams'
): ProjectInput[] => {
    let bestProjects = currentProjects.map(p => ({ ...p }));

    const getCost = (projs: ProjectInput[]) => {
        const loads = calculateWeeklyAggregates(projs, config);
        let cost = 0;
        const totalWeeklyLoad = new Array(53).fill(0);
        Object.values(loads).forEach(weeks => {
            weeks.forEach((hours, idx) => {
                if (totalWeeklyLoad[idx] !== undefined) totalWeeklyLoad[idx] += hours;
            });
        });
        totalWeeklyLoad.forEach(hours => { cost += (hours * hours); });
        return cost;
    };

    let bestCost = getCost(bestProjects);
    const iterations = 5000;

    const getProjectDuration = (p: ProjectInput) => {
        const phases = p.phasesConfig || config.phases;
        return phases.reduce((sum, phase) => sum + phase.maxWeeks, 0);
    };

    const projectConstraints = bestProjects.map((p, i) => {
        const duration = getProjectDuration(p);
        const maxStart = Math.max(0, 52 - duration);
        return { index: i, duration, maxStart };
    });

    const unlockedIndices = bestProjects.map((p, i) => {
        const matchesFilter = teamFilter === 'All Teams' || p.team === teamFilter;
        return (p.locked || !matchesFilter) ? -1 : i;
    }).filter(i => i !== -1);

    if (unlockedIndices.length === 0) return currentProjects;

    for (let i = 0; i < iterations; i++) {
        const idx = unlockedIndices[Math.floor(Math.random() * unlockedIndices.length)];
        const originalOffset = bestProjects[idx].startWeekOffset;
        const constraint = projectConstraints[idx];
        const newOffset = Math.floor(Math.random() * (constraint.maxStart + 1));

        if (newOffset === originalOffset) continue;

        bestProjects[idx].startWeekOffset = newOffset;
        const newCost = getCost(bestProjects);

        if (newCost < bestCost) {
            bestCost = newCost;
        } else {
            bestProjects[idx].startWeekOffset = originalOffset;
        }
    }

    bestProjects.forEach((p, idx) => {
        const matchesFilter = teamFilter === 'All Teams' || p.team === teamFilter;
        if (!p.locked && matchesFilter) {
             const constraint = projectConstraints[idx];
             if (p.startWeekOffset > constraint.maxStart) p.startWeekOffset = constraint.maxStart;
        }
    });

    return bestProjects;
};

export const optimizeSchedule = (
  projects: ProjectInput[],
  config: GlobalConfig,
  teamFilter: string = 'All Teams'
): { optimizedProjects: ProjectInput[], warnings: string[] } => {
  const { projects: staffedProjects, warnings } = assignStaffToPlaceholders(projects, config, teamFilter);
  const finalProjects = optimizeProjectTiming(staffedProjects, config, teamFilter);
  return { optimizedProjects: finalProjects, warnings };
};

export const generateSchedule = (
  projects: ProjectInput[],
  config: GlobalConfig
): ScheduleData => {
  const { year, staffTypes } = config;
  const startDate = startOfWeek(startOfYear(new Date(year, 0, 1)), { weekStartsOn: 1 });
  let currentMonday = startDate;
  if (currentMonday.getFullYear() < year) currentMonday = addWeeks(currentMonday, 1);

  const headers: string[] = [];
  for (let i = 0; i < 53; i++) {
    const d = addWeeks(currentMonday, i);
    if (d.getFullYear() > year) break;
    headers.push(d.toISOString());
  }

  const rows: ScheduleRow[] = [];

  projects.forEach((project) => {
    const phases = project.phasesConfig || config.phases;
    const phaseProfiles: Record<string, Record<string, number>> = {};
    const allocatedStaffIds = new Set<string>();

    phases.forEach(p => {
        const totalPhaseHours = (project.budgetHours * p.percentBudget) / 100;
        const duration = Math.max(1, p.maxWeeks);
        const weeklyPhaseHours = totalPhaseHours / duration;

        phaseProfiles[p.name] = {};
        p.staffAllocation.forEach(sa => {
            phaseProfiles[p.name][sa.staffTypeId] = (weeklyPhaseHours * sa.percentage) / 100;
            allocatedStaffIds.add(sa.staffTypeId);
        });
    });

    const weeklyPhases: Record<string, PhaseName> = {};
    let weekCursor = Math.max(0, Math.min(project.startWeekOffset, headers.length - 1));

    phases.forEach(p => {
        for (let i = 0; i < p.maxWeeks; i++) {
            if (weekCursor < headers.length) weeklyPhases[headers[weekCursor]] = p.name;
            weekCursor++;
        }
    });

    if (project.overrides?.phase) {
        Object.entries(project.overrides.phase).forEach(([date, phase]) => {
            if (headers.includes(date)) weeklyPhases[date] = phase;
        });
    }

    staffTypes.forEach(staff => {
        let maxWeeklyLoadCalculated = 0;
        let maxOverrideIndex = 0;

        if (project.overrides?.staff) {
            Object.keys(project.overrides.staff).forEach(key => {
                const [sId, sIdx] = key.split('-');
                if (sId === staff.id) {
                    const idx = parseInt(sIdx);
                    if (idx > maxOverrideIndex) maxOverrideIndex = idx;
                }
            });
        }

        headers.forEach(date => {
            const phaseName = weeklyPhases[date];
            if (phaseName && phaseProfiles[phaseName]) {
                 const hours = phaseProfiles[phaseName][staff.id] || 0;
                 if (hours > maxWeeklyLoadCalculated) maxWeeklyLoadCalculated = hours;
            }
        });

        let numSplits = Math.max(1, maxOverrideIndex);
        const isExplicitlyAllocated = allocatedStaffIds.has(staff.id);

        if (maxWeeklyLoadCalculated === 0 && maxOverrideIndex === 0 && !isExplicitlyAllocated) numSplits = 0;

        for (let i = 0; i < numSplits; i++) {
            const staffIndex = i + 1;
            const staffKey = `${staff.id}-${staffIndex}`;
            const rowCells: ScheduleCell[] = headers.map(d => ({ date: d, hours: 0, phase: null }));
            let rowTotalHours = 0;
            let hasAnyHours = false;

            headers.forEach((date, dateIdx) => {
                const phaseName = weeklyPhases[date];
                let cellHours = 0;
                let isOverride = false;

                if (project.overrides?.staff?.[staffKey]?.[date] !== undefined) {
                    cellHours = project.overrides.staff[staffKey][date];
                    isOverride = true;
                }
                else if (phaseName) {
                    const rawTotalForType = phaseProfiles[phaseName][staff.id] || 0;
                    if (rawTotalForType > 0) {
                        const rawPerPerson = rawTotalForType / numSplits;
                        let baseWeekly = Math.round(rawPerPerson / 4) * 4;
                        if (baseWeekly === 0 && rawPerPerson > 0) baseWeekly = 4;
                        cellHours = baseWeekly;
                    }
                }

                if (cellHours > 0 || isOverride) {
                    rowCells[dateIdx].hours = cellHours;
                    rowCells[dateIdx].phase = phaseName || null;
                    rowCells[dateIdx].isOverride = isOverride;
                    rowTotalHours += cellHours;
                    hasAnyHours = true;
                }
            });

            if (numSplits > 0 && (hasAnyHours || staffIndex <= maxOverrideIndex || (isExplicitlyAllocated && staffIndex === 1))) {
                rows.push({
                    rowId: `${project.id}-${staff.id}-${i}`,
                    projectId: project.id,
                    staffTypeId: staff.id,
                    projectName: project.name,
                    staffTypeName: staff.name,
                    staffRole: staff.role || 'Auditor',
                    staffIndex: staffIndex,
                    cells: rowCells,
                    totalHours: rowTotalHours
                });
            }
        }
    });
  });

  return { headers, rows };
};
