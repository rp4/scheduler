import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const config = await prisma.configuration.findUnique({
    where: { id },
    include: { user: true, projects: true },
  })
  if (!config) {
    return NextResponse.json({ error: 'Configuration not found' }, { status: 404 })
  }
  return NextResponse.json(config)
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()
  const config = await prisma.configuration.update({
    where: { id },
    data: {
      year: body.year,
      phases: body.phases,
    },
  })
  return NextResponse.json(config)
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  await prisma.configuration.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
