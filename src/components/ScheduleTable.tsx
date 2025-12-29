'use client'

import React, { useMemo, useState, useRef, useEffect } from 'react';
import { ScheduleData, PhaseName, ScheduleRow, ScheduleCell, ProjectInput, GlobalConfig } from '@/types/schedule';
import { format, parseISO } from 'date-fns';
import { TrendingUp, ChevronRight, ChevronDown, Clock, Activity, Target, Plus, Trash2, Award, Search, Calendar, Filter } from 'lucide-react';

export type ViewMode = 'project' | 'member' | 'skill';

interface ScheduleTableProps {
  data: ScheduleData;
  projects: ProjectInput[];
  config: GlobalConfig;
  teams: string[];
  onCellUpdate: (projectId: string, staffTypeId: string, staffIndex: number, date: string, value: any, type: 'hours' | 'phase') => void;
  onAssignmentChange: (projectId: string, oldStaffTypeId: string, newStaffTypeId: string) => void;
  onAddAssignment?: (projectId: string) => void;
  onRemoveAssignment?: (projectId: string, staffTypeId: string, staffIndex: number) => void;
  onAddProjectToMember?: (staffTypeId: string) => void;
  onProjectChange?: (staffTypeId: string, oldProjectId: string, newProjectId: string) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  fromDate: string;
  toDate: string;
  selectedTeam: string;
  onFromDateChange: (date: string) => void;
  onToDateChange: (date: string) => void;
  onTeamChange: (team: string) => void;
}

const PHASE_COLORS: Record<string, string> = {
  [PhaseName.PRE_PLANNING]: 'bg-purple-200 text-purple-900 border-purple-300',
  [PhaseName.PLANNING]: 'bg-blue-200 text-blue-900 border-blue-300',
  [PhaseName.FIELDWORK]: 'bg-amber-200 text-amber-900 border-amber-300',
  [PhaseName.REPORTING]: 'bg-emerald-200 text-emerald-900 border-emerald-300',
  'Mixed': 'bg-slate-300 text-slate-700 border-slate-400'
};

const PHASE_OPTIONS = Object.values(PhaseName);

interface GroupedRow {
  id: string;
  label: string;
  subLabel?: string;
  totalHours: number;
  projectId?: string;
  staffTypeId?: string;
  cells: { hours: number; phase: string | null; date: string }[];
  children: ScheduleRow[];
}

interface DragState {
  startRowId: string;
  startColIdx: number;
  endColIdx: number;
  type: 'hours' | 'phase';
  val: any;
  meta: { projectId?: string; staffTypeId?: string; staffIndex?: number };
}

const EditCellInput = ({
    initialValue,
    type,
    onSave,
    onCancel
}: {
    initialValue: any,
    type: 'hours' | 'phase',
    onSave: (val: any) => void,
    onCancel: () => void
}) => {
    const [val, setVal] = useState(initialValue);
    const inputRef = useRef<HTMLInputElement | HTMLSelectElement>(null);

    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.focus();
            if (type === 'hours' && inputRef.current instanceof HTMLInputElement) {
                inputRef.current.select();
            }
        }
    }, [type]);

    const handleBlur = () => {
        if (type !== 'phase') {
            onSave(val);
        } else {
            onCancel();
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            if (type === 'phase') {
                onSave(val);
            } else {
                inputRef.current?.blur();
            }
        } else if (e.key === 'Escape') {
            onCancel();
        }
    };

    if (type === 'phase') {
        return (
            <select
                ref={inputRef as any}
                className="w-full h-full text-[10px] p-0 border-none outline-none bg-white focus:ring-2 focus:ring-indigo-500 rounded"
                value={val}
                onChange={(e) => {
                  const newVal = e.target.value;
                  setVal(newVal);
                  onSave(newVal);
                }}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                onClick={(e) => e.stopPropagation()}
            >
                <option value="" disabled>Select Phase...</option>
                {PHASE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
        );
    }

    return (
        <input
            ref={inputRef as any}
            type="number"
            className="w-full h-full text-center text-xs p-0 border-none outline-none bg-white focus:ring-2 focus:ring-indigo-500 rounded"
            value={val}
            onChange={(e) => setVal(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            onClick={(e) => e.stopPropagation()}
        />
    );
};

export const ScheduleTable: React.FC<ScheduleTableProps> = ({
  data,
  projects,
  config,
  teams,
  onCellUpdate,
  onAssignmentChange,
  onAddAssignment,
  onRemoveAssignment,
  onAddProjectToMember,
  onProjectChange,
  viewMode,
  fromDate,
  toDate,
  selectedTeam,
  onFromDateChange,
  onToDateChange,
  onTeamChange,
  onViewModeChange
}) => {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [expandedSkillCards, setExpandedSkillCards] = useState<Set<string>>(new Set());
  const [skillProjectSearch, setSkillProjectSearch] = useState('');
  const [editingCell, setEditingCell] = useState<{ id: string, date: string, type: 'project' | 'staff' } | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);

  const toggleSkillCard = (id: string) => {
    setExpandedSkillCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const expandAllSkillCards = () => {
    setExpandedSkillCards(new Set(projects.map(p => p.id)));
  };

  const collapseAllSkillCards = () => {
    setExpandedSkillCards(new Set());
  };

  const projectAssignments = useMemo(() => {
    const map: Record<string, Set<string>> = {};
    data.rows.forEach(row => {
        if (!map[row.projectId]) map[row.projectId] = new Set();
        map[row.projectId].add(row.staffTypeId);
    });
    return map;
  }, [data.rows]);

  const memberAssignments = useMemo(() => {
    const map: Record<string, Set<string>> = {};
    data.rows.forEach(row => {
        if (!map[row.staffTypeId]) map[row.staffTypeId] = new Set();
        map[row.staffTypeId].add(row.projectId);
    });
    return map;
  }, [data.rows]);

  const uniqueRoles = useMemo(() => {
    return Array.from(new Set(config.staffTypes.map(s => s.role))).filter(Boolean).sort();
  }, [config.staffTypes]);

  useEffect(() => {
    const handleMouseUp = () => {
        if (dragState) {
            const { startColIdx, endColIdx, val, type, meta } = dragState;
            const start = Math.min(startColIdx, endColIdx);
            const end = Math.max(startColIdx, endColIdx);

            for (let i = start; i <= end; i++) {
                if (i === startColIdx) continue;

                const date = data.headers[i];
                if (type === 'phase' && meta.projectId) {
                     onCellUpdate(meta.projectId, '', 0, date, val, 'phase');
                } else if (type === 'hours' && meta.projectId && meta.staffTypeId && meta.staffIndex) {
                     onCellUpdate(meta.projectId, meta.staffTypeId, meta.staffIndex, date, Number(val), 'hours');
                }
            }
            setDragState(null);
        }
    };
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, [dragState, data.headers, onCellUpdate]);

  const handleDragStart = (e: React.MouseEvent, rowId: string, colIdx: number, type: 'hours'|'phase', val: any, meta: any) => {
    e.preventDefault();
    e.stopPropagation();
    setDragState({
        startRowId: rowId,
        startColIdx: colIdx,
        endColIdx: colIdx,
        type,
        val,
        meta
    });
  };

  const handleDragEnter = (rowId: string, colIdx: number) => {
    if (dragState && dragState.startRowId === rowId) {
        setDragState({ ...dragState, endColIdx: colIdx });
    }
  };

  const toggleGroup = (id: string) => {
    const newSet = new Set(expandedGroups);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setExpandedGroups(newSet);
  };

  const stats = useMemo(() => {
    const weeksCount = data.headers.length || 52;
    let grandTotal = 0;

    const staffLoads: Record<string, number[]> = {};
    const uniqueStaffIds = new Set<string>();

    data.rows.forEach(row => {
        uniqueStaffIds.add(row.staffTypeId);
        grandTotal += row.cells.reduce((acc, cell) => acc + (cell.hours || 0), 0);

        const staffKey = `${row.staffTypeId}-${row.staffIndex}`;
        if (!staffLoads[staffKey]) {
            staffLoads[staffKey] = new Array(data.headers.length).fill(0);
        }

        row.cells.forEach((cell, idx) => {
            staffLoads[staffKey][idx] += (cell.hours || 0);
        });
    });

    let totalOvertime = 0;
    Object.entries(staffLoads).forEach(([key, weeklyHours]) => {
        const [staffId] = key.split('-');
        const staffConfig = config.staffTypes.find(s => s.id === staffId);
        const maxHours = staffConfig ? staffConfig.maxHoursPerWeek : 40;

        weeklyHours.forEach(hours => {
            if (hours > maxHours) {
                totalOvertime += (hours - maxHours);
            }
        });
    });

    let totalCapacity = 0;
    uniqueStaffIds.forEach(id => {
        const staff = config.staffTypes.find(s => s.id === id);
        if (staff) {
            totalCapacity += (staff.maxHoursPerWeek * weeksCount);
        }
    });

    const utilization = totalCapacity > 0 ? (grandTotal / totalCapacity) * 100 : 0;
    const totalAvgWeekly = grandTotal / weeksCount;

    // Calculate skill coverage
    const assignmentMap: Record<string, Set<string>> = {};
    data.rows.forEach(row => {
        if (row.totalHours > 0) {
            if (!assignmentMap[row.projectId]) assignmentMap[row.projectId] = new Set();
            assignmentMap[row.projectId].add(row.staffTypeId);
        }
    });

    let totalRequiredSkills = 0;
    let totalCoveredSkills = 0;

    Object.keys(assignmentMap).forEach(projectId => {
        const project = projects.find(p => p.id === projectId);
        if (project && project.requiredSkills && project.requiredSkills.length > 0) {
            const assignedStaffIds = assignmentMap[projectId];
            project.requiredSkills.forEach(skillName => {
                totalRequiredSkills++;
                // Check if any assigned staff has this skill
                let isCovered = false;
                assignedStaffIds.forEach(staffId => {
                    const staff = config.staffTypes.find(s => s.id === staffId);
                    const level = staff?.skills?.[skillName];
                    if (level && level !== 'None') {
                        isCovered = true;
                    }
                });
                if (isCovered) totalCoveredSkills++;
            });
        }
    });

    const avgSkillCoverage = totalRequiredSkills > 0 ? (totalCoveredSkills / totalRequiredSkills) * 100 : 0;

    return { totalAvgWeekly, totalOvertime, utilization, avgSkillCoverage };
  }, [data, config.staffTypes, projects]);

  const groupedData = useMemo(() => {
    const groups: Record<string, GroupedRow> = {};

    data.rows.forEach(row => {
      let groupId: string;
      let label: string;
      let subLabel = '';
      let projectId: string | undefined = undefined;
      let staffTypeId: string | undefined = undefined;

      if (viewMode === 'project') {
        groupId = row.projectName;
        label = row.projectName;
        projectId = row.projectId;
      } else {
        groupId = `${row.staffTypeId}-${row.staffIndex}`;
        const displayName = row.staffTypeName.trim() || `[${row.staffRole}]`;
        label = row.staffIndex > 1 ? `${displayName} #${row.staffIndex}` : displayName;
        subLabel = '';
        staffTypeId = row.staffTypeId;
      }

      if (!groups[groupId]) {
        groups[groupId] = {
          id: groupId,
          label,
          subLabel,
          projectId,
          staffTypeId,
          totalHours: 0,
          cells: data.headers.map(d => ({ hours: 0, phase: null, date: d })),
          children: []
        };
      }

      const group = groups[groupId];
      group.totalHours += row.totalHours;
      group.children.push(row);

      row.cells.forEach((cell, idx) => {
        const groupCell = group.cells[idx];
        groupCell.hours += cell.hours;
        if (cell.hours > 0 && cell.phase) {
           if (groupCell.phase === null) {
             groupCell.phase = cell.phase;
           } else if (groupCell.phase !== cell.phase) {
             groupCell.phase = 'Mixed';
           }
        }
      });
    });
    return Object.values(groups);
  }, [data, viewMode]);

  // Helper to get skill level color and width
  const getSkillLevelStyle = (level: string | undefined) => {
    switch (level) {
      case 'Advanced':
        return { bg: 'bg-emerald-500', width: 'w-full', text: 'ADV', color: 'text-emerald-700' };
      case 'Intermediate':
        return { bg: 'bg-amber-400', width: 'w-2/3', text: 'INT', color: 'text-amber-700' };
      case 'Beginner':
        return { bg: 'bg-sky-400', width: 'w-1/3', text: 'BEG', color: 'text-sky-700' };
      default:
        return { bg: 'bg-slate-200', width: 'w-0', text: '-', color: 'text-slate-400' };
    }
  };

  // Calculate skill coverage stats
  const skillStats = useMemo(() => {
    const stats: Record<string, { required: number; covered: number; avgLevel: number }> = {};
    config.skills.forEach(skill => {
      let required = 0;
      let covered = 0;
      let totalLevel = 0;
      let staffWithSkill = 0;

      projects.forEach(project => {
        if (project.requiredSkills?.includes(skill)) {
          required++;
          const assignedStaffIds = projectAssignments[project.id] || new Set();
          let hasSkill = false;
          assignedStaffIds.forEach(staffId => {
            const staff = config.staffTypes.find(s => s.id === staffId);
            const level = staff?.skills?.[skill];
            if (level && level !== 'None') {
              hasSkill = true;
              if (level === 'Advanced') totalLevel += 3;
              else if (level === 'Intermediate') totalLevel += 2;
              else if (level === 'Beginner') totalLevel += 1;
              staffWithSkill++;
            }
          });
          if (hasSkill) covered++;
        }
      });

      stats[skill] = {
        required,
        covered,
        avgLevel: staffWithSkill > 0 ? totalLevel / staffWithSkill : 0
      };
    });
    return stats;
  }, [config.skills, projects, projectAssignments, config.staffTypes]);

  const renderContent = () => {
    if (viewMode === 'skill') {
        // Calculate project skill data for cards
        const projectSkillData = projects.map(project => {
            const assignedStaffIds = projectAssignments[project.id] || new Set();
            const assignedStaff = config.staffTypes.filter(s => assignedStaffIds.has(s.id));
            const requiredSkills = project.requiredSkills || [];

            // Calculate skill coverage
            const skillScores = requiredSkills.map(skill => {
                const staffWithSkill = assignedStaff.filter(s => s.skills?.[skill] && s.skills[skill] !== 'None');
                const contributors: { name: string; initials: string; level: string }[] = [];

                staffWithSkill.forEach(s => {
                    const level = s.skills?.[skill] || 'None';
                    if (level !== 'None') {
                        contributors.push({
                            name: s.name,
                            initials: s.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '??',
                            level
                        });
                    }
                });

                return { skill, contributors, isCovered: contributors.length > 0 };
            });

            const coveredCount = skillScores.filter(s => s.isCovered).length;
            const coveragePercent = requiredSkills.length > 0 ? (coveredCount / requiredSkills.length) * 100 : 0;

            return {
                project,
                assignedStaff,
                skillScores,
                coveredCount,
                coveragePercent
            };
        });

        return (
            <div className="flex flex-col h-full p-4 overflow-auto">
                {/* Header Controls */}
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200 gap-4">
                    {/* Search */}
                    <div className="relative flex-1 max-w-xs">
                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search projects..."
                            value={skillProjectSearch}
                            onChange={(e) => setSkillProjectSearch(e.target.value)}
                            className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 text-slate-700 placeholder-slate-400 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                        />
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Legend */}
                        <div className="flex items-center gap-3 text-[10px]">
                            <div className="flex items-center gap-1.5">
                                <div className="w-2.5 h-2.5 bg-emerald-500 rounded"></div>
                                <span className="text-slate-600">Advanced</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <div className="w-2.5 h-2.5 bg-amber-500 rounded"></div>
                                <span className="text-slate-600">Intermediate</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <div className="w-2.5 h-2.5 bg-sky-500 rounded"></div>
                                <span className="text-slate-600">Beginner</span>
                            </div>
                        </div>

                        {/* Expand/Collapse */}
                        <div className="flex items-center gap-1">
                            <button
                                onClick={expandAllSkillCards}
                                className="text-[10px] text-indigo-600 hover:text-indigo-700 font-medium hover:underline"
                            >
                                Expand All
                            </button>
                            <span className="text-slate-300">|</span>
                            <button
                                onClick={collapseAllSkillCards}
                                className="text-[10px] text-indigo-600 hover:text-indigo-700 font-medium hover:underline"
                            >
                                Collapse All
                            </button>
                        </div>
                    </div>
                </div>

                {/* Project Cards Grid */}
                {projects.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                        {projectSkillData
                            .filter(({ project }) =>
                                project.name.toLowerCase().includes(skillProjectSearch.toLowerCase()) ||
                                (project.team?.toLowerCase().includes(skillProjectSearch.toLowerCase()) ?? false)
                            )
                            .map(({ project, assignedStaff, skillScores, coveragePercent }) => {
                            const isExpanded = expandedSkillCards.has(project.id);
                            const gapCount = skillScores.filter(s => !s.isCovered).length;

                            return (
                                <div
                                    key={project.id}
                                    className="bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-all overflow-hidden"
                                >
                                    {/* Card Header - Always Visible, Clickable */}
                                    <button
                                        onClick={() => toggleSkillCard(project.id)}
                                        className="w-full p-3 text-left hover:bg-slate-50 transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            {/* Expand/Collapse Icon */}
                                            <div className={`shrink-0 w-5 h-5 flex items-center justify-center rounded transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
                                                <ChevronRight className="w-4 h-4 text-slate-400" />
                                            </div>

                                            {/* Project Info */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <h3 className="font-semibold text-slate-800 text-sm truncate" title={project.name}>
                                                        {project.name}
                                                    </h3>
                                                    {project.team && (
                                                        <span className="text-[9px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded font-medium shrink-0">
                                                            {project.team}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400">
                                                    <span>{skillScores.length} skill{skillScores.length !== 1 ? 's' : ''}</span>
                                                    <span>·</span>
                                                    <span>{assignedStaff.length} staff</span>
                                                </div>
                                            </div>

                                            {/* Gap count */}
                                            {gapCount > 0 && (
                                                <div className="shrink-0 flex items-center gap-1.5 px-2 py-1 bg-red-50 border border-red-200 rounded-lg">
                                                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                                    <span className="text-sm font-bold text-red-600">{gapCount}</span>
                                                    <span className="text-[9px] text-red-500">gap{gapCount !== 1 ? 's' : ''}</span>
                                                </div>
                                            )}
                                        </div>
                                    </button>

                                    {/* Expandable Skills List */}
                                    {isExpanded && (
                                        <div className="border-t border-slate-100">
                                            <div className="p-3">
                                                {skillScores.length > 0 ? (
                                                    <div className="space-y-2">
                                                        {skillScores.map(({ skill, contributors, isCovered }) => (
                                                            <div
                                                                key={skill}
                                                                className={`flex items-center gap-2 p-2 rounded-lg ${isCovered ? 'bg-slate-50' : 'bg-red-50 border border-red-100'}`}
                                                            >
                                                                {/* Skill name */}
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-xs font-medium text-slate-700 truncate" title={skill}>
                                                                            {skill}
                                                                        </span>
                                                                        {!isCovered && (
                                                                            <span className="text-[9px] px-1 py-0.5 bg-red-100 text-red-600 rounded font-semibold shrink-0">
                                                                                GAP
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    {/* Contributors */}
                                                                    {contributors.length > 0 && (
                                                                        <div className="flex items-center gap-1 mt-1 flex-wrap">
                                                                            {contributors.slice(0, 4).map((c, i) => {
                                                                                const levelColor = c.level === 'Advanced' ? 'bg-emerald-500' : c.level === 'Intermediate' ? 'bg-amber-500' : 'bg-sky-500';
                                                                                return (
                                                                                    <div
                                                                                        key={i}
                                                                                        className="flex items-center gap-0.5 text-[9px] text-slate-500"
                                                                                        title={`${c.name}: ${c.level}`}
                                                                                    >
                                                                                        <div className={`w-1.5 h-1.5 ${levelColor} rounded-full`}></div>
                                                                                        <span>{c.initials}</span>
                                                                                    </div>
                                                                                );
                                                                            })}
                                                                            {contributors.length > 4 && (
                                                                                <span className="text-[9px] text-slate-400">+{contributors.length - 4}</span>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                {/* Coverage indicator */}
                                                                {isCovered && (
                                                                    <div className="shrink-0 w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center">
                                                                        <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="text-center py-4 text-slate-400 text-xs">
                                                        No required skills defined
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="text-center">
                            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                <Award className="w-8 h-8 text-slate-300" />
                            </div>
                            <div className="text-slate-500 text-sm font-medium">No projects to display</div>
                            <div className="text-slate-400 text-xs mt-1">Add projects in the sidebar to view skill coverage</div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return (
        <table className="border-collapse min-w-max w-full text-sm select-none">
          <thead className="bg-slate-100 sticky top-0 z-20 shadow-sm">
            <tr>
              <th className="sticky left-0 z-30 bg-slate-100 p-3 text-left font-semibold text-slate-600 border-r border-b border-slate-300 min-w-[200px] w-[200px]">
                {viewMode === 'project' ? 'Audit Name' : 'Team Member'}
              </th>
              <th className="sticky left-[200px] z-30 bg-slate-100 p-3 text-left font-semibold text-slate-600 border-r border-b border-slate-300 min-w-[150px] w-[150px]">
                Staff Role
              </th>
              <th className="sticky left-[350px] z-30 bg-slate-100 p-3 text-left font-semibold text-slate-600 border-r border-b border-slate-300 min-w-[150px] w-[150px]">
                {viewMode === 'project' ? 'Team Member' : 'Audit Project'}
              </th>
               <th className="p-3 text-center font-semibold text-slate-600 border-r border-b border-slate-300 min-w-[80px] w-[80px]">
                Total
              </th>
              {data.headers.map(dateStr => (
                <th key={dateStr} className="p-2 text-center font-normal text-slate-500 border-b border-r border-slate-200 min-w-[50px] w-[50px]">
                   <div className="flex flex-col items-center">
                       <span className="text-xs font-bold">{format(parseISO(dateStr), 'MMM')}</span>
                       <span className="text-[10px]">{format(parseISO(dateStr), 'd')}</span>
                   </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {groupedData.length === 0 ? (
                <tr>
                    <td colSpan={data.headers.length + 4} className="p-10 text-center text-slate-400">
                        No data to display.
                    </td>
                </tr>
            ) : (
                groupedData.map((group) => {
                  const isExpanded = expandedGroups.has(group.id);

                  let maxHours = 40;
                  if (viewMode === 'member') {
                     const staffId = group.staffTypeId;
                     const staffMember = config.staffTypes.find(s => s.id === staffId);
                     if (staffMember) maxHours = staffMember.maxHoursPerWeek;
                  }

                  return (
                    <React.Fragment key={group.id}>
                      <tr className="bg-slate-50/80 hover:bg-slate-100 border-b border-slate-200 transition-colors">
                        <td className="sticky left-0 z-10 bg-slate-50/80 p-2 border-r border-slate-200 font-bold text-slate-800">
                          <button
                            onClick={() => toggleGroup(group.id)}
                            className="flex items-center gap-2 w-full text-left focus:outline-none"
                          >
                            {isExpanded ? <ChevronDown className="w-4 h-4 text-indigo-600" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                            <span className="truncate" title={group.label}>
                                {group.label}
                            </span>
                          </button>
                        </td>
                        <td className="sticky left-[200px] z-10 bg-slate-50/80 p-2 border-r border-slate-200 text-slate-500 italic text-xs">
                           <div className="flex items-center justify-between">
                             <span>{viewMode === 'project' ? `${group.children.length} Assignments` : group.subLabel}</span>
                             {viewMode === 'project' && group.projectId && onAddAssignment && (
                               <button
                                 onClick={(e) => {
                                   e.stopPropagation();
                                   onAddAssignment(group.projectId!);
                                   if (!isExpanded) toggleGroup(group.id);
                                 }}
                                 className="p-1 rounded bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors"
                                 title="Add Staff Assignment"
                               >
                                 <Plus className="w-3.5 h-3.5" />
                               </button>
                             )}
                             {viewMode === 'member' && group.staffTypeId && onAddProjectToMember && (
                               <button
                                 onClick={(e) => {
                                   e.stopPropagation();
                                   onAddProjectToMember(group.staffTypeId!);
                                   if (!isExpanded) toggleGroup(group.id);
                                 }}
                                 className="p-1 rounded bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors"
                                 title="Add Project Assignment"
                               >
                                 <Plus className="w-3.5 h-3.5" />
                               </button>
                             )}
                           </div>
                        </td>
                        <td className="sticky left-[350px] z-10 bg-slate-50/80 p-2 border-r border-slate-200 text-slate-500 italic text-xs">
                           -
                        </td>
                        <td className="p-2 text-center font-bold font-mono text-slate-800 border-r border-slate-200 text-xs">
                          {Math.round(group.totalHours)}
                        </td>
                        {group.cells.map((cell, cIdx) => {
                          const isEditing = editingCell?.id === group.id && editingCell?.date === cell.date && editingCell?.type === 'project';
                          const canEdit = viewMode === 'project' && group.projectId;

                          let cellColorClass = '';
                          if (viewMode === 'member') {
                               if (cell.hours > maxHours) {
                                   cellColorClass = 'bg-red-200 text-red-900 border-red-300 font-bold';
                               } else {
                                   cellColorClass = 'bg-emerald-100 text-emerald-800 border-emerald-200';
                               }
                          } else {
                               cellColorClass = PHASE_COLORS[cell.phase || ''] || 'bg-gray-100 text-gray-600 border-gray-200';
                          }

                          const isDragActive = dragState?.startRowId === group.id;
                          const isDragSelected = isDragActive && cIdx >= Math.min(dragState!.startColIdx, dragState!.endColIdx) && cIdx <= Math.max(dragState!.startColIdx, dragState!.endColIdx);
                          const showDragHandle = canEdit && !isEditing && cell.phase !== 'Mixed' && cell.phase !== null;

                          return (
                          <td
                            key={`g-${cIdx}`}
                            className={`p-1 text-center border-r border-slate-200 h-10 min-w-[50px] relative group/cell ${canEdit ? 'cursor-pointer hover:bg-indigo-50/50' : ''} ${isDragSelected ? 'bg-indigo-100 ring-2 ring-indigo-400 z-10' : ''}`}
                            onClick={() => {
                                if (canEdit) setEditingCell({ id: group.id, date: cell.date, type: 'project' });
                            }}
                            onMouseEnter={() => handleDragEnter(group.id, cIdx)}
                          >
                             {isEditing ? (
                                <div
                                    className="absolute inset-0 z-50 p-0.5"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <EditCellInput
                                        initialValue={cell.phase === 'Mixed' ? '' : cell.phase || ''}
                                        type="phase"
                                        onSave={(val) => {
                                            if (group.projectId && val) {
                                                onCellUpdate(group.projectId, '', 0, cell.date, val, 'phase');
                                            }
                                            setEditingCell(null);
                                        }}
                                        onCancel={() => setEditingCell(null)}
                                    />
                                </div>
                             ) : (
                                cell.hours > 0 && (
                                    <>
                                        <div
                                            className={`h-full w-full rounded flex items-center justify-center text-[10px] font-bold border ${cellColorClass}`}
                                            title={`${cell.phase || 'Allocated'}: ${cell.hours} hrs${viewMode === 'member' ? ` (Max: ${maxHours})` : ''}`}
                                        >
                                            {Math.round(cell.hours)}
                                        </div>
                                        {showDragHandle && (
                                            <div
                                                className="absolute -bottom-1 -right-1 w-3 h-3 bg-indigo-600 border border-white cursor-crosshair opacity-0 group-hover/cell:opacity-100 z-20 rounded-sm hover:scale-125 transition-transform"
                                                onMouseDown={(e) => handleDragStart(e, group.id, cIdx, 'phase', cell.phase, { projectId: group.projectId })}
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                        )}
                                    </>
                                )
                             )}
                          </td>
                        )})}
                      </tr>

                      {isExpanded && group.children.map((row) => {
                        const assignedToProject = projectAssignments[row.projectId] || new Set();
                        const assignedToMember = memberAssignments[row.staffTypeId] || new Set();

                        return (
                        <tr key={row.rowId} className="hover:bg-slate-50 border-b border-slate-100 bg-white group/row">
                            <td className="sticky left-0 z-10 bg-white p-2 pl-8 border-r border-slate-200 text-slate-600 truncate text-xs border-l-4 border-l-indigo-500">
                                <div className="flex items-center justify-between">
                                    {viewMode === 'project' ? (
                                        <span>↳ Assignment</span>
                                    ) : (
                                        onProjectChange ? (
                                             <select
                                                className="w-full bg-transparent border border-transparent hover:border-slate-300 rounded px-1 py-0.5 text-xs text-slate-600 focus:ring-1 focus:ring-indigo-500 outline-none cursor-pointer transition-all -ml-1"
                                                value={row.projectId}
                                                onChange={(e) => onProjectChange(row.staffTypeId, row.projectId, e.target.value)}
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                {projects.map(p => {
                                                    if (assignedToMember.has(p.id) && p.id !== row.projectId) return null;
                                                    return (
                                                        <option key={p.id} value={p.id}>{p.name}</option>
                                                    );
                                                })}
                                            </select>
                                        ) : (
                                            <span>{row.projectName}</span>
                                        )
                                    )}

                                    {onRemoveAssignment && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onRemoveAssignment(row.projectId, row.staffTypeId, row.staffIndex);
                                            }}
                                            className="text-slate-300 hover:text-red-500 hover:bg-red-50 rounded p-1 transition-colors opacity-0 group-hover/row:opacity-100"
                                            title="Remove Assignment"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </div>
                            </td>
                            <td className="sticky left-[200px] z-10 bg-white p-2 border-r border-slate-200 text-slate-600 truncate text-xs">
                                <div className="flex items-center gap-1">
                                    <select
                                        className="w-full bg-transparent border border-transparent hover:border-slate-300 rounded px-1 py-0.5 text-xs text-slate-600 focus:ring-1 focus:ring-indigo-500 outline-none cursor-pointer transition-all -ml-1"
                                        value={row.staffRole}
                                        disabled={viewMode === 'member'}
                                        onChange={(e) => {
                                            if (viewMode === 'member') return;
                                            const newRole = e.target.value;
                                            const currentStaff = config.staffTypes.find(s => s.id === row.staffTypeId);

                                            const candidates = config.staffTypes.filter(s => s.role === newRole);

                                            let bestCandidate = candidates.find(s => s.team === currentStaff?.team && !assignedToProject.has(s.id));

                                            if (!bestCandidate) {
                                                bestCandidate = candidates.find(s => !assignedToProject.has(s.id));
                                            }

                                            if (bestCandidate) {
                                                onAssignmentChange(row.projectId, row.staffTypeId, bestCandidate.id);
                                            } else {
                                                alert(`All staff members with role '${newRole}' are already assigned to this project.`);
                                            }
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        {uniqueRoles.map(r => (
                                            <option key={r} value={r}>{r}</option>
                                        ))}
                                    </select>
                                    {row.staffIndex > 1 && (
                                        <span className="text-[10px] text-slate-400 font-mono shrink-0">#{row.staffIndex}</span>
                                    )}
                                </div>
                            </td>
                            <td className="sticky left-[350px] z-10 bg-white p-2 border-r border-slate-200 text-slate-400 truncate text-xs">
                                {viewMode === 'project' ? (
                                    <select
                                        className="w-full bg-transparent border border-transparent hover:border-slate-300 rounded px-1 py-0.5 text-xs text-slate-600 focus:ring-1 focus:ring-indigo-500 outline-none cursor-pointer transition-all -ml-1"
                                        value={row.staffTypeId}
                                        onChange={(e) => onAssignmentChange(row.projectId, row.staffTypeId, e.target.value)}
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        {config.staffTypes.map(st => {
                                            if (assignedToProject.has(st.id) && st.id !== row.staffTypeId) return null;

                                            return (
                                                <option key={st.id} value={st.id}>
                                                    {st.name.trim() ? st.name : `[${st.role}]`}
                                                </option>
                                            );
                                        })}
                                    </select>
                                ) : (
                                    row.projectName
                                )}
                            </td>
                            <td className="p-2 text-center font-mono text-slate-500 border-r border-slate-200 text-xs">
                                {Math.round(row.totalHours)}
                            </td>
                            {row.cells.map((cell, cIdx) => {
                                const isEditing = editingCell?.id === row.rowId && editingCell?.date === cell.date && editingCell?.type === 'staff';

                                const isDragActive = dragState?.startRowId === row.rowId;
                                const isDragSelected = isDragActive && cIdx >= Math.min(dragState!.startColIdx, dragState!.endColIdx) && cIdx <= Math.max(dragState!.startColIdx, dragState!.endColIdx);
                                const showDragHandle = !isEditing;

                                return (
                                <td
                                    key={`c-${cIdx}`}
                                    className={`p-1 text-center border-r border-slate-100 h-10 min-w-[50px] relative cursor-pointer group/cell ${isDragSelected ? 'bg-indigo-100 ring-2 ring-indigo-400 z-10' : 'hover:bg-indigo-50/50'}`}
                                    onClick={() => setEditingCell({ id: row.rowId, date: cell.date, type: 'staff' })}
                                    onMouseEnter={() => handleDragEnter(row.rowId, cIdx)}
                                >
                                {isEditing ? (
                                    <div
                                        className="absolute inset-0 z-50 p-0.5"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <EditCellInput
                                            initialValue={cell.hours}
                                            type="hours"
                                            onSave={(val) => {
                                                const num = parseFloat(val);
                                                const finalVal = isNaN(num) ? 0 : num;
                                                onCellUpdate(row.projectId, row.staffTypeId, row.staffIndex, cell.date, finalVal, 'hours');
                                                setEditingCell(null);
                                            }}
                                            onCancel={() => setEditingCell(null)}
                                        />
                                    </div>
                                ) : (
                                    <>
                                        {cell.hours > 0 ? (
                                            <div
                                                className={`h-[80%] w-full rounded-sm flex items-center justify-center text-[9px] border ${cell.isOverride ? 'border-indigo-500 ring-1 ring-indigo-200 opacity-100 font-bold' : 'opacity-80'} ${PHASE_COLORS[cell.phase || ''] || 'bg-gray-100'}`}
                                                title={`${cell.phase}: ${cell.hours} hrs${cell.isOverride ? ' (Manual)' : ''}`}
                                            >
                                                {cell.hours}
                                            </div>
                                        ) : (
                                            <div className="h-full w-full"></div>
                                        )}
                                        {showDragHandle && (
                                            <div
                                                className="absolute -bottom-1 -right-1 w-3 h-3 bg-indigo-600 border border-white cursor-crosshair opacity-0 group-hover/cell:opacity-100 z-20 rounded-sm hover:scale-125 transition-transform"
                                                onMouseDown={(e) => handleDragStart(e, row.rowId, cIdx, 'hours', cell.hours, { projectId: row.projectId, staffTypeId: row.staffTypeId, staffIndex: row.staffIndex })}
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                        )}
                                    </>
                                )}
                                </td>
                            )})}
                        </tr>
                      )})}
                    </React.Fragment>
                  );
                })
            )}
          </tbody>
        </table>
    );
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden min-h-0">
      <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col gap-4 shrink-0">
         <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                <TrendingUp className="w-4 h-4" /> Performance Metrics
              </h3>

              {/* Filters */}
              <div className="flex items-center gap-3">
                {/* Date Range Filter */}
                <div className="flex items-center bg-white rounded-lg border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-2 px-3 py-1.5 border-r border-slate-200">
                    <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                    <span className="text-xs text-slate-500 font-medium">From:</span>
                    <input
                      type="date"
                      value={fromDate}
                      onChange={(e) => onFromDateChange(e.target.value)}
                      className="bg-transparent text-xs text-slate-700 focus:outline-none w-[110px] cursor-pointer"
                    />
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5">
                    <span className="text-xs text-slate-500 font-medium">To:</span>
                    <input
                      type="date"
                      value={toDate}
                      onChange={(e) => onToDateChange(e.target.value)}
                      className="bg-transparent text-xs text-slate-700 focus:outline-none w-[110px] cursor-pointer"
                    />
                  </div>
                </div>

                {/* Team Filter */}
                <div className="relative">
                  <Filter className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <select
                    value={selectedTeam}
                    onChange={(e) => onTeamChange(e.target.value)}
                    className="pl-8 pr-8 py-1.5 bg-white border border-slate-200 text-slate-700 text-xs rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 hover:border-slate-300 transition-all cursor-pointer appearance-none shadow-sm min-w-[130px]"
                  >
                    <option value="All Teams">All Teams</option>
                    {teams.map(team => (
                      <option key={team} value={team}>{team}</option>
                    ))}
                  </select>
                </div>
              </div>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Avg Hrs/Wk</p>
                    <p className="text-2xl font-bold text-slate-800">{stats.totalAvgWeekly.toFixed(1)}</p>
                </div>
                <div className="p-2 bg-indigo-50 rounded-full">
                    <TrendingUp className="w-5 h-5 text-indigo-600" />
                </div>
            </div>

            <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Overtime Hours</p>
                    <p className="text-xl font-bold text-slate-700">{Math.round(stats.totalOvertime).toLocaleString()} <span className="text-xs font-normal text-slate-400">hrs</span></p>
                </div>
                <div className="p-2 bg-amber-50 rounded-full">
                    <Clock className="w-4 h-4 text-amber-600" />
                </div>
            </div>

            <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Utilization</p>
                    <p className="text-xl font-bold text-slate-700">{Math.round(stats.utilization)}%</p>
                </div>
                <div className="p-2 bg-emerald-50 rounded-full">
                    <Activity className="w-4 h-4 text-emerald-600" />
                </div>
            </div>

            <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Skill Coverage</p>
                    <p className="text-xl font-bold text-slate-700">{Math.round(stats.avgSkillCoverage)}%</p>
                </div>
                <div className="p-2 bg-blue-50 rounded-full">
                    <Target className="w-4 h-4 text-blue-600" />
                </div>
            </div>
         </div>
      </div>

      <div className="flex-1 min-h-0 overflow-auto custom-scrollbar relative">
        {renderContent()}
      </div>
    </div>
  );
};
