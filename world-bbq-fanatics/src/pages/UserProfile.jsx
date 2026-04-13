import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../supabase'
import styles from './UserProfile.module.css'

const SKILL_COLORS = {
  'Orientating':  { bg: 'rgba(148,163,184,0.1)',  color: '#94a3b8',  border: 'rgba(148,163,184,0.2)' },
  'Beginner':     { bg: 'rgba(34,197,94,0.08)',    color: '#4ade80',  border: 'rgba(34,197,94,0.2)'  },
  'Backyard Pro': { bg: 'rgba(251,191,36,0.1)',    color: '#fbbf24',  border: 'rgba(251,191,36,0.2)' },
  'Pitmaster':    { bg: 'rgba(249,115,22,0.12)',   color: '#fb923c',  border: 'rgba(249,115,22,0.25)'},
  'Professional': { bg: 'rgba(239,68,68,0.1)',     color: '#f87171',  border: 'rgba(239,68,68,0.2)'  },
}

const VISIBILITY_LABELS = {
  public:       { label: 'Public',       cls: styles.badgePublic  },
  friends_only: { label: 'Friends Only', cls: styles.badgeFriends },
  private:      { label: 'Private',      cls: styles.badgePrivate },
}

function formatMemberDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

function formatFlames(n) { return n === 1 ? '1 flame' : `${n} flames` }

function SkillBadge({ level }) {
  if (!level) return null
  const s = SKILL_COLORS[level] ?? SKILL_COLORS['Beginner']
  return (
    <span className={styles.skillBadge} style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
      🔥 {level}
    </span>
  )
}

function RecipeCard({ recipe, showVisibility }) {
  const flameCount = recipe.flames?.length ?? 0
  const vis = VISIBILITY_LABELS[recipe.visibility] ?? VISIBILITY_LABELS.private
  return (
    <Link to={`/recipes/${recipe.id}`} className={styles.recipeCard}>
      {recipe.image_url && (
        <img src={recipe.image_url} className={styles.recipeImg} alt={recipe.title} />
      )}
      <div className={styles.recipeBody}>
        <div className={styles.recipeTop}>
          <h3 className={styles.recipeTitle}>{recipe.title}</h3>
          {showVisibility && (
            <span className={`${styles.badge} ${vis.cls}`}>{vis.label}</span>
          )}
        </div>
        {recipe.description && (
          <p className={styles.recipeDesc}>{recipe.description}</p>
        )}
        <span className={styles.recipeFlames}>🔥 {formatFlames(flameCount)}</span>
      </div>
    </Link>
  )
}

export default function UserProfile() {
  const { username } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const isMe = username === 'me'

  const [profile,  setProfile]  = useState(null)
  const [recipes,  setRecipes]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    // Wait until the auth user is available
    if (!user) return

    async function load() {
      let profileData

      if (isMe) {
        // Always fetch by auth user id — never rely on context cache
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle()
        profileData = data

        // No profile yet — send them to setup instead of showing "not found"
        if (!profileData) {
          navigate('/profile-setup', { replace: true })
          return
        }
      } else {
        // Public profile — fetch by username column
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('username', username)
          .maybeSingle()
        profileData = data
      }

      if (!profileData) { setNotFound(true); setLoading(false); return }
      setProfile(profileData)

      // Fetch recipes
      let query = supabase
        .from('recipes')
        .select('id, title, description, image_url, visibility, created_at, flames(id)')
        .eq('user_id', profileData.id)
        .order('created_at', { ascending: false })

      if (!isMe) {
        query = query.eq('visibility', 'public')
      }

      const { data: recipesData } = await query
      setRecipes(recipesData ?? [])
      setLoading(false)
    }

    load()
  }, [username, isMe, user, navigate])

  if (loading) {
    return (
      <div className={styles.loading}>
        <span>🔥</span><p>Loading profile…</p>
      </div>
    )
  }

  if (notFound) {
    return (
      <div className={styles.loading}>
        <span>🍖</span>
        <h2>Profile not found</h2>
        <p>No pitmaster with that username exists.</p>
        <Link to="/dashboard" className={styles.backLink}>← Back to Feed</Link>
      </div>
    )
  }

  return (
    <div className={styles.page}>

      {/* ── Profile card ── */}
      <div className={styles.profileCard}>
        <div className={styles.avatarWrap}>
          {profile.avatar_url
            ? <img src={profile.avatar_url} className={styles.avatar} alt={profile.username} />
            : <span className={styles.avatarDefault}>🔥</span>
          }
        </div>

        <div className={styles.profileMain}>
          <div className={styles.profileNameRow}>
            <h1 className={styles.username}>{profile.username}</h1>
            {profile.skill_level && <SkillBadge level={profile.skill_level} />}
            {isMe && (
              <Link to="/profile/edit" className={styles.editBtn}>Edit Profile</Link>
            )}
          </div>

          {profile.bio && <p className={styles.bio}>{profile.bio}</p>}

          <div className={styles.metaRow}>
            {profile.location  && <span className={styles.meta}>📍 {profile.location}</span>}
            {profile.bbq_brand && <span className={styles.meta}>🔩 {profile.bbq_brand}</span>}
            {profile.bbq_type  && <span className={styles.meta}>🔥 {profile.bbq_type}</span>}
            <span className={styles.meta}>🗓 Member since {formatMemberDate(profile.created_at)}</span>
          </div>
        </div>
      </div>

      {/* ── Recipes section ── */}
      <div className={styles.recipesSection}>
        <h2 className={styles.sectionTitle}>
          {isMe ? 'My Recipes' : `Recipes by ${profile.username}`}
          <span className={styles.recipeCount}>{recipes.length}</span>
        </h2>

        {recipes.length === 0 ? (
          <div className={styles.emptyState}>
            <span>🍖</span>
            <p>{isMe ? "You haven't added any recipes yet." : 'No public recipes yet.'}</p>
            {isMe && (
              <Link to="/recipes/new" className={styles.addRecipeBtn}>+ Add Recipe</Link>
            )}
          </div>
        ) : (
          <div className={styles.recipesGrid}>
            {recipes.map(r => (
              <RecipeCard key={r.id} recipe={r} showVisibility={isMe} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
