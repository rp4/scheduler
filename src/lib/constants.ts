import { GlobalConfig, PhaseName, StaffType, ProjectInput } from '@/types/schedule';

export const TEAMS = ['Finance', 'IT', 'Operations', 'Compliance', 'General'];

export const SKILLS_LIST = [
  'Anti-Money AML',
  'Cloud Security',
  'Communication',
  'Cybersecurity',
  'Data Analytics',
  'Risk Management',
  'Financial Accounting',
  'Fraud Investigation',
  'Governance',
  'Internal Controls (SOX)',
  'IT General Controls',
  'Process Improvement',
  'Project Management',
  'Python/R',
  'Regulatory Compliance',
  'SQL',
];

export const DEFAULT_ROLES = [
  'Portfolio Manager',
  'Audit Lead',
  'Staff Auditor',
  'Senior Auditor',
  'IT Specialist',
  'Quality Reviewer',
];

export const DEFAULT_STAFF_TYPES: StaffType[] = [
  { id: 'pm-1', name: 'Sarah Chen', role: 'Portfolio Manager', maxHoursPerWeek: 15, color: 'bg-purple-100 text-purple-800', team: 'Finance', skills: { 'Project Management': 'Advanced', 'Communication': 'Advanced' } },
  { id: 'lead-1', name: 'Marcus Thorne', role: 'Audit Lead', maxHoursPerWeek: 40, color: 'bg-blue-100 text-blue-800', team: 'IT', skills: { 'Cybersecurity': 'Advanced', 'IT General Controls': 'Advanced' } },
  { id: 'lead-2', name: 'Elena Rodriguez', role: 'Audit Lead', maxHoursPerWeek: 40, color: 'bg-blue-100 text-blue-800', team: 'Finance', skills: { 'Financial Accounting': 'Advanced', 'Internal Controls (SOX)': 'Intermediate' } },
  { id: 'staff-1', name: 'Alex Rivera', role: 'Senior Auditor', maxHoursPerWeek: 40, color: 'bg-green-100 text-green-800', team: 'Operations', skills: { 'Data Analytics': 'Intermediate', 'SQL': 'Advanced' } },
  { id: 'staff-2', name: 'Priya Patel', role: 'Senior Auditor', maxHoursPerWeek: 40, color: 'bg-green-100 text-green-800', team: 'IT', skills: { 'Cloud Security': 'Intermediate', 'Python/R': 'Beginner' } },

  { id: 'tmpl-pm', name: '', role: 'Portfolio Manager', maxHoursPerWeek: 40, color: 'bg-slate-100 text-slate-400', team: 'General' },
  { id: 'tmpl-lead', name: '', role: 'Audit Lead', maxHoursPerWeek: 40, color: 'bg-slate-100 text-slate-400', team: 'General' },
  { id: 'tmpl-staff', name: '', role: 'Senior Auditor', maxHoursPerWeek: 40, color: 'bg-slate-100 text-slate-400', team: 'General' },
  { id: 'placeholder', name: '', role: 'Unassigned', maxHoursPerWeek: 40, color: 'bg-slate-200 text-slate-500', team: 'General' },
];

export const DEFAULT_PHASES = [
  {
    name: PhaseName.PRE_PLANNING,
    percentBudget: 10,
    minWeeks: 1,
    maxWeeks: 2,
    staffAllocation: [
      { staffTypeId: 'tmpl-pm', percentage: 40 },
      { staffTypeId: 'tmpl-lead', percentage: 60 },
    ],
  },
  {
    name: PhaseName.PLANNING,
    percentBudget: 20,
    minWeeks: 2,
    maxWeeks: 4,
    staffAllocation: [
      { staffTypeId: 'tmpl-pm', percentage: 10 },
      { staffTypeId: 'tmpl-lead', percentage: 40 },
      { staffTypeId: 'tmpl-staff', percentage: 50 },
    ],
  },
  {
    name: PhaseName.FIELDWORK,
    percentBudget: 50,
    minWeeks: 4,
    maxWeeks: 8,
    staffAllocation: [
      { staffTypeId: 'tmpl-pm', percentage: 5 },
      { staffTypeId: 'tmpl-lead', percentage: 25 },
      { staffTypeId: 'tmpl-staff', percentage: 70 },
    ],
  },
  {
    name: PhaseName.REPORTING,
    percentBudget: 20,
    minWeeks: 2,
    maxWeeks: 4,
    staffAllocation: [
      { staffTypeId: 'tmpl-pm', percentage: 20 },
      { staffTypeId: 'tmpl-lead', percentage: 50 },
      { staffTypeId: 'tmpl-staff', percentage: 30 },
    ],
  },
];

export const DEFAULT_CONFIG: GlobalConfig = {
  year: 2026,
  staffTypes: DEFAULT_STAFF_TYPES,
  skills: SKILLS_LIST,
  phases: DEFAULT_PHASES,
  roles: DEFAULT_ROLES,
};

export const getBasePhases = () => JSON.parse(JSON.stringify(DEFAULT_PHASES));
