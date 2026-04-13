'use client'

import Link from 'next/link'
import { signOut, useSession } from 'next-auth/react'

export default function Navbar() {
  const { data: session, status } = useSession()

  return (
    <nav className="flex flex-wrap items-center gap-4 bg-slate-900 px-6 py-4 text-white">
      <Link href="/" className="font-bold text-lg">
        Secure Envelope App
      </Link>

      <Link href="/dashboard" className="hover:text-yellow-300">
        Dashboard
      </Link>

      <Link href="/certificates" className="hover:text-yellow-300">
        Certificates
      </Link>

      <Link href="/sign-login" className="hover:text-yellow-300">
        Sign Login
      </Link>

      <Link href="/messages" className="hover:text-yellow-300">
        Messages
      </Link>

      <div className="ml-auto">
        {status === 'authenticated' ? (
          <div className="flex items-center gap-3">
            <span>{session.user?.name}</span>
            <button
              onClick={() => signOut({ callbackUrl: '/' })}
              className="bg-red-500 px-3 py-1 rounded"
            >
              Logout
            </button>
          </div>
        ) : (
          <Link href="/login" className="bg-blue-600 px-3 py-1 rounded">
            Login
          </Link>
        )}
      </div>
    </nav>
  )
}