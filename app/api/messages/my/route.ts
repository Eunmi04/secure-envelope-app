import { NextRequest, NextResponse } from 'next/server'
import connectMongoDB from '@/lib/mongodb'
import Message from '@/models/Message'

export async function GET(request: NextRequest) {
  try {
    const userEmail = request.nextUrl.searchParams.get('userEmail')

    if (!userEmail) {
      return NextResponse.json(
        { message: 'userEmail이 필요합니다.' },
        { status: 400 }
      )
    }

    await connectMongoDB()

    const receivedMessages = await Message.find({
      receiverEmail: userEmail,
    })
      .sort({ createdAt: -1 })
      .lean()

    return NextResponse.json(
      {
        messages: receivedMessages,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error fetching my messages:', error)
    return NextResponse.json(
      { message: '메시지 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}