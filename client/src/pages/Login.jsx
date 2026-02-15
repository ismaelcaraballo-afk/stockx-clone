import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import axios from 'axios'
import styles from './Login.module.css'

export default function Login() {
  const [isSignup, setIsSignup] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
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
      <div className={styles.card}>
        {expired && <p className={styles.expired}>Your session expired. Please log in again.</p>}
        <h1>{isSignup ? 'Sign Up' : 'Log In'}</h1>
        <form onSubmit={handleSubmit} className={styles.form}>
          <input type="text" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} required className={styles.input} />
          <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={4} className={styles.input} />
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
