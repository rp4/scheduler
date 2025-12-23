import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
  const skills = await prisma.skill.findMany({
    orderBy: { name: 'asc' },
  })
  return NextResponse.json(skills)
}

export async function POST(request: Request) {
  const body = await request.json()
  const skill = await prisma.skill.create({
    data: { name: body.name },
  })
  return NextResponse.json(skill, { status: 201 })
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url)
  const name = searchParams.get('name')
  if (!name) {
    return NextResponse.json({ error: 'Name required' }, { status: 400 })
  }
  await prisma.skill.delete({ where: { name } })
  return NextResponse.json({ success: true })
}
