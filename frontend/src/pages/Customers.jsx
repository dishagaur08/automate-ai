import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, Search } from 'lucide-react'
import { useFetch } from '../hooks/useFetch'
import { useDebouncedValue } from '../hooks/useDebounce'
import { api } from '../lib/api'
import { useToast } from '../components/ToastProvider'
import { StatusBadge } from '../components/StatusBadge'
import { LoadingState, ErrorState, EmptyState } from '../components/StateMessage'
import CustomerFormModal from '../components/CustomerFormModal'
import CustomerDetailModal from '../components/CustomerDetailModal'
import ConfirmDialog from '../components/ConfirmDialog'

const STATUS_FILTERS = ['All', 'Active', 'Inactive']

function formatDate(iso) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function Customers() {
  const { showToast } = useToast()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('All')
  const debouncedSearch = useDebouncedValue(search)

  const queryString = useMemo(() => {
    const entries = Object.entries({
      search: debouncedSearch || undefined,
      status: status === 'All' ? undefined : status,
    }).filter(([, v]) => v !== undefined)
    return entries.length ? `?${new URLSearchParams(entries).toString()}` : ''
  }, [debouncedSearch, status])

  const { data: customers, loading, error, refetch } = useFetch(`/api/customers${queryString}`)

  const [formOpen, setFormOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState(null)
  const [detailCustomer, setDetailCustomer] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  function openCreate() {
    setEditingCustomer(null)
    setFormOpen(true)
  }
  function openEdit(customer) {
    setDetailCustomer(null)
    setEditingCustomer(customer)
    setFormOpen(true)
  }
  function handleSaved(_, isEdit) {
    setFormOpen(false)
    refetch()
    showToast(isEdit ? 'Customer updated' : 'Customer created', 'success')
  }
  function requestDelete(customer) {
    setDetailCustomer(null)
    setDeleteTarget(customer)
  }
  async function handleDelete() {
    try {
      await api.customers.remove(deleteTarget.id)
      setDeleteTarget(null)
      refetch()
      showToast('Customer deleted', 'success')
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-text">Customers</h2>
          <p className="mt-1 text-sm text-text-muted">
            {loading ? 'Loading…' : `${customers?.length ?? 0} customers on your account`}
          </p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center justify-center gap-1.5 self-start rounded-xl bg-gradient-to-r from-accent to-accent-2 px-4 py-2.5 text-sm font-medium text-white transition-transform duration-150 hover:-translate-y-0.5 sm:self-auto"
        >
          <Plus size={15} />
          Add customer
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {loading && (
          <div className="card-surface col-span-full rounded-2xl">
            <LoadingState label="Loading customers…" />
          </div>
        )}
        {!loading && error && (
          <div className="card-surface col-span-full rounded-2xl">
            <ErrorState message={error} onRetry={refetch} />
          </div>
        )}
        {!loading && !error && customers?.length === 0 && (
          <div className="card-surface col-span-full rounded-2xl">
            <EmptyState
              label={
                search || status !== 'All'
                  ? 'No customers match your search or filter.'
                  : 'No customers yet.'
              }
            />
          </div>
        )}

        {!loading &&
          !error &&
          customers?.map((customer, i) => (
            <motion.button
              key={customer.id}
              onClick={() => setDetailCustomer(customer)}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: Math.min(i * 0.04, 0.3) }}
              whileHover={{ y: -3 }}
              className="card-surface rounded-2xl p-5 text-left transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-accent-2 to-accent-3 text-sm font-semibold text-white">
                  {customer.name?.[0]?.toUpperCase() || '?'}
                </div>
                <StatusBadge value={customer.status} />
              </div>
              <h3 className="mt-4 text-sm font-semibold text-text">{customer.name}</h3>
              <p className="mt-0.5 truncate text-xs text-text-faint">
                {customer.email || 'No email on file'}
              </p>
              <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                <span className="text-[11px] text-text-faint">Customer since</span>
                <span className="text-[11px] font-medium text-text-muted">
                  {formatDate(customer.created_at)}
                </span>
              </div>
            </motion.button>
          ))}
      </div>

      <CustomerDetailModal
        open={Boolean(detailCustomer)}
        onClose={() => setDetailCustomer(null)}
        customer={detailCustomer}
        onEdit={openEdit}
        onDelete={requestDelete}
      />
      <CustomerFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        customer={editingCustomer}
        onSaved={handleSaved}
      />
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete this customer?"
        message={deleteTarget ? `"${deleteTarget.name}" will be permanently removed.` : ''}
        confirmLabel="Delete customer"
      />
    </div>
  )
}
