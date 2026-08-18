import { Menu, Search, Bell } from 'lucide-react'
import { useAuth } from '../lib/auth'

function initials(name) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  const chars = parts.length > 1 ? [parts[0][0], parts[parts.length - 1][0]] : [parts[0][0]]
  return chars.join('').toUpperCase()
}

export default function Topbar({ title, onOpenMobile }) {
  const { user } = useAuth()
  return (
    <header className="glass sticky top-0 z-20 flex items-center justify-between gap-4 border-b px-4 py-3.5 lg:px-8">
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobile}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-text-muted hover:bg-surface-hover hover:text-text lg:hidden"
          aria-label="Open menu"
        >
          <Menu size={19} />
        </button>
        <h1 className="text-[15px] font-semibold tracking-tight text-text sm:text-base">
          {title}
        </h1>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <div className="hidden items-center gap-2 rounded-xl border border-border bg-surface-2 px-3 py-2 text-text-faint sm:flex">
          <Search size={15} />
          <span className="text-[13px]">Search leads, tasks, docs…</span>
          <kbd className="ml-6 rounded-md border border-border-strong px-1.5 py-0.5 text-[10px] text-text-faint">
            ⌘K
          </kbd>
        </div>
        <button
          className="relative flex h-9 w-9 items-center justify-center rounded-lg text-text-muted hover:bg-surface-hover hover:text-text"
          aria-label="Notifications"
        >
          <Bell size={17} />
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-accent-3" />
        </button>
        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-accent-2 to-accent-3 text-center text-xs font-semibold leading-8 text-white sm:hidden">
          {initials(user?.name)}
        </div>
      </div>
    </header>
  )
}
