import { UserPlus, MessageCircleQuestion, PenLine, BadgeCheck, RefreshCcw, ListChecks } from 'lucide-react'

// Maps the Activity.type value the backend stores to how it's displayed.
export const ACTIVITY_TYPES = {
  create: { label: 'Created a lead', icon: UserPlus, color: 'text-accent-3', bg: 'bg-accent-3/10' },
  answer: { label: 'Answered a question', icon: MessageCircleQuestion, color: 'text-accent-2', bg: 'bg-accent-2/10' },
  draft: { label: 'Drafted a follow-up email', icon: PenLine, color: 'text-warning', bg: 'bg-warning/10' },
  qualify: { label: 'Qualified a lead', icon: BadgeCheck, color: 'text-success', bg: 'bg-success/10' },
  update: { label: 'Updated a lead', icon: RefreshCcw, color: 'text-accent', bg: 'bg-accent/10' },
  task: { label: 'Created a task', icon: ListChecks, color: 'text-accent-3', bg: 'bg-accent-3/10' },
}

export const DEFAULT_ACTIVITY_TYPE = {
  label: 'Activity',
  icon: RefreshCcw,
  color: 'text-text-muted',
  bg: 'bg-surface-hover',
}

export function getActivityType(type) {
  return ACTIVITY_TYPES[type] || DEFAULT_ACTIVITY_TYPE
}
