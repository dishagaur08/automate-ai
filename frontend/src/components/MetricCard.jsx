import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown } from 'lucide-react'

export default function MetricCard({ metric, index }) {
  const hasTrend = metric.trend === 'up' || metric.trend === 'down'
  const isUp = metric.trend === 'up'

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.05 * index, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -3 }}
      className="card-surface rounded-2xl p-5 transition-colors duration-200"
    >
      <p className="text-xs font-medium text-text-faint">{metric.label}</p>
      <div className="mt-3 flex items-end justify-between">
        <span className="tabular-nums text-[28px] font-semibold leading-none tracking-tight text-text">
          {metric.value}
        </span>
        {hasTrend && (
          <span
            className={`flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium ${
              isUp ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'
            }`}
          >
            {isUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {metric.delta}
          </span>
        )}
      </div>
      <p className="mt-2 text-[11px] text-text-faint">{metric.caption}</p>
    </motion.div>
  )
}
