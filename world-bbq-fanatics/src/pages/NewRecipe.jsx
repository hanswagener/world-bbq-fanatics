import { useRef, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../supabase'
import styles from './NewRecipe.module.css'

const MAX_FILE_SIZE = 5 * 1024 * 1024
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
const CATEGORIES = ['Rund', 'Varken', 'Kip', 'Vis', 'Groenten', 'Rub', 'Sauzen']

const VISIBILITY_OPTIONS = [
  { value: 'public',       label: '🌍 Public',       desc: 'Visible to everyone' },
  { value: 'friends_only', label: '👥 Friends Only',  desc: 'Only your friends' },
  { value: 'private',      label: '🔒 Private',       desc: 'Only you' },
]

export default function NewRecipe() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const fileInputRef = useRef(null)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [ingredients, setIngredients] = useState('')
  const [instructions, setInstructions] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [imageError, setImageError] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [category, setCategory] = useState('')
  const [visibility, setVisibility] = useState('public')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  function handleImageSelect(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setImageError(null)
    if (!ALLOWED_TYPES.includes(file.type)) {
      setImageError('Only JPG, PNG, and WebP images are allowed.')
      e.target.value = ''
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      setImageError('Image must be smaller than 5MB.')
      e.target.value = ''
      return
    }
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  function handleRemoveImage() {
    setImageFile(null)
    setImagePreview(null)
    setImageError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function uploadImage() {
    const ext = imageFile.name.split('.').pop().toLowerCase()
    const path = `${user.id}/${Date.now()}.${ext}`
    const { error: uploadError } = await supabase.storage
      .from('recipe-images')
      .upload(path, imageFile, { contentType: imageFile.type })
    if (uploadError) throw uploadError
    const { data } = supabase.storage.from('recipe-images').getPublicUrl(path)
    return data.publicUrl
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSaving(true)

    let imageUrl = null
    if (imageFile) {
      setUploading(true)
      try {
        imageUrl = await uploadImage()
      } catch (err) {
        setError('Image upload failed: ' + err.message)
        setSaving(false)
        setUploading(false)
        return
      }
      setUploading(false)
    }

    const { error: insertError } = await supabase.from('recipes').insert({
      user_id:      user.id,
      title:        title.trim(),
      description:  description.trim() || null,
      ingredients:  ingredients.trim() || null,
      instructions: instructions.trim() || null,
      image_url:    imageUrl,
      category:     category || null,
      visibility,
    })

    if (insertError) {
      setError(insertError.message)
      setSaving(false)
    } else {
      navigate('/recipes')
    }
  }

  const isSubmitting = saving || uploading

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

          {/* Category */}
          <div className={styles.field}>
            <label htmlFor="category" className={styles.label}>
              Category <span className={styles.required}>*</span>
            </label>
            <select
              id="category"
              className={styles.select}
              value={category}
              onChange={e => setCategory(e.target.value)}
              required
            >
              <option value="">Select category…</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Image Upload */}
          <div className={styles.field}>
            <span className={styles.label}>Recipe Image</span>
            <input
              ref={fileInputRef}
              id="imageFile"
              type="file"
              accept=".jpg,.jpeg,.png,.webp"
              onChange={handleImageSelect}
              className={styles.fileInput}
            />
            {imagePreview ? (
              <div className={styles.imagePreviewWrap}>
                <img src={imagePreview} className={styles.imagePreview} alt="Preview" />
                <div className={styles.imagePreviewActions}>
                  <button
                    type="button"
                    className={styles.changeImageBtn}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Change Image
                  </button>
                  <button
                    type="button"
                    className={styles.removeImageBtn}
                    onClick={handleRemoveImage}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <label htmlFor="imageFile" className={styles.uploadArea}>
                <span className={styles.uploadIcon}>📷</span>
                <span className={styles.uploadText}>Click to select an image</span>
                <span className={styles.uploadHint}>JPG, PNG or WebP · Max 5MB</span>
              </label>
            )}
            {imageError && <p className={styles.imageError}>{imageError}</p>}
            {uploading && (
              <div className={styles.progressBar}>
                <div className={styles.progressBarFill} />
              </div>
            )}
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
            <button type="submit" className={styles.submitBtn} disabled={isSubmitting}>
              {uploading ? 'Uploading image…' : saving ? 'Saving…' : 'Save Recipe'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
