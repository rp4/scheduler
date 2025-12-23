import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const TEAMS = ['Finance', 'IT', 'Operations', 'Compliance', 'General'];

const SKILLS = [
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

const ROLES = ['Portfolio Manager', 'Audit Lead', 'Senior Auditor', 'Unassigned'];

const PHASES = [
  { name: 'Pre-Planning', defaultPercentBudget: 10, defaultMinWeeks: 1, defaultMaxWeeks: 2, sortOrder: 1 },
  { name: 'Planning', defaultPercentBudget: 20, defaultMinWeeks: 2, defaultMaxWeeks: 4, sortOrder: 2 },
  { name: 'Fieldwork', defaultPercentBudget: 50, defaultMinWeeks: 4, defaultMaxWeeks: 8, sortOrder: 3 },
  { name: 'Reporting', defaultPercentBudget: 20, defaultMinWeeks: 2, defaultMaxWeeks: 4, sortOrder: 4 },
];

const DEFAULT_PHASES_CONFIG = [
  {
    name: 'Pre-Planning',
    percentBudget: 10,
    minWeeks: 1,
    maxWeeks: 2,
    staffAllocation: [
      { staffTypeId: 'tmpl-pm', percentage: 40 },
      { staffTypeId: 'tmpl-lead', percentage: 60 },
    ],
  },
  {
    name: 'Planning',
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
    name: 'Fieldwork',
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
    name: 'Reporting',
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

async function main() {
  console.log('Seeding database...');

  // Create teams
  const teamMap: Record<string, string> = {};
  for (const name of TEAMS) {
    const team = await prisma.team.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    teamMap[name] = team.id;
  }
  console.log('Created teams');

  // Create skills
  for (const name of SKILLS) {
    await prisma.skill.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }
  console.log('Created skills');

  // Create roles
  const roleMap: Record<string, string> = {};
  for (const name of ROLES) {
    const role = await prisma.role.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    roleMap[name] = role.id;
  }
  console.log('Created roles');

  // Create phases
  for (const phase of PHASES) {
    await prisma.phase.upsert({
      where: { name: phase.name },
      update: phase,
      create: phase,
    });
  }
  console.log('Created phases');

  // Create default user
  const user = await prisma.user.upsert({
    where: { email: 'demo@example.com' },
    update: {},
    create: {
      email: 'demo@example.com',
      name: 'Demo User',
    },
  });
  console.log('Created default user');

  // Create default configuration for user
  const config = await prisma.configuration.upsert({
    where: { userId_year: { userId: user.id, year: 2026 } },
    update: { phases: JSON.stringify(DEFAULT_PHASES_CONFIG) },
    create: {
      userId: user.id,
      year: 2026,
      phases: JSON.stringify(DEFAULT_PHASES_CONFIG),
    },
  });
  console.log('Created configuration');

  // Create template members
  const templates = [
    { id: 'tmpl-pm', name: '', role: 'Portfolio Manager', maxHours: 40, color: 'bg-slate-100 text-slate-400', team: 'General', isTemplate: true },
    { id: 'tmpl-lead', name: '', role: 'Audit Lead', maxHours: 40, color: 'bg-slate-100 text-slate-400', team: 'General', isTemplate: true },
    { id: 'tmpl-staff', name: '', role: 'Senior Auditor', maxHours: 40, color: 'bg-slate-100 text-slate-400', team: 'General', isTemplate: true },
    { id: 'placeholder', name: '', role: 'Unassigned', maxHours: 40, color: 'bg-slate-200 text-slate-500', team: 'General', isTemplate: true },
  ];

  for (const tmpl of templates) {
    await prisma.member.upsert({
      where: { id: tmpl.id },
      update: {},
      create: {
        id: tmpl.id,
        name: tmpl.name,
        roleId: roleMap[tmpl.role],
        teamId: teamMap[tmpl.team],
        maxHours: tmpl.maxHours,
        color: tmpl.color,
        skills: '{}',
        isTemplate: tmpl.isTemplate,
      },
    });
  }
  console.log('Created template members');

  // Create real members
  const members = [
    { id: 'pm-1', name: 'Sarah Chen', role: 'Portfolio Manager', maxHours: 15, color: 'bg-purple-100 text-purple-800', team: 'Finance', skills: { 'Project Management': 'Advanced', 'Communication': 'Advanced' } },
    { id: 'lead-1', name: 'Marcus Thorne', role: 'Audit Lead', maxHours: 40, color: 'bg-blue-100 text-blue-800', team: 'IT', skills: { 'Cybersecurity': 'Advanced', 'IT General Controls': 'Advanced' } },
    { id: 'lead-2', name: 'Elena Rodriguez', role: 'Audit Lead', maxHours: 40, color: 'bg-blue-100 text-blue-800', team: 'Finance', skills: { 'Financial Accounting': 'Advanced', 'Internal Controls (SOX)': 'Intermediate' } },
    { id: 'staff-1', name: 'Alex Rivera', role: 'Senior Auditor', maxHours: 40, color: 'bg-green-100 text-green-800', team: 'Operations', skills: { 'Data Analytics': 'Intermediate', 'SQL': 'Advanced' } },
    { id: 'staff-2', name: 'Priya Patel', role: 'Senior Auditor', maxHours: 40, color: 'bg-green-100 text-green-800', team: 'IT', skills: { 'Cloud Security': 'Intermediate', 'Python/R': 'Beginner' } },
  ];

  for (const member of members) {
    await prisma.member.upsert({
      where: { id: member.id },
      update: {},
      create: {
        id: member.id,
        name: member.name,
        roleId: roleMap[member.role],
        teamId: teamMap[member.team],
        maxHours: member.maxHours,
        color: member.color,
        skills: JSON.stringify(member.skills),
        isTemplate: false,
      },
    });
  }
  console.log('Created members');

  // Create sample projects
  const projects = [
    { name: 'Cybersecurity Review', budgetHours: 400, startWeek: 0, team: 'IT', requiredSkills: ['Cybersecurity', 'IT General Controls'] },
    { name: 'Financial Controls 2026', budgetHours: 600, startWeek: 4, team: 'Finance', requiredSkills: ['Financial Accounting', 'Internal Controls (SOX)'] },
  ];

  for (const project of projects) {
    await prisma.project.create({
      data: {
        name: project.name,
        budgetHours: project.budgetHours,
        startWeek: project.startWeek,
        teamId: teamMap[project.team],
        requiredSkills: JSON.stringify(project.requiredSkills),
        phasesConfig: JSON.stringify(DEFAULT_PHASES_CONFIG),
        configurationId: config.id,
      },
    });
  }
  console.log('Created projects');

  console.log('Seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
