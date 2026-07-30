'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import type { ServiceStatusResponse } from '@/lib/serviceStatus'

const CHECK_INTERVAL_MS = 60_000

export default function ServiceStatusBanner() {
  const [status, setStatus] = useState<ServiceStatusResponse | null>(null)
  const [checkFailed, setCheckFailed] = useState(false)

  useEffect(() => {
    let active = true

    async function loadStatus() {
      try {
        const response = await fetch('/api/status')

        if (!response.ok) {
          throw new Error('Status request failed')
        }

        const nextStatus = (await response.json()) as ServiceStatusResponse

        if (active) {
          setStatus(nextStatus)
          setCheckFailed(false)
        }
      } catch {
        if (active) {
          setCheckFailed(true)
        }
      }
    }

    void loadStatus()
    const interval = window.setInterval(loadStatus, CHECK_INTERVAL_MS)

    return () => {
      active = false
      window.clearInterval(interval)
    }
  }, [])

  if (!checkFailed && (!status || status.overall === 'operational')) {
    return null
  }

  const isOutage = status?.overall === 'outage'
  const affectedServices =
    status?.services
      .filter((service) => service.state !== 'operational')
      .map((service) => service.name)
      .join(', ') || 'Service status'

  return (
    <aside
      aria-live="polite"
      className={`relative z-50 border-b px-4 py-3 text-sm ${
        isOutage
          ? 'border-red-300 bg-red-50 text-red-950'
          : 'border-amber-300 bg-amber-50 text-amber-950'
      }`}
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center">
        <strong>
          {checkFailed
            ? 'We cannot confirm the service status right now.'
            : isOutage
              ? `Service unavailable: ${affectedServices}.`
              : `Service issue: ${affectedServices}.`}
        </strong>
        <Link
          href="/status"
          className="font-semibold underline underline-offset-2 hover:no-underline"
        >
          View service status
        </Link>
      </div>
    </aside>
  )
}
