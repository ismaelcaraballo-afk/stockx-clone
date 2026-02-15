import { useState } from 'react'
import styles from './SearchBar.module.css'

export default function SearchBar({ onSearch }) {
  const [query, setQuery] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    onSearch(query)
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <input
        type="text"
        placeholder="Search sneakers..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className={styles.input}
      />
      <button type="submit" className={styles.btn}>Search</button>
    </form>
  )
}
