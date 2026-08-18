import { StatusBadge } from './StatusBadge'

function Pill({ children }) {
  return (
    <span className="rounded-full border border-border-strong bg-surface px-2 py-0.5 text-[11px] text-text-muted">
      {children}
    </span>
  )
}

function LeadRow({ lead }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border py-2 last:border-0">
      <div className="min-w-0">
        <p className="truncate text-[13px] font-medium text-text">{lead.name}</p>
        <p className="truncate text-[11px] text-text-faint">{lead.company || 'No company on file'}</p>
      </div>
      <StatusBadge value={lead.status} />
    </div>
  )
}

function TaskRow({ task }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border py-2 last:border-0">
      <div className="min-w-0">
        <p className="truncate text-[13px] font-medium text-text">{task.title}</p>
        {task.due_date && <p className="text-[11px] text-text-faint">Due {task.due_date}</p>}
      </div>
      <StatusBadge value={task.status} />
    </div>
  )
}

function CustomerRow({ customer }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border py-2 last:border-0">
      <div className="min-w-0">
        <p className="truncate text-[13px] font-medium text-text">{customer.name}</p>
        <p className="truncate text-[11px] text-text-faint">{customer.company || 'No company on file'}</p>
      </div>
      <StatusBadge value={customer.status} />
    </div>
  )
}

export default function ToolResultView({ tool, data }) {
  if (!data) return null

  // Lists returned by search_leads / search_tasks / search_customers
  if (Array.isArray(data.leads)) {
    if (data.leads.length === 0) return null
    return <div>{data.leads.map((l) => <LeadRow key={l.id} lead={l} />)}</div>
  }
  if (Array.isArray(data.tasks)) {
    if (data.tasks.length === 0) return null
    return <div>{data.tasks.map((t) => <TaskRow key={t.id} task={t} />)}</div>
  }
  if (Array.isArray(data.customers)) {
    if (data.customers.length === 0) return null
    return <div>{data.customers.map((c) => <CustomerRow key={c.id} customer={c} />)}</div>
  }

  // A single created/found lead (create_lead, get_lead)
  if (tool === 'create_lead' || tool === 'get_lead') {
    return <LeadRow lead={data} />
  }

  // A single created task
  if (tool === 'create_task') {
    return <TaskRow task={data} />
  }

  // Dashboard summary
  if (tool === 'get_dashboard_summary') {
    return (
      <div className="flex flex-wrap gap-2">
        <Pill>{data.total_leads} leads</Pill>
        <Pill>{data.active_customers} active customers</Pill>
        <Pill>{data.tasks_completed_percentage}% tasks done</Pill>
        <Pill>{data.pending_approvals} pending approvals</Pill>
      </div>
    )
  }

  // Email draft — content preview, approval already created
  if (tool === 'draft_followup_email') {
    return (
      <div className="rounded-xl border border-border bg-surface px-3.5 py-3">
        <p className="mb-1.5 text-[11px] font-medium text-text-faint">{data.title}</p>
        <p className="whitespace-pre-line text-[13px] leading-relaxed text-text-muted">
          {data.content}
        </p>
        <p className="mt-2 text-[11px] text-accent-3">
          Waiting in Review &amp; Approval — nothing has been sent.
        </p>
      </div>
    )
  }

  // Knowledge Base answer — cite the retrieved source chunks.
  if (tool === 'answer_from_knowledge_base') {
    if (!Array.isArray(data.sources) || data.sources.length === 0) return null
    return (
      <div className="space-y-2">
        <p className="text-[11px] font-medium uppercase tracking-wide text-text-faint">Sources</p>
        {data.sources.map((s, i) => (
          <div key={`${s.document_id}-${s.chunk_index}`} className="rounded-xl border border-border bg-surface px-3.5 py-2.5">
            <div className="mb-1 flex items-center justify-between gap-2">
              <p className="flex items-center gap-1.5 truncate text-[12px] font-medium text-text">
                <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded bg-accent/15 text-[10px] text-accent-3">
                  {i + 1}
                </span>
                {s.filename}
              </p>
              <span className="shrink-0 text-[10px] text-text-faint">{Math.round(s.score * 100)}% match</span>
            </div>
            <p className="line-clamp-2 text-[12px] leading-relaxed text-text-muted">{s.excerpt}</p>
          </div>
        ))}
      </div>
    )
  }

  return null
}
