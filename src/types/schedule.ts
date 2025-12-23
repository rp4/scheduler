export enum PhaseName {
  PRE_PLANNING = 'Pre-Planning',
  PLANNING = 'Planning',
  FIELDWORK = 'Fieldwork',
  REPORTING = 'Reporting'
}

export type SkillLevel = 'None' | 'Beginner' | 'Intermediate' | 'Advanced';

export interface StaffType {
  id: string;
  name: string;
  role: string;
  maxHoursPerWeek: number;
  color: string;
  team?: string;
  skills?: Record<string, SkillLevel>;
}

export interface StaffPhaseConfig {
  staffTypeId: string;
  percentage: number;
}

export interface PhaseConfig {
  name: PhaseName;
  percentBudget: number;
  minWeeks: number;
  maxWeeks: number;
  staffAllocation: StaffPhaseConfig[];
}

export interface GlobalConfig {
  year: number;
  phases: PhaseConfig[];
  staffTypes: StaffType[];
  skills: string[];
}

export interface ProjectOverrides {
  phase?: Record<string, PhaseName>;
  staff?: Record<string, Record<string, number>>;
}

export interface ProjectInput {
  id: string;
  name: string;
  budgetHours: number;
  startWeekOffset: number;
  locked: boolean;
  phasesConfig: PhaseConfig[];
  overrides?: ProjectOverrides;
  team?: string;
  requiredSkills?: string[];
}

export interface ScheduleCell {
  date: string;
  hours: number;
  phase: PhaseName | string | null;
  isOverride?: boolean;
}

export interface ScheduleRow {
  rowId: string;
  projectId: string;
  staffTypeId: string;
  projectName: string;
  staffTypeName: string;
  staffRole: string;
  staffIndex: number;
  cells: ScheduleCell[];
  totalHours: number;
}

export interface ScheduleData {
  headers: string[];
  rows: ScheduleRow[];
}
