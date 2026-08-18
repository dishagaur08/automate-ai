import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, Search, Pencil, Trash2, Check, Calendar } from 'lucide-react'
import { useFetch } from '../hooks/useFetch'
import { useDebouncedValue } from '../hooks/useDebounce'
import { api } from '../lib/api'
import { useToast } from '../components/ToastProvider'
import { StatusBadge, PriorityBadge } from '../components/StatusBadge'
import { LoadingState, ErrorState, EmptyState } from '../components/StateMessage'
import TaskFormModal from '../components/TaskFormModal'
import ConfirmDialog from '../components/ConfirmDialog'

const STATUS_FILTERS = ['All', 'Pending', 'In Progress', 'Completed']

function formatDueDate(iso) {
  if (!iso) return null
  const d = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export default function Tasks() {
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

  const { data: tasks, loading, error, refetch } = useFetch(`/api/tasks${queryString}`)

  const [formOpen, setFormOpen] = useState(false)
  const [editingTask, setEditingTask] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [togglingId, setTogglingId] = useState(null)

  function openCreate() {
    setEditingTask(null)
    setFormOpen(true)
  }
  function openEdit(task) {
    setEditingTask(task)
    setFormOpen(true)
  }
  function handleSaved(_, isEdit) {
    setFormOpen(false)
    refetch()
    showToast(isEdit ? 'Task updated' : 'Task created', 'success')
  }
  async function handleDelete() {
    try {
      await api.tasks.remove(deleteTarget.id)
      setDeleteTarget(null)
      refetch()
      showToast('Task deleted', 'success')
    } catch (err) {
      showToast(err.message, 'error')
    }
  }
  async function toggleComplete(task) {
    setTogglingId(task.id)
    const nextStatus = task.status === 'Completed' ? 'Pending' : 'Completed'
    try {
      await api.tasks.update(task.id, { status: nextStatus })
      refetch()
      showToast(nextStatus === 'Completed' ? 'Task marked complete' : 'Task reopened', 'success')
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setTogglingId(null)
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-text">Tasks</h2>
          <p className="mt-1 text-sm text-text-muted">
            {loading ? 'Loading…' : `${tasks?.length ?? 0} tasks tracked`}
          </p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center justify-center gap-1.5 self-start rounded-xl bg-gradient-to-r from-accent to-accent-2 px-4 py-2.5 text-sm font-medium text-white transition-transform duration-150 hover:-translate-y-0.5 sm:self-auto"
        >
          <Plus size={15} />
          Add task
        </button>
      </div>

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex flex-1 items-center gap-2 rounded-xl border border-border bg-surface-2 px-3.5 py-2.5">
          <Search size={15} className="text-text-faint" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks…"
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
        {loading && <LoadingState label="Loading tasks…" />}
        {!loading && error && <ErrorState message={error} onRetry={refetch} />}
        {!loading && !error && tasks?.length === 0 && (
          <EmptyState
            label={
              search || status !== 'All'
                ? 'No tasks match your search or filter.'
                : 'No tasks yet. Add one to get started.'
            }
          />
        )}

        {!loading && !error && tasks?.length > 0 && (
          <ul>
            {tasks.map((task, i) => {
              const isDone = task.status === 'Completed'
              const dueLabel = formatDueDate(task.due_date)
              return (
                <motion.li
                  key={task.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3, delay: Math.min(i * 0.03, 0.3) }}
                  className="group flex items-center gap-3 border-b border-border px-5 py-3.5 last:border-0 hover:bg-surface-hover"
                >
                  <button
                    onClick={() => toggleComplete(task)}
                    disabled={togglingId === task.id}
                    aria-label={isDone ? 'Mark incomplete' : 'Mark complete'}
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors ${
                      isDone
                        ? 'border-success bg-success/20 text-success'
                        : 'border-border-strong text-transparent hover:border-accent'
                    }`}
                  >
                    <Check size={12} strokeWidth={3} />
                  </button>

                  <div className="min-w-0 flex-1">
                    <span className={`text-sm ${isDone ? 'text-text-faint line-through' : 'text-text'}`}>
                      {task.title}
                    </span>
                    {dueLabel && (
                      <span className="ml-2 inline-flex items-center gap-1 text-[11px] text-text-faint">
                        <Calendar size={11} />
                        {dueLabel}
                      </span>
                    )}
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <PriorityBadge value={task.priority} />
                    <StatusBadge value={task.status} />
                    <div className="flex items-center opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        onClick={() => openEdit(task)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-text-faint hover:bg-surface-hover hover:text-text"
                        aria-label="Edit task"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(task)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-text-faint hover:bg-danger/10 hover:text-danger"
                        aria-label="Delete task"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </motion.li>
              )
            })}
          </ul>
        )}
      </div>

      <TaskFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        task={editingTask}
        onSaved={handleSaved}
      />
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete this task?"
        message={deleteTarget ? `"${deleteTarget.title}" will be permanently removed.` : ''}
        confirmLabel="Delete task"
      />
    </div>
  )
}
