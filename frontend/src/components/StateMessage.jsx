import { Loader2, AlertTriangle, Inbox } from 'lucide-react'

export function LoadingState({ label = 'Loading…' }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 text-text-faint">
      <Loader2 size={18} className="animate-spin" />
      <p className="text-xs">{label}</p>
    </div>
  )
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
      <AlertTriangle size={18} className="text-danger" />
      <p className="max-w-xs text-xs text-text-muted">
        {message || "Couldn't load this data. Check that the backend is running."}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-1 rounded-lg border border-border-strong px-3 py-1.5 text-xs font-medium text-text-muted transition-colors hover:text-text"
        >
          Try again
        </button>
      )}
    </div>
  )
}

export function EmptyState({ label = 'Nothing here yet.' }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 text-text-faint">
      <Inbox size={18} />
      <p className="text-xs">{label}</p>
    </div>
  )
}
