import { useRef, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
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
const DONENESS_OPTIONS = {
  Rund: [
    { value: 'Rauw (Blue)', temp: 45 },
    { value: 'Bloedig (Rare)', temp: 50 },
    { value: 'Half doorbakken (Medium Rare)', temp: 55 },
    { value: 'Rosé (Medium)', temp: 60 },
    { value: 'Bijna doorbakken (Medium Well)', temp: 65 },
    { value: 'Doorbakken (Well Done)', temp: 70 },
  ],
  Lam: [
    { value: 'Rauw (Blue)', temp: 45 },
    { value: 'Bloedig (Rare)', temp: 50 },
    { value: 'Half doorbakken (Medium Rare)', temp: 55 },
    { value: 'Rosé (Medium)', temp: 60 },
    { value: 'Bijna doorbakken (Medium Well)', temp: 65 },
    { value: 'Doorbakken (Well Done)', temp: 70 },
  ],
  Varken: [
    { value: 'Rosé (Medium)', temp: 65 },
    { value: 'Doorbakken (Well Done)', temp: 70 },
  ],
}
const FIXED_DONENESS = { Kip: 'Gaar', Vis: 'Gaar' }

const VISIBILITY_OPTIONS = [
  { value: 'public',       label: '🌍 Public',       desc: 'Visible to everyone' },
  { value: 'friends_only', label: '👥 Friends Only',  desc: 'Only your friends' },
  { value: 'private',      label: '🔒 Private',       desc: 'Only you' },
]
const WOOD_OPTIONS = ['Eiken', 'Appel', 'Kers', 'Hickory', 'Mesquite', 'Els', 'Peer']

function emptyIngredient() {
  return { amount: '', name: '' }
}

function emptyStep() {
  return ''
}

function emptyTip() {
  return ''
}

export default function NewRecipe() {
  const { user } = useAuth()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const fileInputRef = useRef(null)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [prepTime, setPrepTime] = useState('')
  const [smokeHours, setSmokeHours] = useState('')
  const [smokeMinutes, setSmokeMinutes] = useState('')
  const [servings, setServings] = useState('')
  const [difficulty, setDifficulty] = useState('')
  const [ingredients, setIngredients] = useState([emptyIngredient(), emptyIngredient(), emptyIngredient()])
  const [instructions, setInstructions] = useState([emptyStep(), emptyStep(), emptyStep()])
  const [tips, setTips] = useState([emptyTip(), emptyTip()])
  const [woodType, setWoodType] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [imageError, setImageError] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [category, setCategory] = useState('')
  const [coreTemp, setCoreTemp] = useState('')
  const [doneness, setDoneness] = useState('')
  const [visibility, setVisibility] = useState('public')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const shouldShowCoreTemp = ['Rund', 'Lam', 'Varken', 'Kip', 'Vis'].includes(category)

  function handleCategoryChange(nextCategory) {
    setCategory(nextCategory)
    const suggestion = CORE_TEMP_BY_CATEGORY[nextCategory]
    const nextTemp = suggestion === null || suggestion === undefined ? '' : String(suggestion)
    setCoreTemp(nextTemp)
    setDoneness(FIXED_DONENESS[nextCategory] ?? findClosestDoneness(nextCategory, Number(nextTemp)))
  }

  function findClosestDoneness(nextCategory, temperature) {
    const options = DONENESS_OPTIONS[nextCategory]
    if (!options || !Number.isFinite(temperature)) return ''
    return options.reduce((closest, option) =>
      Math.abs(option.temp - temperature) < Math.abs(closest.temp - temperature) ? option : closest
    ).value
  }

  function handleCoreTempChange(nextTemp) {
    setCoreTemp(nextTemp)
    if (FIXED_DONENESS[category]) return
    setDoneness(findClosestDoneness(category, Number(nextTemp)))
  }

  function handleDonenessChange(nextDoneness) {
    setDoneness(nextDoneness)
    const option = DONENESS_OPTIONS[category]?.find(item => item.value === nextDoneness)
    if (option) setCoreTemp(String(option.temp))
  }

  function updateIngredient(index, field, value) {
    setIngredients(current => current.map((ingredient, itemIndex) =>
      itemIndex === index ? { ...ingredient, [field]: value } : ingredient
    ))
  }

  function updateListItem(setList, index, value) {
    setList(current => current.map((item, itemIndex) => itemIndex === index ? value : item))
  }

  function removeListItem(setList, index) {
    setList(current => current.filter((_, itemIndex) => itemIndex !== index))
  }

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
      ingredients:  ingredients
        .filter(item => item.amount.trim() || item.name.trim())
        .map(item => `${item.amount.trim()} ${item.name.trim()}`.trim())
        .join('\n') || null,
      instructions: instructions.filter(step => step.trim()).map((step, index) => `${index + 1}. ${step.trim()}`).join('\n') || null,
      prep_time: prepTime === '' ? null : Number(prepTime),
      smoke_time_hours: smokeHours === '' ? null : Number(smokeHours),
      smoke_time_minutes: smokeMinutes === '' ? null : Number(smokeMinutes),
      servings: servings === '' ? null : Number(servings),
      difficulty: difficulty || null,
      tips: tips.filter(tip => tip.trim()).map(tip => tip.trim()).join('\n') || null,
      wood_type: woodType.trim() || null,
      image_url:    imageUrl,
      category:     category || null,
      core_temp:    (coreTemp === '' || coreTemp === null) ? null : Number(coreTemp),
      doneness:     doneness || null,
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
          <Link to="/recipes" className={styles.backLink}>← {t('nav.myRecipes')}</Link>
          <h1 className={styles.title}>{t('recipe.addRecipe')}</h1>
          <p className={styles.subtitle}>{t('dashboard.shareSecrets')}</p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          {/* Title */}
          <div className={styles.field}>
            <label htmlFor="title" className={styles.label}>
              {t('recipe.title')} <span className={styles.required}>*</span>
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
            <label htmlFor="description" className={styles.label}>{t('recipe.description')}</label>
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
              {t('recipe.category')} <span className={styles.required}>*</span>
            </label>
            <select
              id="category"
              className={styles.select}
              value={category}
              onChange={e => handleCategoryChange(e.target.value)}
              required
            >
              <option value="">{t('recipe.selectCategory')}</option>
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
                onChange={e => handleCoreTempChange(e.target.value)}
                readOnly={Boolean(FIXED_DONENESS[category])}
                placeholder="55"
              />
              <label htmlFor="doneness" className={styles.label}>Gaarheid</label>
              {DONENESS_OPTIONS[category] ? (
                <select
                  id="doneness"
                  className={styles.select}
                  value={doneness}
                  onChange={e => handleDonenessChange(e.target.value)}
                >
                  {DONENESS_OPTIONS[category].map(option => (
                    <option key={option.value} value={option.value}>{option.value}</option>
                  ))}
                </select>
              ) : (
                <span className={styles.temperatureTip}>Gaar</span>
              )}
            </div>
          )}

          {/* Image Upload */}
          <div className={styles.field}>
            <span className={styles.label}>{t('recipe.recipeImage')}</span>
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
                    {t('recipe.changeImage')}
                  </button>
                  <button
                    type="button"
                    className={styles.removeImageBtn}
                    onClick={handleRemoveImage}
                  >
                    {t('recipe.remove')}
                  </button>
                </div>
              </div>
            ) : (
              <label htmlFor="imageFile" className={styles.uploadArea}>
                <span className={styles.uploadIcon}>📷</span>
                <span className={styles.uploadText}>{t('recipe.clickImage')}</span>
                <span className={styles.uploadHint}>{t('recipe.uploadHint')}</span>
              </label>
            )}
            <p className={styles.photoTip}>{t('photoTip')}</p>
            {imageError && <p className={styles.imageError}>{imageError}</p>}
            {uploading && (
              <div className={styles.progressBar}>
                <div className={styles.progressBarFill} />
              </div>
            )}
          </div>

          {/* Ingredients */}
          <div className={styles.field}>
            <label htmlFor="ingredients" className={styles.label}>{t('recipe.ingredients')}</label>
            <div className={styles.sectionTitle}>RECEPT INFORMATIE</div>
            <div className={styles.infoGrid}>
              <div className={styles.field}>
                <label htmlFor="prepTime" className={styles.label}>Bereidingstijd (minuten)</label>
                <input id="prepTime" type="number" min="0" className={styles.input} value={prepTime} onChange={e => setPrepTime(e.target.value)} />
              </div>
              <div className={styles.field}>
                <label htmlFor="smokeHours" className={styles.label}>Rooktijd/Griltijd (uur)</label>
                <input id="smokeHours" type="number" min="0" className={styles.input} value={smokeHours} onChange={e => setSmokeHours(e.target.value)} />
              </div>
              <div className={styles.field}>
                <label htmlFor="smokeMinutes" className={styles.label}>Rooktijd/Griltijd (minuten)</label>
                <input id="smokeMinutes" type="number" min="0" max="59" className={styles.input} value={smokeMinutes} onChange={e => setSmokeMinutes(e.target.value)} />
              </div>
              <div className={styles.field}>
                <label htmlFor="servings" className={styles.label}>Aantal personen</label>
                <input id="servings" type="number" min="1" className={styles.input} value={servings} onChange={e => setServings(e.target.value)} />
              </div>
              <div className={styles.field}>
                <label htmlFor="difficulty" className={styles.label}>Moeilijkheidsgraad</label>
                <select id="difficulty" className={styles.select} value={difficulty} onChange={e => setDifficulty(e.target.value)}>
                  <option value="">Selecteer moeilijkheid</option>
                  <option value="Makkelijk">Makkelijk</option>
                  <option value="Gemiddeld">Gemiddeld</option>
                  <option value="Moeilijk">Moeilijk</option>
                </select>
              </div>
            </div>

            <div className={styles.sectionTitle}>INGREDIËNTEN</div>
            {ingredients.map((ingredient, index) => (
              <div className={styles.dynamicRow} key={`ingredient-${index}`}>
                <input
                  className={styles.input}
                  value={ingredient.amount}
                  onChange={e => updateIngredient(index, 'amount', e.target.value)}
                  placeholder="Hoeveelheid"
                  aria-label={`Hoeveelheid ingrediënt ${index + 1}`}
                />
                <input
                  className={styles.input}
                  value={ingredient.name}
                  onChange={e => updateIngredient(index, 'name', e.target.value)}
                  placeholder="Ingrediënt"
                  aria-label={`Ingrediënt ${index + 1}`}
                />
                <button type="button" className={styles.removeBtn} onClick={() => removeListItem(setIngredients, index)} aria-label={`Ingrediënt ${index + 1} verwijderen`}>×</button>
              </div>
            ))}
            <button type="button" className={styles.addBtn} onClick={() => setIngredients(current => [...current, emptyIngredient()])}>+ Ingrediënt toevoegen</button>
          </div>

          {/* Instructions */}
          <div className={styles.field}>
            <label htmlFor="instructions" className={styles.label}>{t('recipe.instructions')}</label>
            <div className={styles.sectionTitle}>BEREIDINGSWIJZE</div>
            {instructions.map((step, index) => (
              <div className={styles.dynamicRow} key={`step-${index}`}>
                <span className={styles.stepNumber}>{index + 1}</span>
                <textarea
                  className={styles.textarea}
                  value={step}
                  onChange={e => updateListItem(setInstructions, index, e.target.value)}
                  placeholder={`Stap ${index + 1}`}
                  rows={2}
                  aria-label={`Bereidingsstap ${index + 1}`}
                />
                <button type="button" className={styles.removeBtn} onClick={() => removeListItem(setInstructions, index)} aria-label={`Stap ${index + 1} verwijderen`}>×</button>
              </div>
            ))}
            <button type="button" className={styles.addBtn} onClick={() => setInstructions(current => [...current, emptyStep()])}>+ Stap toevoegen</button>
          </div>

          {/* Tips and wood recommendation */}
          <div className={styles.field}>
            <div className={styles.sectionTitle}>TIPS &amp; TRICKS</div>
            {tips.map((tip, index) => (
              <div className={styles.dynamicRow} key={`tip-${index}`}>
                <input
                  className={styles.input}
                  value={tip}
                  onChange={e => updateListItem(setTips, index, e.target.value)}
                  placeholder={`Tip ${index + 1}`}
                  aria-label={`Tip ${index + 1}`}
                />
                <button type="button" className={styles.removeBtn} onClick={() => removeListItem(setTips, index)} aria-label={`Tip ${index + 1} verwijderen`}>×</button>
              </div>
            ))}
            <button type="button" className={styles.addBtn} onClick={() => setTips(current => [...current, emptyTip()])}>+ Tip toevoegen</button>
          </div>

          <div className={styles.field}>
            <label htmlFor="woodType" className={styles.label}>HOUT/BRANDSTOF AANBEVELING</label>
            <input id="woodType" list="wood-options" className={styles.input} value={woodType} onChange={e => setWoodType(e.target.value)} placeholder="Aanbevolen houtsoort" />
            <datalist id="wood-options">
              {WOOD_OPTIONS.map(wood => <option key={wood} value={wood} />)}
            </datalist>
          </div>

          {/* Visibility */}
          <div className={styles.field}>
            <span className={styles.label}>{t('recipe.visibility')}</span>
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
            <Link to="/recipes" className={styles.cancelBtn}>{t('recipe.cancel')}</Link>
            <button type="submit" className={styles.submitBtn} disabled={isSubmitting}>
              {uploading ? t('recipe.uploading') : saving ? t('common.loading') : t('recipe.saveRecipe')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
