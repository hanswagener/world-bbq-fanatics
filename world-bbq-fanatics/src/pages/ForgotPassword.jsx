import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabase'
import styles from './Auth.module.css'

export default function ForgotPassword() {
  const [email,   setEmail]   = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error,   setError]   = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://world-bbq-fanatics.vercel.app/reset-password',
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setSuccess(true)
      setLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logo}>🔥</div>
        <h1 className={styles.title}>World BBQ Fanatics</h1>
        <p className={styles.subtitle}>Reset your password</p>

        {success ? (
          <div className={styles.successBox}>
            <p className={styles.successText}>
              Check your email for a password reset link
            </p>
            <p className={styles.footer} style={{ marginTop: 16 }}>
              <Link to="/login" className={styles.link}>Back to Sign In</Link>
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.field}>
              <label htmlFor="email" className={styles.label}>Email</label>
              <input
                id="email"
                type="email"
                className={styles.input}
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="pitmaster@bbq.com"
                required
                autoComplete="email"
                autoFocus
              />
            </div>

            {error && <p className={styles.error}>{error}</p>}

            <button type="submit" className={styles.button} disabled={loading}>
              {loading ? 'Sending…' : 'Send Reset Link'}
            </button>
          </form>
        )}

        {!success && (
          <p className={styles.footer}>
            <Link to="/login" className={styles.link}>← Back to Sign In</Link>
          </p>
        )}
      </div>
    </div>
  )
}
