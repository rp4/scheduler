import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const configId = searchParams.get('configId')

  const projects = await prisma.project.findMany({
    where: configId ? { configurationId: configId } : undefined,
    include: { team: true },
    orderBy: { startWeek: 'asc' },
  })
  return NextResponse.json(projects)
}

export async function POST(request: Request) {
  const body = await request.json()
  const project = await prisma.project.create({
    data: {
      name: body.name,
      budgetHours: body.budgetHours,
      startWeek: body.startWeek || 0,
      locked: body.locked || false,
      teamId: body.teamId,
      configurationId: body.configurationId,
      requiredSkills: JSON.stringify(body.requiredSkills || []),
      phasesConfig: JSON.stringify(body.phasesConfig || []),
    },
    include: { team: true },
  })
  return NextResponse.json(project, { status: 201 })
}
