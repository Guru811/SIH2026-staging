import { useApi } from './useApi'
import { endpoints } from '../lib/api'

export function useAlertsBadge() {
  const { data } = useApi(endpoints.summary, [])
  if (!data) return 0
  return (Number(data.flagged_anomalies) || 0) + (Number(data.critical_constituencies) || 0)
}
