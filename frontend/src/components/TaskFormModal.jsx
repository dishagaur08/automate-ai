import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import Modal from './Modal'
import { api } from '../lib/api'

const STATUS_OPTIONS = ['Pending', 'In Progress', 'Completed']
const PRIORITY_OPTIONS = ['Low', 'Medium', 'High']
const EMPTY = { title: '', status: 'Pending', priority: 'Medium', due_date: '' }

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

export default function TaskFormModal({ open, onClose, task, onSaved }) {
  const isEdit = Boolean(task)
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState(null)

  useEffect(() => {
    if (open) {
      setForm(
        task
          ? {
              title: task.title ?? '',
              status: task.status ?? 'Pending',
              priority: task.priority ?? 'Medium',
              due_date: task.due_date ?? '',
            }
          : EMPTY
      )
      setErrors({})
      setFormError(null)
    }
  }, [open, task])

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  function validate() {
    const next = {}
    if (!form.title.trim()) next.title = 'Title is required'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!validate()) return

    setSubmitting(true)
    setFormError(null)
    const payload = { ...form, due_date: form.due_date || null }

    try {
      const saved = isEdit ? await api.tasks.update(task.id, payload) : await api.tasks.create(payload)
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
      title={isEdit ? 'Edit task' : 'Add a new task'}
      description={isEdit ? 'Update this task.' : 'Create a new task.'}
      maxWidth="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Title" error={errors.title}>
          <input
            className={inputClass}
            value={form.title}
            onChange={(e) => update('title', e.target.value)}
            placeholder="e.g. Follow up with Rahul Sharma"
            autoFocus
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Priority">
            <select
              className={inputClass}
              value={form.priority}
              onChange={(e) => update('priority', e.target.value)}
            >
              {PRIORITY_OPTIONS.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </Field>
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
        </div>

        <Field label="Due date">
          <input
            type="date"
            className={inputClass}
            value={form.due_date || ''}
            onChange={(e) => update('due_date', e.target.value)}
          />
        </Field>

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
            {isEdit ? 'Save changes' : 'Create task'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
