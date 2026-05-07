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

  const [profile,      setProfile]      = useState(null)
  const [recipes,      setRecipes]      = useState([])
  const [loading,      setLoading]      = useState(true)
  const [notFound,     setNotFound]     = useState(false)
  const [isFollowing,  setIsFollowing]  = useState(false)
  const [followerCount, setFollowerCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [followLoading, setFollowLoading] = useState(false)

  useEffect(() => {
    if (!user) return

    // Reset every time username or user changes so stale state from a
    // previous profile never bleeds into the new one while loading.
    setLoading(true)
    setNotFound(false)
    setProfile(null)
    setRecipes([])
    setIsFollowing(false)
    setFollowerCount(0)
    setFollowingCount(0)

    async function load() {
      let profileData

      if (isMe) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle()
        profileData = data
        if (!profileData) {
          navigate('/profile-setup', { replace: true })
          return
        }
      } else {
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
      if (!isMe) query = query.eq('visibility', 'public')
      const { data: recipesData } = await query
      setRecipes(recipesData ?? [])

      // Follower / following counts (run in parallel)
      const [{ data: fwrs }, { data: fwng }] = await Promise.all([
        supabase.from('user_follows').select('id').eq('following_id', profileData.id),
        supabase.from('user_follows').select('id').eq('follower_id',  profileData.id),
      ])
      setFollowerCount(fwrs?.length ?? 0)
      setFollowingCount(fwng?.length ?? 0)

      setLoading(false)
    }

    load()
  }, [username, isMe, user, navigate])

  // Separate effect so the follow check re-runs whenever the profile or
  // the logged-in user changes, with profileId as an explicit dependency.
  useEffect(() => {
    if (!user || !profile) return

    const ownProfile = isMe || profile.id === user.id
    if (ownProfile) return

    async function checkFollowStatus() {
      console.log('Checking follow status for follower:', user.id)
      console.log('Following:', profile.id)

      const { data } = await supabase
        .from('user_follows')
        .select('id')
        .eq('follower_id',  user.id)
        .eq('following_id', profile.id)
        .maybeSingle()

      console.log('Follow record found:', data)
      setIsFollowing(!!data)
    }

    checkFollowStatus()
  }, [profile?.id, user?.id, isMe])

  async function handleFollow() {
    if (!user || !profile || followLoading) return
    setFollowLoading(true)

    if (isFollowing) {
      await supabase
        .from('user_follows')
        .delete()
        .eq('follower_id',  user.id)
        .eq('following_id', profile.id)
      setIsFollowing(false)
      setFollowerCount(c => Math.max(0, c - 1))
    } else {
      await supabase.from('user_follows').insert({
        follower_id:  user.id,
        following_id: profile.id,
      })
      setIsFollowing(true)
      setFollowerCount(c => c + 1)

      // Notify the followed user
      await supabase.from('notifications').insert({
        user_id:      profile.id,
        from_user_id: user.id,
        type:         'follow',
        recipe_id:    null,
        read:         false,
      })
    }

    setFollowLoading(false)
  }

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

  const isOwnProfile = isMe || (user && profile && user.id === profile.id)

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
          {/* Name + skill badge — no button here so wrapping can't hide it */}
          <div className={styles.profileNameRow}>
            <h1 className={styles.username}>{profile.username}</h1>
            {profile.skill_level && <SkillBadge level={profile.skill_level} />}
          </div>

          {profile.bio && <p className={styles.bio}>{profile.bio}</p>}

          {/* Stats + action button always on the same dedicated row */}
          <div className={styles.profileActionsRow}>
            <div className={styles.statsRow}>
              <span className={styles.stat}>
                <strong className={styles.statNum}>{followerCount}</strong>
                <span className={styles.statLabel}> followers</span>
              </span>
              <span className={styles.statSep}>·</span>
              <span className={styles.stat}>
                <strong className={styles.statNum}>{followingCount}</strong>
                <span className={styles.statLabel}> following</span>
              </span>
            </div>

            {isOwnProfile ? (
              <Link to="/profile/edit" className={styles.editBtn}>Edit Profile</Link>
            ) : (
              <button
                className={`${styles.followBtn} ${isFollowing ? styles.followBtnActive : ''}`}
                onClick={handleFollow}
                disabled={followLoading}
              >
                {followLoading ? '…' : isFollowing ? 'Following' : '+ Follow'}
              </button>
            )}
          </div>

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
