/**
 * Formats an ISO timestamp as a short relative string ("2 min ago",
 * "3 hr ago", "5 days ago"), falling back to a plain date for anything
 * older than a week.
 */
export function formatRelativeTime(isoString) {
  const then = new Date(isoString)
  if (Number.isNaN(then.getTime())) return ''

  const diffMs = Date.now() - then.getTime()
  const diffMin = Math.round(diffMs / 60000)

  if (diffMin < 1) return 'Just now'
  if (diffMin < 60) return `${diffMin} min ago`

  const diffHr = Math.round(diffMin / 60)
  if (diffHr < 24) return `${diffHr} hr ago`

  const diffDay = Math.round(diffHr / 24)
  if (diffDay < 7) return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`

  return then.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
