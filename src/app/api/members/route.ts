import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const teamId = searchParams.get('teamId')
  const includeTemplates = searchParams.get('includeTemplates') === 'true'

  const where: any = {}
  if (teamId) where.teamId = teamId
  if (!includeTemplates) where.isTemplate = false

  const members = await prisma.member.findMany({
    where,
    include: { team: true, role: true },
    orderBy: { name: 'asc' },
  })
  return NextResponse.json(members)
}

export async function POST(request: Request) {
  const body = await request.json()
  const member = await prisma.member.create({
    data: {
      name: body.name,
      roleId: body.roleId,
      teamId: body.teamId,
      maxHours: body.maxHours || 40,
      color: body.color || 'bg-slate-100 text-slate-800',
      skills: JSON.stringify(body.skills || {}),
      isTemplate: body.isTemplate || false,
    },
    include: { team: true, role: true },
  })
  return NextResponse.json(member, { status: 201 })
}
