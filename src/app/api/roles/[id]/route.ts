import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  await prisma.role.delete({
    where: { id },
  })

  return NextResponse.json({ success: true })
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()

  const role = await prisma.role.update({
    where: { id },
    data: { name: body.name },
  })

  return NextResponse.json(role)
}
