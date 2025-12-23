import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const project = await prisma.project.findUnique({
    where: { id },
    include: { team: true, assignments: true },
  })
  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }
  return NextResponse.json(project)
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()

  const data: any = {}
  if (body.name !== undefined) data.name = body.name
  if (body.budgetHours !== undefined) data.budgetHours = body.budgetHours
  if (body.startWeek !== undefined) data.startWeek = body.startWeek
  if (body.locked !== undefined) data.locked = body.locked
  if (body.teamId !== undefined) data.teamId = body.teamId
  if (body.requiredSkills !== undefined) data.requiredSkills = JSON.stringify(body.requiredSkills)
  if (body.phasesConfig !== undefined) data.phasesConfig = JSON.stringify(body.phasesConfig)
  if (body.overrides !== undefined) data.overrides = JSON.stringify(body.overrides)

  const project = await prisma.project.update({
    where: { id },
    data,
    include: { team: true },
  })
  return NextResponse.json(project)
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  await prisma.project.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
