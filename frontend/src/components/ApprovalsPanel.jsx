import { useState } from 'react'
import { motion } from 'framer-motion'
import { Check, X, Loader2, Sparkles } from 'lucide-react'
import Modal from './Modal'
import { LoadingState, ErrorState, EmptyState } from './StateMessage'
import { api } from '../lib/api'
import { formatRelativeTime } from '../lib/time'

function ApprovalItem({ item, onAct }) {
  const [busy, setBusy] = useState(null) // 'Approved' | 'Rejected' | null

  async function act(status) {
    setBusy(status)
    try {
      await onAct(item.id, status)
    } finally {
      setBusy(null)
    }
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 30, transition: { duration: 0.2 } }}
      className="rounded-2xl border border-border bg-surface-2 p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-text">{item.title}</p>
          {item.related_to && <p className="mt-0.5 text-xs text-text-faint">{item.related_to}</p>}
        </div>
        <span className="shrink-0 text-[11px] text-text-faint">
          {formatRelativeTime(item.created_at)}
        </span>
      </div>

      <p className="mt-3 whitespace-pre-line rounded-xl border border-border bg-surface px-3.5 py-3 text-[13px] leading-relaxed text-text-muted">
        {item.content}
      </p>

      <div className="mt-3 flex gap-2.5">
        <button
          onClick={() => act('Rejected')}
          disabled={busy !== null}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-border-strong px-3.5 py-2 text-xs font-medium text-text-muted transition-colors hover:text-danger disabled:opacity-50"
        >
          {busy === 'Rejected' ? <Loader2 size={13} className="animate-spin" /> : <X size={13} />}
          Reject
        </button>
        <button
          onClick={() => act('Approved')}
          disabled={busy !== null}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-accent to-accent-2 px-3.5 py-2 text-xs font-medium text-white transition-transform duration-150 hover:-translate-y-0.5 disabled:opacity-60 disabled:hover:translate-y-0"
        >
          {busy === 'Approved' ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
          Approve
        </button>
      </div>
    </motion.div>
  )
}

export default function ApprovalsPanel({ open, onClose, approvals, loading, error, onRetry, onAct }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Review & Approval"
      description="Actions AutomateAI has prepared and is waiting on you to approve."
      maxWidth="max-w-lg"
    >
      <div className="mb-4 flex items-center gap-2 rounded-xl border border-border-strong bg-white/[0.03] px-3 py-2">
        <Sparkles size={13} className="text-accent-3" />
        <span className="text-[11px] font-medium text-text-muted">
          Nothing is sent until you approve it.
        </span>
      </div>

      {loading && <LoadingState label="Loading approvals…" />}
      {!loading && error && <ErrorState message={error} onRetry={onRetry} />}
      {!loading && !error && approvals?.length === 0 && (
        <EmptyState label="No pending approvals — you're all caught up." />
      )}

      {!loading && !error && approvals?.length > 0 && (
        <div className="space-y-3">
          {approvals.map((item) => (
            <ApprovalItem key={item.id} item={item} onAct={onAct} />
          ))}
        </div>
      )}
    </Modal>
  )
}
