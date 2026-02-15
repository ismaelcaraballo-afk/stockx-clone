import { useState, useEffect } from 'react'
import api from '../api.js'
import ProductCard from '../components/ProductCard.jsx'
import SearchBar from '../components/SearchBar.jsx'
import styles from './Home.module.css'

export default function Home() {
  const [products, setProducts] = useState([])
  const [search, setSearch] = useState('')
  const [brand, setBrand] = useState('')

  useEffect(() => {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (brand) params.set('brand', brand)
    api.get(`/api/products?${params}`).then((res) => setProducts(res.data))
  }, [search, brand])

  const brands = ['All', 'Nike', 'Adidas', 'New Balance']

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>Browse Sneakers</h1>
        <SearchBar onSearch={setSearch} />
      </div>
      <div className={styles.filters}>
        {brands.map((b) => (
          <button
            key={b}
            className={`${styles.filterBtn} ${(b === 'All' ? '' : b) === brand ? styles.active : ''}`}
            onClick={() => setBrand(b === 'All' ? '' : b)}
          >
            {b}
          </button>
        ))}
      </div>
      <div className={styles.grid}>
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
      {products.length === 0 && <p className={styles.empty}>No sneakers found.</p>}
    </div>
  )
}
