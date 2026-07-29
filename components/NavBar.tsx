'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useHousehold } from './AuthProvider'

const links = [
  { href: '/', label: 'Dashboard', emoji: '🏠' },
  { href: '/routines', label: 'Routine', emoji: '🌅' },
  { href: '/chores', label: 'Chores', emoji: '🧹' },
  { href: '/bored', label: 'Bored', emoji: '🎲' },
  { href: '/schedule', label: 'Our Day', emoji: '📅' },
  { href: '/meals', label: 'Meals', emoji: '🍽️' },
  { href: '/rewards', label: 'Rewards', emoji: '🎁' },
  { href: '/parent', label: 'Parent', emoji: '🔐' },
]

export default function NavBar() {
  const pathname = usePathname()
  const { householdName, signOut } = useHousehold()

  return (
    <header className="relative left-1/2 mb-6 w-screen -translate-x-1/2">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-3 flex min-h-10 items-center justify-between gap-3">
          <p className="truncate font-semibold text-slate-700">
            🏡 {householdName}
          </p>
          <button
            type="button"
            onClick={() => void signOut()}
            className="shrink-0 rounded-xl bg-white px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
          >
            Sign out
          </button>
        </div>
        <nav
          aria-label="Main navigation"
          className="grid grid-cols-4 gap-2 lg:grid-cols-8"
        >
          {links.map((link) => {
            const active = pathname === link.href

            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? 'page' : undefined}
                className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-center text-xs font-medium transition sm:px-2 sm:text-sm lg:flex-row lg:rounded-2xl lg:px-3 lg:py-3 lg:text-base ${
                  active
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span aria-hidden="true" className="text-base lg:text-lg">
                  {link.emoji}
                </span>
                <span className="truncate">{link.label}</span>
              </Link>
            )
          })}
        </nav>
      </div>
    </header>
  )
}
