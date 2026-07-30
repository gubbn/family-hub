import type { Metadata } from 'next'
import ServiceStatusView from '@/components/ServiceStatusView'

export const metadata: Metadata = {
  title: 'Service Status | Family Hub',
  description: 'Check the current status of Family Hub services.',
}

export default function StatusPage() {
  return <ServiceStatusView />
}
