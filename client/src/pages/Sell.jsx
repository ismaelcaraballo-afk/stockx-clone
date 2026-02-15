import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api.js'
import styles from './Sell.module.css'

const BRANDS = ['Nike', 'Adidas', 'New Balance', 'Puma', 'Reebok', 'Converse', 'Vans', 'Jordan', 'Other']
const SIZES = ['4', '4.5', '5', '5.5', '6', '6.5', '7', '7.5', '8', '8.5', '9', '9.5', '10', '10.5', '11', '11.5', '12', '12.5', '13', '14']
const CATEGORIES = ['sneakers', 'boots', 'sandals', 'casual', 'running']

export default function Sell() {
  const navigate = useNavigate()
  const user = JSON.parse(localStorage.getItem('user') || 'null')
  const [form, setForm] = useState({
    name: '',
    brand: 'Nike',
    description: '',
    image_url: '',
    retail_price: '',
    size: '10',
    category: 'sneakers',
  })
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  if (!user) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <h1>Sell Sneakers</h1>
          <p className={styles.loginMsg}>You need to be logged in to create a listing.</p>
          <button onClick={() => navigate('/login')} className={styles.submitBtn}>Log In</button>
        </div>
      </div>
    )
  }

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const res = await api.post('/api/products', {
        ...form,
        retail_price: Number(form.retail_price),
      })
      navigate(`/product/${res.data.id}`)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create listing')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1>Create Listing</h1>
        <p className={styles.subtitle}>List your sneakers for sale</p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label}>Product Name *</label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="e.g. Air Jordan 1 Retro High OG"
              required
              className={styles.input}
            />
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label}>Brand *</label>
              <select name="brand" value={form.brand} onChange={handleChange} className={styles.select}>
                {BRANDS.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Category</label>
              <select name="category" value={form.category} onChange={handleChange} className={styles.select}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label}>Size *</label>
              <select name="size" value={form.size} onChange={handleChange} className={styles.select}>
                {SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Retail Price ($) *</label>
              <input
                type="number"
                name="retail_price"
                value={form.retail_price}
                onChange={handleChange}
                placeholder="170"
                required
                min="1"
                className={styles.input}
              />
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Image URL</label>
            <input
              type="url"
              name="image_url"
              value={form.image_url}
              onChange={handleChange}
              placeholder="https://example.com/shoe.jpg"
              className={styles.input}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Description</label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="Describe the shoe — colorway, condition, details..."
              rows={3}
              className={styles.textarea}
            />
          </div>

          {form.image_url && (
            <div className={styles.preview}>
              <img src={form.image_url} alt="Preview" className={styles.previewImg} onError={(e) => e.target.style.display = 'none'} />
            </div>
          )}

          {error && <p className={styles.error}>{error}</p>}

          <button type="submit" className={styles.submitBtn} disabled={submitting}>
            {submitting ? 'Creating...' : 'Create Listing'}
          </button>
        </form>
      </div>
    </div>
  )
}
