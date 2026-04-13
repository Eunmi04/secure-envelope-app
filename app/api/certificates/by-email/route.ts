import { NextRequest, NextResponse } from 'next/server'
import connectMongoDB from '@/lib/mongodb'
import Certificate from '@/models/Certificate'

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

    return NextResponse.json(
      {
        certificate: {
          userEmail: certificate.userEmail,
          subject: certificate.subject,
          issuer: certificate.issuer,
          serialNumber: certificate.serialNumber,
          signPublicKeyJwk: certificate.signPublicKeyJwk,
          encPublicKeyJwk: certificate.encPublicKeyJwk,
          issuedAt: certificate.issuedAt,
          expiresAt: certificate.expiresAt,
          status: certificate.status,
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error fetching certificate by email:', error)
    return NextResponse.json(
      { message: '인증서 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}