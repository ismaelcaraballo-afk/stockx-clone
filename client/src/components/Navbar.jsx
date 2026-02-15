import { Link, useNavigate } from 'react-router-dom'
import styles from './Navbar.module.css'

export default function Navbar() {
  const user = JSON.parse(localStorage.getItem('user') || 'null')
  const navigate = useNavigate()

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/')
    window.location.reload()
  }

  return (
    <nav className={styles.nav}>
      <Link to="/" className={styles.logo}>StockX Clone</Link>
      <div className={styles.links}>
        <Link to="/">Browse</Link>
        {user ? (
          <>
            <Link to="/sell" className={styles.sellLink}>Sell</Link>
            <Link to="/dashboard">Dashboard</Link>
            <span className={styles.user}>{user.username}</span>
            <button onClick={handleLogout} className={styles.logoutBtn}>Logout</button>
          </>
        ) : (
          <Link to="/login">Login</Link>
        )}
      </div>
    </nav>
  )
}
