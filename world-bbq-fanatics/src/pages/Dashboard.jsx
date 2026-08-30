import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
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

function VisibilityBadge({ visibility }) {
  const label = visibility === 'private' ? 'Private' : visibility === 'friends_only' ? 'Friends Only' : 'Public'
  const className = visibility === 'private' ? styles.badgePrivate : visibility === 'friends_only' ? styles.badgeFriendsOnly : styles.badgePublic
  return <span className={className}>{label}</span>
}

function CategoryBadge({ category }) {
  if (!category) return null
  return (
    <span className={`${styles.categoryBadge} ${CATEGORY_CLASS[category] ?? ''}`}>
      {category}
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
          <div className={styles.cardBadges}>
            <CategoryBadge category={recipe.category} />
            <VisibilityBadge visibility={recipe.visibility} />
          </div>
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

function FeaturedRecipe({ recipe }) {
  const author = recipe.profiles
  const flameCount = (recipe.flames ?? []).length

  return (
    <div className={styles.featured}>
      {recipe.image_url ? (
        <img src={recipe.image_url} className={styles.featuredImage} alt={recipe.title} />
      ) : (
        <div className={styles.featuredImagePlaceholder}>🔥</div>
      )}
      <div className={styles.featuredOverlay} />

      <span className={styles.featuredBadge}>🏆 Most Popular Recipe</span>

      <div className={styles.featuredContent}>
        <div className={styles.featuredMeta}>
          <CategoryBadge category={recipe.category} />
          <span className={styles.featuredFlameCount}>🔥 {flameCount}</span>
        </div>

        <Link to={`/recipes/${recipe.id}`} className={styles.featuredTitle}>{recipe.title}</Link>

        {recipe.description && (
          <p className={styles.featuredDesc}>{recipe.description}</p>
        )}

        <div className={styles.featuredFooter}>
          <Link to={`/profile/${author?.username ?? ''}`} className={styles.featuredAuthor}>
            {author?.avatar_url ? (
              <img src={author.avatar_url} className={styles.featuredAuthorImg} alt="" />
            ) : (
              <span className={styles.featuredAuthorInitials}>
                {author?.username?.[0]?.toUpperCase() ?? '?'}
              </span>
            )}
            <span className={styles.featuredAuthorName}>{author?.username ?? 'Unknown'}</span>
          </Link>

          <Link to={`/recipes/${recipe.id}`} className={styles.featuredBtn}>View Recipe →</Link>
        </div>
      </div>
    </div>
  )
}

const CATEGORIES = ['Rund', 'Lam', 'Varken', 'Kip', 'Vis', 'Groenten', 'Rub', 'Sauzen']

const CATEGORY_CLASS = {
  Rund:     styles.catRund,
  Lam:      styles.catLam,
  Varken:   styles.catVarken,
  Kip:      styles.catKip,
  Vis:      styles.catVis,
  Groenten: styles.catGroenten,
  Rub:      styles.catRub,
  Sauzen:   styles.catSauzen,
}

const RECIPE_SELECT = `
  id, title, description, image_url, visibility, category, created_at, user_id,
  profiles(username, avatar_url),
  flames(id, user_id)
`

export default function Dashboard() {
  const { user } = useAuth()
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState(null)

  // All-recipes tab
  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(true)

  // My Recipes tab
  const [myRecipes, setMyRecipes] = useState([])
  const [loadingMyRecipes, setLoadingMyRecipes] = useState(true)

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

  const fetchMyRecipes = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('recipes')
      .select(RECIPE_SELECT)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    setMyRecipes(data ?? [])
    setLoadingMyRecipes(false)
  }, [user])

  const fetchFollowingRecipes = useCallback(async () => {
    if (!user) return

    const { data: followData } = await supabase
      .from('user_follows')
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
  useEffect(() => { fetchMyRecipes() }, [fetchMyRecipes])
  useEffect(() => { fetchFollowingRecipes() }, [fetchFollowingRecipes])

  const featured = useMemo(() => {
    if (recipes.length === 0) return null
    return recipes.reduce((best, r) =>
      (r.flames?.length ?? 0) > (best.flames?.length ?? 0) ? r : best
    , recipes[0])
  }, [recipes])

  async function handleFlameToggle(recipeId, hasFlamed) {
    if (!user) return

    // Optimistic update on all arrays
    const applyUpdate = prev => prev.map(r => {
      if (r.id !== recipeId) return r
      const flames = hasFlamed
        ? r.flames.filter(f => f.user_id !== user.id)
        : [...r.flames, { id: 'optimistic', user_id: user.id }]
      return { ...r, flames }
    })
    setRecipes(applyUpdate)
    setMyRecipes(applyUpdate)
    setFollowingRecipes(applyUpdate)

    if (hasFlamed) {
      await supabase.from('flames').delete()
        .eq('recipe_id', recipeId)
        .eq('user_id', user.id)
    } else {
      await supabase.from('flames').insert({ recipe_id: recipeId, user_id: user.id })

      const recipe =
        recipes.find(r => r.id === recipeId) ||
        myRecipes.find(r => r.id === recipeId) ||
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
    fetchMyRecipes()
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
      {!loading && featured && <FeaturedRecipe recipe={featured} />}

      <div className={styles.feedHeader}>
        <h1 className={styles.feedTitle}>{t('dashboard.latest')}</h1>
        <p className={styles.feedSubtitle}>{t('dashboard.subtitle')}</p>
      </div>

      {/* ── Tabs ── */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'all' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('all')}
        >
          {t('dashboard.allRecipes')}
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'mine' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('mine')}
        >
          {t('dashboard.myRecipes')}
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'following' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('following')}
        >
          {t('dashboard.following')}
        </button>
      </div>

      {/* ── All Recipes tab ── */}
      {activeTab === 'all' && (() => {
        const withoutFeatured = featured ? recipes.filter(r => r.id !== featured.id) : recipes
        const filtered = categoryFilter ? withoutFeatured.filter(r => r.category === categoryFilter) : withoutFeatured
        return (
          <>
            <div className={styles.filterBar}>
              <button
                className={`${styles.filterBtn} ${categoryFilter === null ? styles.filterBtnActive : ''}`}
                onClick={() => setCategoryFilter(null)}
              >
                All
              </button>
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  className={`${styles.filterBtn} ${categoryFilter === cat ? styles.filterBtnActive : ''}`}
                  onClick={() => setCategoryFilter(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
            {loading ? (
              <div className={styles.emptyState}>
                <span className={styles.emptyIcon}>🔥</span>
                <p className={styles.emptyText}>{t('dashboard.loading')}</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className={styles.emptyState}>
                <span className={styles.emptyIcon}>🍖</span>
                <h2 className={styles.emptyTitle}>{categoryFilter ? t('dashboard.emptyTitleCategory', { category: categoryFilter }) : t('dashboard.emptyTitleCold')}</h2>
                <p className={styles.emptyText}>{categoryFilter ? t('dashboard.emptyDescCategory') : t('dashboard.emptyDescCold')}</p>
              </div>
            ) : (
              <RecipeGrid items={filtered} />
            )}
          </>
        )
      })()}

      {/* ── My Recipes tab ── */}
      {activeTab === 'mine' && (() => {
        const items = featured ? myRecipes.filter(r => r.id !== featured.id) : myRecipes
        return loadingMyRecipes ? (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>🔥</span>
            <p className={styles.emptyText}>{t('dashboard.loadingMine')}</p>
          </div>
        ) : myRecipes.length === 0 ? (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>🍖</span>
            <h2 className={styles.emptyTitle}>{t('dashboard.noRecipesYet')}</h2>
            <p className={styles.emptyText}>{t('dashboard.shareSecrets')}</p>
            <Link to="/recipes/new" className={styles.addRecipeBtn}>{t('dashboard.addFirstRecipe')}</Link>
          </div>
        ) : items.length === 0 ? (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>🏆</span>
            <p className={styles.emptyText}>{t('dashboard.featuredOnly')}</p>
          </div>
        ) : (
          <RecipeGrid items={items} />
        )
      })()}

      {/* ── Following tab ── */}
      {activeTab === 'following' && (() => {
        const items = featured ? followingRecipes.filter(r => r.id !== featured.id) : followingRecipes
        return loadingFollowing ? (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>🔥</span>
            <p className={styles.emptyText}>{t('dashboard.loadingFollowing')}</p>
          </div>
        ) : noFollows ? (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>🍖</span>
            <h2 className={styles.emptyTitle}>{t('dashboard.emptyTitleNoOne')}</h2>
            <p className={styles.emptyText}>{t('dashboard.emptyDescFollow')}</p>
            <Link to="/search" className={styles.findPeopleLink}>{t('dashboard.findPeople')}</Link>
          </div>
        ) : followingRecipes.length === 0 ? (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>🍖</span>
            <h2 className={styles.emptyTitle}>{t('dashboard.emptyTitleNothing')}</h2>
            <p className={styles.emptyText}>{t('dashboard.emptyDescNothing')}</p>
          </div>
        ) : items.length === 0 ? (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>🏆</span>
            <p className={styles.emptyText}>{t('dashboard.featuredOnly')}</p>
          </div>
        ) : (
          <RecipeGrid items={items} />
        )
      })()}
    </div>
  )
}
