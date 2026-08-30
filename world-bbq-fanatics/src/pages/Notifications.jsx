import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
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

function NotifItem({ notif, invite, onAccept, onDecline }) {
  const { t } = useTranslation()
  const from = notif.from_profile
  const username = from?.username ?? 'Someone'
  const itemClass = `${styles.item} ${notif.read ? styles.itemRead : styles.itemUnread}`
  const unreadDot = !notif.read && <span className={styles.unreadDot} />

  if (notif.type === 'follow') {
    return (
      <Link
        to={from?.username ? `/profile/${from.username}` : '/dashboard'}
        className={itemClass}
      >
        <NotifAvatar profile={from} />
        <div className={styles.itemBody}>
          <p className={styles.itemText}>
            <span className={styles.flameIcon}>🔥</span>
            <strong className={styles.username}>{username}</strong>
            {' ' + t('notifications.startedFollowing')}
          </p>
          <span className={styles.time}>{timeAgo(notif.created_at)}</span>
        </div>
        {unreadDot}
      </Link>
    )
  }

  if (notif.type === 'chat_invite') {
    return (
      <div className={itemClass}>
        <NotifAvatar profile={from} />
        <div className={styles.itemBody}>
          <p className={styles.itemText}>
            <span className={styles.flameIcon}>💬</span>
            <strong className={styles.username}>{username}</strong>
            {' ' + t('notifications.invitedToChat')}
          </p>
          <span className={styles.time}>{timeAgo(notif.created_at)}</span>

          {invite?.status === 'pending' && (
            <div className={styles.inviteActions}>
              <button className={styles.acceptBtn} onClick={() => onAccept(invite)}>
                ✅ {t('notifications.accept')}
              </button>
              <button className={styles.declineBtn} onClick={() => onDecline(invite)}>
                ❌ {t('notifications.decline')}
              </button>
            </div>
          )}
          {invite?.status === 'accepted' && (
            <span className={styles.inviteAccepted}>✓ {t('notifications.accepted')}</span>
          )}
          {invite?.status === 'declined' && (
            <span className={styles.inviteDeclined}>✗ {t('notifications.declined')}</span>
          )}
        </div>
        {unreadDot}
      </div>
    )
  }

  // type === 'flame'
  const recipe = notif.recipe
  const recipeTitle = recipe?.title ?? 'a recipe'
  return (
    <Link
      to={recipe?.id ? `/recipes/${recipe.id}` : '/dashboard'}
      className={itemClass}
    >
      <NotifAvatar profile={from} />
      <div className={styles.itemBody}>
        <p className={styles.itemText}>
          <span className={styles.flameIcon}>🔥</span>
          <strong className={styles.username}>{username}</strong>
          {' ' + t('notifications.flamedRecipe') + ' '}
          <span className={styles.recipeTitle}>{recipeTitle}</span>
        </p>
        <span className={styles.time}>{timeAgo(notif.created_at)}</span>
      </div>
      {unreadDot}
    </Link>
  )
}

// Match a chat_invite notification to its invite record by from_user_id +
// closest created_at (both are created in the same request, so within ms).
function findInvite(notif, chatInvites) {
  const candidates = chatInvites.filter(i => i.from_user_id === notif.from_user_id)
  if (!candidates.length) return null
  return candidates.reduce((best, cur) =>
    Math.abs(new Date(cur.created_at) - new Date(notif.created_at)) <
    Math.abs(new Date(best.created_at) - new Date(notif.created_at)) ? cur : best
  )
}

export default function Notifications() {
  const { user } = useAuth()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState([])
  const [chatInvites,   setChatInvites]   = useState([])
  const [loading,       setLoading]       = useState(true)

  const fetchData = useCallback(async () => {
    if (!user) return

    const [{ data: notifData }, { data: inviteData }] = await Promise.all([
      supabase
        .from('notifications')
        .select(`
          id, type, read, created_at, recipe_id, from_user_id,
          from_profile:from_user_id(username, avatar_url),
          recipe:recipe_id(id, title)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('chat_invites')
        .select('id, room_id, from_user_id, status, created_at')
        .eq('to_user_id', user.id),
    ])

    setNotifications(notifData ?? [])
    setChatInvites(inviteData ?? [])
    setLoading(false)
  }, [user])

  async function markAllRead() {
    if (!user) return
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('read', false)
  }

  useEffect(() => {
    fetchData()
    markAllRead()
  }, [fetchData])

  async function handleAccept(invite) {
    await supabase
      .from('private_room_members')
      .insert({ room_id: invite.room_id, user_id: user.id })
    await supabase
      .from('chat_invites')
      .update({ status: 'accepted' })
      .eq('id', invite.id)
    navigate(`/chat/${invite.room_id}`)
  }

  async function handleDecline(invite) {
    await supabase
      .from('chat_invites')
      .update({ status: 'declined' })
      .eq('id', invite.id)
    setChatInvites(prev => prev.map(i => i.id === invite.id ? { ...i, status: 'declined' } : i))
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>{t('notifications.title')}</h1>
      </div>

      {loading ? (
        <div className={styles.empty}>
          <span className={styles.emptyIcon}>🔥</span>
          <p className={styles.emptyText}>{t('notifications.loading')}</p>
        </div>
      ) : notifications.length === 0 ? (
        <div className={styles.empty}>
          <span className={styles.emptyIcon}>🔔</span>
          <h2 className={styles.emptyTitle}>{t('notifications.noNotifications')}</h2>
          <p className={styles.emptyText}>{t('notifications.emptyText')}</p>
        </div>
      ) : (
        <div className={styles.list}>
          {notifications.map(n => (
            <NotifItem
              key={n.id}
              notif={n}
              invite={n.type === 'chat_invite' ? findInvite(n, chatInvites) : null}
              onAccept={handleAccept}
              onDecline={handleDecline}
            />
          ))}
        </div>
      )}
    </div>
  )
}
