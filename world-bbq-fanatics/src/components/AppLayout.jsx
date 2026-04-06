import { Outlet } from 'react-router-dom'
import { AuthProvider, useAuth } from '../context/AuthContext'
import Navbar from './Navbar'
import styles from './AppLayout.module.css'

function Layout() {
  const { loading } = useAuth()

  if (loading) {
    return (
      <div className={styles.loadingPage}>
        <span className={styles.loadingFlame}>🔥</span>
        <p className={styles.loadingText}>Firing up the pit…</p>
      </div>
    )
  }

  return (
    <div className={styles.layout}>
      <Navbar />
      <main className={styles.content}>
        <Outlet />
      </main>
    </div>
  )
}

export default function AppLayout() {
  return (
    <AuthProvider>
      <Layout />
    </AuthProvider>
  )
}
