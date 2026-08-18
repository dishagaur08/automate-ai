import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, Search, Pencil, Trash2 } from 'lucide-react'
import { useFetch } from '../hooks/useFetch'
import { useDebouncedValue } from '../hooks/useDebounce'
import { api } from '../lib/api'
import { useToast } from '../components/ToastProvider'
import { StatusBadge } from '../components/StatusBadge'
import { LoadingState, ErrorState, EmptyState } from '../components/StateMessage'
import LeadFormModal from '../components/LeadFormModal'
import ConfirmDialog from '../components/ConfirmDialog'

const STATUS_FILTERS = ['All', 'New', 'Qualified', 'Negotiation', 'Lost']

function formatDate(iso) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function Leads() {
  const { showToast } = useToast()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('All')
  const debouncedSearch = useDebouncedValue(search)

  const query = useMemo(
    () => ({ search: debouncedSearch || undefined, status: status === 'All' ? undefined : status }),
    [debouncedSearch, status]
  )
  const queryString = useMemo(() => {
    const entries = Object.entries(query).filter(([, v]) => v !== undefined)
    return entries.length ? `?${new URLSearchParams(entries).toString()}` : ''
  }, [query])
  const path = `/api/leads${queryString}`

  const { data: leads, loading, error, refetch } = useFetch(path)

  const [formOpen, setFormOpen] = useState(false)
  const [editingLead, setEditingLead] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  function openCreate() {
    setEditingLead(null)
    setFormOpen(true)
  }
  function openEdit(lead) {
    setEditingLead(lead)
    setFormOpen(true)
  }
  function handleSaved(_, isEdit) {
    setFormOpen(false)
    refetch()
    showToast(isEdit ? 'Lead updated' : 'Lead created', 'success')
  }
  async function handleDelete() {
    try {
      await api.leads.remove(deleteTarget.id)
      setDeleteTarget(null)
      refetch()
      showToast('Lead deleted', 'success')
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-text">Leads</h2>
          <p className="mt-1 text-sm text-text-muted">
            {loading ? 'Loading…' : `${leads?.length ?? 0} leads in your pipeline`}
          </p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center justify-center gap-1.5 self-start rounded-xl bg-gradient-to-r from-accent to-accent-2 px-4 py-2.5 text-sm font-medium text-white transition-transform duration-150 hover:-translate-y-0.5 sm:self-auto"
        >
          <Plus size={15} />
          Add lead
        </button>
      </div>

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex flex-1 items-center gap-2 rounded-xl border border-border bg-surface-2 px-3.5 py-2.5">
          <Search size={15} className="text-text-faint" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, company, or email…"
            className="w-full bg-transparent text-sm text-text placeholder:text-text-faint focus:outline-none"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                status === s
                  ? 'bg-surface-hover text-text border border-border-strong'
                  : 'text-text-faint hover:text-text-muted border border-transparent'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="card-surface overflow-hidden rounded-2xl">
        {loading && <LoadingState label="Loading leads…" />}
        {!loading && error && <ErrorState message={error} onRetry={refetch} />}
        {!loading && !error && leads?.length === 0 && (
          <EmptyState
            label={
              search || status !== 'All'
                ? 'No leads match your search or filter.'
                : 'No leads yet. Add one to get started.'
            }
          />
        )}

        {!loading && !error && leads?.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-[11px] uppercase tracking-wide text-text-faint">
                  <th className="px-5 py-3 font-medium">Name</th>
                  <th className="px-5 py-3 font-medium">Company</th>
                  <th className="px-5 py-3 font-medium">Email</th>
                  <th className="px-5 py-3 font-medium">Source</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Created</th>
                  <th className="px-5 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead, i) => (
                  <motion.tr
                    key={lead.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3, delay: Math.min(i * 0.03, 0.3) }}
                    className="group border-b border-border last:border-0 transition-colors hover:bg-surface-hover"
                  >
                    <td className="px-5 py-3.5 font-medium text-text">{lead.name}</td>
                    <td className="px-5 py-3.5 text-text-muted">{lead.company || '—'}</td>
                    <td className="px-5 py-3.5 text-text-muted">{lead.email || '—'}</td>
                    <td className="px-5 py-3.5 text-text-muted">{lead.source || '—'}</td>
                    <td className="px-5 py-3.5">
                      <StatusBadge value={lead.status} />
                    </td>
                    <td className="px-5 py-3.5 text-text-faint">{formatDate(lead.created_at)}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                          onClick={() => openEdit(lead)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-text-faint hover:bg-surface-hover hover:text-text"
                          aria-label="Edit lead"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(lead)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-text-faint hover:bg-danger/10 hover:text-danger"
                          aria-label="Delete lead"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <LeadFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        lead={editingLead}
        onSaved={handleSaved}
      />
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete this lead?"
        message={deleteTarget ? `"${deleteTarget.name}" will be permanently removed.` : ''}
        confirmLabel="Delete lead"
      />
    </div>
  )
}
