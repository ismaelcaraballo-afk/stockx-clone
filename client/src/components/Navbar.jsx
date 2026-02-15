import { Link } from 'react-router-dom'
import styles from './Navbar.module.css'

export default function Navbar() {
  const user = JSON.parse(localStorage.getItem('user') || 'null')

  return (
    <nav className={styles.nav}>
      <Link to="/" className={styles.logo}>StockX Clone</Link>
      <div className={styles.links}>
        <Link to="/">Browse</Link>
        {user ? (
          <>
            <Link to="/dashboard">Dashboard</Link>
            <span className={styles.user}>{user.username}</span>
          </>
        ) : (
          <Link to="/login">Login</Link>
        )}
      </div>
    </nav>
  )
}
