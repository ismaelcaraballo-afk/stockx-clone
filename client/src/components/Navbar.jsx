import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import styles from './Navbar.module.css'

export default function Navbar() {
  const user = JSON.parse(localStorage.getItem('user') || 'null')
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/')
    window.location.reload()
  }

  const closeMenu = () => setMenuOpen(false)

  return (
    <nav className={styles.nav}>
      <Link to="/" className={styles.logo}>StockX</Link>

      <button
        className={`${styles.hamburger} ${menuOpen ? styles.hamburgerOpen : ''}`}
        onClick={() => setMenuOpen(!menuOpen)}
        aria-label="Toggle menu"
      >
        <span />
        <span />
        <span />
      </button>

      <div className={`${styles.links} ${menuOpen ? styles.linksOpen : ''}`}>
        <Link to="/" onClick={closeMenu}>Browse</Link>
        {user ? (
          <>
            <Link to="/sell" className={styles.sellLink} onClick={closeMenu}>Sell</Link>
            <Link to="/dashboard" onClick={closeMenu}>Dashboard</Link>
            <span className={styles.user}>{user.username}</span>
            <button onClick={() => { handleLogout(); closeMenu() }} className={styles.logoutBtn}>Logout</button>
          </>
        ) : (
          <Link to="/login" onClick={closeMenu}>Login</Link>
        )}
      </div>

      {menuOpen && <div className={styles.overlay} onClick={closeMenu} />}
    </nav>
  )
}
