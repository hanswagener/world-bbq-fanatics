import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../supabase'
import styles from './ProfileSetup.module.css'

const MAX_AVATAR_SIZE = 2 * 1024 * 1024
const AVATAR_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']

const BBQ_TYPES   = ['Gas', 'Charcoal', 'Electric', 'Wood', 'Kamado', 'Pellets', 'Smoker', 'Multiple']
const SKILL_LEVELS = ['Orientating', 'Beginner', 'Backyard Pro', 'Pitmaster', 'Professional']
const LANGUAGE_OPTIONS = [
  { code: 'nl', label: '🇳🇱 Nederlands' },
  { code: 'en', label: '🇬🇧 English' },
  { code: 'de', label: '🇩🇪 Deutsch' },
  { code: 'fr', label: '🇫🇷 Français' },
  { code: 'es', label: '🇪🇸 Español' },
  { code: 'it', label: '🇮🇹 Italiano' },
]

export default function EditProfile() {
  const { user } = useAuth()
  const { i18n } = useTranslation()
  const navigate = useNavigate()
  const avatarInputRef = useRef(null)

  const [loading,       setLoading]       = useState(true)
  const [saving,        setSaving]        = useState(false)
  const [uploading,     setUploading]     = useState(false)
  const [error,         setError]         = useState(null)
  const [avatarError,   setAvatarError]   = useState(null)

  const [username,   setUsername]   = useState('')
  const [bio,        setBio]        = useState('')
  const [avatarUrl,  setAvatarUrl]  = useState('')
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [location,   setLocation]   = useState('')
  const [bbqBrand,   setBbqBrand]   = useState('')
  const [bbqType,    setBbqType]    = useState('')
  const [birthday,   setBirthday]   = useState('')
  const [skillLevel, setSkillLevel] = useState('')
  const [selectedLanguage, setSelectedLanguage] = useState(i18n.language || 'en')

  useEffect(() => {
    if (!user) return
    supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setUsername(data.username   ?? '')
          setBio(data.bio             ?? '')
          setAvatarUrl(data.avatar_url ?? '')
          setLocation(data.location   ?? '')
          setBbqBrand(data.bbq_brand  ?? '')
          setBbqType(data.bbq_type    ?? '')
          setBirthday(data.birthday   ?? '')
          setSkillLevel(data.skill_level ?? '')
          const savedLang = data.language ?? (i18n.language || 'en')
          setSelectedLanguage(savedLang)
          if (savedLang && savedLang !== i18n.language) {
            i18n.changeLanguage(savedLang)
            localStorage.setItem('bbq-fanatics-language', savedLang)
          }
        }
        setLoading(false)
      })
  }, [user, i18n])

  async function handleLanguageChange(code) {
    setSelectedLanguage(code)
    localStorage.setItem('bbq-fanatics-language', code)
    i18n.changeLanguage(code)

    if (!user) return

    const { error } = await supabase
      .from('profiles')
      .update({ language: code })
      .eq('id', user.id)

    if (error) {
      console.error('[EditProfile] language update failed:', error.message)
    }
  }

  function handleAvatarSelect(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarError(null)
    if (!AVATAR_TYPES.includes(file.type)) {
      setAvatarError('Only JPG, PNG, and WebP images are allowed.')
      e.target.value = ''
      return
    }
    if (file.size > MAX_AVATAR_SIZE) {
      setAvatarError('Image must be smaller than 2MB.')
      e.target.value = ''
      return
    }
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  async function uploadAvatar() {
    const ext = avatarFile.name.split('.').pop().toLowerCase()
    const path = `${user.id}/${Date.now()}.${ext}`
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, avatarFile, { contentType: avatarFile.type })
    if (uploadError) throw uploadError
    const { data } = supabase.storage.from('avatars').getPublicUrl(path)
    return data.publicUrl
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSaving(true)

    let finalAvatarUrl = avatarUrl

    if (avatarFile) {
      setUploading(true)
      try {
        finalAvatarUrl = await uploadAvatar()
      } catch (err) {
        setError('Avatar upload failed: ' + err.message)
        setSaving(false)
        setUploading(false)
        return
      }
      setUploading(false)
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        username:    username.trim(),
        bio:         bio.trim()              || null,
        avatar_url:  finalAvatarUrl.trim()   || null,
        location:    location.trim()         || null,
        bbq_brand:   bbqBrand.trim()         || null,
        bbq_type:    bbqType                 || null,
        birthday:    birthday                || null,
        skill_level: skillLevel              || null,
        language:    selectedLanguage,
      })
      .eq('id', user.id)

    if (error) {
      setError(error.message)
      setSaving(false)
    } else {
      navigate('/profile/me')
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
        <h1 className={styles.title}>Edit Profile</h1>
        <p className={styles.subtitle}>Update your BBQ identity</p>

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
                onChange={e => setUsername(e.target.value)}
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
                onChange={e => setLocation(e.target.value)}
                placeholder="Austin, TX"
              />
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Taal / Language</label>
            <div className={styles.languageSelector}>
              {LANGUAGE_OPTIONS.map(option => (
                <button
                  key={option.code}
                  type="button"
                  className={`${styles.languageOption} ${selectedLanguage === option.code ? styles.languageOptionActive : ''}`}
                  onClick={() => handleLanguageChange(option.code)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.field}>
            <label htmlFor="bio" className={styles.label}>Bio</label>
            <textarea
              id="bio"
              className={styles.textarea}
              value={bio}
              onChange={e => setBio(e.target.value)}
              placeholder="Weekend warrior with a passion for low-and-slow brisket…"
              rows={3}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Profile Photo</label>
            <div className={styles.avatarSection}>
              <div
                className={styles.avatarCircle}
                onClick={() => avatarInputRef.current?.click()}
                title="Click to upload photo"
              >
                {(avatarPreview || avatarUrl) ? (
                  <img src={avatarPreview || avatarUrl} alt="Avatar" className={styles.avatarImg} />
                ) : (
                  <span className={styles.avatarEmoji}>🔥</span>
                )}
              </div>
              <input
                ref={avatarInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.webp"
                style={{ display: 'none' }}
                onChange={handleAvatarSelect}
              />
              <button
                type="button"
                className={styles.uploadBtn}
                onClick={() => avatarInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? 'Uploading…' : 'Upload Photo'}
              </button>
              {uploading && <p className={styles.uploadProgress}>Uploading your photo…</p>}
              {avatarError && <p className={styles.error}>{avatarError}</p>}
            </div>
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <label htmlFor="bbqBrand" className={styles.label}>BBQ Brand</label>
              <input
                id="bbqBrand"
                type="text"
                className={styles.input}
                value={bbqBrand}
                onChange={e => setBbqBrand(e.target.value)}
                placeholder="Weber, Kamado Joe…"
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="bbqType" className={styles.label}>BBQ Type</label>
              <select
                id="bbqType"
                className={styles.select}
                value={bbqType}
                onChange={e => setBbqType(e.target.value)}
              >
                <option value="">Select type…</option>
                {BBQ_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
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
                onChange={e => setBirthday(e.target.value)}
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="skillLevel" className={styles.label}>BBQ Skill Level</label>
              <select
                id="skillLevel"
                className={styles.select}
                value={skillLevel}
                onChange={e => setSkillLevel(e.target.value)}
              >
                <option value="">Select level…</option>
                {SKILL_LEVELS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <div className={styles.formActions}>
            <Link to="/profile/me" className={styles.cancelBtn}>Cancel</Link>
            <button type="submit" className={styles.button} disabled={saving}>
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
