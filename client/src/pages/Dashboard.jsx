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

  useEffect(() => {
    if (!user) { navigate('/login'); return }
    api.get('/api/users/me/listings').then((res) => setListings(res.data))
    api.get('/api/bids/mine').then((res) => setBids(res.data))
    api.get('/api/orders').then((res) => setOrders(res.data))
  }, [])

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
          listings.length === 0 ? <p className={styles.empty}>No listings yet.</p> :
          listings.map((p) => (
            <div key={p.id} className={styles.row} onClick={() => navigate(`/product/${p.id}`)}>
              <span>{p.name}</span><span>${p.retail_price}</span>
            </div>
          ))
        )}
        {tab === 'bids' && (
          bids.length === 0 ? <p className={styles.empty}>No bids yet.</p> :
          bids.map((b) => (
            <div key={b.id} className={styles.row}>
              <span>{b.product_name}</span><span className={b.type === 'bid' ? styles.green : styles.red}>{b.type.toUpperCase()} ${b.amount}</span><span className={styles.status}>{b.status}</span>
            </div>
          ))
        )}
        {tab === 'orders' && (
          orders.length === 0 ? <p className={styles.empty}>No orders yet.</p> :
          orders.map((o) => (
            <div key={o.id} className={styles.row}>
              <span>{o.product_name}</span><span>${o.price}</span><span className={styles.status}>{o.status}</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
