import { motion } from 'framer-motion'
import { ArrowUpRight } from 'lucide-react'

const TODAY = new Date().toLocaleDateString(undefined, {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
})

export default function WelcomeHero({
  userName,
  aiActions,
  pendingApprovals,
  loading,
  onReviewApprovals,
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-surface-2 via-surface-2 to-surface p-6 sm:p-8"
    >
      <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-accent/20 blur-[90px]" />

      <div className="pointer-events-none absolute -bottom-20 left-1/3 h-52 w-52 rounded-full bg-accent-2/10 blur-[80px]" />

      <div className="relative flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-text-faint">
            {TODAY}
          </p>

          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-text sm:text-3xl">
            Good afternoon, {userName || 'there'}
          </h2>

          <p className="mt-2 max-w-md text-sm leading-relaxed text-text-muted">
            {loading ? (
              'Loading your AI agent\u2019s activity\u2026'
            ) : (
              <>
                Your AI agent has logged{' '}
                <span className="text-text">
                  {aiActions != null
                    ? aiActions.toLocaleString()
                    : '—'}{' '}
                  actions
                </span>

                {pendingApprovals > 0 ? (
                  <>
                    {' '}and{' '}
                    <span className="text-text">
                      {pendingApprovals} item
                      {pendingApprovals === 1 ? '' : 's'}
                    </span>{' '}
                    are waiting on your approval.
                  </>
                ) : (
                  ' so far. Nothing is waiting on your approval right now.'
                )}
              </>
            )}
          </p>
        </div>

        <button
          onClick={onReviewApprovals}
          className="group relative inline-flex items-center gap-2 self-start rounded-xl bg-gradient-to-r from-accent to-accent-2 px-4 py-2.5 text-sm font-medium text-white shadow-[0_8px_24px_-8px_rgba(99,102,241,0.6)] transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_28px_-8px_rgba(99,102,241,0.7)] sm:self-auto"
        >
          Review approvals

          {pendingApprovals > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-white/25 px-1.5 text-[11px] font-semibold">
              {pendingApprovals}
            </span>
          )}

          <ArrowUpRight
            size={16}
            className="transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
          />
        </button>
      </div>
    </motion.section>
  )
}