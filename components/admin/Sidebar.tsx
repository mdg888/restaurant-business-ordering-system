'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ClipboardList, UtensilsCrossed, Star, BarChart2, ChevronRight, ChevronLeft, LogOut, Menu } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV = [
  { href: '/admin/orders', label: 'Orders', icon: ClipboardList },
  { href: '/admin/menu', label: 'Menu', icon: UtensilsCrossed },
  { href: '/admin/loyalty', label: 'Loyalty', icon: Star },
  { href: '/admin/analytics', label: 'Analytics', icon: BarChart2 },
]

export default function AdminSidebar({ adminName }: { adminName: string }) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <>
      {/* Mobile top bar */}
      <div className="sm:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-200 h-12 flex items-center px-4 gap-3">
        <button onClick={() => setMobileOpen(true)} className="text-gray-600 hover:text-gray-900">
          <Menu size={20} />
        </button>
        <span className="font-semibold text-gray-800 text-sm">Admin</span>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="sm:hidden fixed inset-0 z-40 bg-black/40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed sm:static top-0 left-0 z-50 h-full sm:h-auto min-h-screen bg-white border-r border-gray-200 flex flex-col transition-all duration-200',
          // Desktop: collapsible width
          collapsed ? 'sm:w-14' : 'sm:w-56',
          // Mobile: slide in/out
          mobileOpen ? 'translate-x-0 w-56' : '-translate-x-full sm:translate-x-0'
        )}
      >
        {/* Header */}
        <div className={cn(
          'border-b border-gray-100 flex items-center justify-between',
          collapsed ? 'px-3 py-5' : 'px-5 py-5'
        )}>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-xs text-gray-400 uppercase tracking-widest mb-0.5">Admin</p>
              <p className="font-semibold text-gray-800 truncate">{adminName}</p>
            </div>
          )}
          {/* Desktop collapse toggle */}
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="hidden sm:flex items-center justify-center text-gray-400 hover:text-gray-700 transition-colors shrink-0"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
          {/* Mobile close */}
          <button
            onClick={() => setMobileOpen(false)}
            className="sm:hidden text-gray-400 hover:text-gray-700 transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-2 flex flex-col gap-0.5">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + '/')
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                title={collapsed ? label : undefined}
                className={cn(
                  'flex items-center rounded-lg text-sm font-medium transition-colors',
                  collapsed ? 'justify-center px-2 py-2.5' : 'gap-3 px-3 py-2.5',
                  active
                    ? 'bg-orange-50 text-orange-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                )}
              >
                <Icon size={18} className="shrink-0" />
                {!collapsed && (
                  <>
                    {label}
                    {active && <ChevronRight size={14} className="ml-auto" />}
                  </>
                )}
              </Link>
            )
          })}
        </nav>

        {/* Sign out */}
        <div className={cn('border-t border-gray-100', collapsed ? 'px-2 py-4' : 'px-5 py-4')}>
          <form action="/api/auth/signout" method="POST">
            <button
              type="submit"
              title={collapsed ? 'Sign out' : undefined}
              className={cn(
                'flex items-center text-sm text-gray-400 hover:text-gray-700 transition-colors',
                collapsed ? 'justify-center w-full' : 'gap-2'
              )}
            >
              <LogOut size={16} />
              {!collapsed && 'Sign out'}
            </button>
          </form>
        </div>
      </aside>

      {/* Spacer for mobile top bar */}
      <div className="sm:hidden h-12 shrink-0" />
    </>
  )
}
