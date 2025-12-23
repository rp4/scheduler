import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId')
  const year = searchParams.get('year')

  const where: any = {}
  if (userId) where.userId = userId
  if (year) where.year = parseInt(year)

  const configs = await prisma.configuration.findMany({
    where,
    include: { user: true },
  })
  return NextResponse.json(configs)
}

export async function POST(request: Request) {
  const body = await request.json()
  const config = await prisma.configuration.create({
    data: {
      userId: body.userId,
      year: body.year,
      phases: body.phases,
    },
  })
  return NextResponse.json(config, { status: 201 })
}
