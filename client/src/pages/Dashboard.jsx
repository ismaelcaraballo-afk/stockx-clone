import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import api from '../api.js'
import styles from './Dashboard.module.css'

// Mock data for charts and stats
const MOCK_TOTAL_SALES = 4721.44
const MOCK_SALES_CHANGE = 8.42
const MOCK_TOTAL_ORDERS = 1290
const MOCK_ORDERS_CHANGE = 12.42

const MOCK_TOP_SHOES = [
  { name: "Men's Running Nike Epic React", img: '/Shoes/NIKE/Nike-ACG-Rufus-Limestone-Black-Product.jpg.avif' },
  { name: 'Jordan Jump Diamond Basketball', img: '/Shoes/NIKE/Nike-Air-Force-1-Low-LX-Lucky-Charms-Black-W-Product.jpg.avif' },
  { name: "Men's Trail Nike Air Zoom", img: '/Shoes/NIKE/Nike-Air-Max-Dn-Black-Metallic-Silver-Red-Product.jpg.avif' },
]

const CHART_COLORS = ['#5bc4e0', '#4ab8c4', '#39aca8', '#28a08c', '#189470', '#088854', '#08a05c']
const MOCK_COUNTRIES = [
  { name: 'United States', orders: 420 },
  { name: 'United Kingdom', orders: 180 },
  { name: 'Germany', orders: 145 },
  { name: 'France', orders: 112 },
  { name: 'Canada', orders: 98 },
  { name: 'Japan', orders: 87 },
  { name: 'Australia', orders: 72 },
  { name: 'Spain', orders: 58 },
  { name: 'Italy', orders: 45 },
  { name: 'Netherlands', orders: 38 },
]

const MOCK_YEARLY_SALES = [
  { year: '2015', sales: 8.2 },
  { year: '2016', sales: 11.5 },
  { year: '2017', sales: 14.8 },
  { year: '2018', sales: 16.2 },
  { year: '2019', sales: 15.1 },
]

const MOCK_CATEGORIES = [
  { name: 'Lifestyle', value: 520 },
  { name: 'Running', value: 380 },
  { name: 'Basketball', value: 290 },
  { name: 'Football', value: 175 },
  { name: 'Training', value: 125 },
]

const MOCK_INVESTMENT = [
  {
    name: 'StockX - Stock Market',
    rating: 'Rating stock market status of Stockx.com',
    invest: 1250,
    profit: 89.50,
    lastDeposit: 500,
    finalProfit: 389.50,
  },
]

const MOCK_RECENT = [
  { img: '/Shoes/NIKE/Nike-Air-Force-1-Low-LX-Lucky-Charms-Black-W-Product.jpg.avif', name: 'Nike Air Force 1 Low', date: '2024-02-15', orderId: 'ORD-7821', stars: 5 },
  { img: '/Shoes/ADIDAS/adidas-Yeezy-Boost-350-V2-Core-Black-White-Product.jpg.avif', name: 'Adidas Yeezy Boost 350 V2', date: '2024-02-10', orderId: 'ORD-7792', stars: 4 },
]

const DEMO_USER = { id: 0, username: 'Demo User' }
const MOCK_LISTINGS = [{ id: 1, name: 'Nike Air Max 90', retail_price: 150 }]
const MOCK_BIDS = [{ id: 1, product_id: 1, product_name: 'Nike Air Force 1', type: 'bid', amount: 120, status: 'active' }]
const MOCK_ORDERS = [{ id: 1, product_id: 1, product_name: 'Adidas Yeezy 350', price: 220, buyer_id: 0 }]

export default function Dashboard() {
  const [listings, setListings] = useState([])
  const [bids, setBids] = useState([])
  const [orders, setOrders] = useState([])
  const [tab, setTab] = useState('overview')
  const navigate = useNavigate()
  const storedUser = JSON.parse(localStorage.getItem('user') || 'null')
  const hasBackend = !!localStorage.getItem('token')
  const user = storedUser || DEMO_USER

  const loadData = () => {
    if (!hasBackend) return
    api.get('/api/users/me/listings').then((res) => setListings(res.data)).catch(() => {})
    api.get('/api/bids/mine').then((res) => setBids(res.data)).catch(() => {})
    api.get('/api/orders').then((res) => setOrders(res.data)).catch(() => {})
  }

  useEffect(() => {
    if (hasBackend) loadData()
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
    if (!confirm('Delete this listing?')) return
    try {
      await api.delete(`/api/products/${productId}`)
      loadData()
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete')
    }
  }

  const displayListings = hasBackend ? listings : MOCK_LISTINGS
  const displayBids = hasBackend ? bids : MOCK_BIDS
  const displayOrders = hasBackend ? orders : MOCK_ORDERS

  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <Link to="/" className={styles.sidebarIcon} title="Home"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></svg></Link>
        <button className={styles.sidebarIcon} title="Notifications"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg></button>
        <button className={styles.sidebarIcon} title="Refresh"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 4v6h-6" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></svg></button>
        <button className={styles.sidebarIcon} title="Documents"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg></button>
        <button className={`${styles.sidebarIcon} ${styles.sidebarActive}`} title="Dashboard"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg></button>
      </aside>

      <main className={styles.main}>
        <p className={styles.pageLabel}>Dashboard</p>
        {!hasBackend && (
          <p className={styles.demoBanner}>Demo mode — showing mock data until backend is connected</p>
        )}
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <h1>Dashboard</h1>
            <span className={styles.headerSub}>{user.username}</span>
          </div>
          <div className={styles.profile}>
            <span>Profile: {user.username}</span>
            <span>Customer since 2024</span>
            <div className={styles.avatar} />
          </div>
        </header>

        <div className={styles.tabs}>
          <button className={`${styles.tab} ${tab === 'overview' ? styles.tabActive : ''}`} onClick={() => setTab('overview')}>Overview</button>
          <button className={`${styles.tab} ${tab === 'listings' ? styles.tabActive : ''}`} onClick={() => setTab('listings')}>My Listings ({displayListings.length})</button>
          <button className={`${styles.tab} ${tab === 'bids' ? styles.tabActive : ''}`} onClick={() => setTab('bids')}>My Bids ({displayBids.length})</button>
          <button className={`${styles.tab} ${tab === 'orders' ? styles.tabActive : ''}`} onClick={() => setTab('orders')}>Orders ({displayOrders.length})</button>
        </div>

        {tab === 'overview' && (
          <>
            <section className={styles.investment}>
              <h2>Investment</h2>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Name of Stock</th>
                      <th>Updated Stock Market Rating</th>
                      <th>Your Invest to Stockx.com</th>
                      <th>Your Stock Profit Earned</th>
                      <th>Last Dated Deposit</th>
                      <th>Final Stock Profit Earned</th>
                    </tr>
                  </thead>
                  <tbody>
                    {MOCK_INVESTMENT.map((row, i) => (
                      <tr key={i}>
                        <td>{row.name}</td>
                        <td>{row.rating}</td>
                        <td>${row.invest.toFixed(2)}</td>
                        <td>${row.profit.toFixed(2)}</td>
                        <td>${row.lastDeposit.toFixed(2)}</td>
                        <td>${row.finalProfit.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className={styles.recent}>
              <h2>Recent Purchased</h2>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Shoe Image</th>
                      <th>Brand Name - Description</th>
                      <th>Purchased Date</th>
                      <th>Order ID</th>
                      <th>Stars Rating</th>
                    </tr>
                  </thead>
                  <tbody>
                    {MOCK_RECENT.map((row, i) => (
                      <tr key={i}>
                        <td><img src={row.img} alt="" className={styles.thumb} /></td>
                        <td>{row.name}</td>
                        <td>{row.date}</td>
                        <td>{row.orderId}</td>
                        <td>{'★'.repeat(row.stars)}{'☆'.repeat(5 - row.stars)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className={styles.boxes}>
              <div className={styles.box}>
                <h3>Total Sale</h3>
                <p className={styles.boxValue}>${MOCK_TOTAL_SALES.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                <p className={styles.boxMeta}>Last 30 Day <span className={styles.positive}>+{MOCK_SALES_CHANGE}%</span></p>
              </div>
              <div className={styles.box}>
                <h3>Total Orders</h3>
                <p className={styles.boxValue}>{MOCK_TOTAL_ORDERS.toLocaleString()}</p>
                <p className={styles.boxMeta}>Last 30 Day <span className={styles.positive}>+{MOCK_ORDERS_CHANGE}%</span></p>
              </div>
              <div className={styles.box}>
                <h3>Top Selling Nike Shoes</h3>
                <div className={styles.topShoes}>
                  {MOCK_TOP_SHOES.map((s, i) => (
                    <div key={i} className={styles.topShoe}>
                      <img src={s.img} alt="" />
                      <span>{s.name}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className={styles.box}>
                <h3>Top 10 Sales Countries</h3>
                <div className={styles.chartWrap}>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={MOCK_COUNTRIES} layout="vertical" margin={{ left: 80, right: 12 }}>
                      <XAxis type="number" stroke="#666" tick={{ fill: '#999', fontSize: 10 }} />
                      <YAxis type="category" dataKey="name" stroke="#666" tick={{ fill: '#999', fontSize: 10 }} width={75} />
                      <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 8 }} />
                      <Bar dataKey="orders" radius={4}>
                        {MOCK_COUNTRIES.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className={styles.box}>
                <h3>Product Yearly Sales</h3>
                <div className={styles.chartWrap}>
                  <ResponsiveContainer width="100%" height={180}>
                    <LineChart data={MOCK_YEARLY_SALES} margin={{ left: 12, right: 12 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                      <XAxis dataKey="year" stroke="#666" tick={{ fill: '#999', fontSize: 10 }} />
                      <YAxis stroke="#666" tick={{ fill: '#999', fontSize: 10 }} tickFormatter={(v) => `${v}m`} />
                      <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 8 }} formatter={(v) => [`${v}m`, 'Sales']} />
                      <defs><linearGradient id="salesGrad" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#5bc4e0" /><stop offset="100%" stopColor="#08a05c" /></linearGradient></defs>
                      <Line type="monotone" dataKey="sales" stroke="url(#salesGrad)" strokeWidth={2} dot={{ fill: '#08a05c' }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className={styles.box}>
                <h3>Sales by Category</h3>
                <div className={styles.chartWrap}>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={MOCK_CATEGORIES} margin={{ left: 12, right: 12 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                      <XAxis dataKey="name" stroke="#666" tick={{ fill: '#999', fontSize: 10 }} />
                      <YAxis stroke="#666" tick={{ fill: '#999', fontSize: 10 }} />
                      <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 8 }} />
                      <Bar dataKey="value" radius={4}>
                        {MOCK_CATEGORIES.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </section>

            <footer className={styles.footer}>
              <div className={styles.footerCol}><h4>Buy</h4><p>Browse</p><p>Release Calendar</p><p>How to Buy</p></div>
              <div className={styles.footerCol}><h4>Sell</h4><p>Start Selling</p><p>Price Guide</p></div>
              <div className={styles.footerCol}><h4>Company</h4><p>About</p><p>Careers</p><p>Contact</p></div>
              <div className={styles.footerCol}><h4>Support</h4><p>Help Center</p><p>Authenticity</p></div>
            </footer>
          </>
        )}

        {tab === 'listings' && (
          <div className={styles.content}>
            {displayListings.length === 0 ? (
              <p className={styles.empty}>No listings yet. <span className={styles.link} onClick={() => navigate('/sell')}>Create one</span></p>
            ) : (
              displayListings.map((p) => (
                <div key={p.id} className={styles.row}>
                  <span className={styles.clickable} onClick={() => navigate(`/product/${p.id}`)}>{p.name}</span>
                  <span>${p.retail_price}</span>
                  {hasBackend && <button onClick={(e) => deleteListing(p.id, e)} className={styles.cancelBtn}>Delete</button>}
                </div>
              ))
            )}
          </div>
        )}

        {tab === 'bids' && (
          <div className={styles.content}>
            {displayBids.length === 0 ? <p className={styles.empty}>No bids yet.</p> : (
              displayBids.map((b) => (
                <div key={b.id} className={styles.row}>
                  <span className={styles.clickable} onClick={() => navigate(`/product/${b.product_id}`)}>{b.product_name}</span>
                  <span className={b.type === 'bid' ? styles.green : styles.red}>{b.type.toUpperCase()} ${b.amount}</span>
                  <span className={styles.status}>{b.status}</span>
                  {b.status === 'active' && hasBackend && <button onClick={(e) => cancelBid(b.id, e)} className={styles.cancelBtn}>Cancel</button>}
                </div>
              ))
            )}
          </div>
        )}

        {tab === 'orders' && (
          <div className={styles.content}>
            {displayOrders.length === 0 ? <p className={styles.empty}>No orders yet.</p> : (
              displayOrders.map((o) => (
                <div key={o.id} className={styles.row}>
                  <span className={styles.clickable} onClick={() => navigate(`/product/${o.product_id}`)}>{o.product_name}</span>
                  <span>${o.price}</span>
                  <span className={styles.status}>{o.buyer_id === user?.id ? 'BOUGHT' : 'SOLD'}</span>
                </div>
              ))
            )}
          </div>
        )}
      </main>
    </div>
  )
}
