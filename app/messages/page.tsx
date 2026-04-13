'use client'

import { useState } from 'react'

function arrayBufferToBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i += 1) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

function base64ToUint8Array(base64: string) {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

async function sha256Hex(text: string) {
  const encoder = new TextEncoder()
  const data = encoder.encode(text)
  const digest = await window.crypto.subtle.digest('SHA-256', data)

  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

type MessageItem = {
  _id: string
  senderEmail: string
  receiverEmail: string
  encryptedMessageBase64: string
  encryptedAesKeyBase64: string
  ivBase64: string
  signatureBase64: string
  plainMessageHash: string
  createdAt?: string
}

export default function MessagesPage() {
  const [senderEmail, setSenderEmail] = useState('')
  const [receiverEmail, setReceiverEmail] = useState('')
  const [plainMessage, setPlainMessage] = useState('')
  const [statusMessage, setStatusMessage] = useState('')
  const [myMessages, setMyMessages] = useState<MessageItem[]>([])
  const [selectedMessage, setSelectedMessage] = useState<MessageItem | null>(null)
  const [decryptedMessage, setDecryptedMessage] = useState('')
  const [verifyResult, setVerifyResult] = useState('')

  async function sendSecureMessage() {
    try {
      if (!senderEmail || !receiverEmail || !plainMessage) {
        alert('송신자 이메일, 수신자 이메일, 메시지를 모두 입력하세요.')
        return
      }

      const senderSignPrivateKeyRaw = localStorage.getItem(
        'secure-envelope-sign-private-key'
      )

      if (!senderSignPrivateKeyRaw) {
        alert('송신자 서명용 개인키가 없습니다. 먼저 인증서 페이지에서 키쌍을 생성하세요.')
        return
      }

      setStatusMessage('수신자 인증서 조회 중...')

      const certResponse = await fetch(
        `/api/certificates/by-email?userEmail=${encodeURIComponent(receiverEmail)}`
      )
      const certData = await certResponse.json()

      if (!certResponse.ok) {
        throw new Error(certData.message || '수신자 인증서 조회 실패')
      }

      const receiverEncPublicKeyJwk = certData.certificate.encPublicKeyJwk

      if (!receiverEncPublicKeyJwk) {
        throw new Error('수신자 암호화용 공개키가 없습니다.')
      }

      const senderSignPrivateKey = await window.crypto.subtle.importKey(
        'jwk',
        JSON.parse(senderSignPrivateKeyRaw),
        {
          name: 'RSASSA-PKCS1-v1_5',
          hash: 'SHA-256',
        },
        true,
        ['sign']
      )

      setStatusMessage('메시지 전자서명 생성 중...')

      const encoder = new TextEncoder()
      const plainBytes = encoder.encode(plainMessage)

      const signatureBuffer = await window.crypto.subtle.sign(
        {
          name: 'RSASSA-PKCS1-v1_5',
        },
        senderSignPrivateKey,
        plainBytes
      )

      const signatureBase64 = arrayBufferToBase64(signatureBuffer)

      setStatusMessage('AES 키 생성 및 메시지 암호화 중...')

      const aesKey = await window.crypto.subtle.generateKey(
        {
          name: 'AES-GCM',
          length: 256,
        },
        true,
        ['encrypt', 'decrypt']
      )

      const iv = window.crypto.getRandomValues(new Uint8Array(12))

      const encryptedMessageBuffer = await window.crypto.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv,
        },
        aesKey,
        plainBytes
      )

      const exportedAesKey = await window.crypto.subtle.exportKey('raw', aesKey)

      setStatusMessage('수신자 암호화용 공개키로 AES 키 암호화 중...')

      const receiverEncPublicKey = await window.crypto.subtle.importKey(
        'jwk',
        receiverEncPublicKeyJwk,
        {
          name: 'RSA-OAEP',
          hash: 'SHA-256',
        },
        true,
        ['encrypt']
      )

      const encryptedAesKeyBuffer = await window.crypto.subtle.encrypt(
        {
          name: 'RSA-OAEP',
        },
        receiverEncPublicKey,
        exportedAesKey
      )

      const plainMessageHash = await sha256Hex(plainMessage)

      setStatusMessage('전자봉투 메시지 전송 중...')

      const response = await fetch('/api/messages/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          senderEmail,
          receiverEmail,
          encryptedMessageBase64: arrayBufferToBase64(encryptedMessageBuffer),
          encryptedAesKeyBase64: arrayBufferToBase64(encryptedAesKeyBuffer),
          ivBase64: arrayBufferToBase64(iv.buffer),
          signatureBase64,
          plainMessageHash,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || '전자봉투 메시지 전송 실패')
      }

      setStatusMessage('전자봉투 메시지 전송 완료')
      setPlainMessage('')
    } catch (error) {
      console.error(error)
      setStatusMessage(
        error instanceof Error ? error.message : '전자봉투 메시지 전송 실패'
      )
    }
  }

  async function loadMyMessages() {
    try {
      if (!receiverEmail) {
        alert('받는 사람 이메일 칸에 내 이메일을 입력한 후 조회하세요.')
        return
      }

      setStatusMessage('내 메시지 조회 중...')

      const response = await fetch(
        `/api/messages/my?userEmail=${encodeURIComponent(receiverEmail)}`
      )
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || '메시지 조회 실패')
      }

      setMyMessages(data.messages)
      setStatusMessage('내 메시지 조회 완료')
    } catch (error) {
      console.error(error)
      setStatusMessage(
        error instanceof Error ? error.message : '메시지 조회 실패'
      )
    }
  }

  async function decryptSelectedMessage(message: MessageItem) {
    try {
      setSelectedMessage(message)
      setVerifyResult('')
      setDecryptedMessage('')
      setStatusMessage('메시지 복호화 중...')

      const receiverEncPrivateKeyRaw = localStorage.getItem(
        'secure-envelope-enc-private-key'
      )

      if (!receiverEncPrivateKeyRaw) {
        alert(
          '수신자 암호화용 개인키가 없습니다. 해당 수신자 브라우저에서 키쌍을 생성했는지 확인하세요.'
        )
        return
      }

      const receiverEncPrivateKey = await window.crypto.subtle.importKey(
        'jwk',
        JSON.parse(receiverEncPrivateKeyRaw),
        {
          name: 'RSA-OAEP',
          hash: 'SHA-256',
        },
        true,
        ['decrypt']
      )

      const encryptedAesKeyBytes = base64ToUint8Array(
        message.encryptedAesKeyBase64
      )

      const aesRawKey = await window.crypto.subtle.decrypt(
        {
          name: 'RSA-OAEP',
        },
        receiverEncPrivateKey,
        encryptedAesKeyBytes
      )

      const aesKey = await window.crypto.subtle.importKey(
        'raw',
        aesRawKey,
        {
          name: 'AES-GCM',
        },
        true,
        ['decrypt']
      )

      const iv = base64ToUint8Array(message.ivBase64)
      const encryptedMessageBytes = base64ToUint8Array(
        message.encryptedMessageBase64
      )

      const decryptedBuffer = await window.crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv,
        },
        aesKey,
        encryptedMessageBytes
      )

      const decoder = new TextDecoder()
      const plainText = decoder.decode(decryptedBuffer)

      setDecryptedMessage(plainText)
      setStatusMessage('메시지 복호화 완료')

      const senderCertResponse = await fetch(
        `/api/certificates/by-email?userEmail=${encodeURIComponent(message.senderEmail)}`
      )
      const senderCertData = await senderCertResponse.json()

      if (!senderCertResponse.ok) {
        throw new Error(senderCertData.message || '송신자 인증서 조회 실패')
      }

      const senderSignPublicKeyJwk = senderCertData.certificate.signPublicKeyJwk

      if (!senderSignPublicKeyJwk) {
        throw new Error('송신자 서명용 공개키가 없습니다.')
      }

      const senderSignPublicKey = await window.crypto.subtle.importKey(
        'jwk',
        senderSignPublicKeyJwk,
        {
          name: 'RSASSA-PKCS1-v1_5',
          hash: 'SHA-256',
        },
        true,
        ['verify']
      )

      const encoder = new TextEncoder()
      const plainBytes = encoder.encode(plainText)
      const signatureBytes = base64ToUint8Array(message.signatureBase64)

      const verified = await window.crypto.subtle.verify(
        {
          name: 'RSASSA-PKCS1-v1_5',
        },
        senderSignPublicKey,
        signatureBytes,
        plainBytes
      )

      const hashNow = await sha256Hex(plainText)

      if (verified && hashNow === message.plainMessageHash) {
        setVerifyResult('서명 검증 성공 / 메시지 무결성 확인')
      } else {
        setVerifyResult('서명 검증 실패 또는 무결성 불일치')
      }
    } catch (error) {
      console.error(error)
      setStatusMessage(
        error instanceof Error ? error.message : '메시지 복호화 실패'
      )
      setVerifyResult('서명 검증 실패')
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
      <h1 className="text-3xl font-bold">전자봉투 기반 보안통신</h1>

      <div className="border rounded-lg p-4 space-y-4">
        <h2 className="text-xl font-bold">메시지 전송</h2>

        <div className="grid gap-4">
          <label className="block">
            <span className="font-semibold">송신자 이메일</span>
            <input
              type="email"
              value={senderEmail}
              onChange={(e) => setSenderEmail(e.target.value)}
              className="w-full border rounded-md px-3 py-2 mt-2"
              placeholder="sender@example.com"
            />
          </label>

          <label className="block">
            <span className="font-semibold">수신자 이메일</span>
            <input
              type="email"
              value={receiverEmail}
              onChange={(e) => setReceiverEmail(e.target.value)}
              className="w-full border rounded-md px-3 py-2 mt-2"
              placeholder="receiver@example.com"
            />
          </label>

          <label className="block">
            <span className="font-semibold">평문 메시지</span>
            <textarea
              value={plainMessage}
              onChange={(e) => setPlainMessage(e.target.value)}
              className="w-full border rounded-md px-3 py-2 mt-2 h-32"
              placeholder="보낼 메시지를 입력하세요."
            />
          </label>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={sendSecureMessage}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
          >
            전자봉투 전송
          </button>

          <button
            type="button"
            onClick={loadMyMessages}
            className="bg-gray-800 hover:bg-gray-900 text-white px-4 py-2 rounded-md"
          >
            내 수신 메시지 조회
          </button>
        </div>

        <p className="text-sm text-gray-700">{statusMessage}</p>
      </div>

      <div className="border rounded-lg p-4 space-y-4">
        <h2 className="text-xl font-bold">받은 메시지 목록</h2>

        {myMessages.length === 0 ? (
          <p className="text-gray-600">아직 받은 메시지가 없습니다.</p>
        ) : (
          <div className="space-y-3">
            {myMessages.map((message) => (
              <div
                key={message._id}
                className="border rounded-md p-3 flex flex-col gap-2"
              >
                <p>
                  <span className="font-semibold">송신자:</span> {message.senderEmail}
                </p>
                <p>
                  <span className="font-semibold">수신자:</span> {message.receiverEmail}
                </p>
                <p>
                  <span className="font-semibold">시간:</span>{' '}
                  {message.createdAt
                    ? new Date(message.createdAt).toLocaleString()
                    : '-'}
                </p>

                <button
                  type="button"
                  onClick={() => decryptSelectedMessage(message)}
                  className="w-fit bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md"
                >
                  복호화 및 서명 검증
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border rounded-lg p-4 space-y-4">
        <h2 className="text-xl font-bold">선택한 메시지 복호화 결과</h2>

        <div>
          <p className="font-semibold mb-2">복호화된 평문</p>
          <pre className="bg-gray-100 p-3 rounded-md text-sm whitespace-pre-wrap break-all overflow-hidden max-w-full">
            {decryptedMessage || '아직 복호화하지 않았습니다.'}
          </pre>
        </div>

        <div>
          <p className="font-semibold mb-2">서명 검증 결과</p>
          <pre className="bg-gray-100 p-3 rounded-md text-sm whitespace-pre-wrap break-all overflow-hidden max-w-full">
            {verifyResult || '아직 검증하지 않았습니다.'}
          </pre>
        </div>

        <div>
          <p className="font-semibold mb-2">선택된 메시지 원본 메타데이터</p>
          <pre className="bg-gray-100 p-3 rounded-md text-sm whitespace-pre-wrap break-all overflow-hidden max-w-full">
            {selectedMessage
              ? JSON.stringify(selectedMessage, null, 2)
              : '아직 선택된 메시지가 없습니다.'}
          </pre>
        </div>
      </div>
    </div>
  )
}