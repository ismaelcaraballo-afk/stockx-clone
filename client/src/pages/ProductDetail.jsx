import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import api from '../api.js'
import styles from './ProductDetail.module.css'

export default function ProductDetail() {
  const { id } = useParams()
  const [product, setProduct] = useState(null)
  const [bidData, setBidData] = useState({ highestBid: null, lowestAsk: null })
  const [bidAmount, setBidAmount] = useState('')
  const [askAmount, setAskAmount] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    api.get(`/api/products/${id}`).then((res) => setProduct(res.data))
    api.get(`/api/bids/product/${id}`).then((res) => setBidData(res.data))
  }, [id])

  const placeBid = async () => {
    if (!bidAmount) return
    try {
      const res = await api.post('/api/bids/bid', { product_id: Number(id), amount: Number(bidAmount) })
      if (res.data.matched) {
        setMessage('Bid matched! Order created.')
      } else {
        setMessage('Bid placed!')
      }
      setBidAmount('')
      api.get(`/api/bids/product/${id}`).then((r) => setBidData(r.data))
    } catch {
      setMessage('Failed to place bid. Are you logged in?')
    }
  }

  const placeAsk = async () => {
    if (!askAmount) return
    try {
      const res = await api.post('/api/bids/ask', { product_id: Number(id), amount: Number(askAmount) })
      if (res.data.matched) {
        setMessage('Ask matched! Order created.')
      } else {
        setMessage('Ask placed!')
      }
      setAskAmount('')
      api.get(`/api/bids/product/${id}`).then((r) => setBidData(r.data))
    } catch {
      setMessage('Failed to place ask. Are you logged in?')
    }
  }

  if (!product) return <div className={styles.loading}>Loading...</div>

  return (
    <div className={styles.page}>
      <div className={styles.left}>
        <div className={styles.imageWrap}>
          <img src={product.image_url} alt={product.name} className={styles.image} />
        </div>
        {/* TODO: 3D Viewer + AR Camera goes here (Ismael) */}
        <div className={styles.viewer3d}>
          <p>3D Viewer / AR Camera — Coming Soon</p>
        </div>
      </div>
      <div className={styles.right}>
        <p className={styles.brand}>{product.brand}</p>
        <h1 className={styles.name}>{product.name}</h1>
        <p className={styles.size}>Size: {product.size}</p>
        <p className={styles.desc}>{product.description}</p>
        <div className={styles.priceRow}>
          <div className={styles.priceBox}>
            <span className={styles.label}>Retail Price</span>
            <span className={styles.val}>${product.retail_price}</span>
          </div>
          <div className={styles.priceBox}>
            <span className={styles.label}>Highest Bid</span>
            <span className={styles.val}>{bidData.highestBid ? `$${bidData.highestBid.amount}` : '--'}</span>
          </div>
          <div className={styles.priceBox}>
            <span className={styles.label}>Lowest Ask</span>
            <span className={styles.val}>{bidData.lowestAsk ? `$${bidData.lowestAsk.amount}` : '--'}</span>
          </div>
        </div>
        <div className={styles.actions}>
          <div className={styles.actionGroup}>
            <input
              type="number"
              placeholder="Your bid $"
              value={bidAmount}
              onChange={(e) => setBidAmount(e.target.value)}
              className={styles.input}
            />
            <button onClick={placeBid} className={styles.bidBtn}>Place Bid</button>
          </div>
          <div className={styles.actionGroup}>
            <input
              type="number"
              placeholder="Your ask $"
              value={askAmount}
              onChange={(e) => setAskAmount(e.target.value)}
              className={styles.input}
            />
            <button onClick={placeAsk} className={styles.askBtn}>Place Ask</button>
          </div>
        </div>
        {message && <p className={styles.message}>{message}</p>}
      </div>
    </div>
  )
}
