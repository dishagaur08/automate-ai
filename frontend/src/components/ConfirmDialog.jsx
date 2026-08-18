import { useState } from 'react'
import { Loader2, AlertTriangle } from 'lucide-react'
import Modal from './Modal'

export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  message,
  confirmLabel = 'Delete',
  danger = true,
}) {
  const [busy, setBusy] = useState(false)

  async function handleConfirm() {
    setBusy(true)
    try {
      await onConfirm()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} onClose={busy ? () => {} : onClose} maxWidth="max-w-sm">
      <div className="flex flex-col items-center text-center">
        <div className={`flex h-11 w-11 items-center justify-center rounded-full ${danger ? 'bg-danger/10' : 'bg-accent/10'}`}>
          <AlertTriangle size={19} className={danger ? 'text-danger' : 'text-accent'} />
        </div>
        <h3 className="mt-4 text-base font-semibold text-text">{title}</h3>
        {message && <p className="mt-1.5 text-sm text-text-muted">{message}</p>}

        <div className="mt-6 flex w-full gap-3">
          <button
            onClick={onClose}
            disabled={busy}
            className="flex-1 rounded-xl border border-border-strong px-4 py-2.5 text-sm font-medium text-text-muted transition-colors hover:text-text disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={busy}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-medium text-white transition-transform duration-150 hover:-translate-y-0.5 disabled:opacity-60 disabled:hover:translate-y-0 ${
              danger ? 'bg-danger' : 'bg-gradient-to-r from-accent to-accent-2'
            }`}
          >
            {busy && <Loader2 size={14} className="animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  )
}
