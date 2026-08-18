import { motion } from 'framer-motion'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import { LoadingState, ErrorState, EmptyState } from './StateMessage'

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="glass rounded-lg border px-3 py-2 text-xs">
      <p className="font-medium text-text">{label}</p>
      <p className="text-text-muted">{payload[0].value} leads</p>
    </div>
  )
}

export default function LeadAnalyticsCard({ data, loading, error, onRetry }) {
  const total = Array.isArray(data) ? data.reduce((sum, d) => sum + d.leads, 0) : 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="card-surface rounded-2xl p-6"
    >
      <div className="mb-1 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-text">Lead Analytics</h3>
          <p className="mt-0.5 text-xs text-text-faint">New leads captured this week</p>
        </div>
        {!loading && !error && (
          <div className="text-right">
            <p className="tabular-nums text-xl font-semibold text-text">{total}</p>
            <p className="text-[11px] font-medium text-text-faint">leads this week</p>
          </div>
        )}
      </div>

      {loading && <LoadingState label="Loading analytics…" />}
      {!loading && error && <ErrorState message={error} onRetry={onRetry} />}
      {!loading && !error && (!data || data.length === 0) && (
        <EmptyState label="No lead data yet." />
      )}

      {!loading && !error && data && data.length > 0 && (
      <div className="mt-4 h-52 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 4, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="leadGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366f1" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              vertical={false}
              stroke="rgba(148,163,184,0.08)"
              strokeDasharray="0"
            />
            <XAxis
              dataKey="day"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#5c6a80', fontSize: 11 }}
              dy={8}
            />
            <YAxis hide domain={['dataMin - 10', 'dataMax + 10']} />
            <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'rgba(148,163,184,0.2)' }} />
            <Area
              type="monotone"
              dataKey="leads"
              stroke="#818cf8"
              strokeWidth={2.5}
              fill="url(#leadGradient)"
              animationDuration={1100}
              animationEasing="ease-out"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      )}
    </motion.div>
  )
}
