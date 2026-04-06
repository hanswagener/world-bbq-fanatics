import styles from './Placeholder.module.css'

export default function Chat() {
  return (
    <div className={styles.page}>
      <span className={styles.icon}>🔒</span>
      <h1 className={styles.title}>Chat</h1>
      <p className={styles.text}>Private rooms with fellow pitmasters. Coming soon.</p>
    </div>
  )
}
