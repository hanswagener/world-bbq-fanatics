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
      {recipe.image_url && (
        <img src={recipe.image_url} className={styles.cardImage} alt={recipe.title} />
      )}

      <div className={styles.cardBody}>
        <div className={styles.cardTop}>
          <div className={styles.author}>
            <AuthorAvatar profile={author} />
            <span className={styles.authorName}>{author?.username ?? 'Unknown'}</span>
          </div>
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

export default function Dashboard() {
  const { user } = useAuth()
  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchRecipes = useCallback(async () => {
    const { data } = await supabase
      .from('recipes')
      .select(`
        id, title, description, image_url, visibility, created_at, user_id,
        profiles(username, avatar_url),
        flames(id, user_id)
      `)
      .eq('visibility', 'public')
      .order('created_at', { ascending: false })

    setRecipes(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchRecipes()
  }, [fetchRecipes])

  async function handleFlameToggle(recipeId, hasFlamed) {
    if (!user) return

    // Optimistic update
    setRecipes(prev => prev.map(r => {
      if (r.id !== recipeId) return r
      const flames = hasFlamed
        ? r.flames.filter(f => f.user_id !== user.id)
        : [...r.flames, { id: 'optimistic', user_id: user.id }]
      return { ...r, flames }
    }))

    if (hasFlamed) {
      await supabase.from('flames').delete()
        .eq('recipe_id', recipeId)
        .eq('user_id', user.id)
    } else {
      await supabase.from('flames').insert({ recipe_id: recipeId, user_id: user.id })
    }

    fetchRecipes()
  }

  return (
    <div className={styles.page}>
      <div className={styles.feedHeader}>
        <h1 className={styles.feedTitle}>Latest from the Pit</h1>
        <p className={styles.feedSubtitle}>Fresh BBQ recipes from the community</p>
      </div>

      {loading ? (
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
        <div className={styles.grid}>
          {recipes.map(recipe => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              currentUserId={user?.id}
              onFlameToggle={handleFlameToggle}
            />
          ))}
        </div>
      )}
    </div>
  )
}
