'use client'

import React from 'react';
import { GlobalConfig, StaffType } from '@/types/schedule';
import { X, Settings, Users, PieChart, AlertCircle, CheckCircle2, Trash2, Plus, User } from 'lucide-react';

interface ConfigurationPanelProps {
  config: GlobalConfig;
  teams: string[];
  onUpdateConfig: (phases: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const ConfigurationPanel: React.FC<ConfigurationPanelProps> = ({
  config,
  teams,
  onUpdateConfig,
  isOpen,
  onClose
}) => {
  if (!isOpen) return null;

  const [localPhases, setLocalPhases] = React.useState(config.phases);

  const updatePhase = (phaseIndex: number, field: string, value: any) => {
    const newPhases = [...localPhases];
    (newPhases[phaseIndex] as any)[field] = value;
    setLocalPhases(newPhases);
  };

  const updateStaffAllocation = (phaseIndex: number, staffTypeId: string, percentage: number) => {
    const newPhases = [...localPhases];
    const allocationIndex = newPhases[phaseIndex].staffAllocation.findIndex(s => s.staffTypeId === staffTypeId);
    if (allocationIndex >= 0) {
      newPhases[phaseIndex].staffAllocation[allocationIndex].percentage = percentage;
    }
    setLocalPhases(newPhases);
  };

  const handleSave = () => {
    onUpdateConfig(JSON.stringify(localPhases));
    onClose();
  };

  const totalBudgetPercent = localPhases.reduce((acc, p) => acc + p.percentBudget, 0);
  const isBudgetValid = Math.abs(totalBudgetPercent - 100) < 0.1;

  return (
    <div className="fixed inset-0 bg-slate-900/50 z-50 flex justify-end backdrop-blur-sm">
      <div className="bg-white w-full max-w-2xl h-full shadow-2xl flex flex-col">
        <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Settings className="w-5 h-5 text-indigo-600" />
            Global Configuration
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
          <section>
            <div className="flex justify-between items-end mb-4 border-b pb-2">
               <h3 className="text-md font-bold text-slate-800 flex items-center gap-2">
                <PieChart className="w-4 h-4" />
                Phase Definitions & Allocations
              </h3>
              <div className={`text-sm flex items-center gap-1 font-medium ${isBudgetValid ? 'text-emerald-600' : 'text-amber-600'}`}>
                {isBudgetValid ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                Total Budget: {totalBudgetPercent}%
              </div>
            </div>

            <div className="space-y-6">
              {localPhases.map((phase, idx) => {
                 const totalStaffAllocation = phase.staffAllocation.reduce((sum, s) => sum + s.percentage, 0);
                 const isAllocationValid = Math.abs(totalStaffAllocation - 100) < 0.1;

                 return (
                <div key={phase.name} className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="bg-slate-100 p-3 flex justify-between items-center">
                    <span className="font-semibold text-slate-700">{phase.name}</span>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-slate-500">Budget %</label>
                        <input
                          type="number"
                          className="w-16 px-2 py-1 border rounded text-sm text-center focus:ring-2 focus:ring-indigo-500 outline-none"
                          value={phase.percentBudget}
                          onChange={(e) => updatePhase(idx, 'percentBudget', parseFloat(e.target.value))}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="p-4 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Min Weeks</label>
                        <input
                          type="number"
                          className="w-full px-2 py-1 border rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                          value={phase.minWeeks}
                          onChange={(e) => updatePhase(idx, 'minWeeks', parseInt(e.target.value))}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Max Weeks</label>
                        <input
                          type="number"
                          className="w-full px-2 py-1 border rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                          value={phase.maxWeeks}
                          onChange={(e) => updatePhase(idx, 'maxWeeks', parseInt(e.target.value))}
                        />
                      </div>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <div className="flex justify-between items-center mb-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Staff Distribution (% of Phase)</label>
                        <span className={`text-xs font-mono font-bold ${isAllocationValid ? 'text-emerald-600' : 'text-amber-600'}`}>
                            Sum: {totalStaffAllocation}%
                        </span>
                      </div>
                      <div className="grid grid-cols-1 gap-3">
                        {config.staffTypes.filter(s => s.id.startsWith('tmpl-')).map(staff => {
                          const allocation = phase.staffAllocation.find(s => s.staffTypeId === staff.id);
                          const val = allocation ? allocation.percentage : 0;
                          return (
                            <div key={staff.id} className="flex items-center justify-between text-sm">
                               <span className="text-slate-600 w-1/3 text-xs truncate" title={staff.name}>
                                    {staff.role || staff.name}
                               </span>
                               <div className="flex-1 mx-3 flex items-center">
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                    value={val}
                                    onChange={(e) => updateStaffAllocation(idx, staff.id, parseInt(e.target.value))}
                                />
                               </div>
                               <div className="w-12 text-right">
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        className="w-full text-right text-xs p-1 border rounded"
                                        value={val}
                                        onChange={(e) => updateStaffAllocation(idx, staff.id, parseInt(e.target.value))}
                                    />
                               </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            </div>
          </section>
        </div>
        <div className="p-4 border-t bg-slate-50 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors">
            Cancel
          </button>
          <button onClick={handleSave} className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};
