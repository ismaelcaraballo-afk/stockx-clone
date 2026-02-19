import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { ToastProvider } from './components/Toast.jsx'
import Navbar from './components/Navbar.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import Home from './pages/Home.jsx'
import ProductDetail from './pages/ProductDetail.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Login from './pages/Login.jsx'
import Sell from './pages/Sell.jsx'

function AppContent() {
  const location = useLocation()
  const showNavbar = location.pathname !== '/dashboard'

  return (
    <>
      {showNavbar && <Navbar />}
      <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/sell" element={<ProtectedRoute><Sell /></ProtectedRoute>} />
          <Route path="/login" element={<Login />} />
      </Routes>
    </>
  )
}

function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </BrowserRouter>
  )
}

export default App
