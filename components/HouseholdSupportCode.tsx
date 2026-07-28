'use client'

import { useState } from 'react'
import { useHousehold } from './AuthProvider'

export default function HouseholdSupportCode() {
  const { householdId } = useHousehold()
  const [copied, setCopied] = useState(false)

  async function copyCode() {
    await navigator.clipboard.writeText(householdId)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }

  return (
    <footer className="mt-8 border-t border-slate-200 pt-5 text-center">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        Family support code
      </p>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
        <code className="break-all rounded-lg bg-white px-3 py-2 text-xs text-slate-600 shadow-sm">
          {householdId}
        </code>
        <button
          type="button"
          onClick={copyCode}
          className="rounded-lg bg-white px-3 py-2 text-xs font-medium text-blue-700 shadow-sm hover:bg-blue-50"
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <p className="mt-2 text-xs text-slate-500">
        Share this code only when you need help with your account.
      </p>
    </footer>
  )
}
