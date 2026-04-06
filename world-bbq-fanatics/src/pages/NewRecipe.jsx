import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../supabase'
import styles from './NewRecipe.module.css'

const VISIBILITY_OPTIONS = [
  { value: 'public',       label: '🌍 Public',       desc: 'Visible to everyone' },
  { value: 'friends_only', label: '👥 Friends Only',  desc: 'Only your friends' },
  { value: 'private',      label: '🔒 Private',       desc: 'Only you' },
]

export default function NewRecipe() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [ingredients, setIngredients] = useState('')
  const [instructions, setInstructions] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [visibility, setVisibility] = useState('public')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSaving(true)

    const { error } = await supabase.from('recipes').insert({
      user_id:      user.id,
      title:        title.trim(),
      description:  description.trim() || null,
      ingredients:  ingredients.trim() || null,
      instructions: instructions.trim() || null,
      image_url:    imageUrl.trim() || null,
      visibility,
    })

    if (error) {
      setError(error.message)
      setSaving(false)
    } else {
      navigate('/recipes')
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <Link to="/recipes" className={styles.backLink}>← Back to My Recipes</Link>
          <h1 className={styles.title}>Add New Recipe</h1>
          <p className={styles.subtitle}>Share your BBQ mastery with the community</p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          {/* Title */}
          <div className={styles.field}>
            <label htmlFor="title" className={styles.label}>
              Title <span className={styles.required}>*</span>
            </label>
            <input
              id="title"
              type="text"
              className={styles.input}
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Texas Brisket Low and Slow"
              required
            />
          </div>

          {/* Description */}
          <div className={styles.field}>
            <label htmlFor="description" className={styles.label}>Description</label>
            <input
              id="description"
              type="text"
              className={styles.input}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="A short intro to your recipe…"
            />
          </div>

          {/* Image URL */}
          <div className={styles.field}>
            <label htmlFor="imageUrl" className={styles.label}>Image URL</label>
            <input
              id="imageUrl"
              type="url"
              className={styles.input}
              value={imageUrl}
              onChange={e => setImageUrl(e.target.value)}
              placeholder="https://example.com/recipe.jpg"
            />
          </div>

          {/* Ingredients */}
          <div className={styles.field}>
            <label htmlFor="ingredients" className={styles.label}>Ingredients</label>
            <textarea
              id="ingredients"
              className={styles.textarea}
              value={ingredients}
              onChange={e => setIngredients(e.target.value)}
              placeholder={"2 kg beef brisket\n1 tbsp coarse salt\n1 tbsp black pepper\n…"}
              rows={6}
            />
          </div>

          {/* Instructions */}
          <div className={styles.field}>
            <label htmlFor="instructions" className={styles.label}>Instructions</label>
            <textarea
              id="instructions"
              className={styles.textarea}
              value={instructions}
              onChange={e => setInstructions(e.target.value)}
              placeholder={"1. Trim excess fat from brisket\n2. Apply rub evenly\n3. Smoke at 107°C for 12 hours\n…"}
              rows={8}
            />
          </div>

          {/* Visibility */}
          <div className={styles.field}>
            <span className={styles.label}>Visibility</span>
            <div className={styles.visibilityGroup}>
              {VISIBILITY_OPTIONS.map(opt => (
                <label
                  key={opt.value}
                  className={`${styles.visOption} ${visibility === opt.value ? styles.visOptionActive : ''}`}
                >
                  <input
                    type="radio"
                    name="visibility"
                    value={opt.value}
                    checked={visibility === opt.value}
                    onChange={() => setVisibility(opt.value)}
                    className={styles.visRadio}
                  />
                  <span className={styles.visLabel}>{opt.label}</span>
                  <span className={styles.visDesc}>{opt.desc}</span>
                </label>
              ))}
            </div>
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <div className={styles.formActions}>
            <Link to="/recipes" className={styles.cancelBtn}>Cancel</Link>
            <button type="submit" className={styles.submitBtn} disabled={saving}>
              {saving ? 'Saving…' : 'Save Recipe'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
