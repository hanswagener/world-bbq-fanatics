import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../supabase'
import { useAuth } from '../context/AuthContext'
import styles from './Community.module.css'

const CHANNEL_ICONS = {
  'Smoking & Low and Slow': '🪵',
  'Rubs & Marinades':       '🧂',
  'BBQ Equipment':          '⚙️',
  'Recipes & Techniques':   '📖',
  'BBQ Events & Meetups':   '🏆',
}

const CHANNEL_KEYS = {
  'Smoking & Low and Slow': 'smoking',
  'Rubs & Marinades':       'rubs',
  'BBQ Equipment':          'equipment',
  'Recipes & Techniques':   'recipes',
  'BBQ Events & Meetups':   'events',
}

export default function Community() {
  const { user, profile: myProfile } = useAuth()
  const { t } = useTranslation()
  const navigate = useNavigate()

  const [channels, setChannels] = useState([])
  const [memberOf, setMemberOf] = useState(new Set())
  const [loading,  setLoading]  = useState(true)
  const [joinHint, setJoinHint] = useState(null) // channel id showing "join first" hint

  useEffect(() => {
    async function load() {
      try {
        const { data: channelData, error: chErr } = await supabase
          .from('channels')
          .select('id, name, description')
          .order('created_at', { ascending: true })
        if (chErr) console.error('[Community] channels error:', chErr.message)
        setChannels(channelData ?? [])

        if (user) {
          const { data: memberData, error: memErr } = await supabase
            .from('channel_members')
            .select('channel_id')
            .eq('user_id', user.id)
          if (memErr) console.error('[Community] channel_members error:', memErr.message)
          setMemberOf(new Set((memberData ?? []).map(m => m.channel_id)))
        }
      } catch (err) {
        console.error('[Community] load threw:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user])

  async function handleJoin(e, ch) {
    e.stopPropagation()
    if (!user) return
    await supabase.from('channel_members').insert({ channel_id: ch.id, user_id: user.id })
    await supabase.from('channel_messages').insert({
      channel_id: ch.id,
      user_id:    user.id,
      content:    `👋 ${myProfile?.username ?? 'Someone'} joined the channel`,
      is_system:  true,
    })
    setMemberOf(prev => new Set([...prev, ch.id]))
    navigate(`/community/${ch.id}`)
  }

  async function handleLeave(e, ch) {
    e.stopPropagation()
    if (!window.confirm(t('community.leaveQuestion', { name: getChannelName(ch.name) }))) return
    await supabase.from('channel_messages').insert({
      channel_id: ch.id,
      user_id:    user.id,
      content:    `👋 ${myProfile?.username ?? 'Someone'} left the channel`,
      is_system:  true,
    })
    await supabase.from('channel_members').delete().eq('channel_id', ch.id).eq('user_id', user.id)
    setMemberOf(prev => { const n = new Set(prev); n.delete(ch.id); return n })
  }

  function handleCardClick(ch) {
    if (!memberOf.has(ch.id)) {
      setJoinHint(ch.id)
      setTimeout(() => setJoinHint(v => v === ch.id ? null : v), 3000)
      return
    }
    navigate(`/community/${ch.id}`)
  }

  function getChannelName(name) {
    const key = CHANNEL_KEYS[name]
    return key ? t(`channels.${key}`) : name
  }

  function getChannelDescription(ch) {
    const key = CHANNEL_KEYS[ch.name]
    if (key) {
      const translated = t(`channels.${key}Desc`)
      if (translated && translated !== `channels.${key}Desc`) return translated
    }
    return ch.description || ''
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>{t('community.title')}</h1>
        <p className={styles.pageSubtitle}>{t('community.subtitle')}</p>
      </div>

      {loading ? (
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon}>🔥</span>
          <p className={styles.emptyText}>{t('community.loading')}</p>
        </div>
      ) : channels.length === 0 ? (
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon}>💬</span>
          <p className={styles.emptyText}>{t('community.noChannels')}</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {channels.map(ch => {
            const joined = memberOf.has(ch.id)
            const description = getChannelDescription(ch)
            return (
              <div
                key={ch.id}
                className={`${styles.card} ${joined ? styles.cardJoined : styles.cardGuest}`}
                onClick={() => handleCardClick(ch)}
              >
                <span className={styles.cardIcon}>
                  {CHANNEL_ICONS[ch.name] ?? '💬'}
                </span>

                <div className={styles.cardBody}>
                  <h2 className={styles.cardName}>{getChannelName(ch.name)}</h2>
                  {description && (
                    <p className={styles.cardDesc}>{description}</p>
                  )}
                  {joinHint === ch.id && (
                    <p className={styles.joinHint}>{t('community.joinHint')}</p>
                  )}
                </div>

                <div className={styles.cardActions}>
                  {joined ? (
                    <>
                      <button
                        className={styles.leaveChannelBtn}
                        onClick={(e) => handleLeave(e, ch)}
                        title={t('community.leave')}
                      >
                        {t('community.leave')}
                      </button>
                      <span className={styles.cardArrow}>→</span>
                    </>
                  ) : (
                    <button
                      className={styles.joinChannelBtn}
                      onClick={(e) => handleJoin(e, ch)}
                    >
                      {t('community.join')}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
