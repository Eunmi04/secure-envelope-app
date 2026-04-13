import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import connectMongoDB from '@/lib/mongodb'
import LoginChallenge from '@/models/LoginChallenge'
import Certificate from '@/models/Certificate'

function createNonce() {
  return crypto.randomBytes(32).toString('hex')
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userEmail } = body

    if (!userEmail) {
      return NextResponse.json(
        { message: 'userEmail이 필요합니다.' },
        { status: 400 }
      )
    }

    await connectMongoDB()

    const certificate = await Certificate.findOne({
      userEmail,
      status: 'valid',
    }).sort({ createdAt: -1 })

    if (!certificate) {
      return NextResponse.json(
        { message: '유효한 인증서가 없습니다. 먼저 인증서를 발급받으세요.' },
        { status: 404 }
      )
    }

    const nonce = createNonce()
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000)

    await LoginChallenge.create({
      userEmail,
      nonce,
      expiresAt,
      used: false,
    })

    return NextResponse.json(
      {
        message: 'challenge 발급 완료',
        nonce,
        expiresAt,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating sign-login challenge:', error)
    return NextResponse.json(
      { message: 'challenge 발급 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}