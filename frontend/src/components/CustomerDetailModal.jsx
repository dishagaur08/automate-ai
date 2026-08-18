import { Building2, Mail, Phone, Calendar, Pencil, Trash2 } from 'lucide-react'
import Modal from './Modal'
import { StatusBadge } from './StatusBadge'

function formatDate(iso) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })
}

function Row({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3 border-b border-border py-3 last:border-0">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-text-faint">
        <Icon size={14} />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] text-text-faint">{label}</p>
        <p className="truncate text-sm text-text">{value || '—'}</p>
      </div>
    </div>
  )
}

export default function CustomerDetailModal({ open, onClose, customer, onEdit, onDelete }) {
  if (!customer) return null

  return (
    <Modal open={open} onClose={onClose} maxWidth="max-w-md">
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-accent-2 to-accent-3 text-base font-semibold text-white">
          {customer.name?.[0]?.toUpperCase() || '?'}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-semibold text-text">{customer.name}</h3>
          <div className="mt-1">
            <StatusBadge value={customer.status} />
          </div>
        </div>
      </div>

      <div className="mt-5">
        <Row icon={Building2} label="Company" value={customer.company} />
        <Row icon={Mail} label="Email" value={customer.email} />
        <Row icon={Phone} label="Phone" value={customer.phone} />
        <Row icon={Calendar} label="Customer since" value={formatDate(customer.created_at)} />
      </div>

      <div className="mt-6 flex gap-3">
        <button
          onClick={() => onDelete(customer)}
          className="flex items-center justify-center gap-1.5 rounded-xl border border-border-strong px-4 py-2.5 text-sm font-medium text-danger transition-colors hover:bg-danger/10"
        >
          <Trash2 size={14} />
          Delete
        </button>
        <button
          onClick={() => onEdit(customer)}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-accent to-accent-2 px-4 py-2.5 text-sm font-medium text-white transition-transform duration-150 hover:-translate-y-0.5"
        >
          <Pencil size={14} />
          Edit customer
        </button>
      </div>
    </Modal>
  )
}
