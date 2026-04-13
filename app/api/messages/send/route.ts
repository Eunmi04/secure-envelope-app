import { NextRequest, NextResponse } from 'next/server'
import connectMongoDB from '@/lib/mongodb'
import Message from '@/models/Message'
import Certificate from '@/models/Certificate'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const {
      senderEmail,
      receiverEmail,
      encryptedMessageBase64,
      encryptedAesKeyBase64,
      ivBase64,
      signatureBase64,
      plainMessageHash,
    } = body

    if (
      !senderEmail ||
      !receiverEmail ||
      !encryptedMessageBase64 ||
      !encryptedAesKeyBase64 ||
      !ivBase64 ||
      !signatureBase64 ||
      !plainMessageHash
    ) {
      return NextResponse.json(
        { message: '필수 전자봉투 데이터가 누락되었습니다.' },
        { status: 400 }
      )
    }

    await connectMongoDB()

    const senderCert = await Certificate.findOne({
      userEmail: senderEmail,
      status: 'valid',
    }).sort({ createdAt: -1 })

    const receiverCert = await Certificate.findOne({
      userEmail: receiverEmail,
      status: 'valid',
    }).sort({ createdAt: -1 })

    if (!senderCert) {
      return NextResponse.json(
        { message: '송신자의 유효한 인증서가 없습니다.' },
        { status: 404 }
      )
    }

    if (!receiverCert) {
      return NextResponse.json(
        { message: '수신자의 유효한 인증서가 없습니다.' },
        { status: 404 }
      )
    }

    const savedMessage = await Message.create({
      senderEmail,
      receiverEmail,
      encryptedMessageBase64,
      encryptedAesKeyBase64,
      ivBase64,
      signatureBase64,
      plainMessageHash,
      status: 'sent',
    })

    return NextResponse.json(
      {
        message: '전자봉투 메시지 전송 완료',
        savedMessage,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error sending secure message:', error)
    return NextResponse.json(
      { message: '전자봉투 메시지 전송 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}