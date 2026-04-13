import { NextRequest, NextResponse } from 'next/server'
import connectMongoDB from '@/lib/mongodb'
import User from '@/models/User'

export async function POST(req: NextRequest) {
  try {
    const { user, account } = await req.json()
    const { name, email, image } = user

    await connectMongoDB()

    const userExists = await User.findOne({ email })

    if (!userExists) {
      await User.create({
        name,
        email,
        image,
        provider: account?.provider || 'unknown',
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}