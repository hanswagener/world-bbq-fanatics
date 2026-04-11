import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabase'
import styles from './Community.module.css'

const CHANNEL_ICONS = {
  'Smoking & Low and Slow': '🪵',
  'Rubs & Marinades':       '🧂',
  'BBQ Equipment':          '⚙️',
  'Recipes & Techniques':   '📖',
  'BBQ Events & Meetups':   '🏆',
}

export default function Community() {
  const [channels, setChannels] = useState([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    supabase
      .from('channels')
      .select('id, name, description')
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        setChannels(data ?? [])
        setLoading(false)
      })
  }, [])

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Community Channels</h1>
        <p className={styles.pageSubtitle}>Join the conversation with fellow BBQ fanatics</p>
      </div>

      {loading ? (
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon}>🔥</span>
          <p className={styles.emptyText}>Loading channels…</p>
        </div>
      ) : channels.length === 0 ? (
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon}>💬</span>
          <p className={styles.emptyText}>No channels found.</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {channels.map(ch => (
            <Link key={ch.id} to={`/community/${ch.id}`} className={styles.card}>
              <span className={styles.cardIcon}>
                {CHANNEL_ICONS[ch.name] ?? '💬'}
              </span>
              <div className={styles.cardBody}>
                <h2 className={styles.cardName}>{ch.name}</h2>
                {ch.description && (
                  <p className={styles.cardDesc}>{ch.description}</p>
                )}
              </div>
              <span className={styles.cardArrow}>→</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
