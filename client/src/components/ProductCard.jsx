import { Link } from 'react-router-dom'
import styles from './ProductCard.module.css'

const PLACEHOLDER = 'data:image/svg+xml;base64,' + btoa('<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" fill="#333"><rect width="300" height="200" fill="#e0e0e0"/><text x="150" y="100" text-anchor="middle" dy=".3em" font-size="14" fill="#999" font-family="sans-serif">No Image</text></svg>')

export default function ProductCard({ product }) {
  return (
    <Link to={`/product/${product.id}`} className={styles.card}>
      <div className={styles.imageWrap}>
        <img
          src={product.image_url || PLACEHOLDER}
          alt={product.name}
          className={styles.image}
          onError={(e) => { e.target.src = PLACEHOLDER }}
        />
      </div>
      <div className={styles.info}>
        <p className={styles.brand}>{product.brand}</p>
        <p className={styles.name}>{product.name}</p>
        <p className={styles.size}>Size: {product.size}</p>
        <p className={styles.price}>${product.retail_price}</p>
      </div>
    </Link>
  )
}
