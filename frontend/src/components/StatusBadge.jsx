const STATUS_STYLES = {
  New: 'bg-accent-3/10 text-accent-3',
  Qualified: 'bg-success/10 text-success',
  Negotiation: 'bg-warning/10 text-warning',
  Lost: 'bg-danger/10 text-danger',
  Active: 'bg-success/10 text-success',
  Inactive: 'bg-text-faint/10 text-text-faint',
  Pending: 'bg-accent-3/10 text-accent-3',
  'In Progress': 'bg-warning/10 text-warning',
  Completed: 'bg-success/10 text-success',
}

const PRIORITY_STYLES = {
  High: 'bg-danger/10 text-danger',
  Medium: 'bg-warning/10 text-warning',
  Low: 'bg-text-faint/10 text-text-faint',
}

export function StatusBadge({ value }) {
  const style = STATUS_STYLES[value] || 'bg-surface-hover text-text-muted'
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium ${style}`}>
      {value}
    </span>
  )
}

export function PriorityBadge({ value }) {
  const style = PRIORITY_STYLES[value] || 'bg-surface-hover text-text-muted'
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium ${style}`}>
      {value}
    </span>
  )
}
