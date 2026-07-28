'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useHousehold } from './AuthProvider'

const links = [
  { href: '/', label: 'Dashboard', emoji: '🏠' },
  { href: '/chores', label: 'Chores', emoji: '🧹' },
  { href: '/rewards', label: 'Rewards', emoji: '🎁' },
  { href: '/routines', label: 'Routines', emoji: '🌅' },
  { href: '/schedule', label: 'Our Day', emoji: '📅' },
  { href: '/meals', label: 'Meals', emoji: '🍽️' },
  { href: '/bored', label: 'Bored', emoji: '🎲' },
  { href: '/parent', label: 'Parent', emoji: '🔐' },
]

export default function NavBar() {
  const pathname = usePathname()
  const { householdName, signOut } = useHousehold()

  return (
    <div className="mb-6">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <p className="font-semibold text-slate-700">🏡 {householdName}</p>
        <button
          type="button"
          onClick={() => void signOut()}
          className="rounded-xl bg-white px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
        >
          Sign out
        </button>
      </div>
      <nav className="flex flex-wrap gap-3">
        {links.map((link) => {
        const active = pathname === link.href

        return (
          <Link
            key={link.href}
            href={link.href}
            className={`rounded-2xl px-5 py-3 text-lg transition ${
              active
                ? 'bg-blue-600 text-white'
                : 'bg-white text-slate-700 hover:bg-slate-100'
            }`}
          >
            {link.emoji} {link.label}
          </Link>
        )
        })}
      </nav>
    </div>
  )
}
