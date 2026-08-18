import { useCallback, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import {
  UploadCloud,
  FileText,
  Trash2,
  Loader2,
  Search,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Sparkles,
} from 'lucide-react'
import { useFetch } from '../hooks/useFetch'
import { api } from '../lib/api'
import { useToast } from '../components/ToastProvider'
import { LoadingState, ErrorState, EmptyState } from '../components/StateMessage'
import ConfirmDialog from '../components/ConfirmDialog'
import { formatRelativeTime } from '../lib/time'

const STATUS_META = {
  processing: { label: 'Processing', icon: Loader2, className: 'text-accent-3', spin: true },
  ready: { label: 'Ready', icon: CheckCircle2, className: 'text-success' },
  ready_no_embeddings: { label: 'Stored (not searchable)', icon: Clock, className: 'text-warning' },
  error: { label: 'Failed', icon: AlertTriangle, className: 'text-danger' },
}

function formatBytes(bytes) {
  if (!bytes) return '0 KB'
  const kb = bytes / 1024
  if (kb < 1024) return `${kb.toFixed(kb < 10 ? 1 : 0)} KB`
  return `${(kb / 1024).toFixed(1)} MB`
}

function DocumentRow({ doc, onDelete }) {
  const meta = STATUS_META[doc.status] || STATUS_META.error
  const Icon = meta.icon
  return (
    <div className="flex items-center gap-3 border-b border-border py-3 last:border-0">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-text-faint">
        <FileText size={16} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium text-text">{doc.original_filename}</p>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-text-faint">
          <span>{formatBytes(doc.size_bytes)}</span>
          <span>&middot;</span>
          <span>{doc.chunk_count} chunk{doc.chunk_count === 1 ? '' : 's'}</span>
          <span>&middot;</span>
          <span>{formatRelativeTime(doc.created_at)}</span>
        </div>
        {doc.status === 'error' && doc.error_message && (
          <p className="mt-1 text-[11px] text-danger">{doc.error_message}</p>
        )}
        {doc.status === 'ready_no_embeddings' && (
          <p className="mt-1 text-[11px] text-warning">{doc.error_message}</p>
        )}
      </div>
      <span className={`flex shrink-0 items-center gap-1.5 text-[11px] font-medium ${meta.className}`}>
        <Icon size={13} className={meta.spin ? 'animate-spin' : ''} />
        {meta.label}
      </span>
      <button
        onClick={() => onDelete(doc)}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-text-faint transition-colors hover:bg-danger/10 hover:text-danger"
        aria-label={`Delete ${doc.original_filename}`}
      >
        <Trash2 size={14} />
      </button>
    </div>
  )
}

function SourceCard({ source, index }) {
  return (
    <div className="rounded-xl border border-border bg-surface px-3.5 py-3">
      <div className="mb-1 flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 truncate text-[12px] font-medium text-text">
          <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded bg-accent/15 text-[10px] text-accent-3">
            {index + 1}
          </span>
          {source.filename}
        </p>
        <span className="shrink-0 text-[10px] text-text-faint">{Math.round(source.score * 100)}% match</span>
      </div>
      <p className="line-clamp-3 text-[12px] leading-relaxed text-text-muted">{source.excerpt}</p>
    </div>
  )
}

function AskPanel() {
  const [question, setQuestion] = useState('')
  const [asking, setAsking] = useState(false)
  const [result, setResult] = useState(null) // { status, answer, sources, message }
  const [error, setError] = useState(null)

  async function handleAsk(e) {
    e.preventDefault()
    if (!question.trim() || asking) return
    setAsking(true)
    setError(null)
    setResult(null)
    try {
      const res = await api.knowledgeBase.query(question.trim())
      setResult(res)
    } catch (err) {
      setError(err.message || 'Something went wrong')
    } finally {
      setAsking(false)
    }
  }

  return (
    <div className="card-surface rounded-2xl p-5">
      <div className="mb-3 flex items-center gap-2">
        <Sparkles size={15} className="text-accent-3" />
        <h3 className="text-sm font-semibold text-text">Ask your Knowledge Base</h3>
      </div>
      <form onSubmit={handleAsk} className="flex gap-2">
        <div className="relative flex-1">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-faint" />
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="e.g. What's included in the Pro plan?"
            className="w-full rounded-xl border border-border bg-surface-2 py-2.5 pl-9 pr-3.5 text-sm text-text placeholder:text-text-faint focus:border-border-strong focus:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={asking || !question.trim()}
          className="flex items-center gap-1.5 rounded-xl bg-gradient-to-br from-accent via-accent-2 to-accent-3 px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {asking && <Loader2 size={14} className="animate-spin" />}
          Ask
        </button>
      </form>

      {error && (
        <p className="mt-3 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-[13px] text-danger">
          {error}
        </p>
      )}

      {result && result.status === 'not_configured' && (
        <p className="mt-3 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-[13px] text-warning">
          {result.message}
        </p>
      )}

      {result && result.status === 'error' && (
        <p className="mt-3 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-[13px] text-danger">
          {result.message}
        </p>
      )}

      {result && result.status === 'success' && (
        <div className="mt-4 space-y-3">
          <p className="whitespace-pre-line rounded-xl border border-border bg-surface-2 px-4 py-3 text-[13px] leading-relaxed text-text">
            {result.answer}
          </p>
          {result.sources?.length > 0 && (
            <div>
              <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-text-faint">Sources</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {result.sources.map((s, i) => (
                  <SourceCard key={`${s.document_id}-${s.chunk_index}`} source={s} index={i} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function KnowledgeBase() {
  const { showToast } = useToast()
  const { data: documents, loading, error, refetch } = useFetch('/api/documents')
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const fileInputRef = useRef(null)

  const uploadFile = useCallback(
    async (file) => {
      if (!file) return
      setUploading(true)
      try {
        const doc = await api.documents.upload(file)
        refetch()
        if (doc.status === 'error') {
          showToast(doc.error_message || 'Upload failed', 'error')
        } else if (doc.status === 'ready_no_embeddings') {
          showToast('Document stored — configure an embedding provider to make it searchable', 'info')
        } else {
          showToast('Document uploaded and indexed', 'success')
        }
      } catch (err) {
        showToast(err.message || 'Upload failed', 'error')
      } finally {
        setUploading(false)
      }
    },
    [refetch, showToast]
  )

  function handleFileInputChange(e) {
    const file = e.target.files?.[0]
    if (file) uploadFile(file)
    e.target.value = ''
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) uploadFile(file)
  }

  async function handleDelete() {
    try {
      await api.documents.remove(deleteTarget.id)
      setDeleteTarget(null)
      refetch()
      showToast('Document deleted', 'success')
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="mb-6">
        <h2 className="text-xl font-semibold tracking-tight text-text">Knowledge Base</h2>
        <p className="mt-1 text-sm text-text-muted">
          Upload product info, pricing, FAQs, and policies. The AI Command Center and the search
          below can answer questions using these documents, with citations.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <AskPanel />

          <div className="card-surface rounded-2xl p-5">
            <h3 className="mb-3 text-sm font-semibold text-text">Documents</h3>
            {loading && <LoadingState label="Loading documents…" />}
            {error && <ErrorState message={error} onRetry={refetch} />}
            {!loading && !error && (!documents || documents.length === 0) && (
              <EmptyState label="No documents yet — upload one to get started." />
            )}
            {!loading && !error && documents?.length > 0 && (
              <div>
                {documents.map((doc) => (
                  <DocumentRow key={doc.id} doc={doc} onDelete={setDeleteTarget} />
                ))}
              </div>
            )}
          </div>
        </div>

        <div>
          <motion.div
            initial={false}
            animate={{ borderColor: dragOver ? 'var(--color-accent-3)' : 'var(--color-border)' }}
            onDragOver={(e) => {
              e.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className="card-surface flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-accent via-accent-2 to-accent-3 shadow-[0_0_18px_-2px_rgba(99,102,241,0.55)]">
              {uploading ? (
                <Loader2 size={20} className="animate-spin text-white" />
              ) : (
                <UploadCloud size={20} className="text-white" />
              )}
            </div>
            <p className="mt-4 text-sm font-medium text-text">
              {uploading ? 'Uploading…' : 'Drag & drop a document'}
            </p>
            <p className="mt-1 text-xs text-text-faint">PDF, TXT, or MD — up to 15 MB</p>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="mt-4 rounded-xl border border-border-strong px-4 py-2 text-sm font-medium text-text-muted transition-colors hover:text-text disabled:opacity-50"
            >
              Browse files
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.txt,.md"
              className="hidden"
              onChange={handleFileInputChange}
            />
          </motion.div>
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete this document?"
        message={deleteTarget ? `"${deleteTarget.original_filename}" will be permanently removed.` : ''}
      />
    </div>
  )
}
