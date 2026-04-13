import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import connectMongoDB from '@/lib/mongodb'
import Certificate from '@/models/Certificate'

function createSerialNumber() {
  const randomPart = crypto.randomBytes(4).toString('hex')
  return `CERT-${Date.now()}-${randomPart}`
}

function signCertificatePayload(payload: string) {
  const secret = process.env.CERT_CA_SECRET || 'dev-ca-secret'
  return crypto.createHmac('sha256', secret).update(payload).digest('hex')
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userEmail, signPublicKeyJwk, encPublicKeyJwk } = body

    if (!userEmail || !signPublicKeyJwk || !encPublicKeyJwk) {
      return NextResponse.json(
        { message: 'userEmail, signPublicKeyJwk, encPublicKeyJwk가 필요합니다.' },
        { status: 400 }
      )
    }

    await connectMongoDB()

    await Certificate.updateMany(
      { userEmail, status: 'valid' },
      { $set: { status: 'revoked' } }
    )

    const issuedAt = new Date()
    const expiresAt = new Date()
    expiresAt.setFullYear(expiresAt.getFullYear() + 1)

    const serialNumber = createSerialNumber()

    const certificateData = {
      serialNumber,
      subject: userEmail,
      issuer: 'SecureEnvelopeCA',
      signPublicKeyJwk,
      encPublicKeyJwk,
      issuedAt: issuedAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
    }

    const certificateJson = JSON.stringify(certificateData)
    const signature = signCertificatePayload(certificateJson)

    const savedCertificate = await Certificate.create({
      userEmail,
      subject: userEmail,
      issuer: 'SecureEnvelopeCA',
      serialNumber,
      signPublicKeyJwk,
      encPublicKeyJwk,
      certificateJson,
      signature,
      issuedAt,
      expiresAt,
      status: 'valid',
    })

    return NextResponse.json(
      {
        message: '인증서 발급 완료',
        certificate: {
          serialNumber: savedCertificate.serialNumber,
          subject: savedCertificate.subject,
          issuer: savedCertificate.issuer,
          signPublicKeyJwk: savedCertificate.signPublicKeyJwk,
          encPublicKeyJwk: savedCertificate.encPublicKeyJwk,
          issuedAt: savedCertificate.issuedAt,
          expiresAt: savedCertificate.expiresAt,
          signature: savedCertificate.signature,
          status: savedCertificate.status,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error issuing certificate:', error)
    return NextResponse.json(
      { message: '인증서 발급 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}