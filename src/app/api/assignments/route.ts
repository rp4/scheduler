import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get('projectId')
  const memberId = searchParams.get('memberId')

  const where: any = {}
  if (projectId) where.projectId = projectId
  if (memberId) where.memberId = memberId

  const assignments = await prisma.assignment.findMany({
    where,
    include: { project: true, member: true },
    orderBy: { week: 'asc' },
  })
  return NextResponse.json(assignments)
}

export async function POST(request: Request) {
  const body = await request.json()

  // Upsert: create or update assignment
  const assignment = await prisma.assignment.upsert({
    where: {
      projectId_memberId_week: {
        projectId: body.projectId,
        memberId: body.memberId,
        week: body.week,
      },
    },
    update: {
      hours: body.hours,
      phaseId: body.phaseId,
    },
    create: {
      projectId: body.projectId,
      memberId: body.memberId,
      week: body.week,
      hours: body.hours || 0,
      phaseId: body.phaseId,
    },
  })
  return NextResponse.json(assignment, { status: 201 })
}
