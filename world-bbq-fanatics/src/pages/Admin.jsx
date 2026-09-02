import { useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../supabase'
import styles from './Admin.module.css'

const TAB_ITEMS = [
  { key: 'channels', label: 'Kanalen' },
  { key: 'users', label: 'Gebruikers' },
  { key: 'recipes', label: 'Recepten' },
  { key: 'stats', label: 'Statistieken' },
]

function AdminGuard() {
  const { user, profile, loading } = useAuth()

  if (loading) {
    return (
      <div className={styles.page}>
        <p className={styles.loading}>Adminpaneel laden…</p>
      </div>
    )
  }

  if (!user || !profile?.is_admin) {
    return <Navigate to="/dashboard" replace />
  }

  return <AdminPage />
}

export default AdminGuard

function AdminPage() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('channels')
  const [channels, setChannels] = useState([])
  const [users, setUsers] = useState([])
  const [recipes, setRecipes] = useState([])
  const [channelForm, setChannelForm] = useState({ name: '', description: '' })
  const [editingChannelId, setEditingChannelId] = useState(null)
  const [userSearch, setUserSearch] = useState('')
  const [recipeSearch, setRecipeSearch] = useState('')
  const [stats, setStats] = useState({ users: 0, recipes: 0, flames: 0, messages: 0, chats: 0 })
  const [loading, setLoading] = useState(true)

  const filteredUsers = useMemo(() => {
    const term = userSearch.trim().toLowerCase()
    if (!term) return users
    return users.filter(u => (u.username ?? '').toLowerCase().includes(term))
  }, [users, userSearch])

  const filteredRecipes = useMemo(() => {
    const term = recipeSearch.trim().toLowerCase()
    if (!term) return recipes
    return recipes.filter(r => (r.title ?? '').toLowerCase().includes(term))
  }, [recipes, recipeSearch])

  useEffect(() => {
    loadAdminData()
  }, [])

  async function loadAdminData() {
    setLoading(true)

    const [channelsRes, profilesRes, recipesRes, usersCountRes, recipesCountRes, flamesCountRes, messagesCountRes, chatsCountRes] = await Promise.all([
      supabase.from('channels').select('id, name, description, created_at').order('created_at', { ascending: false }),
      supabase.from('profiles').select('id, username, email, skill_level, created_at, is_admin').order('created_at', { ascending: false }),
      supabase
        .from('recipes')
        .select('id, title, category, visibility, user_id, created_at, flames(id), profiles(username)')
        .eq('visibility', 'public')
        .order('created_at', { ascending: false }),
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('recipes').select('*', { count: 'exact', head: true }),
      supabase.from('flames').select('*', { count: 'exact', head: true }),
      supabase.from('channel_messages').select('*', { count: 'exact', head: true }),
      supabase.from('private_rooms').select('*', { count: 'exact', head: true }),
    ])

    setChannels(channelsRes.data ?? [])
    setUsers(profilesRes.data ?? [])
    setRecipes(recipesRes.data ?? [])
    setStats({
      users: usersCountRes.count ?? 0,
      recipes: recipesCountRes.count ?? 0,
      flames: flamesCountRes.count ?? 0,
      messages: messagesCountRes.count ?? 0,
      chats: chatsCountRes.count ?? 0,
    })
    setLoading(false)
  }

  async function handleChannelSubmit(e) {
    e.preventDefault()
    const name = channelForm.name.trim()
    const description = channelForm.description.trim()

    if (!name) return

    if (editingChannelId) {
      const { error } = await supabase
        .from('channels')
        .update({ name, description })
        .eq('id', editingChannelId)

      if (error) {
        alert(error.message)
        return
      }
    } else {
      const { error } = await supabase
        .from('channels')
        .insert({ name, description })

      if (error) {
        alert(error.message)
        return
      }
    }

    setChannelForm({ name: '', description: '' })
    setEditingChannelId(null)
    loadAdminData()
  }

  function editChannel(channel) {
    setEditingChannelId(channel.id)
    setChannelForm({ name: channel.name, description: channel.description ?? '' })
    setActiveTab('channels')
  }

  async function deleteChannel(channelId) {
    if (!window.confirm('Weet je zeker dat je dit kanaal wilt verwijderen?')) return

    const { error } = await supabase.from('channels').delete().eq('id', channelId)
    if (error) {
      alert(error.message)
      return
    }

    setChannels(prev => prev.filter(channel => channel.id !== channelId))
  }

  async function toggleAdmin(userId, currentValue) {
    const { error } = await supabase
      .from('profiles')
      .update({ is_admin: !currentValue })
      .eq('id', userId)

    if (error) {
      alert(error.message)
      return
    }

    setUsers(prev => prev.map(item => item.id === userId ? { ...item, is_admin: !currentValue } : item))
    if (user?.id === userId) {
      window.location.reload()
    }
  }

  async function deleteRecipe(recipeId) {
    if (!window.confirm('Weet je zeker dat je dit recept wilt verwijderen?')) return

    const { error } = await supabase.from('recipes').delete().eq('id', recipeId)
    if (error) {
      alert(error.message)
      return
    }

    setRecipes(prev => prev.filter(recipe => recipe.id !== recipeId))
  }

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <div className={styles.header}>
          <div>
            <p className={styles.eyebrow}>Admin</p>
            <h1 className={styles.title}>World BBQ Fanatics beheer</h1>
          </div>
        </div>

        <div className={styles.tabBar}>
          {TAB_ITEMS.map(tab => (
            <button
              key={tab.key}
              type="button"
              className={`${styles.tabButton} ${activeTab === tab.key ? styles.tabButtonActive : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'channels' && (
          <div className={styles.section}>
            <form onSubmit={handleChannelSubmit} className={styles.channelForm}>
              <h2 className={styles.sectionTitle}>{editingChannelId ? 'Kanaal bewerken' : 'Nieuw kanaal aanmaken'}</h2>
              <div className={styles.formGrid}>
                <label className={styles.field}>
                  <span>Naam</span>
                  <input
                    value={channelForm.name}
                    onChange={e => setChannelForm(prev => ({ ...prev, name: e.target.value }))}
                    className={styles.input}
                    placeholder="Bijv. Backyard Tips"
                  />
                </label>

                <label className={styles.field}>
                  <span>Beschrijving</span>
                  <textarea
                    value={channelForm.description}
                    onChange={e => setChannelForm(prev => ({ ...prev, description: e.target.value }))}
                    className={styles.textarea}
                    rows={3}
                    placeholder="Korte beschrijving van het kanaal"
                  />
                </label>
              </div>

              <div className={styles.formActions}>
                {editingChannelId && (
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={() => {
                      setEditingChannelId(null)
                      setChannelForm({ name: '', description: '' })
                    }}
                  >
                    Annuleren
                  </button>
                )}
                <button type="submit" className={styles.primaryButton}>
                  {editingChannelId ? 'Opslaan' : 'Kanaal toevoegen'}
                </button>
              </div>
            </form>

            <div className={styles.listWrap}>
              {channels.map(channel => (
                <div key={channel.id} className={styles.listCard}>
                  <div>
                    <h3 className={styles.cardTitle}>{channel.name}</h3>
                    <p className={styles.cardText}>{channel.description || 'Geen beschrijving'}</p>
                  </div>
                  <div className={styles.cardActions}>
                    <button type="button" className={styles.secondaryButton} onClick={() => editChannel(channel)}>
                      Bewerken
                    </button>
                    <button type="button" className={styles.dangerButton} onClick={() => deleteChannel(channel.id)}>
                      Verwijderen
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className={styles.section}>
            <div className={styles.toolbar}>
              <div className={styles.searchBox}>
                <span>🔎</span>
                <input
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                  placeholder="Zoek gebruiker"
                  className={styles.searchInput}
                />
              </div>
              <div className={styles.metaPill}>Totaal: {users.length}</div>
            </div>

            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Gebruiker</th>
                    <th>E-mail</th>
                    <th>Skill</th>
                    <th>Lid sinds</th>
                    <th>Admin</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map(profile => (
                    <tr key={profile.id}>
                      <td>{profile.username}</td>
                      <td>{profile.email || '—'}</td>
                      <td>{profile.skill_level || '—'}</td>
                      <td>{profile.created_at ? new Date(profile.created_at).toLocaleDateString('nl-NL') : '—'}</td>
                      <td>
                        <button
                          type="button"
                          className={`${styles.toggleButton} ${profile.is_admin ? styles.toggleButtonOn : ''}`}
                          onClick={() => toggleAdmin(profile.id, !!profile.is_admin)}
                        >
                          {profile.is_admin ? 'Aan' : 'Uit'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'recipes' && (
          <div className={styles.section}>
            <div className={styles.toolbar}>
              <div className={styles.searchBox}>
                <span>🔎</span>
                <input
                  value={recipeSearch}
                  onChange={e => setRecipeSearch(e.target.value)}
                  placeholder="Zoek recept"
                  className={styles.searchInput}
                />
              </div>
            </div>

            <div className={styles.listWrap}>
              {filteredRecipes.map(recipe => (
                <div key={recipe.id} className={styles.listCard}>
                  <div>
                    <h3 className={styles.cardTitle}>{recipe.title}</h3>
                    <p className={styles.cardMetaLine}>
                      Auteur: {recipe.profiles?.username || 'Onbekend'} · Categorie: {recipe.category || '—'} · Flames: {recipe.flames?.length ?? 0}
                    </p>
                  </div>
                  <div className={styles.cardActions}>
                    <button type="button" className={styles.dangerButton} onClick={() => deleteRecipe(recipe.id)}>
                      Verwijderen
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'stats' && (
          <div className={styles.section}>
            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <span className={styles.statIcon}>👥</span>
                <div>
                  <p className={styles.statLabel}>Gebruikers</p>
                  <strong className={styles.statValue}>{stats.users}</strong>
                </div>
              </div>

              <div className={styles.statCard}>
                <span className={styles.statIcon}>🍖</span>
                <div>
                  <p className={styles.statLabel}>Recepten</p>
                  <strong className={styles.statValue}>{stats.recipes}</strong>
                </div>
              </div>

              <div className={styles.statCard}>
                <span className={styles.statIcon}>🔥</span>
                <div>
                  <p className={styles.statLabel}>Flames</p>
                  <strong className={styles.statValue}>{stats.flames}</strong>
                </div>
              </div>

              <div className={styles.statCard}>
                <span className={styles.statIcon}>💬</span>
                <div>
                  <p className={styles.statLabel}>Kanaalberichten</p>
                  <strong className={styles.statValue}>{stats.messages}</strong>
                </div>
              </div>

              <div className={styles.statCard}>
                <span className={styles.statIcon}>🔒</span>
                <div>
                  <p className={styles.statLabel}>Privé chats</p>
                  <strong className={styles.statValue}>{stats.chats}</strong>
                </div>
              </div>
            </div>
          </div>
        )}

        {loading && activeTab === 'channels' && <p className={styles.loading}>Laden…</p>}
      </div>
    </div>
  )
}
