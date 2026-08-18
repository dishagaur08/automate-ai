import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Sparkles, ArrowRight, Mic } from 'lucide-react'

const SUGGESTIONS = [
  'Create a lead for Rahul from ABC Company',
  "What's the price of our CRM product?",
  'Prepare a follow-up email for Priya',
]

export default function AIAssistantCTA() {
  const navigate = useNavigate()

  function goToCommandCenter(prefill) {
    navigate('/ai-agent', prefill ? { state: { prefill } } : undefined)
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
      className="relative overflow-hidden rounded-3xl border border-border-strong bg-gradient-to-br from-[#0d1023] via-[#0b0e1c] to-[#0a0c17] p-6 sm:p-10"
    >
      {/* Ambient aurora glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="animate-aurora-a absolute -left-16 -top-24 h-72 w-72 rounded-full bg-accent/25 blur-[100px]" />
        <div className="animate-aurora-b absolute -right-10 top-10 h-72 w-72 rounded-full bg-accent-2/20 blur-[100px]" />
        <div className="absolute bottom-0 left-1/2 h-56 w-56 -translate-x-1/2 rounded-full bg-accent-3/10 blur-[90px]" />
      </div>

      <div className="relative grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:items-center">
        {/* Left: copy + CTA */}
        <div>
          <div className="animate-float-slow inline-flex items-center gap-2 rounded-full border border-border-strong bg-white/[0.03] px-3 py-1.5">
            <Sparkles size={13} className="animate-glow-pulse text-accent-3" />
            <span className="text-[11px] font-medium tracking-wide text-text-muted">
              Your AI Business Agent
            </span>
          </div>

          <h2 className="mt-5 text-[26px] font-semibold leading-tight tracking-tight text-text sm:text-3xl">
            Ask AutomateAI
          </h2>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-text-muted">
            Describe what you need in plain English. AutomateAI creates leads,
            searches your knowledge base, and drafts emails — ready for your
            approval before anything goes out.
          </p>

          <button
            onClick={() => goToCommandCenter()}
            className="group mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-accent via-accent-2 to-accent-3 px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_30px_-8px_rgba(99,102,241,0.65)] transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_36px_-8px_rgba(99,102,241,0.75)]"
          >
            Start a conversation
            <ArrowRight size={16} className="transition-transform duration-200 group-hover:translate-x-1" />
          </button>
        </div>

        {/* Right: chat mockup */}
        <div className="glass rounded-2xl border p-4 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.7)] sm:p-5">
          <div className="mb-4 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-danger/70" />
            <span className="h-2 w-2 rounded-full bg-warning/70" />
            <span className="h-2 w-2 rounded-full bg-success/70" />
            <span className="ml-2 text-[11px] text-text-faint">AutomateAI Assistant</span>
          </div>

          <div className="space-y-2.5">
            {SUGGESTIONS.map((text, i) => (
              <motion.button
                key={text}
                onClick={() => goToCommandCenter(text)}
                initial={{ opacity: 0, x: 10 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.15 + i * 0.1, duration: 0.4 }}
                className="w-full rounded-xl border border-border bg-surface-2 px-3.5 py-2.5 text-left text-[13px] text-text-muted transition-colors duration-150 hover:border-border-strong hover:text-text"
              >
                {text}
              </motion.button>
            ))}
          </div>

          <div className="mt-4 flex items-center gap-2 rounded-xl border border-border-strong bg-surface px-3.5 py-3">
            <span className="flex-1 text-[13px] text-text-faint">Type a request…</span>
            <button
              className="flex h-7 w-7 items-center justify-center rounded-lg text-text-faint hover:bg-surface-hover hover:text-text"
              aria-label="Voice input"
            >
              <Mic size={14} />
            </button>
            <button
              onClick={() => goToCommandCenter()}
              className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-accent to-accent-2 text-white"
              aria-label="Open AI Command Center"
            >
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </motion.section>
  )
}
