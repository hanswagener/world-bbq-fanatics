import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import { useAuth } from '../context/AuthContext'
import styles from './Navbar.module.css'

const NAV_LINKS = [
  { to: '/dashboard',  label: 'Feed' },
  { to: '/recipes',    label: 'Recipes' },
  { to: '/community',  label: 'Community' },
  { to: '/chat',       label: 'Chat' },
]

function Avatar({ profile, size = 32 }) {
  const style = { width: size, height: size, fontSize: size * 0.4 }
  if (profile?.avatar_url) {
    return <img src={profile.avatar_url} className={styles.avatarImg} style={style} alt="" />
  }
  return (
    <span className={styles.avatarInitials} style={style}>
      {profile?.username?.[0]?.toUpperCase() ?? '?'}
    </span>
  )
}

export default function Navbar() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    function onOutsideClick(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', onOutsideClick)
    return () => document.removeEventListener('mousedown', onOutsideClick)
  }, [])

  async function handleSignOut() {
    setDropdownOpen(false)
    setMobileOpen(false)
    await supabase.auth.signOut()
    navigate('/login')
  }

  function closeMobile() {
    setMobileOpen(false)
  }

  return (
    <nav className={styles.nav}>
      <div className={styles.inner}>

        {/* Brand */}
        <NavLink to="/dashboard" className={styles.brand}>
          <span className={styles.brandFlame}>🔥</span>
          <span className={styles.brandText}>World BBQ Fanatics</span>
        </NavLink>

        {/* Desktop nav links */}
        <div className={styles.links}>
          {NAV_LINKS.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `${styles.link} ${isActive ? styles.linkActive : ''}`
              }
            >
              {label}
            </NavLink>
          ))}
        </div>

        {/* Search icon */}
        <Link to="/search" className={styles.searchLink} aria-label="Search">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
        </Link>

        {/* Right: user dropdown + hamburger */}
        <div className={styles.right}>

          {/* User dropdown (desktop) */}
          <div className={styles.userMenu} ref={dropdownRef}>
            <button
              className={styles.userBtn}
              onClick={() => setDropdownOpen(v => !v)}
              aria-haspopup="true"
              aria-expanded={dropdownOpen}
            >
              <Avatar profile={profile} size={30} />
              <span className={styles.userName}>{profile?.username ?? '…'}</span>
              <svg
                className={`${styles.chevron} ${dropdownOpen ? styles.chevronOpen : ''}`}
                width="10" height="6" viewBox="0 0 10 6" fill="none"
              >
                <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>

            {dropdownOpen && (
              <div className={styles.dropdown}>
                <NavLink to="/profile/me" className={styles.dropItem} onClick={() => setDropdownOpen(false)}>My Profile</NavLink>
                <NavLink to="/recipes" className={styles.dropItem} onClick={() => setDropdownOpen(false)}>My Recipes</NavLink>
                <NavLink to="/settings"   className={styles.dropItem} onClick={() => setDropdownOpen(false)}>Settings</NavLink>
                <div className={styles.dropDivider} />
                <button className={styles.dropItemDanger} onClick={handleSignOut}>Sign Out</button>
              </div>
            )}
          </div>

          {/* Hamburger (mobile) */}
          <button
            className={styles.hamburger}
            onClick={() => setMobileOpen(v => !v)}
            aria-label="Toggle navigation"
          >
            <span className={`${styles.bar} ${mobileOpen ? styles.barTopOpen : ''}`} />
            <span className={`${styles.bar} ${mobileOpen ? styles.barMidOpen : ''}`} />
            <span className={`${styles.bar} ${mobileOpen ? styles.barBotOpen : ''}`} />
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <div className={`${styles.mobileMenu} ${mobileOpen ? styles.mobileMenuOpen : ''}`}>
        {NAV_LINKS.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `${styles.mobileLink} ${isActive ? styles.mobileLinkActive : ''}`
            }
            onClick={closeMobile}
          >
            {label}
          </NavLink>
        ))}
        <div className={styles.mobileDivider} />
        <div className={styles.mobileUser}>
          <Avatar profile={profile} size={28} />
          <span className={styles.mobileUsername}>{profile?.username ?? '…'}</span>
        </div>
        <NavLink to="/profile/me" className={styles.mobileLink} onClick={closeMobile}>My Profile</NavLink>
        <NavLink to="/recipes" className={styles.mobileLink} onClick={closeMobile}>My Recipes</NavLink>
        <NavLink to="/settings"   className={styles.mobileLink} onClick={closeMobile}>Settings</NavLink>
        <button className={styles.mobileSignOut} onClick={handleSignOut}>Sign Out</button>
      </div>
    </nav>
  )
}
