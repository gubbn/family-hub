'use client'

import Link from 'next/link'

export default function ParentBackButton() {
  return (
    <Link
      href="/parent"
      className="mb-4 inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium shadow-sm transition hover:bg-slate-50"
    >
      ← Back to Parent Zone
    </Link>
  )
}