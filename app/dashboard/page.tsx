import { auth } from '@/auth'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const session = await auth()

  if (!session) {
    redirect('/login')
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <p className="mt-4">로그인 성공</p>
      <pre className="mt-4 bg-gray-100 p-4 rounded-md">
        {JSON.stringify(session, null, 2)}
      </pre>
    </div>
  )
}