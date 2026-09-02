import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../supabase'
import styles from './NewRecipe.module.css'

const MAX_FILE_SIZE = 5 * 1024 * 1024
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
const CATEGORIES = ['Rund', 'Lam', 'Varken', 'Kip', 'Vis', 'Groenten', 'Rub', 'Sauzen']
const CORE_TEMP_BY_CATEGORY = {
  Rund: 55,
  Lam: 60,
  Varken: 70,
  Kip: 75,
  Vis: 55,
  Groenten: null,
  Rub: null,
  Sauzen: null,
}

const VISIBILITY_OPTIONS = [
  { value: 'public',       label: '🌍 Public',       desc: 'Visible to everyone' },
  { value: 'friends_only', label: '👥 Friends Only',  desc: 'Only your friends' },
  { value: 'private',      label: '🔒 Private',       desc: 'Only you' },
]

export default function EditRecipe() {
  const { user } = useAuth()
  const { id } = useParams()
  const navigate = useNavigate()
  const fileInputRef = useRef(null)

  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [ingredients, setIngredients] = useState('')
  const [instructions, setInstructions] = useState('')
  const [category, setCategory] = useState('')
  const [coreTemp, setCoreTemp] = useState('')
  const [visibility, setVisibility] = useState('public')

  // existing URL from DB; null if user removes it
  const [currentImageUrl, setCurrentImageUrl] = useState(null)
  // new file selected by user
  const [imageFile, setImageFile] = useState(null)
  // preview: blob URL for new file, existing URL, or null
  const [imagePreview, setImagePreview] = useState(null)
  const [imageError, setImageError] = useState(null)
  const [uploading, setUploading] = useState(false)

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const shouldShowCoreTemp = ['Rund', 'Lam', 'Varken', 'Kip', 'Vis'].includes(category)

  function handleCategoryChange(nextCategory) {
    setCategory(nextCategory)
    const suggestion = CORE_TEMP_BY_CATEGORY[nextCategory]
    setCoreTemp(suggestion === null || suggestion === undefined ? '' : String(suggestion))
  }

  useEffect(() => {
    async function loadRecipe() {
      const { data, error: fetchError } = await supabase
        .from('recipes')
        .select('id, user_id, title, description, ingredients, instructions, image_url, visibility, category, core_temp')
        .eq('id', id)
        .single()

      if (fetchError || !data) { setNotFound(true); setLoading(false); return }
      if (data.user_id !== user?.id) { setNotFound(true); setLoading(false); return }

      setTitle(data.title ?? '')
      setDescription(data.description ?? '')
      setIngredients(data.ingredients ?? '')
      setInstructions(data.instructions ?? '')
      setCategory(data.category ?? '')
      setCoreTemp(data.core_temp != null ? String(data.core_temp) : '')
      setVisibility(data.visibility ?? 'public')
      setCurrentImageUrl(data.image_url ?? null)
      setImagePreview(data.image_url ?? null)
      setLoading(false)
    }
    loadRecipe()
  }, [id, user])

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

    let imageUrl
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
    } else {
      // null = user removed it; otherwise keep existing
      imageUrl = imagePreview === null ? null : currentImageUrl
    }

    const { error: updateError } = await supabase
      .from('recipes')
      .update({
        title:        title.trim(),
        description:  description.trim() || null,
        ingredients:  ingredients.trim() || null,
        instructions: instructions.trim() || null,
        image_url:    imageUrl,
        category:     category || null,
        core_temp:    (coreTemp === '' || coreTemp === null) ? null : Number(coreTemp),
        visibility,
      })
      .eq('id', id)

    if (updateError) {
      setError(updateError.message)
      setSaving(false)
    } else {
      navigate(`/recipes/${id}`)
    }
  }

  const isSubmitting = saving || uploading

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <p className={styles.subtitle}>Loading…</p>
          </div>
        </div>
      </div>
    )
  }

  if (notFound) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <Link to="/recipes" className={styles.backLink}>← Back to My Recipes</Link>
            <h1 className={styles.title}>Recipe not found</h1>
            <p className={styles.subtitle}>This recipe doesn't exist or you don't have permission to edit it.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <Link to={`/recipes/${id}`} className={styles.backLink}>← Back to Recipe</Link>
          <h1 className={styles.title}>Edit Recipe</h1>
          <p className={styles.subtitle}>Update your BBQ masterpiece</p>
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
              onChange={e => handleCategoryChange(e.target.value)}
              required
            >
              <option value="">Select category…</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {shouldShowCoreTemp && (
            <div className={styles.field}>
              <label htmlFor="coreTemp" className={styles.label}>Kerntemperatuur (°C)</label>
              <input
                id="coreTemp"
                type="number"
                min="0"
                step="1"
                className={styles.input}
                value={coreTemp}
                onChange={e => setCoreTemp(e.target.value)}
                placeholder="55"
              />
              <span className={styles.temperatureTip}>🌡️ Aanbevolen kerntemperatuur - pas aan naar wens</span>
            </div>
          )}

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
            <Link to={`/recipes/${id}`} className={styles.cancelBtn}>Cancel</Link>
            <button type="submit" className={styles.submitBtn} disabled={isSubmitting}>
              {uploading ? 'Uploading image…' : saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
