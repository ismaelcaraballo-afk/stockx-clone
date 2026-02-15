import { Link } from 'react-router-dom'
import styles from './ProductCard.module.css'

export default function ProductCard({ product }) {
  return (
    <Link to={`/product/${product.id}`} className={styles.card}>
      <div className={styles.imageWrap}>
        <img src={product.image_url} alt={product.name} className={styles.image} />
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
