import styles from './Skeleton.module.css'

export function CardSkeleton() {
  return (
    <div className={styles.card}>
      <div className={`${styles.block} ${styles.image}`} />
      <div className={styles.info}>
        <div className={`${styles.block} ${styles.brand}`} />
        <div className={`${styles.block} ${styles.name}`} />
        <div className={`${styles.block} ${styles.size}`} />
        <div className={`${styles.block} ${styles.price}`} />
      </div>
    </div>
  )
}

export function CardGridSkeleton({ count = 8 }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </>
  )
}

export function DetailSkeleton() {
  return (
    <div className={styles.detail}>
      <div className={styles.detailLeft}>
        <div className={`${styles.block} ${styles.detailImage}`} />
      </div>
      <div className={styles.detailRight}>
        <div className={`${styles.block} ${styles.detailBrand}`} />
        <div className={`${styles.block} ${styles.detailName}`} />
        <div className={`${styles.block} ${styles.detailSize}`} />
        <div className={`${styles.block} ${styles.detailDesc}`} />
        <div className={styles.detailPriceRow}>
          <div className={`${styles.block} ${styles.detailPriceBox}`} />
          <div className={`${styles.block} ${styles.detailPriceBox}`} />
          <div className={`${styles.block} ${styles.detailPriceBox}`} />
        </div>
      </div>
    </div>
  )
}
