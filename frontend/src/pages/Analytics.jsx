import { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  Bot,
  CheckCircle2,
  Clock3,
  Users,
  UserCircle2,
  Workflow as WorkflowIcon,
  RefreshCw,
  TrendingUp,
  TrendingDown,
} from 'lucide-react'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { api } from '../lib/api'

const presets = [
  ['7d', 7],
  ['30d', 30],
  ['90d', 90],
]

const defs = [
  ['leads', 'Leads', Users],
  ['qualified_leads', 'Qualified Leads', TrendingUp],
  ['customers', 'New Customers', UserCircle2],
  ['tasks_completed', 'Tasks Completed', CheckCircle2],
  ['ai_commands', 'AI Commands', Bot],
  ['workflow_runs', 'Workflow Runs', WorkflowIcon],
]

function Card({ label, metric, Icon }) {
  const up = metric?.change_percent >= 0
  return (
    <div className="card-surface rounded-2xl p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-text-muted">{label}</span>
        <span className="rounded-lg bg-surface-2 p-2 text-accent-3">
          <Icon size={15} />
        </span>
      </div>
      <div className="mt-3 text-2xl font-semibold tracking-tight text-text">
        {metric?.value?.toLocaleString?.() ?? '—'}
      </div>
      <div className={`mt-1 flex items-center gap-1 text-xs font-medium ${up ? 'text-success' : 'text-danger'}`}>
        {up ? <TrendingUp size={12} /> : <TrendingDown size={12} />} {metric?.change_percent ?? 0}% vs previous
      </div>
    </div>
  )
}

function Empty() {
  return (
    <div className="flex h-[260px] items-center justify-center text-xs text-text-faint">
      No activity in this date range.
    </div>
  )
}

function Mini({ icon: Icon, label, value }) {
  return (
    <div className="rounded-xl border border-border bg-surface-2 p-4">
      <Icon size={16} className="text-accent-3" />
      <p className="mt-3 text-xs text-text-muted">{label}</p>
      <p className="mt-1 text-xl font-semibold text-text">{value}</p>
    </div>
  )
}

export default function Analytics() {
  const [range, setRange] = useState(30)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const initialEnd = new Date().toISOString().slice(0, 10)
  const initialStart = new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10)
  const [customStart, setCustomStart] = useState(initialStart)
  const [customEnd, setCustomEnd] = useState(initialEnd)

  const dates = useMemo(() => {
    if (range === 'custom') return { start_date: customStart, end_date: customEnd }
    const e = new Date()
    const s = new Date()
    s.setDate(e.getDate() - range + 1)
    const f = (d) => d.toISOString().slice(0, 10)
    return { start_date: f(s), end_date: f(e) }
  }, [range, customStart, customEnd])

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      setData(await api.analytics.get(dates))
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [dates.start_date, dates.end_date])

  const chart = data?.series || []

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-text">Advanced Analytics</h2>
          <p className="mt-1 text-sm text-text-muted">
            A comprehensive view of CRM growth, AI utilization, and workflow automation.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-xl border border-border bg-surface p-1">
            {presets.map(([key, n]) => (
              <button
                key={key}
                onClick={() => setRange(n)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  range === n ? 'bg-surface-hover text-text' : 'text-text-muted hover:text-text'
                }`}
              >
                {key}
              </button>
            ))}
          </div>
          <button
            onClick={() => setRange('custom')}
            className={`rounded-xl border border-border px-3 py-2 text-xs font-medium transition-colors ${
              range === 'custom' ? 'bg-surface-hover text-text' : 'bg-surface text-text-muted hover:text-text'
            }`}
          >
            Custom
          </button>
          {range === 'custom' && (
            <>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="rounded-xl border border-border bg-surface px-2.5 py-1.5 text-xs text-text focus:outline-none"
              />
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="rounded-xl border border-border bg-surface px-2.5 py-1.5 text-xs text-text focus:outline-none"
              />
            </>
          )}
          <button
            onClick={load}
            className="rounded-xl border border-border bg-surface p-2 text-text-muted hover:text-text"
            aria-label="Refresh metrics"
          >
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {error ? (
        <div className="card-surface rounded-2xl p-6 text-center text-sm text-danger">
          {error}
          <button onClick={load} className="ml-2 underline font-medium">
            Retry
          </button>
        </div>
      ) : loading ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">
          {defs.map(([k]) => (
            <div key={k} className="card-surface h-32 animate-pulse rounded-2xl" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">
            {defs.map(([k, l, I]) => (
              <Card key={k} label={l} metric={data?.metrics?.[k]} Icon={I} />
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <section className="card-surface rounded-2xl p-5 sm:p-6">
              <div className="mb-4">
                <h3 className="font-semibold text-text">Lead & Customer Growth</h3>
                <p className="text-xs text-text-faint">Daily records created</p>
              </div>
              {chart.length ? (
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={chart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.1)" />
                    <XAxis dataKey="date" tickFormatter={(x) => x.slice(5)} tick={{ fontSize: 11, fill: '#93a0b4' }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#93a0b4' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0e1220',
                        borderColor: 'rgba(148, 163, 184, 0.15)',
                        borderRadius: '12px',
                        fontSize: '12px',
                      }}
                    />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="leads"
                      name="Leads"
                      fill="#6366f1"
                      stroke="#6366f1"
                      fillOpacity={0.2}
                    />
                    <Area
                      type="monotone"
                      dataKey="customers"
                      name="Customers"
                      fill="#38bdf8"
                      stroke="#38bdf8"
                      fillOpacity={0.15}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <Empty />
              )}
            </section>

            <section className="card-surface rounded-2xl p-5 sm:p-6">
              <div className="mb-4">
                <h3 className="font-semibold text-text">Task Performance</h3>
                <p className="text-xs text-text-faint">Created vs completed</p>
              </div>
              {chart.length ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={chart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.1)" />
                    <XAxis dataKey="date" tickFormatter={(x) => x.slice(5)} tick={{ fontSize: 11, fill: '#93a0b4' }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#93a0b4' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0e1220',
                        borderColor: 'rgba(148, 163, 184, 0.15)',
                        borderRadius: '12px',
                        fontSize: '12px',
                      }}
                    />
                    <Legend />
                    <Bar dataKey="tasks_created" name="Created" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="tasks_completed" name="Completed" fill="#34d399" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <Empty />
              )}
            </section>

            <section className="card-surface rounded-2xl p-5 sm:p-6">
              <div className="mb-4">
                <h3 className="font-semibold text-text">AI Activity</h3>
                <p className="text-xs text-text-faint">Commands processed over time</p>
              </div>
              {chart.length ? (
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={chart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.1)" />
                    <XAxis dataKey="date" tickFormatter={(x) => x.slice(5)} tick={{ fontSize: 11, fill: '#93a0b4' }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#93a0b4' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0e1220',
                        borderColor: 'rgba(148, 163, 184, 0.15)',
                        borderRadius: '12px',
                        fontSize: '12px',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="ai_commands"
                      name="AI Commands"
                      fill="#a855f7"
                      stroke="#a855f7"
                      fillOpacity={0.2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <Empty />
              )}
            </section>

            <section className="card-surface rounded-2xl p-5 sm:p-6">
              <div className="mb-4">
                <h3 className="font-semibold text-text">Workflow Health</h3>
                <p className="text-xs text-text-faint">Runs and outcomes</p>
              </div>
              {chart.length ? (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={chart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.1)" />
                    <XAxis dataKey="date" tickFormatter={(x) => x.slice(5)} tick={{ fontSize: 11, fill: '#93a0b4' }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#93a0b4' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0e1220',
                        borderColor: 'rgba(148, 163, 184, 0.15)',
                        borderRadius: '12px',
                        fontSize: '12px',
                      }}
                    />
                    <Legend />
                    <Bar dataKey="workflow_success" name="Successful" fill="#34d399" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="workflow_failed" name="Failed" fill="#fb7185" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <Empty />
              )}
            </section>
          </div>

          <div className="card-surface rounded-2xl p-5 sm:p-6">
            <div className="grid gap-4 sm:grid-cols-3">
              <Mini
                icon={Clock3}
                label="Task Completion Rate"
                value={`${
                  data?.metrics?.tasks_created?.value
                    ? Math.round(
                        (data.metrics.tasks_completed.value / data.metrics.tasks_created.value) * 100
                      )
                    : 0
                }%`}
              />
              <Mini
                icon={Activity}
                label="Workflow Success Rate"
                value={`${
                  data?.metrics?.workflow_runs?.value
                    ? Math.round(
                        (data.metrics.workflow_success.value / data.metrics.workflow_runs.value) * 100
                      )
                    : 0
                }%`}
              />
              <Mini
                icon={Users}
                label="Lead Conversion Rate"
                value={`${data?.metrics?.lead_conversion_rate?.value ?? 0}%`}
              />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
