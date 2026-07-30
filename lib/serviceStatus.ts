export type ServiceState = 'operational' | 'degraded' | 'outage'

export type ServiceStatusItem = {
  id: 'app' | 'auth' | 'email'
  name: string
  state: ServiceState
  message: string
}

export type ServiceStatusResponse = {
  overall: ServiceState
  checkedAt: string
  services: ServiceStatusItem[]
}

export function getOverallState(
  services: ServiceStatusItem[],
): ServiceState {
  if (services.some((service) => service.state === 'outage')) {
    return 'outage'
  }

  if (services.some((service) => service.state === 'degraded')) {
    return 'degraded'
  }

  return 'operational'
}
