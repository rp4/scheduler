import { NextResponse } from 'next/server'
import { writeFile } from 'fs/promises'
import path from 'path'
import { prisma } from '@/lib/prisma'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const SQLITE_MAGIC = 'SQLite format 3'

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get('database') as File | null

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File too large (max 10MB)' },
        { status: 400 }
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())

    // Validate SQLite magic bytes
    const header = buffer.slice(0, 16).toString('utf8')
    if (!header.startsWith(SQLITE_MAGIC)) {
      return NextResponse.json(
        { error: 'Invalid SQLite database file' },
        { status: 400 }
      )
    }

    // Disconnect Prisma before replacing the database
    await prisma.$disconnect()

    // Write the new database file
    const dbPath = path.join(process.cwd(), 'prisma', 'prisma', 'dev.db')
    await writeFile(dbPath, buffer)

    // Reconnect Prisma
    await prisma.$connect()

    return NextResponse.json({ success: true, message: 'Database uploaded successfully' })
  } catch (error) {
    console.error('Failed to upload database:', error)
    return NextResponse.json(
      { error: 'Failed to upload database' },
      { status: 500 }
    )
  }
}
