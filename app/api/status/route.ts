import {
  getOverallState,
  type ServiceState,
  type ServiceStatusItem,
  type ServiceStatusResponse,
} from '@/lib/serviceStatus'

export const dynamic = 'force-dynamic'

const HEALTH_CHECK_TIMEOUT_MS = 5_000

function readManualState(
  service: 'APP' | 'AUTH' | 'EMAIL',
): ServiceState | null {
  const value = process.env[`STATUS_${service}_STATE`]?.trim().toLowerCase()

  if (value === 'operational' || value === 'degraded' || value === 'outage') {
    return value
  }

  return null
}

function applyManualStatus(
  service: ServiceStatusItem,
  environmentName: 'APP' | 'AUTH' | 'EMAIL',
): ServiceStatusItem {
  const manualMessage = process.env[
    `STATUS_${environmentName}_MESSAGE`
  ]?.trim()
  const manualState = readManualState(environmentName)

  if (!manualMessage && !manualState) {
    return service
  }

  return {
    ...service,
    state: manualState ?? 'degraded',
    message: manualMessage || service.message,
  }
}

async function checkAuthenticationService(): Promise<ServiceStatusItem> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const publicKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()

  if (!supabaseUrl || !publicKey) {
    return {
      id: 'auth',
      name: 'Authentication services',
      state: 'outage',
      message: 'The authentication status check is unavailable.',
    }
  }

  try {
    const response = await fetch(
      `${supabaseUrl.replace(/\/$/, '')}/auth/v1/health`,
      {
        cache: 'no-store',
        headers: {
          apikey: publicKey,
        },
        signal: AbortSignal.timeout(HEALTH_CHECK_TIMEOUT_MS),
      },
    )

    if (response.ok) {
      return {
        id: 'auth',
        name: 'Authentication services',
        state: 'operational',
        message: 'Online',
      }
    }

    return {
      id: 'auth',
      name: 'Authentication services',
      state: response.status >= 500 ? 'outage' : 'degraded',
      message: 'Supabase authentication is not responding normally.',
    }
  } catch {
    return {
      id: 'auth',
      name: 'Authentication services',
      state: 'outage',
      message: 'Supabase authentication cannot be reached.',
    }
  }
}

export async function GET() {
  const authentication = applyManualStatus(
    await checkAuthenticationService(),
    'AUTH',
  )
  const services: ServiceStatusItem[] = [
    applyManualStatus(
      {
        id: 'app',
        name: 'Family Hub',
        state: 'operational',
        message: 'Online',
      },
      'APP',
    ),
    authentication,
    applyManualStatus(
      {
        id: 'email',
        name: 'Email sign-in codes',
        state: authentication.state,
        message:
          authentication.state === 'operational'
            ? 'No issue reported'
            : 'May be affected by the authentication issue',
      },
      'EMAIL',
    ),
  ]
  const status: ServiceStatusResponse = {
    overall: getOverallState(services),
    checkedAt: new Date().toISOString(),
    services,
  }

  return Response.json(status, {
    headers: {
      'Cache-Control': 'public, max-age=15, s-maxage=30, stale-while-revalidate=60',
    },
  })
}
