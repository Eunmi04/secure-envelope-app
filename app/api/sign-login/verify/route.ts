import { NextRequest, NextResponse } from 'next/server'
import connectMongoDB from '@/lib/mongodb'
import LoginChallenge from '@/models/LoginChallenge'
import Certificate from '@/models/Certificate'

function base64ToUint8Array(base64: string) {
  return new Uint8Array(Buffer.from(base64, 'base64'))
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userEmail, nonce, signatureBase64 } = body

    if (!userEmail || !nonce || !signatureBase64) {
      return NextResponse.json(
        { message: 'userEmail, nonce, signatureBase64가 필요합니다.' },
        { status: 400 }
      )
    }

    await connectMongoDB()

    const challenge = await LoginChallenge.findOne({
      userEmail,
      nonce,
      used: false,
    }).sort({ createdAt: -1 })

    if (!challenge) {
      return NextResponse.json(
        { message: '유효한 challenge를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    if (new Date() > new Date(challenge.expiresAt)) {
      return NextResponse.json(
        { message: 'challenge가 만료되었습니다.' },
        { status: 400 }
      )
    }

    const certificate = await Certificate.findOne({
      userEmail,
      status: 'valid',
    }).sort({ createdAt: -1 })

    if (!certificate) {
      return NextResponse.json(
        { message: '유효한 인증서를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    const publicKey = await crypto.subtle.importKey(
      'jwk',
      certificate.signPublicKeyJwk,
      {
        name: 'RSASSA-PKCS1-v1_5',
        hash: 'SHA-256',
      },
      true,
      ['verify']
    )

    const encoder = new TextEncoder()
    const data = encoder.encode(nonce)
    const signatureBuffer = base64ToUint8Array(signatureBase64)

    const verified = await crypto.subtle.verify(
      {
        name: 'RSASSA-PKCS1-v1_5',
      },
      publicKey,
      signatureBuffer,
      data
    )

    if (!verified) {
      console.error('SIGN VERIFY FAILED', {
        userEmail,
        nonce,
        certificateSerial: certificate.serialNumber,
        certificateIssuedAt: certificate.issuedAt,
      })

      return NextResponse.json(
        {
          message: '전자서명 검증 실패',
          debug: {
            certificateSerial: certificate.serialNumber,
          },
        },
        { status: 401 }
      )
    }

    challenge.used = true
    await challenge.save()

    return NextResponse.json(
      {
        message: '전자서명 로그인 성공',
        success: true,
        userEmail,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error verifying sign-login:', error)
    return NextResponse.json(
      { message: '전자서명 로그인 검증 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}