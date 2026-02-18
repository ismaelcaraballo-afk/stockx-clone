import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api.js'
import styles from './Dashboard.module.css'

export default function Dashboard() {
  const [listings, setListings] = useState([])
  const [bids, setBids] = useState([])
  const [orders, setOrders] = useState([])
  const [tab, setTab] = useState('listings')
  const navigate = useNavigate()
  const user = JSON.parse(localStorage.getItem('user') || 'null')

  const loadData = () => {
    api.get('/api/users/me/listings').then((res) => setListings(res.data))
    api.get('/api/bids/mine').then((res) => setBids(res.data))
    api.get('/api/orders').then((res) => setOrders(res.data))
  }

  useEffect(() => {
    if (!user) { navigate('/login'); return }
    loadData()
  }, [])

  const cancelBid = async (bidId, e) => {
    e.stopPropagation()
    try {
      await api.delete(`/api/bids/${bidId}`)
      loadData()
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to cancel')
    }
  }

  const deleteListing = async (productId, e) => {
    e.stopPropagation()
    if (!confirm('Delete this listing? All active bids/asks will be cancelled.')) return
    try {
      await api.delete(`/api/products/${productId}`)
      loadData()
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete')
    }
  }

  if (!user) return null

  return (
    <div className={styles.page}>
      <h1>Dashboard</h1>
      <p className={styles.welcome}>Welcome, {user.username}</p>
      <div className={styles.tabs}>
        <button className={`${styles.tab} ${tab === 'listings' ? styles.active : ''}`} onClick={() => setTab('listings')}>My Listings ({listings.length})</button>
        <button className={`${styles.tab} ${tab === 'bids' ? styles.active : ''}`} onClick={() => setTab('bids')}>My Bids ({bids.length})</button>
        <button className={`${styles.tab} ${tab === 'orders' ? styles.active : ''}`} onClick={() => setTab('orders')}>Orders ({orders.length})</button>
      </div>
      <div className={styles.content}>
        {tab === 'listings' && (
          listings.length === 0 ? (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon}>📦</span>
              <p className={styles.emptyTitle}>No listings yet</p>
              <p className={styles.emptyText}>List your first pair and start selling. <span className={styles.link} onClick={() => navigate('/sell')}>Create one</span></p>
            </div>
          ) :
          listings.map((p) => (
            <div key={p.id} className={styles.row}>
              <span className={styles.clickable} onClick={() => navigate(`/product/${p.id}`)}>{p.name}</span>
              <span>${p.retail_price}</span>
              <button onClick={(e) => deleteListing(p.id, e)} className={styles.cancelBtn}>Delete</button>
            </div>
          ))
        )}
        {tab === 'bids' && (
          bids.length === 0 ? (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon}>🏷️</span>
              <p className={styles.emptyTitle}>No bids yet</p>
              <p className={styles.emptyText}>Browse sneakers and place your first bid.</p>
            </div>
          ) :
          bids.map((b) => (
            <div key={b.id} className={styles.row}>
              <span className={styles.clickable} onClick={() => navigate(`/product/${b.product_id}`)}>{b.product_name}</span>
              <span className={b.type === 'bid' ? styles.green : styles.red}>{b.type.toUpperCase()} ${b.amount}</span>
              <span className={styles.status}>{b.status}</span>
              {b.status === 'active' && (
                <button onClick={(e) => cancelBid(b.id, e)} className={styles.cancelBtn}>Cancel</button>
              )}
            </div>
          ))
        )}
        {tab === 'orders' && (
          orders.length === 0 ? (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon}>📋</span>
              <p className={styles.emptyTitle}>No orders yet</p>
              <p className={styles.emptyText}>When a bid matches an ask, your order will appear here.</p>
            </div>
          ) :
          orders.map((o) => (
            <div key={o.id} className={styles.row}>
              <span className={styles.clickable} onClick={() => navigate(`/product/${o.product_id}`)}>{o.product_name}</span>
              <span>${o.price}</span>
              <span className={styles.status}>{o.buyer_id === user.id ? 'BOUGHT' : 'SOLD'}</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
