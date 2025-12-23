# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build and Run Commands

```bash
npm install          # Install dependencies
npm run dev          # Start dev server on port 3000
npm run build        # Production build
npm run preview      # Preview production build
```

**Environment:** Set `GEMINI_API_KEY` in `.env.local` for API access.

## Architecture Overview

This is an audit scheduling application ("AuditScheduler Pro") built with React 19, TypeScript, and Vite. It helps schedule audit projects across team members with phase-based resource allocation.

### Core Data Flow

```
App.tsx (state management)
    ├── ProjectInput[] (projects)
    ├── GlobalConfig (phases, staff, skills)
    └── generateSchedule() → ScheduleData
            └── ScheduleRow[] with cells per week
```

### Key Types (`types.ts`)

- **ProjectInput**: Project with budget hours, start offset, phase config, and per-cell overrides
- **GlobalConfig**: Year, phases, staff types, and skills list
- **PhaseConfig**: Budget percentage, duration bounds, staff allocation percentages
- **ScheduleData/ScheduleRow/ScheduleCell**: Output format for the schedule table

### Schedule Engine (`services/scheduleEngine.ts`)

Two main exports:
- **generateSchedule()**: Converts projects + config into weekly schedule grid. Calculates hours per staff member per week based on phase allocations.
- **optimizeSchedule()**: Two-step optimization - first assigns real staff to template placeholders (skill/team matching), then runs simulated annealing to balance workload across weeks.

### View Modes

The app has three view modes controlled by `viewMode` state:
- **project**: Group schedule rows by project
- **member**: Group by team member
- **skill**: Group by skill

### Override System

Manual edits are stored in `ProjectInput.overrides`:
- `overrides.phase[date]`: Override phase for a specific week
- `overrides.staff["staffId-index"][date]`: Override hours for specific staff/week

### Staff Templates vs Real Staff

Staff types starting with `tmpl-` or `placeholder` are templates used for new projects. The optimizer replaces these with real staff members based on team, role matching, skill fit, and workload balancing.

## Path Alias

`@/*` maps to project root (configured in both `tsconfig.json` and `vite.config.ts`).
