import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../supabase'
import { useAuth } from '../context/AuthContext'
import styles from './ChannelChat.module.css'

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

function MessageAvatar({ profile }) {
  if (profile?.avatar_url) {
    return <img src={profile.avatar_url} className={styles.msgAvatar} alt="" />
  }
  return (
    <span className={styles.msgAvatarInitials}>
      {profile?.username?.[0]?.toUpperCase() ?? '?'}
    </span>
  )
}

export default function ChannelChat() {
  const { id } = useParams()
  const { user, profile: myProfile } = useAuth()

  const [channel,  setChannel]  = useState(null)
  const [messages, setMessages] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [text,     setText]     = useState('')
  const [sending,  setSending]  = useState(false)

  const bottomRef    = useRef(null)
  const inputRef     = useRef(null)
  const isFirstLoad  = useRef(true)

  // Fetch channel info
  useEffect(() => {
    supabase
      .from('channels')
      .select('id, name, description')
      .eq('id', id)
      .maybeSingle()
      .then(({ data }) => setChannel(data))
  }, [id])

  // Load initial messages
  useEffect(() => {
    async function loadMessages() {
      const { data } = await supabase
        .from('channel_messages')
        .select('id, content, created_at, user_id, profiles(username, avatar_url)')
        .eq('channel_id', id)
        .order('created_at', { ascending: true })
        .limit(200)

      setMessages(data ?? [])
      setLoading(false)
    }
    loadMessages()
  }, [id])

  // Realtime subscription
  useEffect(() => {
    const channel_sub = supabase
      .channel(`channel_messages:${id}`)
      .on(
        'postgres_changes',
        {
          event:  'INSERT',
          schema: 'public',
          table:  'channel_messages',
          filter: `channel_id=eq.${id}`,
        },
        async (payload) => {
          // Fetch the full row with profile join so we have username/avatar
          const { data } = await supabase
            .from('channel_messages')
            .select('id, content, created_at, user_id, profiles(username, avatar_url)')
            .eq('id', payload.new.id)
            .maybeSingle()

          if (data) {
            setMessages(prev => {
              // Deduplicate — optimistic message may already be present
              if (prev.some(m => m.id === data.id)) return prev
              return [...prev, data]
            })
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel_sub) }
  }, [id])

  // Scroll to bottom on new messages
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

    // Optimistic insert
    const optimisticId = `opt-${Date.now()}`
    setMessages(prev => [...prev, {
      id:         optimisticId,
      content,
      created_at: new Date().toISOString(),
      user_id:    user.id,
      profiles:   myProfile,
    }])

    await supabase.from('channel_messages').insert({
      channel_id: id,
      user_id:    user.id,
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

  return (
    <div className={styles.page}>

      {/* ── Header ── */}
      <div className={styles.header}>
        <Link to="/community" className={styles.backLink}>← Channels</Link>
        <div className={styles.channelInfo}>
          <h1 className={styles.channelName}>{channel?.name ?? '…'}</h1>
          {channel?.description && (
            <p className={styles.channelDesc}>{channel.description}</p>
          )}
        </div>
      </div>

      {/* ── Messages ── */}
      <div className={styles.messages}>
        {loading ? (
          <div className={styles.centerMsg}>
            <span>🔥</span><p>Loading messages…</p>
          </div>
        ) : messages.length === 0 ? (
          <div className={styles.centerMsg}>
            <span>🍖</span>
            <p>No messages yet. Fire up the conversation!</p>
          </div>
        ) : (
          messages.map((msg, i) => {
            const isMe      = msg.user_id === user?.id
            const prevMsg   = messages[i - 1]
            const grouped   = prevMsg?.user_id === msg.user_id &&
              (new Date(msg.created_at) - new Date(prevMsg.created_at)) < 5 * 60 * 1000

            return (
              <div
                key={msg.id}
                className={`${styles.msgRow} ${isMe ? styles.msgRowMe : ''} ${grouped ? styles.msgGrouped : ''}`}
              >
                {!grouped ? (
                  <MessageAvatar profile={msg.profiles} />
                ) : (
                  <span className={styles.msgAvatarSpacer} />
                )}

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
          placeholder={`Message #${channel?.name ?? '…'}`}
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
    </div>
  )
}
