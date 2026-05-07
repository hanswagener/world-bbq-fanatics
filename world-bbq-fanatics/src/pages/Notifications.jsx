import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../supabase'
import styles from './Notifications.module.css'

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} minute${mins !== 1 ? 's' : ''} ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days} day${days !== 1 ? 's' : ''} ago`
  const weeks = Math.floor(days / 7)
  if (weeks < 5) return `${weeks} week${weeks !== 1 ? 's' : ''} ago`
  const months = Math.floor(days / 30)
  return `${months} month${months !== 1 ? 's' : ''} ago`
}

function NotifAvatar({ profile }) {
  if (profile?.avatar_url) {
    return <img src={profile.avatar_url} className={styles.avatar} alt="" />
  }
  return (
    <span className={styles.avatarInitials}>
      {profile?.username?.[0]?.toUpperCase() ?? '?'}
    </span>
  )
}

function NotifItem({ notif }) {
  const from = notif.from_profile
  const recipe = notif.recipe
  const username = from?.username ?? 'Someone'
  const recipeTitle = recipe?.title ?? 'a recipe'

  return (
    <Link
      to={recipe?.id ? `/recipes/${recipe.id}` : '/dashboard'}
      className={`${styles.item} ${notif.read ? styles.itemRead : styles.itemUnread}`}
    >
      <NotifAvatar profile={from} />
      <div className={styles.itemBody}>
        <p className={styles.itemText}>
          <span className={styles.flameIcon}>🔥</span>
          <strong className={styles.username}>{username}</strong>
          {' flamed your recipe '}
          <span className={styles.recipeTitle}>{recipeTitle}</span>
        </p>
        <span className={styles.time}>{timeAgo(notif.created_at)}</span>
      </div>
      {!notif.read && <span className={styles.unreadDot} />}
    </Link>
  )
}

export default function Notifications() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchNotifications = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('notifications')
      .select(`
        id, type, read, created_at, recipe_id,
        from_profile:from_user_id(username, avatar_url),
        recipe:recipe_id(id, title)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    setNotifications(data ?? [])
    setLoading(false)
  }, [user])

  // Mark all unread as read
  async function markAllRead() {
    if (!user) return
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('read', false)
  }

  useEffect(() => {
    fetchNotifications()
    markAllRead()
  }, [fetchNotifications])

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Notifications</h1>
      </div>

      {loading ? (
        <div className={styles.empty}>
          <span className={styles.emptyIcon}>🔥</span>
          <p className={styles.emptyText}>Loading…</p>
        </div>
      ) : notifications.length === 0 ? (
        <div className={styles.empty}>
          <span className={styles.emptyIcon}>🔔</span>
          <h2 className={styles.emptyTitle}>No notifications yet</h2>
          <p className={styles.emptyText}>When someone flames your recipe, you'll see it here.</p>
        </div>
      ) : (
        <div className={styles.list}>
          {notifications.map(n => (
            <NotifItem key={n.id} notif={n} />
          ))}
        </div>
      )}
    </div>
  )
}
