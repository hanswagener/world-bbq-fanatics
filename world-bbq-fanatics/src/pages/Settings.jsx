import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabase'
import styles from './Settings.module.css'

export default function Settings() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [emailStatus, setEmailStatus] = useState(null)
  const [passwordStatus, setPasswordStatus] = useState(null)
  const [emailSaving, setEmailSaving] = useState(false)
  const [passwordSaving, setPasswordSaving] = useState(false)

  async function handleEmailSubmit(event) {
    event.preventDefault()
    setEmailStatus(null)
    setEmailSaving(true)

    const { error } = await supabase.auth.updateUser({ email: email.trim() })
    setEmailSaving(false)
    setEmailStatus(error
      ? { type: 'error', text: error.message }
      : { type: 'success', text: 'Controleer je nieuwe e-mailadres om de wijziging te bevestigen.' })

    if (!error) setEmail('')
  }

  async function handlePasswordSubmit(event) {
    event.preventDefault()
    setPasswordStatus(null)
    setPasswordSaving(true)

    const { error } = await supabase.auth.updateUser({ password })
    setPasswordSaving(false)
    setPasswordStatus(error
      ? { type: 'error', text: error.message }
      : { type: 'success', text: 'Je wachtwoord is gewijzigd.' })

    if (!error) setPassword('')
  }

  return (
    <div className={styles.page}>
      <div className={styles.content}>
        <div className={styles.header}>
          <p className={styles.eyebrow}>BBQ FANATICS</p>
          <h1 className={styles.title}>Instellingen</h1>
          <p className={styles.subtitle}>Beheer je account en profiel.</p>
        </div>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2>Accountinstellingen</h2>
            <p>Werk je inloggegevens veilig bij.</p>
          </div>

          <form className={styles.form} onSubmit={handleEmailSubmit}>
            <div className={styles.field}>
              <label htmlFor="email">Nieuw e-mailadres</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={event => setEmail(event.target.value)}
                placeholder="jij@example.com"
                required
              />
            </div>
            <button className={styles.button} type="submit" disabled={emailSaving}>
              {emailSaving ? 'Opslaan...' : 'E-mailadres wijzigen'}
            </button>
            {emailStatus && <p className={emailStatus.type === 'error' ? styles.error : styles.success}>{emailStatus.text}</p>}
          </form>

          <form className={styles.form} onSubmit={handlePasswordSubmit}>
            <div className={styles.field}>
              <label htmlFor="password">Nieuw wachtwoord</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={event => setPassword(event.target.value)}
                placeholder="Minimaal 6 tekens"
                minLength="6"
                required
              />
            </div>
            <button className={styles.button} type="submit" disabled={passwordSaving}>
              {passwordSaving ? 'Opslaan...' : 'Wachtwoord wijzigen'}
            </button>
            {passwordStatus && <p className={passwordStatus.type === 'error' ? styles.error : styles.success}>{passwordStatus.text}</p>}
          </form>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2>Profiel</h2>
            <p>Pas je openbare BBQ-profiel aan.</p>
          </div>
          <Link className={styles.profileLink} to="/profile/edit">Profiel bewerken <span aria-hidden="true">→</span></Link>
        </section>
      </div>
    </div>
  )
}
