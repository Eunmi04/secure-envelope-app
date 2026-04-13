'use client'

import { useState } from 'react'

type JsonValue = string | number | boolean | null | JsonObject | JsonArray
type JsonObject = { [key: string]: JsonValue }
type JsonArray = JsonValue[]

export default function CertificatesPage() {
  const [userEmail, setUserEmail] = useState('')
  const [signPublicKeyJwk, setSignPublicKeyJwk] = useState<JsonObject | null>(null)
  const [signPrivateKeyJwk, setSignPrivateKeyJwk] = useState<JsonObject | null>(null)
  const [encPublicKeyJwk, setEncPublicKeyJwk] = useState<JsonObject | null>(null)
  const [encPrivateKeyJwk, setEncPrivateKeyJwk] = useState<JsonObject | null>(null)
  const [certificate, setCertificate] = useState<JsonObject | null>(null)
  const [message, setMessage] = useState('')

  async function generateKeyPairs() {
    try {
      setMessage('서명용/암호화용 키쌍 생성 중...')

      const signKeyPair = await window.crypto.subtle.generateKey(
        {
          name: 'RSASSA-PKCS1-v1_5',
          modulusLength: 2048,
          publicExponent: new Uint8Array([1, 0, 1]),
          hash: 'SHA-256',
        },
        true,
        ['sign', 'verify']
      )

      const exportedSignPublicKey = await window.crypto.subtle.exportKey(
        'jwk',
        signKeyPair.publicKey
      )
      const exportedSignPrivateKey = await window.crypto.subtle.exportKey(
        'jwk',
        signKeyPair.privateKey
      )

      const encKeyPair = await window.crypto.subtle.generateKey(
        {
          name: 'RSA-OAEP',
          modulusLength: 2048,
          publicExponent: new Uint8Array([1, 0, 1]),
          hash: 'SHA-256',
        },
        true,
        ['encrypt', 'decrypt']
      )

      const exportedEncPublicKey = await window.crypto.subtle.exportKey(
        'jwk',
        encKeyPair.publicKey
      )
      const exportedEncPrivateKey = await window.crypto.subtle.exportKey(
        'jwk',
        encKeyPair.privateKey
      )

      setSignPublicKeyJwk(exportedSignPublicKey as JsonObject)
      setSignPrivateKeyJwk(exportedSignPrivateKey as JsonObject)
      setEncPublicKeyJwk(exportedEncPublicKey as JsonObject)
      setEncPrivateKeyJwk(exportedEncPrivateKey as JsonObject)

      localStorage.setItem(
        'secure-envelope-sign-public-key',
        JSON.stringify(exportedSignPublicKey)
      )
      localStorage.setItem(
        'secure-envelope-sign-private-key',
        JSON.stringify(exportedSignPrivateKey)
      )
      localStorage.setItem(
        'secure-envelope-enc-public-key',
        JSON.stringify(exportedEncPublicKey)
      )
      localStorage.setItem(
        'secure-envelope-enc-private-key',
        JSON.stringify(exportedEncPrivateKey)
      )

      setMessage('서명용/암호화용 키쌍 생성 완료')
    } catch (error) {
      console.error(error)
      setMessage('키쌍 생성 실패')
    }
  }

  async function issueCertificate() {
    try {
      if (!userEmail) {
        alert('이메일을 입력하세요.')
        return
      }

      if (!signPublicKeyJwk || !encPublicKeyJwk) {
        alert('먼저 키쌍을 생성하세요.')
        return
      }

      setMessage('인증서 발급 신청 중...')

      const response = await fetch('/api/certificates/issue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userEmail,
          signPublicKeyJwk,
          encPublicKeyJwk,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || '인증서 발급 실패')
      }

      setCertificate(data.certificate)
      setMessage('인증서 발급 완료')
    } catch (error) {
      console.error(error)
      setMessage('인증서 발급 실패')
    }
  }

  async function loadMyCertificates() {
    try {
      if (!userEmail) {
        alert('이메일을 입력하세요.')
        return
      }

      setMessage('내 인증서 조회 중...')

      const response = await fetch(
        `/api/certificates/my?userEmail=${encodeURIComponent(userEmail)}`
      )
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || '조회 실패')
      }

      if (data.certificates.length > 0) {
        setCertificate(data.certificates[0])
        setMessage('최신 인증서 조회 완료')
      } else {
        setCertificate(null)
        setMessage('발급된 인증서가 없습니다.')
      }
    } catch (error) {
      console.error(error)
      setMessage('인증서 조회 실패')
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
      <h1 className="text-3xl font-bold">인증서 발급</h1>

      <div className="border rounded-lg p-4 space-y-4">
        <label className="block">
          <span className="font-semibold">이메일</span>
          <input
            type="email"
            value={userEmail}
            onChange={(e) => setUserEmail(e.target.value)}
            placeholder="user@example.com"
            className="w-full border rounded-md px-3 py-2 mt-2"
          />
        </label>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={generateKeyPairs}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
          >
            1. 서명용/암호화용 키쌍 생성
          </button>

          <button
            type="button"
            onClick={issueCertificate}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
          >
            2. 인증서 발급 신청
          </button>

          <button
            type="button"
            onClick={loadMyCertificates}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
          >
            3. 내 인증서 조회
          </button>
        </div>

        <p className="text-sm text-gray-700">{message}</p>
      </div>

      <div className="border rounded-lg p-4">
        <h2 className="text-xl font-bold mb-3">서명용 공개키 JWK</h2>
        <pre className="bg-gray-100 p-3 rounded-md text-sm whitespace-pre-wrap break-all overflow-hidden max-w-full">
          {signPublicKeyJwk
            ? JSON.stringify(signPublicKeyJwk, null, 2)
            : '아직 생성되지 않았습니다.'}
        </pre>
      </div>

      <div className="border rounded-lg p-4">
        <h2 className="text-xl font-bold mb-3">암호화용 공개키 JWK</h2>
        <pre className="bg-gray-100 p-3 rounded-md text-sm whitespace-pre-wrap break-all overflow-hidden max-w-full">
          {encPublicKeyJwk
            ? JSON.stringify(encPublicKeyJwk, null, 2)
            : '아직 생성되지 않았습니다.'}
        </pre>
      </div>

      <div className="border rounded-lg p-4">
        <h2 className="text-xl font-bold mb-3">발급된 인증서</h2>
        <pre className="bg-gray-100 p-3 rounded-md text-sm whitespace-pre-wrap break-all overflow-hidden max-w-full">
          {certificate
            ? JSON.stringify(certificate, null, 2)
            : '아직 발급되지 않았습니다.'}
        </pre>
      </div>
    </div>
  )
}