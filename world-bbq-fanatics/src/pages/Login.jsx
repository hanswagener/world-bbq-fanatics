import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../supabase'
import PasswordInput from '../components/PasswordInput'
import styles from './Auth.module.css'

export default function Login() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      navigate('/dashboard')
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logo}>
          <img src="/logo.png" alt="BBQ Fanatics" style={{ height: '120px', objectFit: 'contain' }} />
        </div>
        <p className={styles.subtitle}>{t('auth.signInSubtitle')}</p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="email" className={styles.label}>{t('auth.email')}</label>
            <input
              id="email"
              type="email"
              className={styles.input}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="pitmaster@bbq.com"
              required
              autoComplete="email"
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="password" className={styles.label}>{t('auth.password')}</label>
            <PasswordInput
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <div className={styles.forgotRow}>
            <Link to="/forgot-password" className={styles.forgotLink}>{t('auth.forgotPassword')}?</Link>
          </div>

          <button type="submit" className={styles.button} disabled={loading}>
            {loading ? t('auth.signingIn') : t('auth.signIn')}
          </button>
        </form>

        <p className={styles.footer}>
          {t('auth.dontHaveAccount')}{' '}
          <Link to="/register" className={styles.link}>{t('auth.createOne')}</Link>
        </p>
      </div>
    </div>
  )
}
