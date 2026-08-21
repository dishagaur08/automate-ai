import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, Sparkles, Trash2, Play, History, Pencil, Power, CheckCircle2, AlertTriangle, Workflow as WorkflowIcon } from 'lucide-react'
import { api } from '../lib/api'
import { useToast } from '../components/ToastProvider'
import { LoadingState, EmptyState } from '../components/StateMessage'

const empty = {
  name: '',
  description: '',
  enabled: true,
  trigger_entity: 'lead',
  trigger_event: 'created',
  conditions: [],
  actions: [{ type: 'create_task', params: { title: 'Follow up' } }],
}

const actions = [
  { value: 'create_task', label: 'Create Task' },
  { value: 'update_lead', label: 'Update Lead' },
  { value: 'update_customer', label: 'Update Customer' },
  { value: 'update_task', label: 'Update Task' },
  { value: 'send_email', label: 'Send Email' },
  { value: 'draft_email', label: 'Draft Email' },
]

function ActionRow({ a, onChange, onRemove }) {
  return (
    <div className="rounded-xl border border-border bg-surface-2 p-3.5 space-y-2.5">
      <div className="flex gap-2">
        <select
          value={a.type}
          onChange={(e) => onChange({ ...a, type: e.target.value })}
          className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-xs font-medium text-text focus:outline-none"
        >
          {actions.map((x) => (
            <option key={x.value} value={x.value}>
              {x.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={onRemove}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-surface text-sm text-text-muted hover:text-danger"
          aria-label="Remove action"
        >
          ×
        </button>
      </div>
      <input
        value={a.params?.title || a.params?.subject || ''}
        onChange={(e) =>
          onChange({
            ...a,
            params: { ...a.params, title: e.target.value, subject: e.target.value },
          })
        }
        placeholder="Action details (e.g. Follow-up call, Onboarding email)"
        className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-xs text-text placeholder:text-text-faint focus:outline-none"
      />
    </div>
  )
}

export default function Workflows() {
  const [items, setItems] = useState([])
  const [history, setHistory] = useState([])
  const [form, setForm] = useState(empty)
  const [editing, setEditing] = useState(null)
  const [ai, setAi] = useState('')
  const [generating, setGenerating] = useState(false)
  const [loading, setLoading] = useState(true)
  const { showToast } = useToast()

  const load = async () => {
    try {
      const [w, h] = await Promise.all([api.workflows.list(), api.workflows.history()])
      setItems(w)
      setHistory(h)
    } catch (e) {
      showToast(e.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const save = async (e) => {
    e.preventDefault()
    try {
      if (editing) {
        await api.workflows.update(editing, form)
      } else {
        await api.workflows.create(form)
      }
      setEditing(null)
      setForm(empty)
      await load()
      showToast(editing ? 'Workflow updated' : 'Workflow created', 'success')
    } catch (e) {
      showToast(e.message, 'error')
    }
  }

  const suggest = async () => {
    if (!ai.trim() || generating) return
    setGenerating(true)
    try {
      const x = await api.workflows.suggest(ai)
      setForm(x)
      setEditing(null)
      showToast('AI workflow drafted — review before saving', 'success')
    } catch (e) {
      showToast(e.message, 'error')
    } finally {
      setGenerating(false)
    }
  }

  const remove = async (id) => {
    if (!confirm('Delete this workflow?')) return
    try {
      await api.workflows.remove(id)
      load()
      showToast('Workflow deleted', 'success')
    } catch (e) {
      showToast(e.message, 'error')
    }
  }

  const edit = (w) => {
    setEditing(w.id)
    setForm(w)
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-text">Workflows & Automations</h2>
          <p className="mt-1 text-sm text-text-muted">
            Automate repeatable CRM actions with safe triggers, conditions, and AI drafts.
          </p>
        </div>
        <button
          onClick={() => {
            setEditing(null)
            setForm(empty)
          }}
          className="inline-flex items-center gap-2 self-start sm:self-auto rounded-xl bg-gradient-to-r from-accent to-accent-2 px-4 py-2.5 text-sm font-medium text-white shadow-[0_8px_20px_-6px_rgba(99,102,241,0.5)] transition-transform duration-150 hover:-translate-y-0.5"
        >
          <Plus size={15} /> New workflow
        </button>
      </div>

      {/* AI Builder and History */}
      <div className="grid gap-5 lg:grid-cols-[1.15fr_.85fr]">
        <section className="card-surface rounded-2xl p-5 sm:p-6">
          <div className="mb-4 flex items-center gap-2">
            <Sparkles size={17} className="text-accent-3" />
            <h3 className="font-semibold text-text">AI Workflow Builder</h3>
          </div>
          <p className="mb-3 text-xs text-text-muted">
            Describe the trigger and action in natural language to generate a workflow template.
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              value={ai}
              onChange={(e) => setAi(e.target.value)}
              placeholder="e.g. When a lead becomes Qualified, create a high priority follow-up task"
              className="min-w-0 flex-1 rounded-xl border border-border bg-surface-2 px-3.5 py-2.5 text-sm text-text placeholder:text-text-faint focus:outline-none"
            />
            <button
              onClick={suggest}
              disabled={!ai.trim() || generating}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-surface-hover px-4 py-2.5 text-sm font-medium text-text border border-border-strong disabled:opacity-40"
            >
              {generating ? 'Drafting…' : 'Generate'}
            </button>
          </div>
        </section>

        <section className="card-surface rounded-2xl p-5 sm:p-6">
          <div className="mb-4 flex items-center gap-2">
            <History size={17} className="text-accent-3" />
            <h3 className="font-semibold text-text">Execution History</h3>
          </div>
          {history.length === 0 ? (
            <p className="text-xs text-text-faint">No executions yet. Triggers fire on CRM updates.</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {history.slice(0, 10).map((x) => (
                <div key={x.id} className="flex items-center justify-between rounded-xl bg-surface-2 px-3 py-2 text-xs border border-border">
                  <span className="font-medium text-text">
                    {x.trigger_entity} · {x.trigger_event}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 font-medium ${
                      x.status === 'failed'
                        ? 'text-danger'
                        : x.status === 'success'
                        ? 'text-success'
                        : 'text-text-faint'
                    }`}
                  >
                    {x.status === 'success' ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
                    {x.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Main Workflows grid: List and Editor */}
      <div className="grid gap-5 lg:grid-cols-[.9fr_1.1fr]">
        <section className="card-surface rounded-2xl p-5 sm:p-6">
          <div className="mb-4 flex items-center gap-2">
            <WorkflowIcon size={17} className="text-accent-3" />
            <h3 className="font-semibold text-text">Configured Workflows</h3>
          </div>
          {loading ? (
            <LoadingState label="Loading workflows…" />
          ) : items.length === 0 ? (
            <EmptyState label="No workflows yet. Create one or use the AI builder." />
          ) : (
            <div className="space-y-2.5">
              {items.map((w) => (
                <div
                  key={w.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface-2 p-3.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-text">{w.name}</p>
                    <p className="text-xs text-text-faint">
                      When {w.trigger_entity} is {w.trigger_event} &rarr; {w.actions.length} action
                      {w.actions.length > 1 ? 's' : ''}
                    </p>
                  </div>
                  <span
                    className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${
                      w.enabled
                        ? 'border-success/30 bg-success/10 text-success'
                        : 'border-border bg-surface text-text-faint'
                    }`}
                  >
                    {w.enabled ? 'Active' : 'Paused'}
                  </span>
                  <button
                    onClick={() => edit(w)}
                    className="p-1.5 rounded-lg text-text-muted hover:bg-surface hover:text-text"
                    aria-label="Edit workflow"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => remove(w.id)}
                    className="p-1.5 rounded-lg text-text-muted hover:bg-danger/10 hover:text-danger"
                    aria-label="Delete workflow"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Workflow Editor Form */}
        <form onSubmit={save} className="card-surface rounded-2xl p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold text-text">{editing ? 'Edit Workflow' : 'Workflow Builder'}</h3>
            {editing && (
              <button
                type="button"
                onClick={() => {
                  setEditing(null)
                  setForm(empty)
                }}
                className="text-xs text-text-muted hover:text-text"
              >
                Cancel
              </button>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-text-muted">Workflow Name</label>
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Qualify Lead & Notify Team"
                className="w-full rounded-xl border border-border bg-surface-2 px-3.5 py-2.5 text-sm text-text focus:outline-none"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-text-muted">Description (Optional)</label>
              <input
                value={form.description || ''}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Brief summary of workflow objective"
                className="w-full rounded-xl border border-border bg-surface-2 px-3.5 py-2.5 text-sm text-text focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-text-muted">Trigger Entity</label>
              <select
                value={form.trigger_entity}
                onChange={(e) =>
                  setForm({
                    ...form,
                    trigger_entity: e.target.value,
                    trigger_event: e.target.value === 'task' ? form.trigger_event : 'created',
                  })
                }
                className="w-full rounded-xl border border-border bg-surface-2 px-3.5 py-2.5 text-sm text-text focus:outline-none"
              >
                <option value="lead">Lead</option>
                <option value="customer">Customer</option>
                <option value="task">Task</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-text-muted">Trigger Event</label>
              <select
                value={form.trigger_event}
                onChange={(e) => setForm({ ...form, trigger_event: e.target.value })}
                className="w-full rounded-xl border border-border bg-surface-2 px-3.5 py-2.5 text-sm text-text focus:outline-none"
              >
                <option value="created">Created</option>
                <option value="updated">Updated</option>
                {form.trigger_entity === 'task' && <option value="completed">Completed</option>}
              </select>
            </div>
          </div>

          <label className="mt-4 flex items-center gap-2 text-xs font-medium text-text-muted cursor-pointer">
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
              className="rounded border-border text-accent focus:ring-0"
            />
            <Power size={13} className={form.enabled ? 'text-success' : 'text-text-faint'} />
            Enable workflow on save
          </label>

          <div className="mt-5 border-t border-border pt-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-text-muted">Actions</h4>
              <button
                type="button"
                onClick={() =>
                  setForm({
                    ...form,
                    actions: [...form.actions, { type: 'create_task', params: {} }],
                  })
                }
                className="text-xs font-medium text-accent-3 hover:underline"
              >
                + Add action
              </button>
            </div>
            <div className="mt-3 space-y-2.5">
              {form.actions.map((a, i) => (
                <ActionRow
                  key={i}
                  a={a}
                  onChange={(x) =>
                    setForm({
                      ...form,
                      actions: form.actions.map((v, j) => (j === i ? x : v)),
                    })
                  }
                  onRemove={() =>
                    setForm({
                      ...form,
                      actions: form.actions.filter((_, j) => j !== i),
                    })
                  }
                />
              ))}
            </div>
          </div>

          <button
            type="submit"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-accent to-accent-2 px-5 py-2.5 text-sm font-medium text-white shadow-[0_8px_20px_-6px_rgba(99,102,241,0.5)] transition-transform duration-150 hover:-translate-y-0.5"
          >
            <Play size={14} /> {editing ? 'Save changes' : 'Create workflow'}
          </button>
        </form>
      </div>
    </div>
  )
}
