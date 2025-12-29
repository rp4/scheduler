'use client'

import React, { useState, useEffect } from 'react';
import { ProjectInput, GlobalConfig, ProjectRoleAssignment } from '@/types/schedule';
import { Plus, Trash2, Calendar, Lock, Unlock, X, Sparkles, ChevronUp, ChevronDown, Tag, UserPlus } from 'lucide-react';
import { format, addWeeks, startOfYear, startOfWeek } from 'date-fns';
import { useProjectRoles } from '@/hooks/useProjectRoles';

interface DbRole {
  id: string;
  name: string;
}

interface ProjectListProps {
  projects: ProjectInput[];
  setProjects: (projects: ProjectInput[]) => void;
  currentConfig: GlobalConfig;
  teams: string[];
  onOptimize: () => void;
  isOptimizing: boolean;
  dbRoles?: DbRole[];
}

export const ProjectList: React.FC<ProjectListProps> = ({
  projects,
  setProjects,
  currentConfig,
  teams,
  onOptimize,
  isOptimizing,
  dbRoles,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);

  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectBudget, setNewProjectBudget] = useState<number>(200);
  const [newProjectOffset, setNewProjectOffset] = useState<number>(0);
  const [newProjectTeam, setNewProjectTeam] = useState<string>(teams[0] || 'General');
  const [newProjectSkills, setNewProjectSkills] = useState<string[]>([]);
  const [selectedRoleToAdd, setSelectedRoleToAdd] = useState<string>('');

  // Fetch project roles for the editing project
  const { data: projectRoles, create: createProjectRole, update: updateProjectRole, remove: removeProjectRole } = useProjectRoles(editingProjectId || undefined);

  // Get team members that can be assigned (non-template staff)
  const teamMembers = currentConfig.staffTypes.filter(s => !s.id.startsWith('tmpl-') && s.id !== 'placeholder');

  const getStartDateFromOffset = (offset: number) => {
    const year = currentConfig.year;
    const startDate = startOfWeek(startOfYear(new Date(year, 0, 1)), { weekStartsOn: 1 });
    let currentMonday = startDate;
    if (currentMonday.getFullYear() < year) {
        currentMonday = addWeeks(currentMonday, 1);
    }
    return addWeeks(currentMonday, offset);
  };

  const openAddModal = () => {
    setEditingProjectId(null);
    setNewProjectName('');
    setNewProjectBudget(200);
    const nextOffset = projects.length > 0 ? Math.max(...projects.map(p => p.startWeekOffset)) + 4 : 0;
    setNewProjectOffset(nextOffset);
    setNewProjectTeam(teams[0] || 'General');
    setNewProjectSkills([]);
    setIsModalOpen(true);
  };

  const openEditModal = (project: ProjectInput) => {
    setEditingProjectId(project.id);
    setNewProjectName(project.name);
    setNewProjectBudget(project.budgetHours);
    setNewProjectOffset(project.startWeekOffset);
    setNewProjectTeam(project.team || teams[0] || 'General');
    setNewProjectSkills(project.requiredSkills || []);
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!newProjectName.trim()) return;

    if (editingProjectId) {
        setProjects(projects.map(p => p.id === editingProjectId ? {
            ...p,
            name: newProjectName,
            budgetHours: newProjectBudget,
            startWeekOffset: newProjectOffset,
            team: newProjectTeam,
            requiredSkills: newProjectSkills
        } : p));
    } else {
        const newId = Math.random().toString(36).substr(2, 9);
        const phasesSnapshot = JSON.parse(JSON.stringify(currentConfig.phases));

        const project: ProjectInput = {
            id: newId,
            name: newProjectName,
            budgetHours: newProjectBudget,
            startWeekOffset: newProjectOffset,
            locked: false,
            phasesConfig: phasesSnapshot,
            team: newProjectTeam,
            requiredSkills: newProjectSkills
        };
        setProjects([...projects, project]);
    }

    setNewProjectName('');
    setNewProjectBudget(200);
    setNewProjectTeam(teams[0] || 'General');
    setNewProjectSkills([]);
    setEditingProjectId(null);
    setIsModalOpen(false);
  };

  const removeProject = (id: string) => {
    setProjects(projects.filter(p => p.id !== id));
  };

  const updateProject = (id: string, field: keyof ProjectInput, value: any) => {
    setProjects(projects.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const toggleSkill = (skill: string) => {
    if (newProjectSkills.includes(skill)) {
      setNewProjectSkills(newProjectSkills.filter(s => s !== skill));
    } else {
      setNewProjectSkills([...newProjectSkills, skill]);
    }
  };

  return (
    <>
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-full flex flex-col min-h-0 overflow-hidden">
        <div className="flex justify-between items-center mb-4 shrink-0">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-indigo-600" />
                Audit Projects
            </h2>
            <button
                onClick={openAddModal}
                className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-sm active:scale-95"
            >
                <Plus className="w-3.5 h-3.5" />
                Project
            </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar space-y-3 pr-2">
          {projects.map((project) => {
            const projectStartDate = getStartDateFromOffset(project.startWeekOffset);

            return (
            <div
                key={project.id}
                onClick={() => openEditModal(project)}
                className={`relative p-3 bg-white border rounded-lg hover:shadow-md transition-all group cursor-pointer overflow-hidden ${project.locked ? 'border-amber-200 bg-amber-50/30' : 'border-slate-200 hover:border-slate-300'}`}
            >
              {/* Delete button - top right */}
              <button
                onClick={(e) => {
                    e.stopPropagation();
                    removeProject(project.id);
                }}
                className="absolute top-1.5 right-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded p-1 transition-colors opacity-0 group-hover:opacity-100 z-10"
                title="Delete Project"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>

              {/* Project info row */}
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-slate-700 truncate text-sm pr-6" title={project.name}>
                    {project.name}
                  </div>
                  {project.team && (
                    <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">{project.team}</span>
                  )}
                </div>
              </div>

              {/* Date controls row */}
              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                <div
                  className={`flex items-center gap-1.5 border rounded-md px-2.5 py-1.5 flex-1 min-w-0 ${
                    project.locked
                      ? 'bg-amber-50 border-amber-200'
                      : 'bg-slate-50 border-slate-200 hover:border-indigo-300 transition-colors'
                  }`}
                >
                  <span className={`text-[11px] font-mono font-medium ${project.locked ? 'text-amber-700' : 'text-slate-600'}`}>
                    {format(projectStartDate, 'dd MMM yyyy')}
                  </span>

                  {!project.locked && (
                    <div className="flex items-center gap-0.5 ml-auto border-l border-slate-200 pl-1.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          updateProject(project.id, 'startWeekOffset', Math.max(0, project.startWeekOffset - 1));
                        }}
                        className="text-slate-400 hover:text-indigo-600 hover:bg-indigo-100 rounded p-0.5 transition-colors"
                      >
                        <ChevronDown className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          updateProject(project.id, 'startWeekOffset', project.startWeekOffset + 1);
                        }}
                        className="text-slate-400 hover:text-indigo-600 hover:bg-indigo-100 rounded p-0.5 transition-colors"
                      >
                        <ChevronUp className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Lock button - integrated cleanly */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    updateProject(project.id, 'locked', !project.locked);
                  }}
                  className={`shrink-0 p-1.5 rounded-md transition-all ${
                    project.locked
                      ? 'bg-amber-100 text-amber-600 hover:bg-amber-200'
                      : 'bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600'
                  }`}
                  title={project.locked ? "Unlock Start Date" : "Lock Start Date"}
                >
                  {project.locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          )})}

          {projects.length === 0 && (
            <div className="flex flex-col items-center justify-center h-40 text-slate-400 border-2 border-dashed border-slate-100 rounded-lg">
                <Calendar className="w-8 h-8 mb-2 opacity-20" />
                <span className="text-sm italic">No projects found.</span>
            </div>
          )}
        </div>

        <div className="mt-4 pt-4 border-t border-slate-100 shrink-0">
          <button
            onClick={onOptimize}
            disabled={isOptimizing}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg text-sm font-medium transition-all shadow-sm disabled:opacity-70 disabled:cursor-not-allowed group"
          >
            <Sparkles className={`w-4 h-4 ${isOptimizing ? 'animate-spin' : 'group-hover:scale-110 transition-transform'}`} />
            {isOptimizing ? 'Optimizing Schedule...' : 'Auto-Optimize Schedule'}
          </button>
       </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <div
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
                onClick={() => setIsModalOpen(false)}
            />
            <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl transform transition-all flex flex-col overflow-hidden h-[600px]">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
                    <h3 className="text-lg font-bold text-slate-800">
                        {editingProjectId ? 'Edit Project' : 'Add New Project'}
                    </h3>
                    <button
                        onClick={() => setIsModalOpen(false)}
                        className="p-1 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-5 flex-1 overflow-y-auto custom-scrollbar">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Project Name</label>
                        <input
                            type="text"
                            autoFocus
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400"
                            placeholder="e.g., Enterprise Risk Assessment"
                            value={newProjectName}
                            onChange={(e) => setNewProjectName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Team</label>
                        <select
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                            value={newProjectTeam}
                            onChange={(e) => setNewProjectTeam(e.target.value)}
                        >
                            {teams.map(team => (
                                <option key={team} value={team}>{team}</option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-5">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Budget (Hours)</label>
                            <input
                                type="number"
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                                value={newProjectBudget}
                                onChange={(e) => setNewProjectBudget(parseInt(e.target.value) || 0)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Start Week Offset</label>
                            <input
                                type="number"
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                                value={newProjectOffset}
                                onChange={(e) => setNewProjectOffset(parseInt(e.target.value) || 0)}
                            />
                            <p className="text-[10px] text-slate-400 mt-1.5">
                                {format(getStartDateFromOffset(newProjectOffset), 'dd MMM yyyy')}
                            </p>
                        </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Required Skills</label>
                      <div className="w-full border border-slate-300 rounded-lg h-32 overflow-y-auto p-2 bg-slate-50/50 custom-scrollbar">
                        {currentConfig.skills.map(skill => (
                          <label key={skill} className="flex items-center gap-2 p-1.5 hover:bg-white hover:shadow-sm rounded cursor-pointer transition-all">
                            <input
                              type="checkbox"
                              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                              checked={newProjectSkills.includes(skill)}
                              onChange={() => toggleSkill(skill)}
                            />
                            <span className="text-xs text-slate-700">{skill}</span>
                          </label>
                        ))}
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1.5 flex justify-between">
                         <span>Select all skills required for this audit.</span>
                         <span className="font-semibold text-indigo-600">{newProjectSkills.length} selected</span>
                      </p>
                    </div>

                    {/* Project Roles Section - Only show when editing */}
                    {editingProjectId && dbRoles && dbRoles.length > 0 && (
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-2">
                          <Tag className="w-4 h-4" />
                          Project Roles
                        </label>

                        {/* Add new role to project */}
                        <div className="flex gap-2 mb-2">
                          <select
                            className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                            value={selectedRoleToAdd}
                            onChange={(e) => setSelectedRoleToAdd(e.target.value)}
                          >
                            <option value="">Select a role to add...</option>
                            {dbRoles.map(role => (
                              <option key={role.id} value={role.id}>{role.name}</option>
                            ))}
                          </select>
                          <button
                            onClick={() => {
                              if (selectedRoleToAdd && editingProjectId) {
                                createProjectRole({
                                  projectId: editingProjectId,
                                  roleId: selectedRoleToAdd,
                                });
                                setSelectedRoleToAdd('');
                              }
                            }}
                            disabled={!selectedRoleToAdd}
                            className="px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>

                        {/* List of assigned roles */}
                        <div className="w-full border border-slate-300 rounded-lg overflow-hidden bg-slate-50/50">
                          {projectRoles && projectRoles.length > 0 ? (
                            <div className="divide-y divide-slate-200">
                              {projectRoles.map((pr) => (
                                <div key={pr.id} className="p-2 flex items-center gap-2 hover:bg-white transition-colors">
                                  <Tag className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                  <span className="text-xs font-medium text-slate-700 w-24 truncate">{pr.role.name}</span>
                                  <select
                                    className="flex-1 px-2 py-1 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
                                    value={pr.memberId || ''}
                                    onChange={(e) => {
                                      updateProjectRole({
                                        id: pr.id,
                                        data: { memberId: e.target.value || null },
                                      });
                                    }}
                                  >
                                    <option value="">Unassigned</option>
                                    {teamMembers.map(member => (
                                      <option key={member.id} value={member.id}>{member.name}</option>
                                    ))}
                                  </select>
                                  <button
                                    onClick={() => removeProjectRole(pr.id)}
                                    className="text-slate-300 hover:text-red-500 p-1 rounded hover:bg-red-50 transition-colors"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="p-3 text-center text-slate-400 text-xs italic">
                              No roles assigned yet. Add a role above.
                            </div>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1.5">
                          Add role slots and assign team members to this project.
                        </p>
                      </div>
                    )}
                </div>

                <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 shrink-0">
                    <button
                        onClick={() => setIsModalOpen(false)}
                        className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-200/50 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={!newProjectName.trim()}
                        className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-lg shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {editingProjectId ? 'Save Changes' : 'Create Project'}
                    </button>
                </div>
            </div>
        </div>
      )}
    </>
  );
};
