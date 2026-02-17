import { useRef, useState } from 'react'
import PocketCard from './PocketCard.jsx'
import styles from './ProductSlider.module.css'

export default function ProductSlider({ items, title, variant = 'grey', rows = 2 }) {
  const scrollRef = useRef(null)
  const [isDragging, setIsDragging] = useState(false)
  const startX = useRef(0)
  const hasDragged = useRef(false)

  const scroll = (dir) => {
    if (!scrollRef.current) return
    const step = 320
    scrollRef.current.scrollBy({ left: dir * step, behavior: 'smooth' })
  }

  const handleMouseDown = (e) => {
    if (!scrollRef.current) return
    setIsDragging(true)
    hasDragged.current = false
    startX.current = e.pageX - scrollRef.current.offsetLeft
  }

  const handleMouseLeave = () => setIsDragging(false)

  const handleMouseUp = () => setIsDragging(false)

  const handleMouseMove = (e) => {
    if (!isDragging || !scrollRef.current) return
    e.preventDefault()
    hasDragged.current = true
    const x = e.pageX - scrollRef.current.offsetLeft
    const walk = (x - startX.current) * 1.2
    scrollRef.current.scrollLeft -= walk
    startX.current = x
  }

  const handleClick = (e) => {
    if (hasDragged.current) {
      e.preventDefault()
      e.stopPropagation()
      hasDragged.current = false
    }
  }

  const isEmpty = !items?.length

  return (
    <section className={`${styles.sliderSection} ${variant === 'black' ? styles.sectionBlack : styles.sectionGrey}`}>
      {title && <h2 className={styles.sliderTitle}>{title}</h2>}
      <div className={styles.sliderWrap}>
        <button
          type="button"
          className={`${styles.scrollBtn} ${styles.scrollLeft}`}
          onClick={() => scroll(-1)}
          aria-label="Scroll left"
        >
          ‹
        </button>
        <button
          type="button"
          className={`${styles.scrollBtn} ${styles.scrollRight}`}
          onClick={() => scroll(1)}
          aria-label="Scroll right"
        >
          ›
        </button>
        <div
          ref={scrollRef}
          className={`${styles.track} ${rows === 1 ? styles.trackSingleRow : styles.trackShoes} ${isDragging ? styles.dragging : ''}`}
          onMouseDown={handleMouseDown}
          onMouseLeave={handleMouseLeave}
          onMouseUp={handleMouseUp}
          onMouseMove={handleMouseMove}
          onClickCapture={handleClick}
          role="region"
          aria-label={`${title} carousel`}
        >
          {isEmpty ? (
            <p className={styles.emptyState}>Coming soon — add clothing images</p>
          ) : (
            items.map((item, i) => (
              <PocketCard key={item.slug || item.id || item.src || i} item={item} link={(item.slug || item.id) ? `/product/${item.slug || item.id}` : null} />
            ))
          )}
        </div>
      </div>
    </section>
  )
}
