import { useCallback, useEffect, useRef, useState } from 'react'
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

function CreateRoomModal({ currentUserId, onClose, onCreated }) {
  const [name, setName] = useState('')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [invited, setInvited] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const timer = useRef(null)

  useEffect(() => {
    if (!query.trim()) return undefined
    clearTimeout(timer.current)
    timer.current = setTimeout(async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .ilike('username', `%${query.trim()}%`)
        .neq('id', currentUserId)
        .limit(8)
      setResults(data ?? [])
    }, 280)
    return () => clearTimeout(timer.current)
  }, [query, currentUserId])

  function toggleInvite(profile) {
    setInvited(current => current.some(item => item.id === profile.id)
      ? current.filter(item => item.id !== profile.id)
      : [...current, profile])
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setSaving(true)
    setError(null)

    const { data: room, error: roomError } = await supabase
      .from('private_rooms')
      .insert({ name: name.trim() })
      .select('id')
      .single()

    if (roomError) { setError(roomError.message); setSaving(false); return }

    const { error: memberError } = await supabase
      .from('private_room_members')
      .insert([{ room_id: room.id, user_id: currentUserId }])

    if (memberError) { setError(memberError.message); setSaving(false); return }

    if (invited.length > 0) {
      await supabase.from('chat_invites').insert(invited.map(profile => ({
        room_id: room.id,
        from_user_id: currentUserId,
        to_user_id: profile.id,
        status: 'pending',
      })))
    }

    onCreated(room.id)
  }

  return (
    <div className={styles.modalOverlay} onClick={event => event.target === event.currentTarget && onClose()}>
      <form className={styles.modal} onSubmit={handleSubmit}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Nieuwe privé chat</h2>
          <button type="button" className={styles.modalClose} onClick={onClose}>×</button>
        </div>
        <div className={styles.modalBody}>
          <label className={styles.modalLabel} htmlFor="roomName">Naam</label>
          <input id="roomName" className={styles.modalInput} value={name} onChange={event => setName(event.target.value)} placeholder="Bijv. Brisket crew" required autoFocus />
          <label className={styles.modalLabel} htmlFor="inviteSearch">Leden uitnodigen</label>
          <input
            id="inviteSearch"
            className={styles.modalInput}
            value={query}
            onChange={event => {
              setQuery(event.target.value)
              if (!event.target.value.trim()) setResults([])
            }}
            placeholder="Zoek gebruikers..."
          />
          {results.length > 0 && (
            <div className={styles.userResults}>
              {results.map(profile => (
                <button type="button" key={profile.id} className={styles.userResult} onClick={() => toggleInvite(profile)}>
                  <span>{profile.username}</span>
                  <span>{invited.some(item => item.id === profile.id) ? '✓' : '+'}</span>
                </button>
              ))}
            </div>
          )}
          {invited.length > 0 && <p className={styles.selectedUsers}>{invited.map(profile => profile.username).join(', ')}</p>}
          {error && <p className={styles.modalError}>{error}</p>}
        </div>
        <div className={styles.modalActions}>
          <button type="button" className={styles.cancelBtn} onClick={onClose}>Annuleren</button>
          <button type="submit" className={styles.createBtn} disabled={saving}>{saving ? 'Aanmaken...' : 'Chat aanmaken'}</button>
        </div>
      </form>
    </div>
  )
}

export default function Community() {
  const { user, profile: myProfile } = useAuth()
  const { t } = useTranslation()
  const navigate = useNavigate()

  const [channels, setChannels] = useState([])
  const [memberOf, setMemberOf] = useState(new Set())
  const [loading,  setLoading]  = useState(true)
  const [joinHint, setJoinHint] = useState(null) // channel id showing "join first" hint
  const [activeTab, setActiveTab] = useState('channels')
  const [rooms, setRooms] = useState([])
  const [roomsLoading, setRoomsLoading] = useState(false)
  const [showCreateRoom, setShowCreateRoom] = useState(false)

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

  const loadRooms = useCallback(async () => {
    if (!user) return
    setRoomsLoading(true)
    const { data: memberships } = await supabase
      .from('private_room_members')
      .select('room_id')
      .eq('user_id', user.id)

    if (!memberships?.length) {
      setRooms([])
      setRoomsLoading(false)
      return
    }

    const roomIds = memberships.map(member => member.room_id)
    const { data: roomData } = await supabase
      .from('private_rooms')
      .select('id, name, created_at, private_room_members(user_id, profiles(id, username, avatar_url))')
      .in('id', roomIds)
      .order('created_at', { ascending: false })

    const roomsWithMessages = await Promise.all((roomData ?? []).map(async room => {
      const { data: messages } = await supabase
        .from('private_messages')
        .select('content, created_at')
        .eq('room_id', room.id)
        .order('created_at', { ascending: false })
        .limit(1)
      return { ...room, lastMessage: messages?.[0] ?? null }
    }))
    setRooms(roomsWithMessages)
    setRoomsLoading(false)
  }, [user])

  useEffect(() => {
    if (activeTab === 'private') loadRooms()
  }, [activeTab, loadRooms])

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

  function handleRoomCreated(roomId) {
    setShowCreateRoom(false)
    navigate(`/chat/${roomId}`)
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>{t('community.title')}</h1>
        <p className={styles.pageSubtitle}>{t('community.subtitle')}</p>
      </div>

      <div className={styles.tabs}>
        <button className={`${styles.tab} ${activeTab === 'channels' ? styles.tabActive : ''}`} onClick={() => setActiveTab('channels')}>Kanalen</button>
        <button className={`${styles.tab} ${activeTab === 'private' ? styles.tabActive : ''}`} onClick={() => setActiveTab('private')}>Privé Chats</button>
      </div>

      {activeTab === 'channels' && (loading ? (
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
      ))}

      {activeTab === 'private' && (
        roomsLoading ? (
          <div className={styles.emptyState}><span className={styles.emptyIcon}>🔥</span><p className={styles.emptyText}>Privé chats laden...</p></div>
        ) : rooms.length === 0 ? (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>💬</span>
            <p className={styles.emptyText}>Nog geen privé chats. Maak een nieuwe aan!</p>
            <button className={styles.createBtn} onClick={() => setShowCreateRoom(true)}>Nieuwe privé chat</button>
          </div>
        ) : (
          <>
            <div className={styles.privateHeader}>
              <button className={styles.createBtn} onClick={() => setShowCreateRoom(true)}>+ Nieuwe privé chat</button>
            </div>
            <div className={styles.roomList}>
              {rooms.map(room => (
                <button key={room.id} className={styles.roomCard} onClick={() => navigate(`/chat/${room.id}`)}>
                  <span className={styles.roomIcon}>🔒</span>
                  <span className={styles.roomBody}>
                    <strong className={styles.roomName}>{room.name || 'Privé chat'}</strong>
                    <span className={styles.roomMembers}>{room.private_room_members?.length ?? 0} leden</span>
                    <span className={styles.roomPreview}>{room.lastMessage?.content ?? 'Nog geen berichten'}</span>
                  </span>
                  <span className={styles.roomArrow}>→</span>
                </button>
              ))}
            </div>
          </>
        )
      )}

      {showCreateRoom && <CreateRoomModal currentUserId={user.id} onClose={() => setShowCreateRoom(false)} onCreated={handleRoomCreated} />}
    </div>
  )
}
