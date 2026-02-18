import { useState, useEffect } from 'react'
import api from '../api.js'
import ProductCard from '../components/ProductCard.jsx'
import ProductSlider from '../components/ProductSlider.jsx'
import SearchBar from '../components/SearchBar.jsx'
import { CardGridSkeleton } from '../components/Skeleton.jsx'
import clothingData from '../data/clothing.json'
import shoesData from '../data/shoes.json'
import styles from './Home.module.css'

export default function Home() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [brand, setBrand] = useState('')
  const [sort, setSort] = useState('')

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (brand) params.set('brand', brand)
    if (sort) params.set('sort', sort)
    api.get(`/api/products?${params}&limit=100`).then((res) => {
      setProducts(res.data)
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

  // Build shoe slider items from Michael's data by brand
  const nikeShoes = shoesData.NIKE || []
  const adidasShoes = shoesData.ADIDAS || []
  const nbShoes = shoesData.NEWBALANCE || []
  const allShoes = shoesData.ALL || []

  return (
    <div className={styles.page}>
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
          {search && <p className={styles.emptyDetail}>No results for &ldquo;{search}&rdquo;{brand ? ` in ${brand}` : ''}</p>}
          {!search && brand && <p className={styles.emptyDetail}>No {brand} sneakers available right now</p>}
          {(search || brand) && (
            <button onClick={clearFilters} className={styles.clearBtn}>Clear Filters</button>
          )}
        </div>
      )}
      {nikeShoes.length > 0 && (
        <ProductSlider items={nikeShoes} title="Nike" variant="black" rows={2} />
      )}
      {adidasShoes.length > 0 && (
        <ProductSlider items={adidasShoes} title="Adidas" variant="grey" rows={2} />
      )}
      {nbShoes.length > 0 && (
        <ProductSlider items={nbShoes} title="New Balance" variant="black" rows={2} />
      )}
      {allShoes.length > 0 && (
        <ProductSlider items={allShoes} title="All Brands" variant="grey" rows={2} />
      )}
      {clothingItems.length > 0 && (
        <ProductSlider items={clothingItems} title="Featured Apparel" variant="black" rows={1} />
      )}
    </div>
  )
}
