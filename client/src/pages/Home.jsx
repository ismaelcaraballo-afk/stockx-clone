import { useState, useEffect } from 'react'
import api from '../api.js'
import ProductCard from '../components/ProductCard.jsx'
import ProductSlider from '../components/ProductSlider.jsx'
import SearchBar from '../components/SearchBar.jsx'
import { CardGridSkeleton } from '../components/Skeleton.jsx'
import clothingData from '../data/clothing.json'
import shoesData from '../data/shoes.json'
import styles from './Home.module.css'

function shoesToProducts(arr) {
  if (!Array.isArray(arr)) return []
  return arr.map((s) => ({
    id: s.slug || s.src,
    image_url: s.src,
    name: s.name || '',
    brand: s.brand || '—',
    size: '—',
    retail_price: '—',
  }))
}

const FALLBACK_PRODUCTS = shoesToProducts(shoesData.ALL || [])

export default function Home() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [useFallback, setUseFallback] = useState(false)
  const [search, setSearch] = useState('')
  const [brand, setBrand] = useState('')
  const [sort, setSort] = useState('')

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (brand) params.set('brand', brand)
    if (sort) params.set('sort', sort)
    api
      .get(`/api/products?${params}`)
      .then((res) => {
        setProducts(res.data || [])
        setUseFallback(false)
        setLoading(false)
      })
      .catch(() => {
        const brandKey = { All: 'ALL', Nike: 'NIKE', Adidas: 'ADIDAS', 'New Balance': 'NEWBALANCE' }[brand] || 'ALL'
        const arr = shoesData[brandKey] || shoesData.ALL || []
        let list = shoesToProducts(arr)
        if (list.length === 0) list = FALLBACK_PRODUCTS
        if (search) {
          const q = search.toLowerCase()
          list = list.filter((p) => (p.name && p.name.toLowerCase().includes(q)) || (p.brand && p.brand.toLowerCase().includes(q)))
        }
        setProducts(list)
        setUseFallback(true)
        setLoading(false)
      })
  }, [search, brand, sort])

  const brands = ['All', 'Nike', 'Adidas', 'New Balance', 'Converse', 'Vans', 'Puma', 'ASICS']

  const clearFilters = () => {
    setSearch('')
    setBrand('')
    setSort('')
  }

  // Build clothing slider items from Michael's data
  const clothingItems = Array.isArray(clothingData)
    ? clothingData.filter((item) => (item.src || '').startsWith('/Clothing/'))
    : []

  return (
    <div className={styles.page}>
      {useFallback && (
        <p className={styles.offlineBanner}>Backend offline — showing local catalog. When your pair’s API is running, real products will load here.</p>
      )}
      <div className={styles.header}>
        <h1>Browse Sneakers</h1>
        <SearchBar onSearch={setSearch} />
      </div>
      <div className={styles.filterRow}>
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
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className={styles.sortSelect}
        >
          <option value="">Newest</option>
          <option value="price_asc">Price: Low to High</option>
          <option value="price_desc">Price: High to Low</option>
        </select>
      </div>
      {!loading && <p className={styles.count}>{products.length} result{products.length !== 1 ? 's' : ''}</p>}
      <div className={styles.grid}>
        {loading ? (
          <CardGridSkeleton count={8} />
        ) : (
          products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))
        )}
      </div>
      {!loading && products.length === 0 && (
        <div className={styles.emptyState}>
          <p className={styles.emptyTitle}>No sneakers found</p>
          {search && <p className={styles.emptyDetail}>No results for "{search}"{brand ? ` in ${brand}` : ''}</p>}
          {!search && brand && <p className={styles.emptyDetail}>No {brand} sneakers available right now</p>}
          {(search || brand) && (
            <button onClick={clearFilters} className={styles.clearBtn}>Clear Filters</button>
          )}
        </div>
      )}
      {clothingItems.length > 0 && (
        <ProductSlider items={clothingItems} title="Featured Apparel" variant="grey" rows={1} />
      )}
    </div>
  )
}
