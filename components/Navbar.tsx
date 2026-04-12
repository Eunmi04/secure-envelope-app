import Link from 'next/link'

export default function Navbar() {
  return (
    <nav className="flex flex-wrap items-center gap-4 bg-slate-900 px-6 py-4 text-white">
      <Link href="/" className="font-bold text-lg">
        Secure Envelope App
      </Link>

      <Link href="/dashboard" className="hover:text-yellow-300">
        Dashboard
      </Link>

      <Link href="/login" className="hover:text-yellow-300">
        Login
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
    </nav>
  )
}