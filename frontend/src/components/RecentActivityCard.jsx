import { motion } from 'framer-motion'
import { getActivityType } from '../lib/activityTypes'
import { formatRelativeTime } from '../lib/time'
import { LoadingState, ErrorState, EmptyState } from './StateMessage'

export default function RecentActivityCard({ activities, loading, error, onRetry }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="card-surface rounded-2xl p-6"
    >
      <div className="mb-5">
        <h3 className="text-sm font-semibold text-text">Recent Activity</h3>
        <p className="mt-0.5 text-xs text-text-faint">Timeline of automated actions</p>
      </div>

      {loading && <LoadingState label="Loading recent activity…" />}
      {!loading && error && <ErrorState message={error} onRetry={onRetry} />}
      {!loading && !error && (!activities || activities.length === 0) && (
        <EmptyState label="No recent activity yet." />
      )}

      {!loading && !error && activities && activities.length > 0 && (
        <ul className="relative space-y-5 before:absolute before:bottom-2 before:left-4 before:top-2 before:w-px before:bg-border">
          {activities.map((item) => {
            const meta = getActivityType(item.type)
            const Icon = meta.icon
            return (
              <li key={item.id} className="relative flex items-start gap-3.5 pl-0">
                <span className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent to-accent-2">
                  <Icon size={14} className="text-white" strokeWidth={2.2} />
                </span>
                <div className="min-w-0 flex-1 pt-1">
                  <p className="text-[13px] leading-snug text-text-muted">
                    <span className="font-medium text-text">AutomateAI</span>{' '}
                    {item.description}
                  </p>
                  <p className="mt-0.5 text-[11px] text-text-faint">
                    {formatRelativeTime(item.created_at)}
                  </p>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </motion.div>
  )
}
