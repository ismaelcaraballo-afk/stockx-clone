import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import axios from 'axios'
import styles from './Login.module.css'

export default function Login() {
  const [isSignup, setIsSignup] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState(null)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const expired = searchParams.get('expired')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    try {
      const endpoint = isSignup ? '/api/auth/signup' : '/api/auth/login'
      const res = await axios.post(endpoint, { username, password })
      localStorage.setItem('token', res.data.token)
      localStorage.setItem('user', JSON.stringify(res.data.user))
      navigate('/')
      window.location.reload()
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong')
    }
  }

  return (
    <div className={styles.page}>
      <Link to="/" className={styles.logo}>StockX</Link>
      <div className={styles.card}>
        {expired && <p className={styles.expired}>Your session expired. Please log in again.</p>}
        <div className={styles.tabs}>
          <button type="button" className={`${styles.tab} ${!isSignup ? styles.tabActive : ''}`} onClick={() => setIsSignup(false)}>Log In</button>
          <button type="button" className={`${styles.tab} ${isSignup ? styles.tabActive : ''}`} onClick={() => setIsSignup(true)}>Sign Up</button>
        </div>
        <h1>{isSignup ? 'Create Account' : 'Welcome Back'}</h1>
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label>Username</label>
            <input type="text" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} required className={styles.input} />
          </div>
          <div className={styles.field}>
            <label>Password</label>
            <div className={styles.passwordWrap}>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={4}
                className={styles.input}
              />
              <button type="button" className={styles.eyeBtn} onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                {showPassword ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                )}
              </button>
            </div>
          </div>
          {error && <p className={styles.error}>{error}</p>}
          <button type="submit" className={styles.btn}>{isSignup ? 'Sign Up' : 'Log In'}</button>
        </form>
        <p className={styles.toggle}>
          {isSignup ? 'Already have an account?' : "Don't have an account?"}
          <button onClick={() => setIsSignup(!isSignup)} className={styles.toggleBtn}>{isSignup ? 'Log In' : 'Sign Up'}</button>
        </p>
      </div>
    </div>
  )
}
