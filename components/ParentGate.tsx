'use client'

import { useState } from 'react'

const PARENT_PIN = '1234'

type Props = {
  children: React.ReactNode
}

export default function ParentGate({ children }: Props) {
  const [pin, setPin] = useState('')
  const [unlocked, setUnlocked] = useState(false)
  const [error, setError] = useState('')

  function unlock() {
    if (pin === PARENT_PIN) {
      setUnlocked(true)
      setError('')
    } else {
      setError('Incorrect PIN')
    }
  }

  if (unlocked) {
    return <>{children}</>
  }

  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-2xl font-semibold">
        Parent Zone
      </h2>

      <p className="mb-4 text-sm text-slate-500">
        Enter your PIN to continue.
      </p>

      <div className="flex gap-3">
        <input
          type="password"
          value={pin}
          onChange={(event) => setPin(event.target.value)}
          className="rounded-2xl border border-slate-200 p-4 text-xl"
          placeholder="PIN"
        />

        <button
          onClick={unlock}
          className="rounded-2xl bg-blue-600 px-6 py-4 text-xl font-semibold text-white hover:bg-blue-700"
        >
          Unlock
        </button>
      </div>

      {error && (
        <p className="mt-4 text-sm text-red-600">
          {error}
        </p>
      )}
    </section>
  )
}