import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import PasswordInput from '../components/PasswordInput'
import styles from './Auth.module.css'

export default function ResetPassword() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [loading,  setLoading]  = useState(false)
  const [success,  setSuccess]  = useState(false)
  const [error,    setError]    = useState(null)

  // Supabase puts the recovery token in the URL hash; the JS client picks it
  // up automatically when the page loads via onAuthStateChange.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event) => {
        // PASSWORD_RECOVERY fires when the user arrives via the reset link
        if (event === 'PASSWORD_RECOVERY') {
          // Session is now active — nothing extra needed, just let them type
        }
      }
    )
    return () => subscription.unsubscribe()
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)

    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setSuccess(true)
      setTimeout(() => navigate('/login'), 3000)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logo}>🔥</div>
        <h1 className={styles.title}>World BBQ Fanatics</h1>
        <p className={styles.subtitle}>Choose a new password</p>

        {success ? (
          <div className={styles.successBox}>
            <p className={styles.successText}>
              Password updated! Redirecting you to sign in…
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.field}>
              <label htmlFor="password" className={styles.label}>New Password</label>
              <PasswordInput
                id="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="new-password"
                autoFocus
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="confirm" className={styles.label}>Confirm New Password</label>
              <PasswordInput
                id="confirm"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="new-password"
              />
            </div>

            {error && <p className={styles.error}>{error}</p>}

            <button type="submit" className={styles.button} disabled={loading}>
              {loading ? 'Updating…' : 'Update Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
