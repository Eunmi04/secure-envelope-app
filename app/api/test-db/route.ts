import { NextResponse } from 'next/server'
import connectMongoDB from '@/lib/mongodb'

export async function GET() {
  try {
    await connectMongoDB()
    return NextResponse.json({ message: 'DB connected successfully' })
  } catch (error) {
    console.error('DB TEST ERROR:', error)
    return NextResponse.json(
      {
        message: 'DB connection failed',
        error: error instanceof Error ? error.message : 'unknown error',
      },
      { status: 500 }
    )
  }
}