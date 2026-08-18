import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Loader2, Sparkles } from 'lucide-react'
import { useAuth } from '../lib/auth'

const inputClass =
  'w-full rounded-xl border border-border bg-surface-2 px-3.5 py-2.5 text-sm text-text placeholder:text-text-faint focus:border-border-strong focus:outline-none'

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await register(name.trim(), email.trim(), password)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err.message || 'Could not create your account')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="bg-grid flex min-h-screen items-center justify-center bg-base px-4">
      <div className="card-surface w-full max-w-sm rounded-2xl p-7 shadow-[0_30px_70px_-24px_rgba(0,0,0,0.75)]">
        <div className="mb-6 flex items-center gap-2.5">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-accent via-accent-2 to-accent-3 shadow-[0_0_18px_-2px_rgba(99,102,241,0.55)]">
            <Sparkles size={17} className="text-white" strokeWidth={2.2} />
          </div>
          <div className="leading-tight">
            <p className="text-[15px] font-semibold tracking-tight text-text">AutomateAI</p>
            <p className="text-[11px] font-medium text-text-faint">Business Automation</p>
          </div>
        </div>

        <h1 className="text-lg font-semibold tracking-tight text-text">Create your account</h1>
        <p className="mt-1 text-sm text-text-muted">Set up a new AutomateAI workspace.</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-text-muted">Full name</span>
            <input
              type="text"
              required
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
              placeholder="Aisha Khan"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-text-muted">Email</span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
              placeholder="you@company.com"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-text-muted">Password</span>
            <input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
              placeholder="At least 8 characters"
            />
          </label>

          {error && (
            <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-[13px] text-danger">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-accent via-accent-2 to-accent-3 px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {submitting && <Loader2 size={15} className="animate-spin" />}
            Create account
          </button>
        </form>

        <p className="mt-6 text-center text-[13px] text-text-faint">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-accent-3 hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  )
}
