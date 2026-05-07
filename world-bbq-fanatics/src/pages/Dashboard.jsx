import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../supabase'
import styles from './Dashboard.module.css'

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function AuthorAvatar({ profile }) {
  if (profile?.avatar_url) {
    return <img src={profile.avatar_url} className={styles.authorImg} alt="" />
  }
  return (
    <span className={styles.authorInitials}>
      {profile?.username?.[0]?.toUpperCase() ?? '?'}
    </span>
  )
}

function RecipeCard({ recipe, currentUserId, onFlameToggle }) {
  const author = recipe.profiles
  const flames = recipe.flames ?? []
  const flameCount = flames.length
  const hasFlamed = flames.some(f => f.user_id === currentUserId)

  return (
    <div className={styles.card}>
      {recipe.image_url ? (
        <img src={recipe.image_url} className={styles.cardImage} alt={recipe.title} />
      ) : (
        <div className={styles.cardImagePlaceholder}>🔥</div>
      )}

      <div className={styles.cardBody}>
        <div className={styles.cardTop}>
          <Link to={`/profile/${author?.username ?? ''}`} className={styles.author}>
            <AuthorAvatar profile={author} />
            <span className={styles.authorName}>{author?.username ?? 'Unknown'}</span>
          </Link>
          <span className={styles.badgePublic}>Public</span>
        </div>

        <Link to={`/recipes/${recipe.id}`} className={styles.cardTitle}>{recipe.title}</Link>

        {recipe.description && (
          <p className={styles.cardDesc}>{recipe.description}</p>
        )}

        <div className={styles.cardFooter}>
          <span className={styles.date}>{formatDate(recipe.created_at)}</span>
          <button
            className={`${styles.flameBtn} ${hasFlamed ? styles.flameBtnActive : ''}`}
            onClick={() => onFlameToggle(recipe.id, hasFlamed)}
            title={hasFlamed ? 'Remove flame' : 'Flame this recipe'}
          >
            🔥
            <span className={styles.flameCount}>{flameCount}</span>
          </button>
        </div>
      </div>
    </div>
  )
}

const RECIPE_SELECT = `
  id, title, description, image_url, visibility, created_at, user_id,
  profiles(username, avatar_url),
  flames(id, user_id)
`

export default function Dashboard() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('all')

  // All-recipes tab
  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(true)

  // Following tab
  const [followingRecipes, setFollowingRecipes] = useState([])
  const [loadingFollowing, setLoadingFollowing] = useState(true)
  const [noFollows, setNoFollows] = useState(false)

  const fetchRecipes = useCallback(async () => {
    const { data } = await supabase
      .from('recipes')
      .select(RECIPE_SELECT)
      .eq('visibility', 'public')
      .order('created_at', { ascending: false })
    setRecipes(data ?? [])
    setLoading(false)
  }, [])

  const fetchFollowingRecipes = useCallback(async () => {
    if (!user) return

    const { data: followData } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', user.id)

    if (!followData || followData.length === 0) {
      setNoFollows(true)
      setFollowingRecipes([])
      setLoadingFollowing(false)
      return
    }

    setNoFollows(false)
    const ids = followData.map(f => f.following_id)

    const { data } = await supabase
      .from('recipes')
      .select(RECIPE_SELECT)
      .in('user_id', ids)
      .eq('visibility', 'public')
      .order('created_at', { ascending: false })

    setFollowingRecipes(data ?? [])
    setLoadingFollowing(false)
  }, [user])

  useEffect(() => { fetchRecipes() }, [fetchRecipes])
  useEffect(() => { fetchFollowingRecipes() }, [fetchFollowingRecipes])

  async function handleFlameToggle(recipeId, hasFlamed) {
    if (!user) return

    // Optimistic update on both arrays
    const applyUpdate = prev => prev.map(r => {
      if (r.id !== recipeId) return r
      const flames = hasFlamed
        ? r.flames.filter(f => f.user_id !== user.id)
        : [...r.flames, { id: 'optimistic', user_id: user.id }]
      return { ...r, flames }
    })
    setRecipes(applyUpdate)
    setFollowingRecipes(applyUpdate)

    if (hasFlamed) {
      await supabase.from('flames').delete()
        .eq('recipe_id', recipeId)
        .eq('user_id', user.id)
    } else {
      await supabase.from('flames').insert({ recipe_id: recipeId, user_id: user.id })

      const recipe =
        recipes.find(r => r.id === recipeId) ||
        followingRecipes.find(r => r.id === recipeId)
      console.log('[Flame] recipe found:', recipe?.id, '| owner:', recipe?.user_id, '| current user:', user.id)
      if (recipe && recipe.user_id !== user.id) {
        const { error: notifError } = await supabase.from('notifications').insert({
          user_id:      recipe.user_id,
          from_user_id: user.id,
          type:         'flame',
          recipe_id:    recipeId,
          read:         false,
        })
        console.log('[Flame] notification insert result — error:', notifError)
      } else {
        console.log('[Flame] skipping notification — own recipe or recipe not found')
      }
    }

    fetchRecipes()
    fetchFollowingRecipes()
  }

  function RecipeGrid({ items }) {
    return (
      <div className={styles.grid}>
        {items.map(recipe => (
          <RecipeCard
            key={recipe.id}
            recipe={recipe}
            currentUserId={user?.id}
            onFlameToggle={handleFlameToggle}
          />
        ))}
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.feedHeader}>
        <h1 className={styles.feedTitle}>Latest from the Pit</h1>
        <p className={styles.feedSubtitle}>Fresh BBQ recipes from the community</p>
      </div>

      {/* ── Tabs ── */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'all' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('all')}
        >
          All Recipes
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'following' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('following')}
        >
          Following
        </button>
      </div>

      {/* ── All Recipes tab ── */}
      {activeTab === 'all' && (
        loading ? (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>🔥</span>
            <p className={styles.emptyText}>Loading recipes…</p>
          </div>
        ) : recipes.length === 0 ? (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>🍖</span>
            <h2 className={styles.emptyTitle}>The grill is cold…</h2>
            <p className={styles.emptyText}>No recipes yet. Be the first to fire one up!</p>
          </div>
        ) : (
          <RecipeGrid items={recipes} />
        )
      )}

      {/* ── Following tab ── */}
      {activeTab === 'following' && (
        loadingFollowing ? (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>🔥</span>
            <p className={styles.emptyText}>Loading…</p>
          </div>
        ) : noFollows ? (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>🍖</span>
            <h2 className={styles.emptyTitle}>No one followed yet</h2>
            <p className={styles.emptyText}>Follow some BBQ fanatics to see their recipes here!</p>
            <Link to="/search" className={styles.findPeopleLink}>Find people to follow →</Link>
          </div>
        ) : followingRecipes.length === 0 ? (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>🍖</span>
            <h2 className={styles.emptyTitle}>Nothing on the grill yet</h2>
            <p className={styles.emptyText}>The people you follow haven't posted any recipes yet.</p>
          </div>
        ) : (
          <RecipeGrid items={followingRecipes} />
        )
      )}
    </div>
  )
}
