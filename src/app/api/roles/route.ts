import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
  const roles = await prisma.role.findMany({
    orderBy: { name: 'asc' },
  })
  return NextResponse.json(roles)
}

export async function POST(request: Request) {
  const body = await request.json()
  const role = await prisma.role.create({
    data: { name: body.name },
  })
  return NextResponse.json(role, { status: 201 })
}
