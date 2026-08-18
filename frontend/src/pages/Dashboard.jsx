import { useState } from 'react'
import { Users, UserCircle2, ListChecks, Bot } from 'lucide-react'
import { useFetch } from '../hooks/useFetch'
import { api } from '../lib/api'
import { useToast } from '../components/ToastProvider'
import WelcomeHero from '../components/WelcomeHero'
import MetricCard from '../components/MetricCard'
import AIActivityCard from '../components/AIActivityCard'
import LeadAnalyticsCard from '../components/LeadAnalyticsCard'
import RecentActivityCard from '../components/RecentActivityCard'
import AIAssistantCTA from '../components/AIAssistantCTA'
import ApprovalsPanel from '../components/ApprovalsPanel'

// Maps each field on GET /api/dashboard/stats to how the metric card
// displays it. No numbers here are hard-coded — only presentation.
const METRIC_DEFS = [
  {
    key: 'total_leads',
    label: 'Total Leads',
    icon: Users,
    caption: 'All leads in your CRM',
    format: (v) => v.toLocaleString(),
  },
  {
    key: 'active_customers',
    label: 'Active Customers',
    icon: UserCircle2,
    caption: 'Currently active accounts',
    format: (v) => v.toLocaleString(),
  },
  {
    key: 'tasks_completed_percentage',
    label: 'Tasks Completed',
    icon: ListChecks,
    caption: 'Completion rate',
    format: (v) => `${v}%`,
  },
  {
    key: 'ai_actions',
    label: 'AI Actions',
    icon: Bot,
    caption: 'Logged by the agent',
    format: (v) => v.toLocaleString(),
  },
]

export default function Dashboard() {
  const { showToast } = useToast()
  const stats = useFetch('/api/dashboard/stats')
  const activity = useFetch('/api/dashboard/activity?limit=8')
  const leadAnalytics = useFetch('/api/dashboard/lead-analytics')

  const [approvalsOpen, setApprovalsOpen] = useState(false)
  const approvals = useFetch(approvalsOpen ? '/api/approvals?status=Pending' : null)

  async function handleApprovalAction(id, status) {
    try {
      await api.approvals.act(id, status)
      approvals.refetch()
      stats.refetch()
      activity.refetch()
      showToast(status === 'Approved' ? 'Approved' : 'Rejected', 'success')
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      {/* 1. Welcome / hero */}
      <WelcomeHero
        aiActions={stats.data?.ai_actions}
        pendingApprovals={stats.data?.pending_approvals}
        loading={stats.loading}
        onReviewApprovals={() => setApprovalsOpen(true)}
      />

      {/* 2. Key metrics */}
      {stats.error && !stats.loading ? (
        <div className="card-surface rounded-2xl p-5 text-center text-sm text-danger">
          {stats.error}{' '}
          <button onClick={stats.refetch} className="ml-1 underline underline-offset-2">
            Retry
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {METRIC_DEFS.map((def, i) => {
            const raw = stats.data?.[def.key]
            return (
              <MetricCard
                key={def.key}
                index={i}
                metric={{
                  label: def.label,
                  icon: def.icon,
                  caption: def.caption,
                  value: stats.loading || raw == null ? '—' : def.format(raw),
                }}
              />
            )
          })}
        </div>
      )}

      {/* 3. AI activity/insights + 4. Lead analytics */}
      <div className="grid gap-6 lg:grid-cols-2">
        <AIActivityCard
          activities={activity.data}
          loading={activity.loading}
          error={activity.error}
          onRetry={activity.refetch}
        />
        <LeadAnalyticsCard
          data={leadAnalytics.data}
          loading={leadAnalytics.loading}
          error={leadAnalytics.error}
          onRetry={leadAnalytics.refetch}
        />
      </div>

      {/* 5. Recent activity */}
      <RecentActivityCard
        activities={activity.data}
        loading={activity.loading}
        error={activity.error}
        onRetry={activity.refetch}
      />

      {/* 6. AI assistant CTA — the visual highlight (static, not data-driven) */}
      <AIAssistantCTA />

      <ApprovalsPanel
        open={approvalsOpen}
        onClose={() => setApprovalsOpen(false)}
        approvals={approvals.data}
        loading={approvals.loading}
        error={approvals.error}
        onRetry={approvals.refetch}
        onAct={handleApprovalAction}
      />
    </div>
  )
}
