import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../supabase'
import styles from './RecipeDetail.module.css'

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  })
}

function Section({ title, content }) {
  if (!content) return null
  return (
    <div className={styles.section}>
      <h2 className={styles.sectionTitle}>{title}</h2>
      <p className={styles.sectionContent}>{content}</p>
    </div>
  )
}

export default function RecipeDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [recipe, setRecipe] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [hasFlamed, setHasFlamed] = useState(false)
  const [flameCount, setFlameCount] = useState(0)
  const [flamePending, setFlamePending] = useState(false)

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from('recipes')
        .select(`
          id, title, description, ingredients, instructions,
          image_url, visibility, created_at, user_id,
          profiles(username, avatar_url, skill_level, bio),
          flames(id, user_id)
        `)
        .eq('id', id)
        .maybeSingle()

      if (error || !data) {
        setNotFound(true)
        setLoading(false)
        return
      }

      setRecipe(data)
      setFlameCount(data.flames?.length ?? 0)
      setHasFlamed(data.flames?.some(f => f.user_id === user?.id) ?? false)
      setLoading(false)
    }
    load()
  }, [id, user])

  async function toggleFlame() {
    if (!user || flamePending) return
    setFlamePending(true)

    if (hasFlamed) {
      setHasFlamed(false)
      setFlameCount(c => c - 1)
      await supabase.from('flames').delete()
        .eq('recipe_id', id)
        .eq('user_id', user.id)
    } else {
      setHasFlamed(true)
      setFlameCount(c => c + 1)
      await supabase.from('flames').insert({ recipe_id: id, user_id: user.id })
    }
    setFlamePending(false)
  }

  if (loading) {
    return (
      <div className={styles.loading}>
        <span>🔥</span>
        <p>Loading…</p>
      </div>
    )
  }

  if (notFound) {
    return (
      <div className={styles.loading}>
        <span>🍖</span>
        <h2>Recipe not found</h2>
        <Link to="/recipes" className={styles.backBtn}>Back to Recipes</Link>
      </div>
    )
  }

  const author = recipe.profiles
  const isOwner = user?.id === recipe.user_id

  return (
    <div className={styles.page}>
      <div className={styles.container}>

        {/* Back + owner actions */}
        <div className={styles.topBar}>
          <button className={styles.backBtn} onClick={() => navigate(-1)}>← Back</button>
          {isOwner && (
            <Link to={`/recipes/${id}/edit`} className={styles.editLink}>Edit Recipe</Link>
          )}
        </div>

        {/* Hero image */}
        {recipe.image_url && (
          <img src={recipe.image_url} className={styles.heroImage} alt={recipe.title} />
        )}

        {/* Title row */}
        <div className={styles.titleRow}>
          <h1 className={styles.title}>{recipe.title}</h1>
          <button
            className={`${styles.flameBtn} ${hasFlamed ? styles.flameBtnActive : ''}`}
            onClick={toggleFlame}
            disabled={flamePending}
            title={hasFlamed ? 'Remove flame' : 'Flame this recipe'}
          >
            🔥 <span className={styles.flameCount}>{flameCount}</span>
          </button>
        </div>

        {/* Author card */}
        <div className={styles.authorCard}>
          <div className={styles.authorAvatar}>
            {author?.avatar_url
              ? <img src={author.avatar_url} className={styles.authorAvatarImg} alt="" />
              : <span className={styles.authorAvatarInitials}>{author?.username?.[0]?.toUpperCase() ?? '?'}</span>
            }
          </div>
          <div className={styles.authorInfo}>
            <span className={styles.authorName}>{author?.username ?? 'Unknown'}</span>
            {author?.skill_level && (
              <span className={styles.authorSkill}>🔥 {author.skill_level}</span>
            )}
          </div>
          <span className={styles.recipeDate}>{formatDate(recipe.created_at)}</span>
        </div>

        {/* Content sections */}
        {recipe.description && (
          <p className={styles.description}>{recipe.description}</p>
        )}

        <Section title="Ingredients" content={recipe.ingredients} />
        <Section title="Instructions" content={recipe.instructions} />
      </div>
    </div>
  )
}
