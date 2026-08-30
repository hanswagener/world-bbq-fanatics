import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../supabase'
import { useAuth } from '../context/AuthContext'
import { getLanguageFlag } from '../utils/languageFlags'
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
  const navigate = useNavigate()

  const [channel,       setChannel]       = useState(null)
  const [messages,      setMessages]      = useState([])
  const [loading,       setLoading]       = useState(true)
  const [isMember,      setIsMember]      = useState(false)
  const [memberChecked, setMemberChecked] = useState(false)
  const [text,          setText]          = useState('')
  const [sending,       setSending]       = useState(false)

  const bottomRef   = useRef(null)
  const inputRef    = useRef(null)
  const isFirstLoad = useRef(true)

  // Fetch channel info
  useEffect(() => {
    supabase
      .from('channels')
      .select('id, name, description')
      .eq('id', id)
      .maybeSingle()
      .then(({ data }) => setChannel(data))
  }, [id])

  // Check membership
  useEffect(() => {
    if (!user) {
      setMemberChecked(true)
      return
    }
    supabase
      .from('channel_members')
      .select('channel_id')
      .eq('channel_id', id)
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) console.error('[ChannelChat] membership check error:', error.message)
        setIsMember(!!data)
        setMemberChecked(true)
      })
      .catch(err => {
        console.error('[ChannelChat] membership check threw:', err)
        setMemberChecked(true)
      })
  }, [id, user])

  // Load initial messages
  useEffect(() => {
    async function loadMessages() {
      const { data, error } = await supabase
        .from('channel_messages')
        .select('id, content, created_at, user_id, is_system, profiles(username, avatar_url, language)')
        .eq('channel_id', id)
        .order('created_at', { ascending: true })
        .limit(200)

      if (error) console.error('[ChannelChat] load messages failed:', error)
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
          console.log('[ChannelChat] realtime INSERT received:', payload.new)
          const { data, error } = await supabase
            .from('channel_messages')
            .select('id, content, created_at, user_id, is_system, profiles(username, avatar_url, language)')
            .eq('id', payload.new.id)
            .maybeSingle()

          if (error) console.error('[ChannelChat] realtime message lookup failed:', error)
          if (data) {
            setMessages(prev => {
              if (prev.some(m => m.id === data.id)) return prev
              return [...prev, data]
            })
          }
        }
      )
      .subscribe((status, error) => {
        console.log('[ChannelChat] realtime subscription status:', status)
        if (error) console.error('[ChannelChat] realtime subscription error:', error)
      })

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

  async function handleJoin() {
    if (!user) return
    await supabase.from('channel_members').insert({ channel_id: id, user_id: user.id })
    await supabase.from('channel_messages').insert({
      channel_id: id,
      user_id:    user.id,
      content:    `👋 ${myProfile?.username ?? 'Someone'} joined the channel`,
      is_system:  true,
    })
    setIsMember(true)
  }

  async function handleLeave() {
    if (!window.confirm(`Leave #${channel?.name}?`)) return
    await supabase.from('channel_messages').insert({
      channel_id: id,
      user_id:    user.id,
      content:    `👋 ${myProfile?.username ?? 'Someone'} left the channel`,
      is_system:  true,
    })
    await supabase.from('channel_members').delete().eq('channel_id', id).eq('user_id', user.id)
    navigate('/community')
  }

  async function handleSend(e) {
    e.preventDefault()
    const content = text.trim()
    if (!content || sending || !isMember) return

    setSending(true)
    setText('')

    console.log('Sending message:', content)
    const result = await supabase.from('channel_messages').insert({
      channel_id: id,
      user_id:    user.id,
      content,
    }).select('id, content, created_at, user_id, is_system, profiles(username, avatar_url, language)').single()

    console.log('[ChannelChat] message insert result:', result)

    if (result.error) {
      console.error('[ChannelChat] message insert failed:', result.error)
      setText(content)
      setSending(false)
      inputRef.current?.focus()
      return
    }

    setMessages(prev => {
      if (prev.some(message => message.id === result.data.id)) return prev
      return [...prev, result.data]
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
        {memberChecked && isMember && (
          <button className={styles.leaveBtn} onClick={handleLeave} title="Leave channel">
            🚪 Leave
          </button>
        )}
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
            if (msg.is_system) {
              return (
                <div key={msg.id} className={styles.msgSystem}>
                  {msg.content}
                </div>
              )
            }

            const isMe    = msg.user_id === user?.id
            const prevMsg = messages[i - 1]
            const grouped = !prevMsg?.is_system &&
              prevMsg?.user_id === msg.user_id &&
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
                      <span className={styles.msgLanguage} aria-label="User language">
                        {getLanguageFlag(msg.profiles?.language)}
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

      {/* ── Input / Join bar ── */}
      {memberChecked && (
        isMember ? (
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
        ) : (
          <div className={styles.joinBar}>
            <p className={styles.joinBarText}>Join this channel to participate in the conversation</p>
            <button className={styles.joinBarBtn} onClick={handleJoin}>
              Join Channel
            </button>
          </div>
        )
      )}
    </div>
  )
}
