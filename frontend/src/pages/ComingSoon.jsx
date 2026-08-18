import { motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'

export default function ComingSoon({ title, description }) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="card-surface flex min-h-[420px] flex-col items-center justify-center rounded-3xl p-10 text-center"
      >
        <div className="animate-float-slow flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-accent via-accent-2 to-accent-3 shadow-[0_0_24px_-4px_rgba(99,102,241,0.55)]">
          <Sparkles size={22} className="text-white" strokeWidth={2} />
        </div>
        <h2 className="mt-6 text-xl font-semibold tracking-tight text-text">{title}</h2>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-text-muted">
          {description || 'This module is being built in an upcoming phase.'}
        </p>
      </motion.div>
    </div>
  )
}
