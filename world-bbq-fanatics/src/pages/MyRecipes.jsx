import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../supabase'
import styles from './MyRecipes.module.css'

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

const VISIBILITY_LABELS = {
  public:       { label: 'Public',       cls: 'badgePublic' },
  friends_only: { label: 'Friends Only', cls: 'badgeFriends' },
  private:      { label: 'Private',      cls: 'badgePrivate' },
}

export default function MyRecipes() {
  const { user } = useAuth()
  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(null)

  const fetchRecipes = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('recipes')
      .select('id, title, description, visibility, created_at, flames(id)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    setRecipes(data ?? [])
    setLoading(false)
  }, [user])

  useEffect(() => { fetchRecipes() }, [fetchRecipes])

  async function handleDelete(id) {
    if (!window.confirm('Delete this recipe? This cannot be undone.')) return
    setDeleting(id)
    await supabase.from('recipes').delete().eq('id', id)
    setRecipes(prev => prev.filter(r => r.id !== id))
    setDeleting(null)
  }

  const vis = (v) => VISIBILITY_LABELS[v] ?? VISIBILITY_LABELS.private

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>My Recipes</h1>
          <p className={styles.pageSubtitle}>
            {recipes.length} recipe{recipes.length !== 1 ? 's' : ''} in your pit
          </p>
        </div>
        <Link to="/recipes/new" className={styles.addBtn}>+ Add Recipe</Link>
      </div>

      {loading ? (
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon}>🔥</span>
          <p className={styles.emptyText}>Loading…</p>
        </div>
      ) : recipes.length === 0 ? (
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon}>🍖</span>
          <h2 className={styles.emptyTitle}>No recipes yet</h2>
          <p className={styles.emptyText}>Fire up your first recipe and share it with the community.</p>
          <Link to="/recipes/new" className={styles.addBtn} style={{ marginTop: 8 }}>+ Add Recipe</Link>
        </div>
      ) : (
        <div className={styles.list}>
          {recipes.map(recipe => {
            const v = vis(recipe.visibility)
            return (
              <div key={recipe.id} className={styles.card}>
                <div className={styles.cardMain}>
                  <div className={styles.cardTop}>
                    <span className={`${styles.badge} ${styles[v.cls]}`}>{v.label}</span>
                    <span className={styles.date}>{formatDate(recipe.created_at)}</span>
                  </div>
                  <Link to={`/recipes/${recipe.id}`} className={styles.cardTitle}>
                    {recipe.title}
                  </Link>
                  {recipe.description && (
                    <p className={styles.cardDesc}>{recipe.description}</p>
                  )}
                  <div className={styles.cardMeta}>
                    <span className={styles.flameCount}>🔥 {recipe.flames?.length ?? 0}</span>
                  </div>
                </div>
                <div className={styles.cardActions}>
                  <Link to={`/recipes/${recipe.id}/edit`} className={styles.editBtn}>Edit</Link>
                  <button
                    className={styles.deleteBtn}
                    onClick={() => handleDelete(recipe.id)}
                    disabled={deleting === recipe.id}
                  >
                    {deleting === recipe.id ? '…' : 'Delete'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
