import { motion } from 'framer-motion'
import { getActivityType } from '../lib/activityTypes'
import { formatRelativeTime } from '../lib/time'
import { LoadingState, ErrorState, EmptyState } from './StateMessage'

export default function AIActivityCard({ activities, loading, error, onRetry }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="card-surface rounded-2xl p-6"
    >
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-text">AI Activity</h3>
          <p className="mt-0.5 text-xs text-text-faint">What your agent has been doing</p>
        </div>
        <span className="flex items-center gap-1.5 rounded-full border border-border-strong px-2.5 py-1 text-[11px] font-medium text-text-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-success" />
          Live
        </span>
      </div>

      {loading && <LoadingState label="Loading activity…" />}
      {!loading && error && <ErrorState message={error} onRetry={onRetry} />}
      {!loading && !error && (!activities || activities.length === 0) && (
        <EmptyState label="No AI activity yet." />
      )}

      {!loading && !error && activities && activities.length > 0 && (
        <ul className="space-y-1">
          {activities.map((item) => {
            const meta = getActivityType(item.type)
            const Icon = meta.icon
            return (
              <li
                key={item.id}
                className="flex items-start gap-3 rounded-xl px-2 py-2.5 transition-colors duration-150 hover:bg-surface-hover"
              >
                <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${meta.bg}`}>
                  <Icon size={15} className={meta.color} strokeWidth={2} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium text-text">{meta.label}</p>
                  <p className="truncate text-xs text-text-faint">{item.description}</p>
                </div>
                <span className="shrink-0 pt-0.5 text-[11px] text-text-faint">
                  {formatRelativeTime(item.created_at)}
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </motion.div>
  )
}
