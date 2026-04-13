import { signIn } from '@/auth'

export default function LoginPage() {
  return (
    <div className="max-w-md mx-auto mt-10">
      <h1 className="text-2xl font-bold mb-6">로그인</h1>

      <form
        action={async () => {
          'use server'
          await signIn('google', { redirectTo: '/dashboard' })
        }}
      >
        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-3 rounded-md mb-4"
        >
          Google로 로그인
        </button>
      </form>

      <form
        action={async () => {
          'use server'
          await signIn('github', { redirectTo: '/dashboard' })
        }}
      >
        <button
          type="submit"
          className="w-full bg-gray-900 text-white py-3 rounded-md"
        >
          GitHub로 로그인
        </button>
      </form>
    </div>
  )
}