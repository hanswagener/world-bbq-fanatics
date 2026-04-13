import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabase'
import styles from './Search.module.css'

const SKILL_COLORS = {
  'Orientating':  { bg: 'rgba(148,163,184,0.1)',  color: '#94a3b8',  border: 'rgba(148,163,184,0.2)' },
  'Beginner':     { bg: 'rgba(34,197,94,0.08)',    color: '#4ade80',  border: 'rgba(34,197,94,0.2)'  },
  'Backyard Pro': { bg: 'rgba(251,191,36,0.1)',    color: '#fbbf24',  border: 'rgba(251,191,36,0.2)' },
  'Pitmaster':    { bg: 'rgba(249,115,22,0.12)',   color: '#fb923c',  border: 'rgba(249,115,22,0.25)'},
  'Professional': { bg: 'rgba(239,68,68,0.1)',     color: '#f87171',  border: 'rgba(239,68,68,0.2)'  },
}

function SkillBadge({ level }) {
  if (!level) return null
  const s = SKILL_COLORS[level] ?? SKILL_COLORS['Beginner']
  return (
    <span
      className={styles.skillBadge}
      style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}
    >
      🔥 {level}
    </span>
  )
}

function UserAvatar({ profile }) {
  if (profile.avatar_url) {
    return <img src={profile.avatar_url} className={styles.userAvatar} alt="" />
  }
  return <span className={styles.userAvatarDefault}>🔥</span>
}

function RecipeResults({ recipes, loading }) {
  if (loading) return <div className={styles.state}><span className={styles.stateIcon}>🔥</span><p>Searching…</p></div>
  if (!recipes) return (
    <div className={styles.state}>
      <span className={styles.stateIcon}>🔍</span>
      <p>Start typing to search for recipes</p>
    </div>
  )
  if (recipes.length === 0) return (
    <div className={styles.state}>
      <span className={styles.stateIcon}>🍖</span>
      <p>No BBQ recipes found for that search!</p>
    </div>
  )
  return (
    <div className={styles.recipeList}>
      {recipes.map(r => (
        <Link key={r.id} to={`/recipes/${r.id}`} className={styles.recipeCard}>
          {r.image_url && <img src={r.image_url} className={styles.recipeImg} alt="" />}
          <div className={styles.recipeBody}>
            <h3 className={styles.recipeTitle}>{r.title}</h3>
            <p className={styles.recipeAuthor}>by {r.profiles?.username ?? 'Unknown'}</p>
            {r.description && <p className={styles.recipeDesc}>{r.description}</p>}
            <span className={styles.recipeFlames}>🔥 {r.flames?.length ?? 0} flames</span>
          </div>
        </Link>
      ))}
    </div>
  )
}

function UserResults({ users, loading }) {
  if (loading) return <div className={styles.state}><span className={styles.stateIcon}>🔥</span><p>Searching…</p></div>
  if (!users) return (
    <div className={styles.state}>
      <span className={styles.stateIcon}>🔍</span>
      <p>Start typing to search for users</p>
    </div>
  )
  if (users.length === 0) return (
    <div className={styles.state}>
      <span className={styles.stateIcon}>🍖</span>
      <p>No BBQ fanatics found with that name!</p>
    </div>
  )
  return (
    <div className={styles.userList}>
      {users.map(u => (
        <Link key={u.id} to={`/profile/${u.username}`} className={styles.userCard}>
          <UserAvatar profile={u} />
          <div className={styles.userBody}>
            <span className={styles.userName}>{u.username}</span>
            {u.location && <span className={styles.userLocation}>📍 {u.location}</span>}
          </div>
          {u.skill_level && <SkillBadge level={u.skill_level} />}
        </Link>
      ))}
    </div>
  )
}

export default function Search() {
  const inputRef = useRef(null)
  const timerRef = useRef(null)

  const [query,   setQuery]   = useState('')
  const [tab,     setTab]     = useState('recipes')
  const [recipes, setRecipes] = useState(null)   // null = "not searched yet"
  const [users,   setUsers]   = useState(null)
  const [loading, setLoading] = useState(false)

  // Auto-focus on mount
  useEffect(() => { inputRef.current?.focus() }, [])

  // Debounced search
  useEffect(() => {
    clearTimeout(timerRef.current)

    const q = query.trim()
    if (!q) {
      setRecipes(null)
      setUsers(null)
      setLoading(false)
      return
    }

    setLoading(true)
    timerRef.current = setTimeout(async () => {
      const pattern = `%${q}%`

      const [recipeRes, userRes] = await Promise.all([
        supabase
          .from('recipes')
          .select('id, title, description, image_url, flames(id), profiles(username)')
          .eq('visibility', 'public')
          .or(`title.ilike.${pattern},description.ilike.${pattern},ingredients.ilike.${pattern}`)
          .order('created_at', { ascending: false })
          .limit(30),

        supabase
          .from('profiles')
          .select('id, username, avatar_url, location, skill_level')
          .or(`username.ilike.${pattern},location.ilike.${pattern},bbq_brand.ilike.${pattern},skill_level.ilike.${pattern}`)
          .limit(30),
      ])

      setRecipes(recipeRes.data ?? [])
      setUsers(userRes.data ?? [])
      setLoading(false)
    }, 300)

    return () => clearTimeout(timerRef.current)
  }, [query])

  const recipeCount = recipes?.length ?? 0
  const userCount   = users?.length   ?? 0

  return (
    <div className={styles.page}>
      {/* ── Search bar ── */}
      <div className={styles.searchBar}>
        <svg className={styles.searchIcon} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          className={styles.input}
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search recipes, users, locations…"
          autoComplete="off"
        />
        {query && (
          <button className={styles.clearBtn} onClick={() => { setQuery(''); inputRef.current?.focus() }}>
            ×
          </button>
        )}
      </div>

      {/* ── Tabs ── */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${tab === 'recipes' ? styles.tabActive : ''}`}
          onClick={() => setTab('recipes')}
        >
          Recipes
          {recipes !== null && (
            <span className={styles.tabCount}>{recipeCount}</span>
          )}
        </button>
        <button
          className={`${styles.tab} ${tab === 'users' ? styles.tabActive : ''}`}
          onClick={() => setTab('users')}
        >
          Users
          {users !== null && (
            <span className={styles.tabCount}>{userCount}</span>
          )}
        </button>
      </div>

      {/* ── Results ── */}
      <div className={styles.results}>
        {tab === 'recipes'
          ? <RecipeResults recipes={recipes} loading={loading} />
          : <UserResults   users={users}     loading={loading} />
        }
      </div>
    </div>
  )
}
