import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const member = await prisma.member.findUnique({
    where: { id },
    include: { team: true, role: true, assignments: true },
  })
  if (!member) {
    return NextResponse.json({ error: 'Member not found' }, { status: 404 })
  }
  return NextResponse.json(member)
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()

  const data: any = {}
  if (body.name !== undefined) data.name = body.name
  if (body.roleId !== undefined) data.roleId = body.roleId
  if (body.teamId !== undefined) data.teamId = body.teamId
  if (body.maxHours !== undefined) data.maxHours = body.maxHours
  if (body.color !== undefined) data.color = body.color
  if (body.skills !== undefined) data.skills = JSON.stringify(body.skills)

  const member = await prisma.member.update({
    where: { id },
    data,
    include: { team: true, role: true },
  })
  return NextResponse.json(member)
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  await prisma.member.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
