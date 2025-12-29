'use client'

import React, { useState, useMemo } from 'react';
import { GlobalConfig } from '@/types/schedule';
import { Plus, Trash2, Award, Search, ChevronRight, AlertCircle } from 'lucide-react';

interface SkillListProps {
  config: GlobalConfig;
  onAddSkill: (name: string) => void;
  onRemoveSkill: (name: string) => void;
}

export const SkillList: React.FC<SkillListProps> = ({ config, onAddSkill, onRemoveSkill }) => {
  const [newSkill, setNewSkill] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedSkills, setExpandedSkills] = useState<Set<string>>(new Set());

  const handleAddSkill = () => {
    if (!newSkill.trim()) return;
    if (config.skills.includes(newSkill.trim())) return;
    onAddSkill(newSkill.trim());
    setNewSkill('');
  };

  const toggleSkill = (skillName: string) => {
    setExpandedSkills(prev => {
      const newSet = new Set(prev);
      if (newSet.has(skillName)) {
        newSet.delete(skillName);
      } else {
        newSet.add(skillName);
      }
      return newSet;
    });
  };

  // Calculate skill statistics with staff details
  const skillData = useMemo(() => {
    return config.skills.map(skill => {
      const staffWithSkill = config.staffTypes
        .filter(s => s.skills?.[skill] && s.skills[skill] !== 'None')
        .map(s => ({
          id: s.id,
          name: s.name,
          level: s.skills?.[skill] || 'None',
          team: s.team
        }));

      return {
        name: skill,
        staff: staffWithSkill,
        hasStaff: staffWithSkill.length > 0
      };
    });
  }, [config.skills, config.staffTypes]);

  const filteredSkills = skillData.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 h-full flex flex-col min-h-0 overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-center mb-3 shrink-0">
        <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <div className="w-6 h-6 bg-indigo-100 rounded flex items-center justify-center">
            <Award className="w-3.5 h-3.5 text-indigo-600" />
          </div>
          Skills Library
        </h2>
        <span className="text-[10px] text-slate-400 font-mono bg-slate-100 px-1.5 py-0.5 rounded">{config.skills.length}</span>
      </div>

      {/* Search & Add */}
      <div className="mb-3 space-y-2 shrink-0">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search skills..."
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 text-slate-700 placeholder-slate-400 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex gap-1.5">
            <input
                type="text"
                placeholder="Add new skill..."
                className="flex-1 px-2.5 py-1.5 text-xs bg-white border border-slate-300 text-slate-700 placeholder-slate-400 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddSkill()}
            />
            <button
                onClick={handleAddSkill}
                disabled={!newSkill.trim()}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-2.5 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
                <Plus className="w-4 h-4" />
            </button>
        </div>
      </div>

      {/* Skill List */}
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar space-y-1 pr-1">
        {filteredSkills.map((skill) => {
          const isExpanded = expandedSkills.has(skill.name);
          const hasNoStaff = !skill.hasStaff;

          return (
            <div
              key={skill.name}
              className={`rounded-lg border transition-all overflow-hidden ${
                hasNoStaff
                  ? 'bg-red-50 border-red-200'
                  : 'bg-white border-slate-200 hover:border-indigo-300'
              }`}
            >
              {/* Skill Header - Clickable */}
              <div
                onClick={() => toggleSkill(skill.name)}
                className="w-full p-2.5 text-left flex items-center gap-2 hover:bg-slate-50 transition-colors group cursor-pointer"
              >
                <div className={`shrink-0 transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                </div>
                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                  {hasNoStaff && (
                    <AlertCircle className="w-3 h-3 text-red-500 shrink-0" />
                  )}
                  <span className="text-xs font-semibold text-slate-700 truncate" title={skill.name}>
                    {skill.name}
                  </span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveSkill(skill.name);
                  }}
                  className="text-slate-300 hover:text-red-500 hover:bg-red-50 rounded p-0.5 transition-colors opacity-0 group-hover:opacity-100"
                  title="Remove Skill"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>

              {/* Expanded Staff List */}
              {isExpanded && (
                <div className="border-t border-slate-100 bg-slate-50 p-2">
                  {skill.staff.length > 0 ? (
                    <div className="space-y-1">
                      {skill.staff.map((staff) => {
                        const levelColor = staff.level === 'Advanced' ? 'bg-emerald-500' : staff.level === 'Intermediate' ? 'bg-amber-500' : 'bg-sky-500';
                        const levelText = staff.level === 'Advanced' ? 'ADV' : staff.level === 'Intermediate' ? 'INT' : 'BEG';
                        return (
                          <div
                            key={staff.id}
                            className="flex items-center gap-2 p-1.5 bg-white rounded border border-slate-100"
                          >
                            <div className={`w-1.5 h-1.5 ${levelColor} rounded-full shrink-0`}></div>
                            <span className="text-[11px] text-slate-700 flex-1 truncate">{staff.name}</span>
                            <span className={`text-[9px] font-bold ${
                              staff.level === 'Advanced' ? 'text-emerald-600' :
                              staff.level === 'Intermediate' ? 'text-amber-600' : 'text-sky-600'
                            }`}>
                              {levelText}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-[10px] text-red-500 text-center py-1">
                      No staff members have this skill
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {filteredSkills.length === 0 && (
          <div className="p-6 text-center">
            <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <Award className="w-5 h-5 text-slate-400" />
            </div>
            <div className="text-slate-400 text-xs">No skills found</div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="mt-3 pt-3 border-t border-slate-200 flex items-center justify-center gap-3 text-[9px] shrink-0">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-emerald-500 rounded-sm"></div>
          <span className="text-slate-500">Advanced</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-amber-500 rounded-sm"></div>
          <span className="text-slate-500">Intermediate</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-sky-500 rounded-sm"></div>
          <span className="text-slate-500">Beginner</span>
        </div>
      </div>
    </div>
  );
};
