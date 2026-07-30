'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import type {
  ServiceState,
  ServiceStatusResponse,
} from '@/lib/serviceStatus'

const CHECK_INTERVAL_MS = 60_000

const stateLabels: Record<ServiceState, string> = {
  operational: 'Online',
  degraded: 'Has issues',
  outage: 'Unavailable',
}

const stateStyles: Record<ServiceState, string> = {
  operational: 'bg-emerald-100 text-emerald-800',
  degraded: 'bg-amber-100 text-amber-900',
  outage: 'bg-red-100 text-red-900',
}

export default function ServiceStatusView() {
  const [status, setStatus] = useState<ServiceStatusResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadStatus = useCallback(async () => {
    setError('')

    try {
      const response = await fetch('/api/status')

      if (!response.ok) {
        throw new Error('Status request failed')
      }

      setStatus((await response.json()) as ServiceStatusResponse)
    } catch {
      setError('We could not load the latest service information.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadStatus()
    const interval = window.setInterval(loadStatus, CHECK_INTERVAL_MS)

    return () => window.clearInterval(interval)
  }, [loadStatus])

  const overallMessage =
    status?.overall === 'operational'
      ? 'All Family Hub services are online'
      : status?.overall === 'outage'
        ? 'A Family Hub service is unavailable'
        : 'A Family Hub service has an issue'

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900 sm:py-12">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center justify-between gap-4">
          <Link
            href="/"
            className="font-semibold text-teal-700 hover:text-teal-900"
          >
            ← Family Hub
          </Link>
          <button
            type="button"
            onClick={() => void loadStatus()}
            className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold shadow-sm hover:bg-slate-50"
          >
            Refresh
          </button>
        </div>

        <section className="overflow-hidden rounded-3xl bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-8 sm:px-8">
            <p className="mb-2 text-sm font-bold uppercase tracking-wider text-teal-700">
              Service status
            </p>
            <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
              {loading ? 'Checking Family Hub…' : overallMessage}
            </h1>
            <p className="mt-3 max-w-2xl text-slate-600">
              See whether the app, sign-in, and email code services are working
              normally.
            </p>
          </div>

          <div className="space-y-4 p-6 sm:p-8">
            {error ? (
              <div
                role="alert"
                className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-950"
              >
                {error}
              </div>
            ) : null}

            {status?.services.map((service) => (
              <article
                key={service.id}
                className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <h2 className="text-lg font-bold">{service.name}</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    {service.message}
                  </p>
                </div>
                <span
                  className={`w-fit rounded-full px-3 py-1.5 text-sm font-bold ${stateStyles[service.state]}`}
                >
                  {stateLabels[service.state]}
                </span>
              </article>
            ))}

            {status ? (
              <p className="pt-2 text-center text-xs text-slate-500">
                Last checked{' '}
                {new Date(status.checkedAt).toLocaleString('en-GB', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
                . This page refreshes every minute.
              </p>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  )
}
