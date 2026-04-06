import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import styles from './ProfileSetup.module.css'

const BBQ_TYPES = ['Gas', 'Charcoal', 'Electric', 'Wood', 'Kamado', 'Multiple']
const SKILL_LEVELS = ['Orientating', 'Beginner', 'Backyard Pro', 'Pitmaster', 'Professional']

export default function ProfileSetup() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const [username, setUsername] = useState('')
  const [bio, setBio] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [location, setLocation] = useState('')
  const [bbqBrand, setBbqBrand] = useState('')
  const [bbqType, setBbqType] = useState('')
  const [birthday, setBirthday] = useState('')
  const [skillLevel, setSkillLevel] = useState('')

  useEffect(() => {
    async function check() {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        navigate('/login')
        return
      }

      setUser(user)

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .maybeSingle()

      if (profile) {
        navigate('/dashboard')
        return
      }

      setLoading(false)
    }

    check()
  }, [navigate])

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSaving(true)

    const { error } = await supabase.from('profiles').insert({
      id: user.id,
      username: username.trim(),
      bio: bio.trim() || null,
      avatar_url: avatarUrl.trim() || null,
      location: location.trim() || null,
      bbq_brand: bbqBrand.trim() || null,
      bbq_type: bbqType || null,
      birthday: birthday || null,
      skill_level: skillLevel || null,
    })

    if (error) {
      setError(error.message)
      setSaving(false)
    } else {
      navigate('/dashboard')
    }
  }

  if (loading) {
    return (
      <div className={styles.page}>
        <p className={styles.loading}>Loading…</p>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logo}>🔥</div>
        <h1 className={styles.title}>Set Up Your Profile</h1>
        <p className={styles.subtitle}>Tell the BBQ community a bit about yourself</p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.row}>
            <div className={styles.field}>
              <label htmlFor="username" className={styles.label}>
                Username <span className={styles.required}>*</span>
              </label>
              <input
                id="username"
                type="text"
                className={styles.input}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="pitmaster_hans"
                required
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="location" className={styles.label}>Location</label>
              <input
                id="location"
                type="text"
                className={styles.input}
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Austin, TX"
              />
            </div>
          </div>

          <div className={styles.field}>
            <label htmlFor="bio" className={styles.label}>Bio</label>
            <textarea
              id="bio"
              className={styles.textarea}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Weekend warrior with a passion for low-and-slow brisket…"
              rows={3}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="avatarUrl" className={styles.label}>Avatar URL</label>
            <input
              id="avatarUrl"
              type="url"
              className={styles.input}
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://example.com/avatar.jpg"
            />
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <label htmlFor="bbqBrand" className={styles.label}>BBQ Brand</label>
              <input
                id="bbqBrand"
                type="text"
                className={styles.input}
                value={bbqBrand}
                onChange={(e) => setBbqBrand(e.target.value)}
                placeholder="Weber, Kamado Joe…"
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="bbqType" className={styles.label}>BBQ Type</label>
              <select
                id="bbqType"
                className={styles.select}
                value={bbqType}
                onChange={(e) => setBbqType(e.target.value)}
              >
                <option value="">Select type…</option>
                {BBQ_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <label htmlFor="birthday" className={styles.label}>Birthday</label>
              <input
                id="birthday"
                type="date"
                className={styles.input}
                value={birthday}
                onChange={(e) => setBirthday(e.target.value)}
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="skillLevel" className={styles.label}>BBQ Skill Level</label>
              <select
                id="skillLevel"
                className={styles.select}
                value={skillLevel}
                onChange={(e) => setSkillLevel(e.target.value)}
              >
                <option value="">Select level…</option>
                {SKILL_LEVELS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <button type="submit" className={styles.button} disabled={saving}>
            {saving ? 'Saving…' : 'Save Profile'}
          </button>
        </form>
      </div>
    </div>
  )
}
