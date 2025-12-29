import { NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import path from 'path'

export async function GET() {
  try {
    const dbPath = path.join(process.cwd(), 'prisma', 'prisma', 'dev.db')
    const fileBuffer = await readFile(dbPath)

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/x-sqlite3',
        'Content-Disposition': 'attachment; filename="scheduler.db"',
        'Content-Length': fileBuffer.length.toString(),
      },
    })
  } catch (error) {
    console.error('Failed to download database:', error)
    return NextResponse.json(
      { error: 'Failed to download database' },
      { status: 500 }
    )
  }
}
