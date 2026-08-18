import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import Modal from './Modal'
import { api } from '../lib/api'

const STATUS_OPTIONS = ['New', 'Qualified', 'Negotiation', 'Lost']
const SOURCE_OPTIONS = ['Website', 'Referral', 'Cold Outreach', 'Webinar']

const EMPTY = { name: '', email: '', phone: '', company: '', status: 'New', source: 'Website' }

function Field({ label, error, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-text-muted">{label}</span>
      {children}
      {error && <span className="mt-1 block text-[11px] text-danger">{error}</span>}
    </label>
  )
}

const inputClass =
  'w-full rounded-xl border border-border bg-surface-2 px-3.5 py-2.5 text-sm text-text placeholder:text-text-faint focus:border-border-strong focus:outline-none'

export default function LeadFormModal({ open, onClose, lead, onSaved }) {
  const isEdit = Boolean(lead)
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState(null)

  useEffect(() => {
    if (open) {
      setForm(
        lead
          ? {
              name: lead.name ?? '',
              email: lead.email ?? '',
              phone: lead.phone ?? '',
              company: lead.company ?? '',
              status: lead.status ?? 'New',
              source: lead.source ?? 'Website',
            }
          : EMPTY
      )
      setErrors({})
      setFormError(null)
    }
  }, [open, lead])

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  function validate() {
    const next = {}
    if (!form.name.trim()) next.name = 'Name is required'
    if (form.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) {
      next.email = 'Enter a valid email address'
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!validate()) return

    setSubmitting(true)
    setFormError(null)
    const payload = {
      ...form,
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      company: form.company.trim() || null,
    }

    try {
      const saved = isEdit ? await api.leads.update(lead.id, payload) : await api.leads.create(payload)
      onSaved(saved, isEdit)
    } catch (err) {
      setFormError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit lead' : 'Add a new lead'}
      description={isEdit ? 'Update this lead\u2019s details.' : 'Create a new lead in your pipeline.'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Name" error={errors.name}>
          <input
            className={inputClass}
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
            placeholder="e.g. Rahul Sharma"
            autoFocus
          />
        </Field>

        <Field label="Company">
          <input
            className={inputClass}
            value={form.company}
            onChange={(e) => update('company', e.target.value)}
            placeholder="e.g. ABC Company"
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Email" error={errors.email}>
            <input
              className={inputClass}
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
              placeholder="name@company.com"
              type="email"
            />
          </Field>
          <Field label="Phone">
            <input
              className={inputClass}
              value={form.phone}
              onChange={(e) => update('phone', e.target.value)}
              placeholder="+91 98765 43210"
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Status">
            <select
              className={inputClass}
              value={form.status}
              onChange={(e) => update('status', e.target.value)}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </Field>
          <Field label="Source">
            <select
              className={inputClass}
              value={form.source}
              onChange={(e) => update('source', e.target.value)}
            >
              {SOURCE_OPTIONS.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </Field>
        </div>

        {formError && <p className="text-xs text-danger">{formError}</p>}

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-border-strong px-4 py-2.5 text-sm font-medium text-text-muted transition-colors hover:text-text"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-accent to-accent-2 px-4 py-2.5 text-sm font-medium text-white transition-transform duration-150 hover:-translate-y-0.5 disabled:opacity-60 disabled:hover:translate-y-0"
          >
            {submitting && <Loader2 size={14} className="animate-spin" />}
            {isEdit ? 'Save changes' : 'Create lead'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
