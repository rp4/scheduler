import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
  const phases = await prisma.phase.findMany({
    orderBy: { sortOrder: 'asc' },
  })
  return NextResponse.json(phases)
}

export async function POST(request: Request) {
  const body = await request.json()
  const phase = await prisma.phase.create({
    data: {
      name: body.name,
      defaultPercentBudget: body.defaultPercentBudget || 25,
      defaultMinWeeks: body.defaultMinWeeks || 1,
      defaultMaxWeeks: body.defaultMaxWeeks || 4,
      sortOrder: body.sortOrder || 0,
    },
  })
  return NextResponse.json(phase, { status: 201 })
}
