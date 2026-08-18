import { useState } from 'react'
import { motion } from 'framer-motion'
import { Mail, Send, Save, Clock3, CheckCircle2, XCircle, Loader2, Sparkles, RotateCcw } from 'lucide-react'
import { api } from '../lib/api'
import { useFetch } from '../hooks/useFetch'
import { useToast } from '../components/ToastProvider'
import { LoadingState, ErrorState, EmptyState } from '../components/StateMessage'
import { formatRelativeTime } from '../lib/time'

const STATUS = {
  Draft: { icon: Clock3, className: 'text-text-faint' },
  'Pending Approval': { icon: Clock3, className: 'text-warning' },
  Sending: { icon: Loader2, className: 'text-accent-3' },
  Sent: { icon: CheckCircle2, className: 'text-success' },
  Failed: { icon: XCircle, className: 'text-danger' },
  Rejected: { icon: XCircle, className: 'text-danger' },
}

function StatusPill({ status }) {
  const meta = STATUS[status] || STATUS.Draft
  const Icon = meta.icon
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium ${meta.className}`}>
      <Icon size={12} className={status === 'Sending' ? 'animate-spin' : ''} />
      {status}
    </span>
  )
}

function EmailRow({ email, onSend }) {
  const [busy, setBusy] = useState(false)
  async function handleSend() {
    setBusy(true)
    try { await onSend(email.id) } finally { setBusy(false) }
  }
  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-border bg-surface-2 p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent-3"><Mail size={15} /></div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="truncate text-sm font-medium text-text">{email.subject}</p>
            <StatusPill status={email.status} />
          </div>
          <p className="mt-1 text-xs text-text-faint">To {email.recipient} · {formatRelativeTime(email.created_at)}</p>
          <p className="mt-3 whitespace-pre-line rounded-xl border border-border bg-surface px-3.5 py-3 text-[12px] leading-relaxed text-text-muted line-clamp-5">{email.body}</p>
          {email.error_message && <p className="mt-2 text-[11px] text-danger">{email.error_message}</p>}
          {(email.status === 'Draft' || email.status === 'Failed') && (
            <button onClick={handleSend} disabled={busy} className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-accent to-accent-2 px-3.5 py-2 text-xs font-medium text-white disabled:opacity-50">
              {busy ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />} Send
            </button>
          )}
        </div>
      </div>
    </motion.div>
  )
}

export default function Emails() {
  const { showToast } = useToast()
  const { data: emails, loading, error, refetch } = useFetch('/api/emails')
  const [form, setForm] = useState({ recipient: '', subject: '', body: '' })
  const [busy, setBusy] = useState(null)

  function update(field, value) { setForm((prev) => ({ ...prev, [field]: value })) }
  function reset() { setForm({ recipient: '', subject: '', body: '' }) }

  async function submit(mode) {
    if (!form.recipient.trim() || !form.subject.trim() || !form.body.trim()) {
      showToast('Recipient, subject and message are required.', 'error')
      return
    }
    setBusy(mode)
    try {
      const result = mode === 'send' ? await api.emails.send(form) : await api.emails.draft(form)
      showToast(mode === 'send' ? 'Email sent successfully.' : 'Draft saved.', 'success')
      reset(); refetch()
      return result
    } catch (err) {
      showToast(err.message || 'Could not save email.', 'error')
    } finally { setBusy(null) }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="mb-7 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-accent-3"><Sparkles size={15} /><span className="text-[11px] font-semibold uppercase tracking-[0.18em]">Communication Hub</span></div>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-text">Email workspace</h2>
          <p className="mt-1 text-sm text-text-muted">Compose, save drafts, send messages, and track AI-assisted email activity.</p>
        </div>
        <button onClick={refetch} className="inline-flex w-fit items-center gap-1.5 rounded-xl border border-border-strong bg-surface-2 px-3 py-2 text-xs text-text-muted hover:text-text"><RotateCcw size={13} /> Refresh</button>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card-surface rounded-3xl p-5 sm:p-6">
          <div className="mb-5 flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-accent-2 text-white"><Mail size={18} /></div><div><h3 className="text-sm font-semibold text-text">Compose email</h3><p className="text-xs text-text-faint">Manual emails can be saved or sent directly.</p></div></div>
          <div className="space-y-3">
            <input value={form.recipient} onChange={(e) => update('recipient', e.target.value)} placeholder="Recipient email" type="email" className="w-full rounded-xl border border-border bg-surface-2 px-3.5 py-3 text-sm text-text placeholder:text-text-faint focus:border-border-strong focus:outline-none" />
            <input value={form.subject} onChange={(e) => update('subject', e.target.value)} placeholder="Subject" className="w-full rounded-xl border border-border bg-surface-2 px-3.5 py-3 text-sm text-text placeholder:text-text-faint focus:border-border-strong focus:outline-none" />
            <textarea value={form.body} onChange={(e) => update('body', e.target.value)} placeholder="Write your message…" rows={10} className="w-full resize-none rounded-xl border border-border bg-surface-2 px-3.5 py-3 text-sm leading-relaxed text-text placeholder:text-text-faint focus:border-border-strong focus:outline-none" />
            <div className="flex flex-wrap gap-2 pt-1">
              <button onClick={() => submit('draft')} disabled={busy !== null} className="inline-flex items-center gap-1.5 rounded-xl border border-border-strong px-4 py-2.5 text-xs font-medium text-text-muted hover:text-text disabled:opacity-50">{busy === 'draft' ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Save draft</button>
              <button onClick={() => submit('send')} disabled={busy !== null} className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-accent to-accent-2 px-4 py-2.5 text-xs font-medium text-white disabled:opacity-50">{busy === 'send' ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />} Send now</button>
            </div>
          </div>
        </motion.section>

        <section className="card-surface rounded-3xl p-5 sm:p-6">
          <div className="mb-5 flex items-center justify-between"><div><h3 className="text-sm font-semibold text-text">Email activity</h3><p className="mt-0.5 text-xs text-text-faint">Your drafts, pending approvals, sent and failed emails.</p></div><span className="rounded-full border border-border px-2.5 py-1 text-[10px] text-text-faint">{emails?.length || 0} records</span></div>
          {loading && <LoadingState label="Loading email activity…" />}
          {!loading && error && <ErrorState message={error} onRetry={refetch} />}
          {!loading && !error && (!emails || emails.length === 0) && <EmptyState label="No email activity yet." />}
          {!loading && !error && emails?.length > 0 && <div className="space-y-3">{emails.map((email) => <EmailRow key={email.id} email={email} onSend={async (id) => { try { await api.emails.sendExisting(id); showToast('Email sent successfully.', 'success'); refetch() } catch (err) { showToast(err.message || 'Could not send email.', 'error') } }} />)}</div>}
        </section>
      </div>
    </div>
  )
}
