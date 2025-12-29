import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get('projectId')

  const where = projectId ? { projectId } : {}

  const projectRoles = await prisma.projectRole.findMany({
    where,
    include: {
      role: true,
      member: true,
    },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json(projectRoles)
}

export async function POST(request: Request) {
  const body = await request.json()

  const projectRole = await prisma.projectRole.create({
    data: {
      projectId: body.projectId,
      roleId: body.roleId,
      memberId: body.memberId || null,
    },
    include: {
      role: true,
      member: true,
    },
  })

  return NextResponse.json(projectRole, { status: 201 })
}
