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

export default function SignLoginPage() {
  const [userEmail, setUserEmail] = useState('')
  const [nonce, setNonce] = useState('')
  const [signatureBase64, setSignatureBase64] = useState('')
  const [message, setMessage] = useState('')

  async function requestChallenge() {
    try {
      if (!userEmail) {
        alert('이메일을 입력하세요.')
        return
      }

      setMessage('challenge 요청 중...')

      const response = await fetch('/api/sign-login/challenge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userEmail }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'challenge 요청 실패')
      }

      setNonce(data.nonce)
      setMessage('challenge 발급 완료')
    } catch (error) {
      console.error(error)
      setMessage('challenge 요청 실패')
    }
  }

  async function signChallenge() {
    try {
      if (!nonce) {
        alert('먼저 challenge를 요청하세요.')
        return
      }

      const privateKeyRaw = localStorage.getItem('secure-envelope-sign-private-key')

      if (!privateKeyRaw) {
        alert('서명용 개인키가 없습니다. 먼저 인증서 페이지에서 키쌍을 생성하세요.')
        return
      }

      setMessage('개인키로 nonce 서명 중...')

      const privateKeyJwk = JSON.parse(privateKeyRaw)

      const privateKey = await window.crypto.subtle.importKey(
        'jwk',
        privateKeyJwk,
        {
          name: 'RSASSA-PKCS1-v1_5',
          hash: 'SHA-256',
        },
        true,
        ['sign']
      )

      const encoder = new TextEncoder()
      const data = encoder.encode(nonce)

      const signature = await window.crypto.subtle.sign(
        {
          name: 'RSASSA-PKCS1-v1_5',
        },
        privateKey,
        data
      )

      const base64 = arrayBufferToBase64(signature)

      setSignatureBase64(base64)
      setMessage('전자서명 생성 완료')
    } catch (error) {
      console.error(error)
      setMessage('전자서명 생성 실패')
    }
  }

  async function verifyLogin() {
    try {
      if (!userEmail || !nonce || !signatureBase64) {
        alert('이메일, nonce, 서명값이 모두 필요합니다.')
        return
      }

      setMessage('전자서명 로그인 검증 중...')

      const response = await fetch('/api/sign-login/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userEmail,
          nonce,
          signatureBase64,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || '전자서명 로그인 실패')
      }

      setMessage('전자서명 로그인 성공')
    } catch (error) {
      console.error(error)
      setMessage('전자서명 로그인 실패')
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
      <h1 className="text-3xl font-bold">전자서명 로그인</h1>

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
            onClick={requestChallenge}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
          >
            1. challenge 요청
          </button>

          <button
            type="button"
            onClick={signChallenge}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md"
          >
            2. nonce 서명
          </button>

          <button
            type="button"
            onClick={verifyLogin}
            className="bg-gray-800 hover:bg-gray-900 text-white px-4 py-2 rounded-md"
          >
            3. 로그인 검증
          </button>
        </div>

        <p className="text-sm text-gray-700">{message}</p>
      </div>

      <div className="border rounded-lg p-4">
        <h2 className="text-xl font-bold mb-3">nonce</h2>
        <pre className="bg-gray-100 p-3 rounded-md text-sm whitespace-pre-wrap break-all overflow-hidden max-w-full">
          {nonce || '아직 발급되지 않았습니다.'}
        </pre>
      </div>

      <div className="border rounded-lg p-4">
        <h2 className="text-xl font-bold mb-3">전자서명(Base64)</h2>
        <pre className="bg-gray-100 p-3 rounded-md text-sm whitespace-pre-wrap break-all overflow-hidden max-w-full">
          {signatureBase64 || '아직 생성되지 않았습니다.'}
        </pre>
      </div>
    </div>
  )
}