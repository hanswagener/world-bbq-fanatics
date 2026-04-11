import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../supabase'
import { useAuth } from '../context/AuthContext'
import styles from './PrivateChat.module.css'

function formatTime(dateStr) {
  const d = new Date(dateStr)
  const today = new Date()
  const isToday =
    d.getFullYear() === today.getFullYear() &&
    d.getMonth()    === today.getMonth()    &&
    d.getDate()     === today.getDate()
  if (isToday) {
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  }
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
    ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

function MsgAvatar({ profile }) {
  if (profile?.avatar_url) {
    return <img src={profile.avatar_url} className={styles.msgAvatar} alt="" />
  }
  return (
    <span className={styles.msgAvatarInitials}>
      {profile?.username?.[0]?.toUpperCase() ?? '?'}
    </span>
  )
}

// ── Invite modal ───────────────────────────────────────────────────────────────
function InviteModal({ roomId, currentUserId, existingMemberIds, onClose, onInvited }) {
  const [query,    setQuery]    = useState('')
  const [results,  setResults]  = useState([])
  const [selected, setSelected] = useState([])
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState(null)
  const timer = useRef(null)

  useEffect(() => {
    if (!query.trim()) { setResults([]); return }
    clearTimeout(timer.current)
    timer.current = setTimeout(async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .ilike('username', `%${query.trim()}%`)
        .neq('id', currentUserId)
        .limit(8)
      // Filter out already-members
      setResults((data ?? []).filter(u => !existingMemberIds.includes(u.id)))
    }, 280)
    return () => clearTimeout(timer.current)
  }, [query, currentUserId, existingMemberIds])

  function toggleUser(u) {
    setSelected(prev =>
      prev.some(s => s.id === u.id)
        ? prev.filter(s => s.id !== u.id)
        : [...prev, u]
    )
  }

  async function handleInvite() {
    if (!selected.length) return
    setSaving(true)
    setError(null)

    const { error } = await supabase
      .from('private_room_members')
      .insert(selected.map(u => ({ room_id: roomId, user_id: u.id })))

    if (error) { setError(error.message); setSaving(false); return }
    onInvited(selected)
    onClose()
  }

  return (
    <div className={styles.modalOverlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Invite to Room</h2>
          <button className={styles.modalClose} onClick={onClose}>×</button>
        </div>

        <div className={styles.modalBody}>
          <input
            type="text"
            className={styles.modalInput}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search by username…"
            autoFocus
          />

          {results.length > 0 && (
            <ul className={styles.searchResults}>
              {results.map(u => {
                const isSel = selected.some(s => s.id === u.id)
                return (
                  <li key={u.id}
                    className={`${styles.searchResult} ${isSel ? styles.searchResultSelected : ''}`}
                    onClick={() => toggleUser(u)}
                  >
                    <span className={styles.srAvatar}>
                      {u.avatar_url
                        ? <img src={u.avatar_url} alt="" />
                        : u.username[0].toUpperCase()}
                    </span>
                    <span className={styles.srName}>{u.username}</span>
                    <span className={styles.srCheck}>{isSel ? '✓' : '+'}</span>
                  </li>
                )
              })}
            </ul>
          )}
          {query.trim() && results.length === 0 && (
            <p className={styles.searchEmpty}>No users found (or already in room)</p>
          )}

          {selected.length > 0 && (
            <div className={styles.selectedChips}>
              {selected.map(u => (
                <span key={u.id} className={styles.chip}>
                  {u.username}
                  <button className={styles.chipRemove} onClick={() => toggleUser(u)}>×</button>
                </span>
              ))}
            </div>
          )}

          {error && <p className={styles.modalError}>{error}</p>}
        </div>

        <div className={styles.modalFooter}>
          <button className={styles.cancelBtn} onClick={onClose}>Cancel</button>
          <button
            className={styles.inviteBtn}
            onClick={handleInvite}
            disabled={!selected.length || saving}
          >
            {saving ? 'Inviting…' : `Invite ${selected.length > 0 ? `(${selected.length})` : ''}`}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Members panel ──────────────────────────────────────────────────────────────
function MembersPanel({ members }) {
  return (
    <div className={styles.membersPanel}>
      <p className={styles.membersPanelTitle}>Members ({members.length})</p>
      {members.map(m => (
        <div key={m.user_id} className={styles.memberRow}>
          <span className={styles.memberAvatar}>
            {m.profiles?.avatar_url
              ? <img src={m.profiles.avatar_url} alt="" />
              : m.profiles?.username?.[0]?.toUpperCase() ?? '?'}
          </span>
          <span className={styles.memberName}>{m.profiles?.username ?? 'Unknown'}</span>
        </div>
      ))}
    </div>
  )
}

// ── Private Chat page ──────────────────────────────────────────────────────────
export default function PrivateChat() {
  const { id } = useParams()
  const { user, profile: myProfile } = useAuth()
  const navigate = useNavigate()

  const [room,        setRoom]        = useState(null)
  const [members,     setMembers]     = useState([])
  const [messages,    setMessages]    = useState([])
  const [loading,     setLoading]     = useState(true)
  const [text,        setText]        = useState('')
  const [sending,     setSending]     = useState(false)
  const [showInvite,  setShowInvite]  = useState(false)
  const [showMembers, setShowMembers] = useState(false)

  const bottomRef   = useRef(null)
  const inputRef    = useRef(null)
  const isFirstLoad = useRef(true)

  // Fetch room + membership check
  useEffect(() => {
    async function loadRoom() {
      const { data: memberCheck } = await supabase
        .from('private_room_members')
        .select('room_id')
        .eq('room_id', id)
        .eq('user_id', user.id)
        .maybeSingle()

      if (!memberCheck) { navigate('/chat'); return }

      const { data: roomData } = await supabase
        .from('private_rooms')
        .select('id, name')
        .eq('id', id)
        .maybeSingle()

      setRoom(roomData)

      const { data: memberData } = await supabase
        .from('private_room_members')
        .select('user_id, profiles(id, username, avatar_url)')
        .eq('room_id', id)

      setMembers(memberData ?? [])
    }
    if (user) loadRoom()
  }, [id, user, navigate])

  // Load initial messages
  useEffect(() => {
    async function loadMessages() {
      const { data } = await supabase
        .from('private_messages')
        .select('id, content, created_at, user_id, profiles(username, avatar_url)')
        .eq('room_id', id)
        .order('created_at', { ascending: true })
        .limit(200)

      setMessages(data ?? [])
      setLoading(false)
    }
    loadMessages()
  }, [id])

  // Realtime subscription
  useEffect(() => {
    const sub = supabase
      .channel(`private_messages:${id}`)
      .on(
        'postgres_changes',
        {
          event:  'INSERT',
          schema: 'public',
          table:  'private_messages',
          filter: `room_id=eq.${id}`,
        },
        async (payload) => {
          const { data } = await supabase
            .from('private_messages')
            .select('id, content, created_at, user_id, profiles(username, avatar_url)')
            .eq('id', payload.new.id)
            .maybeSingle()

          if (data) {
            setMessages(prev => {
              if (prev.some(m => m.id === data.id)) return prev
              return [...prev, data]
            })
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(sub) }
  }, [id])

  // Scroll to bottom
  useEffect(() => {
    if (loading) return
    if (isFirstLoad.current) {
      bottomRef.current?.scrollIntoView()
      isFirstLoad.current = false
    } else {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, loading])

  async function handleSend(e) {
    e.preventDefault()
    const content = text.trim()
    if (!content || sending) return

    setSending(true)
    setText('')

    const optimisticId = `opt-${Date.now()}`
    setMessages(prev => [...prev, {
      id:         optimisticId,
      content,
      created_at: new Date().toISOString(),
      user_id:    user.id,
      profiles:   myProfile,
    }])

    await supabase.from('private_messages').insert({
      room_id: id,
      user_id: user.id,
      content,
    })

    setSending(false)
    inputRef.current?.focus()
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend(e)
    }
  }

  function handleInvited(newMembers) {
    setMembers(prev => [
      ...prev,
      ...newMembers.map(u => ({ user_id: u.id, profiles: u })),
    ])
  }

  const memberIds = members.map(m => m.user_id)

  return (
    <div className={styles.page}>

      {/* ── Header ── */}
      <div className={styles.header}>
        <Link to="/chat" className={styles.backLink}>← Rooms</Link>

        <div className={styles.roomInfo}>
          <h1 className={styles.roomName}>{room?.name ?? '…'}</h1>
          <button
            className={styles.membersBtn}
            onClick={() => setShowMembers(v => !v)}
          >
            👥 {members.length} member{members.length !== 1 ? 's' : ''}
          </button>
        </div>

        <button className={styles.inviteHeaderBtn} onClick={() => setShowInvite(true)}>
          + Invite
        </button>
      </div>

      {/* Members panel (collapsible) */}
      {showMembers && <MembersPanel members={members} />}

      {/* ── Messages ── */}
      <div className={styles.messages}>
        {loading ? (
          <div className={styles.centerMsg}>
            <span>🔥</span><p>Loading messages…</p>
          </div>
        ) : messages.length === 0 ? (
          <div className={styles.centerMsg}>
            <span>🍖</span>
            <p>No messages yet — start the conversation!</p>
          </div>
        ) : (
          messages.map((msg, i) => {
            const isMe    = msg.user_id === user?.id
            const prevMsg = messages[i - 1]
            const grouped = prevMsg?.user_id === msg.user_id &&
              (new Date(msg.created_at) - new Date(prevMsg.created_at)) < 5 * 60 * 1000

            return (
              <div
                key={msg.id}
                className={`${styles.msgRow} ${isMe ? styles.msgRowMe : ''} ${grouped ? styles.msgGrouped : ''}`}
              >
                {!grouped
                  ? <MsgAvatar profile={msg.profiles} />
                  : <span className={styles.msgAvatarSpacer} />
                }
                <div className={styles.msgContent}>
                  {!grouped && (
                    <div className={styles.msgMeta}>
                      <span className={styles.msgUsername}>
                        {isMe ? 'You' : (msg.profiles?.username ?? 'Unknown')}
                      </span>
                      <span className={styles.msgTime}>{formatTime(msg.created_at)}</span>
                    </div>
                  )}
                  <div className={`${styles.msgBubble} ${isMe ? styles.msgBubbleMe : ''}`}>
                    {msg.content}
                  </div>
                </div>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* ── Input ── */}
      <form className={styles.inputBar} onSubmit={handleSend}>
        <textarea
          ref={inputRef}
          className={styles.input}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`Message ${room?.name ?? '…'}`}
          rows={1}
          disabled={sending}
        />
        <button
          type="submit"
          className={styles.sendBtn}
          disabled={!text.trim() || sending}
          title="Send (Enter)"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M16 9L2 2l3 7-3 7 14-7z" fill="currentColor" />
          </svg>
        </button>
      </form>

      {showInvite && (
        <InviteModal
          roomId={id}
          currentUserId={user.id}
          existingMemberIds={memberIds}
          onClose={() => setShowInvite(false)}
          onInvited={handleInvited}
        />
      )}
    </div>
  )
}
