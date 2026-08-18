import {
  LayoutDashboard,
  Bot,
  Users,
  UserCircle2,
  BookOpen,
  ListChecks,
  Mail,
  Workflow,
  BarChart3,
  Settings,
} from 'lucide-react'

// Structural sidebar config — not API data. Each path is routed in App.jsx.
export const NAV_ITEMS = [
  { label: 'Dashboard', path: '/', icon: LayoutDashboard },
  { label: 'AI Command Center', path: '/ai-agent', icon: Bot },
  { label: 'Leads / CRM', path: '/leads', icon: Users },
  { label: 'Customers', path: '/customers', icon: UserCircle2 },
  { label: 'Knowledge Base', path: '/knowledge-base', icon: BookOpen },
  { label: 'Tasks', path: '/tasks', icon: ListChecks },
  { label: 'Emails', path: '/emails', icon: Mail },
  { label: 'Workflows', path: '/workflows', icon: Workflow },
  { label: 'Analytics', path: '/analytics', icon: BarChart3 },
  { label: 'Settings', path: '/settings', icon: Settings },
]
