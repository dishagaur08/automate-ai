import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles,
  Send,
  Loader2,
  CheckCircle2,
  XCircle,
  Settings2,
  UserPlus,
  Search,
  ListPlus,
  Mail,
  BarChart3,
} from 'lucide-react'
import { api } from '../lib/api'
import ToolResultView from '../components/ToolResultView'

const SUGGESTIONS = [
  { label: 'Create a lead', icon: UserPlus, text: 'Create a lead for Rahul Sharma from ABC Technologies with phone 9876543210' },
  { label: 'Search leads', icon: Search, text: 'Show me all leads that are currently qualified' },
  { label: 'Create a task', icon: ListPlus, text: 'Create a task for Rahul to follow up tomorrow' },
  { label: 'Draft an email', icon: Mail, text: 'Draft a follow-up email for Rahul regarding our CRM product' },
  { label: 'Analyze activity', icon: BarChart3, text: 'Give me a summary of our current sales activity' },
]

function StatusDot({ providerStatus }) {
  const map = {
    unknown: { color: 'bg-text-faint', label: 'AI Assistant' },
    configured: { color: 'bg-success animate-glow-pulse', label: 'AI Connected' },
    not_configured: { color: 'bg-warning', label: 'Not Configured' },
  }
  const { color, label } = map[providerStatus] ?? map.unknown
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border-strong bg-white/[0.03] px-2.5 py-1 text-[11px] font-medium text-text-muted">
      <span className={`h-1.5 w-1.5 rounded-full ${color}`} />
      {label}
    </span>
  )
}

function InterpretationLine({ entry }) {
  if (entry.status === 'processing') {
    return (
      <span className="inline-flex items-center gap-1.5 text-text-faint">
        <Loader2 size={12} className="animate-spin" />
        AutomateAI is working on it…
      </span>
    )
  }
  if (entry.status === 'not_configured') {
    return <span className="text-warning">AI provider not configured</span>
  }
  if (entry.status === 'error') {
    return <span className="text-danger">Could not complete this request</span>
  }
  if (entry.tool) {
    return (
      <span className="text-text-muted">
        Selected tool: <span className="font-medium text-accent-3">{entry.tool}</span>
      </span>
    )
  }
  return <span className="text-text-muted">Answered directly — no action needed</span>
}

function ConversationEntry({ entry }) {
  const StatusIcon =
    entry.status === 'success' ? CheckCircle2 : entry.status === 'processing' ? Loader2 : entry.status === 'not_configured' ? Settings2 : XCircle
  const iconClass =
    entry.status === 'success'
      ? 'text-success'
      : entry.status === 'processing'
      ? 'text-text-faint animate-spin'
      : entry.status === 'not_configured'
      ? 'text-warning'
      : 'text-danger'

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-2.5"
    >
      {/* User request */}
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-gradient-to-r from-accent to-accent-2 px-4 py-2.5 text-sm text-white">
          {entry.command}
        </div>
      </div>

      {/* AI interpretation + result */}
      <div className="flex gap-3">
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-surface-2">
          <StatusIcon size={14} className={iconClass} />
        </span>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="text-xs">
            <InterpretationLine entry={entry} />
          </div>

          {(entry.status === 'success' || entry.status === 'error' || entry.status === 'not_configured') && (
            <div className="card-surface rounded-xl px-4 py-3">
              <p className="text-sm text-text">{entry.message}</p>
              {entry.status === 'success' && entry.data && (
                <div className="mt-2.5">
                  <ToolResultView tool={entry.tool} data={entry.data} />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

export default function CommandCenter() {
  const location = useLocation()
  const [input, setInput] = useState('')
  const [conversation, setConversation] = useState([])
  const [providerStatus, setProviderStatus] = useState('unknown')
  const [busy, setBusy] = useState(false)
  const scrollRef = useRef(null)
  const inputRef = useRef(null)

  // Fetch AI status and recent activity on mount
  useEffect(() => {
    async function checkStatus() {
      try {
        const res = await api.ai.status()
        setProviderStatus(res.configured ? 'configured' : 'not_configured')
      } catch {
        setProviderStatus('unknown')
      }
    }
    checkStatus()
  }, [])

  // If we arrived here via a suggestion chip clicked on the Dashboard,
  // prefill the input with it.
  useEffect(() => {
    if (location.state?.prefill) {
      setInput(location.state.prefill)
      inputRef.current?.focus()
    }
  }, [location.state])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [conversation])

  async function sendCommand(text) {
    const command = text.trim()
    if (!command || busy) return

    const id = Math.random().toString(36).slice(2)
    setConversation((prev) => [...prev, { id, command, status: 'processing' }])
    setInput('')
    setBusy(true)

    try {
      const result = await api.ai.command(command)
      setProviderStatus(result.status === 'not_configured' ? 'not_configured' : 'configured')
      setConversation((prev) =>
        prev.map((e) => (e.id === id ? { ...e, ...result } : e))
      )
    } catch (err) {
      setConversation((prev) =>
        prev.map((e) =>
          e.id === id ? { ...e, status: 'error', message: err.message || 'Something went wrong.' } : e
        )
      )
    } finally {
      setBusy(false)
    }
  }

  function handleSubmit(e) {
    e.preventDefault()
    sendCommand(input)
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-64px)] max-w-4xl flex-col px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-5 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-accent via-accent-2 to-accent-3 shadow-[0_0_18px_-2px_rgba(99,102,241,0.55)]">
            <Sparkles size={18} className="text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-text">AutomateAI Intelligence</h2>
            <p className="text-xs text-text-faint">Your AI business agent — leads, tasks, and follow-ups on command</p>
          </div>
          <div className="ml-auto">
            <StatusDot providerStatus={providerStatus} />
          </div>
        </div>
      </div>

      {/* Conversation area */}
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto rounded-2xl border border-border bg-surface-2/40 p-4 sm:p-6">
        {conversation.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="animate-float-slow flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-accent/20 via-accent-2/20 to-accent-3/20">
              <Sparkles size={22} className="text-accent-3" />
            </div>
            <p className="mt-4 max-w-sm text-sm text-text-muted">
              Ask AutomateAI to create a lead, find records, draft a follow-up email, or
              summarize your sales activity.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            <AnimatePresence initial={false}>
              {conversation.map((entry) => (
                <ConversationEntry key={entry.id} entry={entry} />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Suggested command chips */}
      <div className="mt-4 flex shrink-0 flex-wrap gap-2">
        {SUGGESTIONS.map(({ label, icon: Icon, text }) => (
          <button
            key={label}
            onClick={() => setInput(text)}
            className="inline-flex items-center gap-1.5 rounded-full border border-border-strong bg-surface-2 px-3 py-1.5 text-xs text-text-muted transition-colors hover:border-accent/40 hover:text-text"
          >
            <Icon size={12} />
            {label}
          </button>
        ))}
      </div>

      {/* Command input */}
      <form onSubmit={handleSubmit} className="mt-3 flex shrink-0 items-center gap-2.5">
        <div className="flex flex-1 items-center gap-2 rounded-2xl border border-border-strong bg-surface-2 px-4 py-3">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask AutomateAI to do something…"
            className="w-full bg-transparent text-sm text-text placeholder:text-text-faint focus:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-accent to-accent-2 text-white shadow-[0_8px_24px_-8px_rgba(99,102,241,0.6)] transition-transform duration-150 hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0"
          aria-label="Send command"
        >
          {busy ? <Loader2 size={17} className="animate-spin" /> : <Send size={17} />}
        </button>
      </form>
    </div>
  )
}
