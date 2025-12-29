import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()

  const projectRole = await prisma.projectRole.update({
    where: { id },
    data: {
      roleId: body.roleId,
      memberId: body.memberId ?? null,
    },
    include: {
      role: true,
      member: true,
    },
  })

  return NextResponse.json(projectRole)
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  await prisma.projectRole.delete({
    where: { id },
  })

  return NextResponse.json({ success: true })
}
