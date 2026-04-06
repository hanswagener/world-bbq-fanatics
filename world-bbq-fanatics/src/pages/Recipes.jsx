import styles from './Placeholder.module.css'

export default function Recipes() {
  return (
    <div className={styles.page}>
      <span className={styles.icon}>📖</span>
      <h1 className={styles.title}>Recipes</h1>
      <p className={styles.text}>Browse and share your BBQ recipes. Coming soon.</p>
    </div>
  )
}
