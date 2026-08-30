import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../supabase'
import { useAuth } from '../context/AuthContext'
import styles from './Chat.module.css'

// ── User search + multi-select used in the create-room modal ──────────────────
function UserSearch({ currentUserId, selected, onToggle }) {
  const { t } = useTranslation()
  const [query,   setQuery]   = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const timer = useRef(null)

  useEffect(() => {
    if (!query.trim()) { setResults([]); return }
    clearTimeout(timer.current)
    timer.current = setTimeout(async () => {
      setSearching(true)
      const { data } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .ilike('username', `%${query.trim()}%`)
        .neq('id', currentUserId)
        .limit(8)
      setResults(data ?? [])
      setSearching(false)
    }, 280)
    return () => clearTimeout(timer.current)
  }, [query, currentUserId])

  return (
    <div className={styles.userSearch}>
      <input
        type="text"
        className={styles.searchInput}
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder={t('chat.searchUser')}
        autoComplete="off"
      />
      {results.length > 0 && (
        <ul className={styles.searchResults}>
          {results.map(u => {
            const isSelected = selected.some(s => s.id === u.id)
            return (
              <li key={u.id}
                className={`${styles.searchResult} ${isSelected ? styles.searchResultSelected : ''}`}
                onClick={() => onToggle(u)}
              >
                <span className={styles.srAvatar}>
                  {u.avatar_url
                    ? <img src={u.avatar_url} alt="" />
                    : u.username[0].toUpperCase()}
                </span>
                <span className={styles.srName}>{u.username}</span>
                <span className={styles.srCheck}>{isSelected ? '✓' : '+'}</span>
              </li>
            )
          })}
        </ul>
      )}
      {query.trim() && !searching && results.length === 0 && (
        <p className={styles.searchEmpty}>{t('chat.noUsersFound')}</p>
      )}
      {selected.length > 0 && (
        <div className={styles.selectedChips}>
          {selected.map(u => (
            <span key={u.id} className={styles.chip}>
              {u.username}
              <button className={styles.chipRemove} onClick={() => onToggle(u)}>×</button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Create Room modal ─────────────────────────────────────────────────────────
function CreateRoomModal({ currentUserId, onClose, onCreate }) {
  const { t } = useTranslation()
  const [name,     setName]     = useState('')
  const [invited,  setInvited]  = useState([])
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState(null)

  function toggleUser(u) {
    setInvited(prev =>
      prev.some(s => s.id === u.id)
        ? prev.filter(s => s.id !== u.id)
        : [...prev, u]
    )
  }

  async function handleCreate(e) {
    e.preventDefault()
    setError(null)
    setSaving(true)

    // 1. Create room
    console.log('Creating room...')
    const { data: room, error: roomErr } = await supabase
      .from('private_rooms')
      .insert({ name: name.trim() })
      .select('id')
      .single()
    console.log('Room insert result — data:', room, '| error:', roomErr)

    if (roomErr) { setError(roomErr.message); setSaving(false); return }

    // 2. Add only the creator as a member immediately
    console.log('Adding creator to room...')
    const { data: memberData, error: membersErr } = await supabase
      .from('private_room_members')
      .insert([{ room_id: room.id, user_id: currentUserId }])
      .select()
    console.log('Creator member insert — data:', memberData, '| error:', membersErr)

    if (membersErr) { setError(membersErr.message); setSaving(false); return }

    // 3. Create pending invites + notifications for invited users
    if (invited.length > 0) {
      for (const u of invited) {
        console.log('Sending invite to:', u.id)
      }
      const { data: inviteData, error: inviteErr } = await supabase
        .from('chat_invites')
        .insert(invited.map(u => ({
          room_id:      room.id,
          from_user_id: currentUserId,
          to_user_id:   u.id,
          status:       'pending',
        })))
        .select()
      console.log('chat_invites insert — data:', inviteData, '| error:', inviteErr)

      if (inviteErr) { setError(inviteErr.message); setSaving(false); return }

      const { error: notifErr } = await supabase.from('notifications').insert(
        invited.map(u => ({
          user_id:      u.id,
          from_user_id: currentUserId,
          type:         'chat_invite',
          recipe_id:    null,
          read:         false,
        }))
      )
      console.log('notifications insert error:', notifErr)
    }

    onCreate(room.id)
  }

  return (
    <div className={styles.modalOverlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>{t('chat.createRoom')}</h2>
          <button className={styles.modalClose} onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleCreate} className={styles.modalForm}>
          <div className={styles.modalField}>
            <label className={styles.modalLabel}>{t('chat.roomName')} <span className={styles.req}>*</span></label>
            <input
              type="text"
              className={styles.modalInput}
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={t('chat.roomPlaceholder')}
              required
              autoFocus
            />
          </div>

          <div className={styles.modalField}>
            <label className={styles.modalLabel}>{t('chat.inviteMembers')}</label>
            <UserSearch
              currentUserId={currentUserId}
              selected={invited}
              onToggle={toggleUser}
            />
          </div>

          {error && <p className={styles.modalError}>{error}</p>}

          <div className={styles.modalActions}>
            <button type="button" className={styles.cancelBtn} onClick={onClose}>{t('chat.cancel')}</button>
            <button type="submit" className={styles.createBtn} disabled={saving}>
              {saving ? t('chat.loading') : t('chat.create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Room member avatars strip ─────────────────────────────────────────────────
function MemberStrip({ members }) {
  const show = members.slice(0, 5)
  const rest = members.length - show.length
  return (
    <div className={styles.memberStrip}>
      {show.map(m => (
        <span key={m.profiles?.id ?? m.user_id} className={styles.memberAvatar} title={m.profiles?.username}>
          {m.profiles?.avatar_url
            ? <img src={m.profiles.avatar_url} alt="" />
            : (m.profiles?.username?.[0]?.toUpperCase() ?? '?')}
        </span>
      ))}
      {rest > 0 && <span className={styles.memberMore}>+{rest}</span>}
    </div>
  )
}

// ── Main rooms list page ──────────────────────────────────────────────────────
export default function Chat() {
  const { user } = useAuth()
  const { t } = useTranslation()
  const [rooms,      setRooms]      = useState([])
  const [loading,    setLoading]    = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const navigate_to_room = useCallback((id) => {
    window.location.href = `/chat/${id}`
  }, [])

  const fetchRooms = useCallback(async () => {
    if (!user) return

    // Get all room IDs for this user
    const { data: memberships } = await supabase
      .from('private_room_members')
      .select('room_id')
      .eq('user_id', user.id)

    if (!memberships?.length) { setRooms([]); setLoading(false); return }

    const roomIds = memberships.map(m => m.room_id)

    const { data } = await supabase
      .from('private_rooms')
      .select(`
        id, name, created_at,
        private_room_members(user_id, profiles(id, username, avatar_url))
      `)
      .in('id', roomIds)
      .order('created_at', { ascending: false })

    setRooms(data ?? [])
    setLoading(false)
  }, [user])

  useEffect(() => { fetchRooms() }, [fetchRooms])

  function handleCreated(roomId) {
    setShowCreate(false)
    navigate_to_room(roomId)
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>{t('chat.privateChats')}</h1>
          <p className={styles.pageSubtitle}>{t('chat.subtitle')}</p>
        </div>
        <button className={styles.createBtn} onClick={() => setShowCreate(true)}>
          {t('chat.newRoom')}
        </button>
      </div>

      {loading ? (
        <div className={styles.emptyState}>
          <span>🔥</span><p>{t('chat.loading')}</p>
        </div>
      ) : rooms.length === 0 ? (
        <div className={styles.emptyState}>
          <span>🔒</span>
          <h2 className={styles.emptyTitle}>{t('chat.noRooms')}</h2>
          <p className={styles.emptyText}>{t('chat.emptyText')}</p>
          <button className={styles.createBtn} style={{ marginTop: 8 }} onClick={() => setShowCreate(true)}>
            {t('chat.newRoom')}
          </button>
        </div>
      ) : (
        <div className={styles.list}>
          {rooms.map(room => (
            <Link key={room.id} to={`/chat/${room.id}`} className={styles.roomCard}>
              <div className={styles.roomIcon}>🔒</div>
              <div className={styles.roomBody}>
                <h2 className={styles.roomName}>{room.name}</h2>
                <MemberStrip members={room.private_room_members ?? []} />
              </div>
              <span className={styles.roomArrow}>→</span>
            </Link>
          ))}
        </div>
      )}

      {showCreate && (
        <CreateRoomModal
          currentUserId={user.id}
          onClose={() => setShowCreate(false)}
          onCreate={handleCreated}
        />
      )}
    </div>
  )
}
