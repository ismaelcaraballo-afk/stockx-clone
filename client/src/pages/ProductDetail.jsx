import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../api.js'
import Viewer3D from '../components/Viewer3D.jsx'
import ARCamera from '../components/ARCamera.jsx'
import { DetailSkeleton } from '../components/Skeleton.jsx'
import styles from './ProductDetail.module.css'

const PLACEHOLDER = 'data:image/svg+xml;base64,' + btoa('<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" fill="#333"><rect width="300" height="300" fill="#1a1a1a"/><text x="150" y="150" text-anchor="middle" dy=".3em" font-size="16" fill="#555" font-family="sans-serif">No Image</text></svg>')

export default function ProductDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [product, setProduct] = useState(null)
  const [bidData, setBidData] = useState({ highestBid: null, lowestAsk: null })
  const [history, setHistory] = useState({ history: [], stats: null, lastSale: null })
  const [bidAmount, setBidAmount] = useState('')
  const [askAmount, setAskAmount] = useState('')
  const [message, setMessage] = useState('')
  const [showAR, setShowAR] = useState(false)
  const [viewMode, setViewMode] = useState('image')
  const user = JSON.parse(localStorage.getItem('user') || 'null')

  useEffect(() => {
    api.get(`/api/products/${id}`).then((res) => setProduct(res.data))
    api.get(`/api/bids/product/${id}`).then((res) => setBidData(res.data))
    api.get(`/api/products/${id}/history`).then((res) => setHistory(res.data))
  }, [id])

  const refreshData = () => {
    api.get(`/api/bids/product/${id}`).then((r) => setBidData(r.data))
    api.get(`/api/products/${id}/history`).then((r) => setHistory(r.data))
  }

  const placeBid = async () => {
    if (!bidAmount) return
    try {
      const res = await api.post('/api/bids/bid', { product_id: Number(id), amount: Number(bidAmount) })
      setMessage(res.data.matched ? 'Bid matched! Order created.' : 'Bid placed!')
      setBidAmount('')
      refreshData()
    } catch {
      setMessage('Failed to place bid. Are you logged in?')
    }
  }

  const placeAsk = async () => {
    if (!askAmount) return
    try {
      const res = await api.post('/api/bids/ask', { product_id: Number(id), amount: Number(askAmount) })
      setMessage(res.data.matched ? 'Ask matched! Order created.' : 'Ask placed!')
      setAskAmount('')
      refreshData()
    } catch {
      setMessage('Failed to place ask. Are you logged in?')
    }
  }

  const buyNow = async () => {
    if (!bidData.lowestAsk) return
    try {
      const res = await api.post('/api/bids/bid', { product_id: Number(id), amount: Number(bidData.lowestAsk.amount) })
      setMessage(res.data.matched ? 'Purchase complete!' : 'Bid placed at lowest ask.')
      refreshData()
    } catch {
      setMessage('Failed to buy. Are you logged in?')
    }
  }

  const sellNow = async () => {
    if (!bidData.highestBid) return
    try {
      const res = await api.post('/api/bids/ask', { product_id: Number(id), amount: Number(bidData.highestBid.amount) })
      setMessage(res.data.matched ? 'Sold! Order created.' : 'Ask placed at highest bid.')
      refreshData()
    } catch {
      setMessage('Failed to sell. Are you logged in?')
    }
  }

  const deleteListing = async () => {
    if (!confirm('Delete this listing? All active bids/asks will be cancelled.')) return
    try {
      await api.delete(`/api/products/${id}`)
      navigate('/')
    } catch (err) {
      setMessage(err.response?.data?.error || 'Failed to delete')
    }
  }

  if (!product) return <DetailSkeleton />

  const isOwner = user && user.id === product.seller_id

  return (
    <div className={styles.page}>
      {showAR && <ARCamera onClose={() => setShowAR(false)} />}

      <div className={styles.left}>
        <div className={styles.viewToggle}>
          <button
            className={`${styles.toggleBtn} ${viewMode === 'image' ? styles.activeToggle : ''}`}
            onClick={() => setViewMode('image')}
          >
            Photo
          </button>
          <button
            className={`${styles.toggleBtn} ${viewMode === '3d' ? styles.activeToggle : ''}`}
            onClick={() => setViewMode('3d')}
          >
            3D View
          </button>
          <button className={styles.arBtn} onClick={() => setShowAR(true)}>
            AR Try-On
          </button>
        </div>

        {viewMode === 'image' ? (
          <div className={styles.imageWrap}>
            <img
              src={product.image_url || PLACEHOLDER}
              alt={product.name}
              className={styles.image}
              onError={(e) => { e.target.src = PLACEHOLDER }}
            />
          </div>
        ) : (
          <Viewer3D />
        )}
      </div>

      <div className={styles.right}>
        <p className={styles.brand}>{product.brand}</p>
        <h1 className={styles.name}>{product.name}</h1>
        <p className={styles.size}>Size: {product.size}</p>
        <p className={styles.desc}>{product.description}</p>
        <p className={styles.seller}>Listed by: {product.seller_name}</p>

        {isOwner && (
          <button onClick={deleteListing} className={styles.deleteBtn}>Delete Listing</button>
        )}

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
          <div className={styles.priceBox}>
            <span className={styles.label}>Last Sale</span>
            <span className={styles.val}>{history.lastSale ? `$${history.lastSale.price}` : '--'}</span>
          </div>
        </div>

        {history.stats && Number(history.stats.total_sales) > 0 && (
          <div className={styles.statsRow}>
            <span>{history.stats.total_sales} sale{Number(history.stats.total_sales) !== 1 ? 's' : ''}</span>
            <span>Avg: ${history.stats.avg_price}</span>
            <span>Low: ${history.stats.min_price}</span>
            <span>High: ${history.stats.max_price}</span>
          </div>
        )}

        <div className={styles.instantRow}>
          <button onClick={buyNow} className={styles.buyNowBtn} disabled={!bidData.lowestAsk}>
            {bidData.lowestAsk ? `Buy Now — $${bidData.lowestAsk.amount}` : 'No Asks Yet'}
          </button>
          <button onClick={sellNow} className={styles.sellNowBtn} disabled={!bidData.highestBid}>
            {bidData.highestBid ? `Sell Now — $${bidData.highestBid.amount}` : 'No Bids Yet'}
          </button>
        </div>

        <div className={styles.orDivider}><span>or place your own price</span></div>

        <div className={styles.actions}>
          <div className={styles.actionGroup}>
            <input type="number" placeholder="Your bid $" value={bidAmount} onChange={(e) => setBidAmount(e.target.value)} className={styles.input} />
            <button onClick={placeBid} className={styles.bidBtn}>Place Bid</button>
          </div>
          <div className={styles.actionGroup}>
            <input type="number" placeholder="Your ask $" value={askAmount} onChange={(e) => setAskAmount(e.target.value)} className={styles.input} />
            <button onClick={placeAsk} className={styles.askBtn}>Place Ask</button>
          </div>
        </div>
        {message && <p className={styles.message}>{message}</p>}

        {history.history.length > 0 && (
          <div className={styles.historySection}>
            <h3>Recent Sales</h3>
            {history.history.slice(0, 5).map((h, i) => (
              <div key={i} className={styles.historyRow}>
                <span>${h.price}</span>
                <span className={styles.historyDate}>{new Date(h.created_at).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
