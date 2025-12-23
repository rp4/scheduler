import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
  const teams = await prisma.team.findMany({
    orderBy: { name: 'asc' },
  })
  return NextResponse.json(teams)
}

export async function POST(request: Request) {
  const body = await request.json()
  const team = await prisma.team.create({
    data: { name: body.name },
  })
  return NextResponse.json(team, { status: 201 })
}
