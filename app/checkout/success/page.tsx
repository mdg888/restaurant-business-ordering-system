import Link from 'next/link'
import { CheckCircle } from 'lucide-react'
import Navbar from '@/components/ui/Navbar'

export default function SuccessPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 flex flex-col items-center justify-center gap-6 px-4 text-center">
        <CheckCircle size={64} className="text-green-500" />
        <div>
          <h1 className="text-3xl font-bold mb-2">Order Confirmed!</h1>
          <p className="text-gray-500 max-w-sm">
            Your payment was successful. We&apos;re preparing your order now.
            You&apos;ll receive a confirmation email shortly.
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/menu"
            className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-xl transition-colors"
          >
            Order More
          </Link>
          <Link
            href="/account"
            className="px-6 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-medium rounded-xl transition-colors"
          >
            View Orders
          </Link>
        </div>
      </main>
    </div>
  )
}
