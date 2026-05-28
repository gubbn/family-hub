'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const links = [
  { href: '/', label: 'Dashboard', emoji: '🏠' },
  { href: '/chores', label: 'Chores', emoji: '🧹' },
  { href: '/routines', label: 'Routines', emoji: '🌅' },
  { href: '/schedule', label: 'Our Day', emoji: '📅' },
  { href: '/meals', label: 'Meals', emoji: '🍽️' },
  { href: '/bored', label: 'Bored', emoji: '🎲' },
]

export default function NavBar() {
  const pathname = usePathname()

  return (
    <nav className="mb-6 flex flex-wrap gap-3">
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
  )
}