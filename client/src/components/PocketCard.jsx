import { Link } from 'react-router-dom'
import styles from './ProductCard.module.css'

export default function PocketCard({ item, link }) {
  const content = (
    <>
      <div className={styles.imageWrap}>
        <img src={item.src || item.image_url} alt={item.name} className={styles.image} />
      </div>
      <div className={styles.info}>
        <p className={styles.brand}>{item.brand}</p>
        <p className={styles.name}>{item.name}</p>
        {item.size != null && <p className={styles.size}>Size: {item.size}</p>}
        {item.retail_price != null && <p className={styles.price}>${item.retail_price}</p>}
      </div>
    </>
  )

  if (link) {
    return (
      <Link to={link} className={styles.card}>
        {content}
      </Link>
    )
  }

  return <div className={styles.card}>{content}</div>
}
