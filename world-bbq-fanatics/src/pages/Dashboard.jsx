import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import styles from './Dashboard.module.css'

export default function Dashboard() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) navigate('/login')
      else setUser(user)
    })
  }, [navigate])

  async function handleSignOut() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <span className={styles.brand}>🔥 World BBQ Fanatics</span>
        <button className={styles.signOut} onClick={handleSignOut}>Sign Out</button>
      </header>

      <main className={styles.main}>
        <h1 className={styles.title}>Welcome to the pit{user ? `, ${user.email}` : ''}!</h1>
        <p className={styles.subtitle}>Your BBQ dashboard is firing up. More features coming soon.</p>

        <div className={styles.grid}>
          {[
            { icon: '📖', label: 'Recipes', desc: 'Browse & share BBQ recipes' },
            { icon: '💬', label: 'Community', desc: 'Join channel discussions' },
            { icon: '🔒', label: 'Private Chats', desc: 'Message fellow pitmasters' },
            { icon: '🏆', label: 'Events', desc: 'Find BBQ meetups near you' },
          ].map(({ icon, label, desc }) => (
            <div key={label} className={styles.card}>
              <span className={styles.cardIcon}>{icon}</span>
              <h2 className={styles.cardTitle}>{label}</h2>
              <p className={styles.cardDesc}>{desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
