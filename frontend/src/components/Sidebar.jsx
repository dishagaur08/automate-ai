import { NavLink } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { LogOut, Sparkles, X } from 'lucide-react'
import { NAV_ITEMS } from '../data/navigation'
import { useAuth } from '../lib/auth'

function NavList({ onNavigate }) {
  return (
    <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon
        return (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            onClick={onNavigate}
            className="group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-text-muted transition-colors duration-150 hover:bg-surface-hover hover:text-text aria-[current=page]:text-text"
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.span
                    layoutId="sidebar-active-pill"
                    className="absolute inset-0 rounded-xl border border-border-strong bg-surface-hover"
                    transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                  />
                )}
                {isActive && (
                  <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-gradient-to-b from-accent to-accent-2" />
                )}
                <Icon
                  size={17}
                  strokeWidth={1.9}
                  className={`relative z-10 shrink-0 ${isActive ? 'text-accent-3' : ''}`}
                />
                <span className="relative z-10 font-medium">{item.label}</span>
              </>
            )}
          </NavLink>
        )
      })}
    </nav>
  )
}

function initials(name) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  const chars = parts.length > 1 ? [parts[0][0], parts[parts.length - 1][0]] : [parts[0][0]]
  return chars.join('').toUpperCase()
}

function UserMenu() {
  const { user, logout } = useAuth()
  if (!user) return null

  return (
    <div className="border-t border-border p-4">
      <div className="flex items-center gap-3 rounded-xl border border-border bg-surface-2 px-3 py-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent-2 to-accent-3 text-xs font-semibold text-white">
          {initials(user.name)}
        </div>
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-[13px] font-medium text-text">{user.name}</p>
          <p className="truncate text-[11px] text-text-faint">{user.email}</p>
        </div>
        <button
          onClick={logout}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-surface-hover hover:text-danger"
          aria-label="Log out"
          title="Log out"
        >
          <LogOut size={15} />
        </button>
      </div>
    </div>
  )
}

function Brand() {
  return (
    <div className="flex items-center gap-2.5 px-5 py-5">
      <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-accent via-accent-2 to-accent-3 shadow-[0_0_18px_-2px_rgba(99,102,241,0.55)]">
        <Sparkles size={17} className="text-white" strokeWidth={2.2} />
      </div>
      <div className="leading-tight">
        <p className="text-[15px] font-semibold tracking-tight text-text">AutomateAI</p>
        <p className="text-[11px] font-medium text-text-faint">Business Automation</p>
      </div>
    </div>
  )
}

export default function Sidebar({ mobileOpen, onCloseMobile }) {
  return (
    <>
      {/* Desktop sidebar */}
      <aside className="glass fixed inset-y-0 left-0 z-30 hidden w-[248px] flex-col border-r lg:flex">
        <Brand />
        <div className="mx-4 mb-2 h-px bg-border" />
        <NavList />
        <UserMenu />
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onCloseMobile}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 34 }}
              className="glass fixed inset-y-0 left-0 z-50 flex w-[80%] max-w-[300px] flex-col border-r lg:hidden"
            >
              <div className="flex items-center justify-between pr-4">
                <Brand />
                <button
                  onClick={onCloseMobile}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted hover:bg-surface-hover hover:text-text"
                  aria-label="Close menu"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="mx-4 mb-2 h-px bg-border" />
              <NavList onNavigate={onCloseMobile} />
              <UserMenu />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
