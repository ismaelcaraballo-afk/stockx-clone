import { Suspense, useRef, useState, useEffect, useCallback } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useGLTF, ContactShadows } from '@react-three/drei'
import * as THREE from 'three'
import styles from './ARCamera.module.css'

const COLORWAYS = [
  { name: 'Original', items: { laces: '#fff', mesh: '#fff', caps: '#fff', inner: '#fff', sole: '#fff', stripes: '#fff', band: '#fff', patch: '#fff' } },
  { name: 'Chicago', items: { laces: '#fff', mesh: '#d32f2f', caps: '#111', inner: '#111', sole: '#fff', stripes: '#d32f2f', band: '#111', patch: '#d32f2f' } },
  { name: 'Royal', items: { laces: '#fff', mesh: '#1565c0', caps: '#111', inner: '#111', sole: '#fff', stripes: '#1565c0', band: '#111', patch: '#1565c0' } },
  { name: 'Shadow', items: { laces: '#555', mesh: '#333', caps: '#222', inner: '#222', sole: '#444', stripes: '#333', band: '#222', patch: '#333' } },
  { name: 'Bred', items: { laces: '#111', mesh: '#111', caps: '#d32f2f', inner: '#111', sole: '#d32f2f', stripes: '#d32f2f', band: '#d32f2f', patch: '#111' } },
]

// Grid floor plane that simulates surface detection
function SurfaceGrid({ position, detected }) {
  const ref = useRef()
  const [opacity, setOpacity] = useState(0)

  useFrame((_, delta) => {
    if (!ref.current) return
    // Fade in when detected, fade out when not
    const target = detected ? 0.35 : 0
    setOpacity(o => THREE.MathUtils.lerp(o, target, delta * 3))
    ref.current.material.opacity = opacity
  })

  return (
    <mesh ref={ref} rotation-x={-Math.PI / 2} position={[position[0], position[1] - 0.01, position[2]]}>
      <planeGeometry args={[6, 6]} />
      <meshBasicMaterial color="#08a05c" transparent opacity={0} side={THREE.DoubleSide} wireframe />
    </mesh>
  )
}

// Scanning animation ring that pulses outward during detection
function ScanRing({ active, position }) {
  const ref = useRef()
  const [scale, setScale] = useState(0.5)

  useFrame((_, delta) => {
    if (!ref.current || !active) return
    setScale(s => {
      const next = s + delta * 1.5
      return next > 3 ? 0.5 : next
    })
    ref.current.scale.set(scale, scale, 1)
    ref.current.material.opacity = Math.max(0, 1 - scale / 3) * 0.5
  })

  if (!active) return null

  return (
    <mesh ref={ref} rotation-x={-Math.PI / 2} position={[position[0], position[1] + 0.01, position[2]]}>
      <ringGeometry args={[0.8, 1, 32]} />
      <meshBasicMaterial color="#08a05c" transparent opacity={0.5} side={THREE.DoubleSide} />
    </mesh>
  )
}

// Floating product image card that shows the actual product photo
function ProductBillboard({ image, visible, position }) {
  const ref = useRef()
  const texRef = useRef()
  const [tex, setTex] = useState(null)

  useEffect(() => {
    if (!image) return
    const loader = new THREE.TextureLoader()
    // image can be a URL string or an Image element
    if (typeof image === 'string') {
      loader.load(image, (t) => setTex(t))
    } else {
      const canvas = document.createElement('canvas')
      canvas.width = image.width
      canvas.height = image.height
      const ctx = canvas.getContext('2d')
      ctx.drawImage(image, 0, 0)
      const t = new THREE.CanvasTexture(canvas)
      setTex(t)
    }
  }, [image])

  useFrame((state) => {
    if (!ref.current || !visible) return
    // Gentle float animation
    const t = state.clock.getElapsedTime()
    ref.current.position.y = position[1] + Math.sin(t * 1.2 + 1) * 0.015
    // Always face camera
    ref.current.lookAt(state.camera.position)
  })

  if (!visible || !tex) return null

  const aspect = tex.image ? tex.image.width / tex.image.height : 1
  const height = 1.2
  const width = height * aspect

  return (
    <group ref={ref} position={position}>
      {/* Card background */}
      <mesh position={[0, 0, -0.01]}>
        <planeGeometry args={[width + 0.1, height + 0.1]} />
        <meshBasicMaterial color="#1a1a1a" transparent opacity={0.9} />
      </mesh>
      {/* Product image */}
      <mesh>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial map={tex} transparent />
      </mesh>
      {/* Border glow */}
      <mesh position={[0, 0, -0.02]}>
        <planeGeometry args={[width + 0.15, height + 0.15]} />
        <meshBasicMaterial color="#08a05c" transparent opacity={0.3} />
      </mesh>
    </group>
  )
}

function ARShoe({ id, position, scale, colorway, visible, rotation, spinning, isActive, onTap }) {
  const ref = useRef()
  const { nodes, materials } = useGLTF('/models/shoe.glb')
  const [opacity, setOpacity] = useState(0)
  const materialRefs = useRef([])

  useFrame((state, delta) => {
    if (!ref.current) return
    if (opacity < 1) {
      setOpacity(o => Math.min(o + delta * 2, 1))
      ref.current.scale.setScalar(scale * opacity)
      ref.current.position.y = position[1] + (1 - opacity) * 0.3
    } else {
      ref.current.scale.setScalar(scale)
      const t = state.clock.getElapsedTime()
      ref.current.position.y = position[1] + Math.sin(t * 1.5) * 0.02
    }

    ref.current.rotation.x = 0.3
    ref.current.rotation.y = rotation + (spinning ? state.clock.getElapsedTime() * 2 : 0)
    ref.current.rotation.z = 0
  })

  if (!visible) return null

  const c = colorway.items

  return (
    <group
      ref={ref}
      position={position}
      scale={scale}
      onClick={(e) => { e.stopPropagation(); if (onTap) onTap(id) }}
    >
      {/* Active selection ring */}
      {isActive && (
        <mesh rotation-x={-Math.PI / 2} position={[0, -0.15, 0]}>
          <ringGeometry args={[0.35, 0.4, 32]} />
          <meshBasicMaterial color="#08a05c" transparent opacity={0.6} />
        </mesh>
      )}
      <mesh geometry={nodes.shoe.geometry} material={materials.laces} material-color={c.laces} />
      <mesh geometry={nodes.shoe_1.geometry} material={materials.mesh} material-color={c.mesh} />
      <mesh geometry={nodes.shoe_2.geometry} material={materials.caps} material-color={c.caps} />
      <mesh geometry={nodes.shoe_3.geometry} material={materials.inner} material-color={c.inner} />
      <mesh geometry={nodes.shoe_4.geometry} material={materials.sole} material-color={c.sole} />
      <mesh geometry={nodes.shoe_5.geometry} material={materials.stripes} material-color={c.stripes} />
      <mesh geometry={nodes.shoe_6.geometry} material={materials.band} material-color={c.band} />
      <mesh geometry={nodes.shoe_7.geometry} material={materials.patch} material-color={c.patch} />
    </group>
  )
}

// Handles touch/mouse drag, pinch zoom, and two-finger rotation
function DragControls({ onDrag, onPinch, onRotate }) {
  const { gl, size } = useThree()
  const dragging = useRef(false)
  const lastPos = useRef({ x: 0, y: 0 })
  const lastPinchDist = useRef(0)
  const lastAngle = useRef(0)

  useEffect(() => {
    const canvas = gl.domElement

    const onMouseDown = (e) => {
      dragging.current = true
      lastPos.current = { x: e.clientX, y: e.clientY }
    }
    const onMouseMove = (e) => {
      if (!dragging.current) return
      const dx = (e.clientX - lastPos.current.x) / size.width * 4
      const dy = -(e.clientY - lastPos.current.y) / size.height * 4
      onDrag(dx, dy)
      lastPos.current = { x: e.clientX, y: e.clientY }
    }
    const onMouseUp = () => { dragging.current = false }

    const getTouchDist = (touches) => {
      const dx = touches[0].clientX - touches[1].clientX
      const dy = touches[0].clientY - touches[1].clientY
      return Math.sqrt(dx * dx + dy * dy)
    }

    const getTouchAngle = (touches) => {
      return Math.atan2(
        touches[1].clientY - touches[0].clientY,
        touches[1].clientX - touches[0].clientX
      )
    }

    const onTouchStart = (e) => {
      if (e.touches.length === 1) {
        dragging.current = true
        lastPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
      } else if (e.touches.length === 2) {
        lastPinchDist.current = getTouchDist(e.touches)
        lastAngle.current = getTouchAngle(e.touches)
      }
    }
    const onTouchMove = (e) => {
      e.preventDefault()
      if (e.touches.length === 1 && dragging.current) {
        const dx = (e.touches[0].clientX - lastPos.current.x) / size.width * 4
        const dy = -(e.touches[0].clientY - lastPos.current.y) / size.height * 4
        onDrag(dx, dy)
        lastPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
      } else if (e.touches.length === 2) {
        const dist = getTouchDist(e.touches)
        const pinchDelta = dist - lastPinchDist.current
        onPinch(pinchDelta * 0.01)
        lastPinchDist.current = dist

        const angle = getTouchAngle(e.touches)
        const angleDelta = angle - lastAngle.current
        if (Math.abs(angleDelta) < Math.PI) {
          onRotate(angleDelta)
        }
        lastAngle.current = angle
      }
    }
    const onTouchEnd = () => { dragging.current = false }

    const onWheel = (e) => {
      e.preventDefault()
      const delta = -e.deltaY * 0.005
      onPinch(delta)
    }

    canvas.addEventListener('mousedown', onMouseDown)
    canvas.addEventListener('mousemove', onMouseMove)
    canvas.addEventListener('mouseup', onMouseUp)
    canvas.addEventListener('touchstart', onTouchStart, { passive: false })
    canvas.addEventListener('touchmove', onTouchMove, { passive: false })
    canvas.addEventListener('touchend', onTouchEnd)
    canvas.addEventListener('wheel', onWheel, { passive: false })

    return () => {
      canvas.removeEventListener('mousedown', onMouseDown)
      canvas.removeEventListener('mousemove', onMouseMove)
      canvas.removeEventListener('mouseup', onMouseUp)
      canvas.removeEventListener('touchstart', onTouchStart)
      canvas.removeEventListener('touchmove', onTouchMove)
      canvas.removeEventListener('touchend', onTouchEnd)
      canvas.removeEventListener('wheel', onWheel)
    }
  }, [gl, size, onDrag, onPinch, onRotate])

  return null
}

export default function ARCamera({ onClose, productImage, productName }) {
  const videoRef = useRef()
  const canvasRef = useRef()
  const streamRef = useRef(null)
  const [cameraReady, setCameraReady] = useState(false)
  const [error, setError] = useState(null)
  const [frozen, setFrozen] = useState(false)
  const [captureFlash, setCaptureFlash] = useState(false)
  const [facingMode, setFacingMode] = useState('environment')
  const [showHints, setShowHints] = useState(true)
  const [bgBlur, setBgBlur] = useState(false)
  const [lightIntensity, setLightIntensity] = useState(0.7)
  const [lastCapture, setLastCapture] = useState(null)
  const [showShareMenu, setShowShareMenu] = useState(false)
  const lightCanvas = useRef(null)
  const [productTexture, setProductTexture] = useState(null)

  // Load product image as texture for AR billboard
  useEffect(() => {
    if (!productImage) return
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => setProductTexture(img)
    img.src = productImage
  }, [productImage])

  // Surface detection simulation
  const [surfaceState, setSurfaceState] = useState('scanning') // 'scanning' | 'detected' | 'placed'
  const [surfaceY, setSurfaceY] = useState(-0.5)

  // Multi-shoe state: array of shoe objects
  const [shoes, setShoes] = useState([
    { id: 1, pos: [0, -0.3, 0], scale: 2.5, rotation: 0.8, spinning: false, colorway: COLORWAYS[0], visible: false }
  ])
  const [activeShoeId, setActiveShoeId] = useState(1)
  const nextId = useRef(2)

  // Simulate surface detection: scanning for 2s, then detected
  useEffect(() => {
    if (surfaceState === 'scanning') {
      const timer = setTimeout(() => setSurfaceState('detected'), 2000)
      return () => clearTimeout(timer)
    }
  }, [surfaceState])

  // Once surface detected, place shoe on it
  useEffect(() => {
    if (surfaceState === 'detected') {
      const timer = setTimeout(() => {
        setSurfaceState('placed')
        // Make first shoe visible, snap to surface
        setShoes(prev => prev.map(s => s.id === 1 ? { ...s, visible: true, pos: [0, surfaceY, 0] } : s))
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [surfaceState, surfaceY])

  // Get the active shoe
  const activeShoe = shoes.find(s => s.id === activeShoeId) || shoes[0]

  // Add a second shoe for comparison
  const addCompareShoe = useCallback(() => {
    if (shoes.length >= 2) return // max 2
    const id = nextId.current++
    const offset = 1.2 // place to the right of active shoe
    const newShoe = {
      id,
      pos: [activeShoe.pos[0] + offset, surfaceY, activeShoe.pos[2]],
      scale: 2.5,
      rotation: 0.8,
      spinning: false,
      colorway: COLORWAYS[1], // default to a different colorway
      visible: true,
    }
    setShoes(prev => [...prev, newShoe])
    setActiveShoeId(id)
  }, [shoes, activeShoe, surfaceY])

  // Remove the compare shoe
  const removeCompareShoe = useCallback(() => {
    if (shoes.length <= 1) return
    const removeId = shoes.find(s => s.id !== 1)?.id
    if (removeId) {
      setShoes(prev => prev.filter(s => s.id !== removeId))
      setActiveShoeId(1)
    }
  }, [shoes])

  // Update active shoe property
  const updateActiveShoe = useCallback((updates) => {
    setShoes(prev => prev.map(s => s.id === activeShoeId ? { ...s, ...updates } : s))
  }, [activeShoeId])

  // Start camera (supports flipping)
  const startCamera = useCallback((facing) => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
    }
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: facing, width: 1280, height: 720 } })
      .then((stream) => {
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play()
        }
        setCameraReady(true)
      })
      .catch(() => {
        navigator.mediaDevices
          .getUserMedia({ video: true })
          .then((stream) => {
            streamRef.current = stream
            if (videoRef.current) {
              videoRef.current.srcObject = stream
              videoRef.current.play()
            }
            setCameraReady(true)
          })
          .catch(() => setError('Camera access denied. Please allow camera permissions.'))
      })
  }, [])

  useEffect(() => {
    startCamera(facingMode)
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop())
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-dismiss hints after 4 seconds
  useEffect(() => {
    if (showHints && surfaceState === 'placed') {
      const timer = setTimeout(() => setShowHints(false), 4000)
      return () => clearTimeout(timer)
    }
  }, [showHints, surfaceState])

  // Light estimation — sample video brightness every 500ms
  useEffect(() => {
    if (!cameraReady || frozen) return
    const canvas = document.createElement('canvas')
    canvas.width = 64
    canvas.height = 48
    lightCanvas.current = canvas
    const ctx = canvas.getContext('2d', { willReadFrequently: true })

    const interval = setInterval(() => {
      if (!videoRef.current || videoRef.current.paused) return
      ctx.drawImage(videoRef.current, 0, 0, 64, 48)
      const frame = ctx.getImageData(0, 0, 64, 48)
      const data = frame.data
      let totalBrightness = 0
      const pixelCount = data.length / 4
      for (let i = 0; i < data.length; i += 16) {
        totalBrightness += (data[i] * 0.299 + data[i+1] * 0.587 + data[i+2] * 0.114)
      }
      const avgBrightness = totalBrightness / (pixelCount / 4) / 255
      // Map 0-1 brightness to light intensity range 0.3 - 1.2
      const intensity = 0.3 + avgBrightness * 0.9
      setLightIntensity(prev => prev + (intensity - prev) * 0.15)
    }, 500)

    return () => clearInterval(interval)
  }, [cameraReady, frozen])

  // Flip camera
  const flipCamera = useCallback(() => {
    const newMode = facingMode === 'environment' ? 'user' : 'environment'
    setFacingMode(newMode)
    startCamera(newMode)
  }, [facingMode, startCamera])

  // Toggle spin for active shoe
  const toggleSpin = useCallback(() => {
    updateActiveShoe({ spinning: !activeShoe.spinning })
  }, [activeShoe, updateActiveShoe])

  // Keyboard controls
  const handleKey = useCallback((e) => {
    const step = 0.1
    switch (e.key) {
      case 'ArrowUp': updateActiveShoe({ pos: [activeShoe.pos[0], activeShoe.pos[1] + step, activeShoe.pos[2]] }); break
      case 'ArrowDown': updateActiveShoe({ pos: [activeShoe.pos[0], activeShoe.pos[1] - step, activeShoe.pos[2]] }); break
      case 'ArrowLeft': updateActiveShoe({ pos: [activeShoe.pos[0] - step, activeShoe.pos[1], activeShoe.pos[2]] }); break
      case 'ArrowRight': updateActiveShoe({ pos: [activeShoe.pos[0] + step, activeShoe.pos[1], activeShoe.pos[2]] }); break
      case '+': case '=': updateActiveShoe({ scale: Math.min(activeShoe.scale + 0.2, 6) }); break
      case '-': case '_': updateActiveShoe({ scale: Math.max(activeShoe.scale - 0.2, 0.5) }); break
      case ' ': setFrozen(f => !f); e.preventDefault(); break
      case 'r': case 'R': updateActiveShoe({ rotation: activeShoe.rotation + 0.3 }); break
      case 'f': case 'F': flipCamera(); break
      case 's': case 'S': toggleSpin(); break
      case 'b': case 'B': setBgBlur(b => !b); break
      case 'c': case 'C': if (shoes.length < 2) addCompareShoe(); break
      case 'Tab':
        e.preventDefault()
        if (shoes.length > 1) {
          const ids = shoes.map(s => s.id)
          const idx = ids.indexOf(activeShoeId)
          setActiveShoeId(ids[(idx + 1) % ids.length])
        }
        break
      case 'Escape': onClose(); break
    }
  }, [onClose, flipCamera, toggleSpin, activeShoe, updateActiveShoe, shoes, activeShoeId, addCompareShoe])

  useEffect(() => {
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [handleKey])

  // Drag handler — moves active shoe
  const handleDrag = useCallback((dx, dy) => {
    setShoes(prev => prev.map(s => s.id === activeShoeId
      ? { ...s, pos: [s.pos[0] + dx, s.pos[1] + dy, s.pos[2]] }
      : s
    ))
  }, [activeShoeId])

  // Pinch handler
  const handlePinch = useCallback((delta) => {
    setShoes(prev => prev.map(s => s.id === activeShoeId
      ? { ...s, scale: Math.max(0.5, Math.min(6, s.scale + delta)) }
      : s
    ))
  }, [activeShoeId])

  // Rotation gesture handler
  const handleRotate = useCallback((angleDelta) => {
    setShoes(prev => prev.map(s => s.id === activeShoeId
      ? { ...s, rotation: s.rotation + angleDelta }
      : s
    ))
  }, [activeShoeId])

  // Freeze / unfreeze camera
  const toggleFreeze = () => {
    if (!frozen && videoRef.current) videoRef.current.pause()
    else if (frozen && videoRef.current) videoRef.current.play()
    setFrozen(!frozen)
  }

  // Screenshot + share
  const captureScreenshot = useCallback(() => {
    try {
      const overlay = document.createElement('canvas')
      overlay.width = window.innerWidth
      overlay.height = window.innerHeight
      const ctx = overlay.getContext('2d')
      if (videoRef.current) ctx.drawImage(videoRef.current, 0, 0, overlay.width, overlay.height)
      const threeCanvas = document.querySelector('canvas')
      if (threeCanvas) ctx.drawImage(threeCanvas, 0, 0, overlay.width, overlay.height)
      const dataUrl = overlay.toDataURL('image/png')
      setLastCapture(dataUrl)
      setShowShareMenu(true)
      setCaptureFlash(true)
      setTimeout(() => setCaptureFlash(false), 200)
    } catch (err) {
      console.error('Screenshot failed:', err)
    }
  }, [])

  const downloadCapture = useCallback(() => {
    if (!lastCapture) return
    const link = document.createElement('a')
    link.download = 'stockx-ar-tryon.png'
    link.href = lastCapture
    link.click()
    setShowShareMenu(false)
  }, [lastCapture])

  const shareCapture = useCallback(async () => {
    if (!lastCapture) return
    try {
      const res = await fetch(lastCapture)
      const blob = await res.blob()
      const file = new File([blob], 'stockx-ar-tryon.png', { type: 'image/png' })
      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: 'StockX AR Try-On' })
      } else if (navigator.clipboard) {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
        alert('Copied to clipboard!')
      } else {
        downloadCapture()
      }
    } catch (err) {
      if (err.name !== 'AbortError') downloadCapture()
    }
    setShowShareMenu(false)
  }, [lastCapture, downloadCapture])

  const copyCapture = useCallback(async () => {
    if (!lastCapture) return
    try {
      const res = await fetch(lastCapture)
      const blob = await res.blob()
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
      alert('Copied to clipboard!')
    } catch {
      alert('Copy not supported in this browser')
    }
    setShowShareMenu(false)
  }, [lastCapture])

  // Set active shoe colorway
  const setColorway = (c) => updateActiveShoe({ colorway: c })

  if (error) {
    return (
      <div className={styles.overlay}>
        <div className={styles.error}>
          <p>{error}</p>
          <button onClick={onClose} className={styles.closeBtn}>Close</button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.overlay}>
      {captureFlash && <div className={styles.flash} />}

      <video ref={videoRef} className={`${styles.video} ${bgBlur ? styles.videoBlurred : ""}`} playsInline muted />

      {/* Surface detection scanning overlay */}
      {cameraReady && surfaceState === 'scanning' && (
        <div className={styles.scanOverlay}>
          <div className={styles.scanCard}>
            <div className={styles.scanSpinner} />
            <p className={styles.scanText}>Scanning for surface...</p>
            <p className={styles.scanSubtext}>Point camera at a flat surface</p>
          </div>
          {/* Corner brackets */}
          <div className={`${styles.scanCorner} ${styles.scanTL}`} />
          <div className={`${styles.scanCorner} ${styles.scanTR}`} />
          <div className={`${styles.scanCorner} ${styles.scanBL}`} />
          <div className={`${styles.scanCorner} ${styles.scanBR}`} />
        </div>
      )}

      {/* Surface detected flash */}
      {cameraReady && surfaceState === 'detected' && (
        <div className={styles.detectedOverlay}>
          <div className={styles.detectedBadge}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M20 6L9 17l-5-5" stroke="#08a05c" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span>Surface Detected</span>
          </div>
        </div>
      )}

      {cameraReady && (
        <div className={styles.canvasOverlay}>
          <Canvas
            ref={canvasRef}
            camera={{ position: [0, 0, 3], fov: 50 }}
            gl={{ alpha: true, preserveDrawingBuffer: true }}
            style={{ background: 'transparent' }}
          >
            <ambientLight intensity={lightIntensity} />
            <directionalLight position={[5, 5, 5]} intensity={lightIntensity * 0.85} />
            <pointLight position={[-3, 3, 2]} intensity={lightIntensity * 0.4} />
            <Suspense fallback={null}>
              {/* Surface grid */}
              <SurfaceGrid position={[0, surfaceY, 0]} detected={surfaceState === 'detected' || surfaceState === 'placed'} />
              <ScanRing active={surfaceState === 'scanning'} position={[0, surfaceY, 0]} />

              {/* Render all shoes */}
              {shoes.map((shoe) => (
                <group key={shoe.id}>
                  <ARShoe
                    id={shoe.id}
                    position={shoe.pos}
                    scale={shoe.scale}
                    colorway={shoe.colorway}
                    visible={shoe.visible}
                    rotation={shoe.rotation}
                    spinning={shoe.spinning}
                    isActive={shoe.id === activeShoeId && shoes.length > 1}
                    onTap={setActiveShoeId}
                  />
                  <ContactShadows
                    rotation-x={Math.PI / 2}
                    position={[shoe.pos[0], shoe.pos[1] - 0.4, shoe.pos[2]]}
                    opacity={shoe.visible ? 0.4 : 0}
                    width={4}
                    height={4}
                    blur={2.5}
                    far={1}
                  />
                </group>
              ))}
              {/* Product image billboard */}
              <ProductBillboard
                image={productImage}
                visible={surfaceState === 'placed'}
                position={[activeShoe.pos[0] - 1.8, activeShoe.pos[1] + 0.8, activeShoe.pos[2]]}
              />
            </Suspense>
            <DragControls onDrag={handleDrag} onPinch={handlePinch} onRotate={handleRotate} />
          </Canvas>
        </div>
      )}

      {/* First-time hint overlay */}
      {showHints && surfaceState === 'placed' && (
        <div className={styles.hintOverlay} onClick={() => setShowHints(false)}>
          <div className={styles.hintCard}>
            <div className={styles.hintIcon}>
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                <circle cx="18" cy="24" r="6" stroke="#fff" strokeWidth="2" fill="none" />
                <circle cx="30" cy="24" r="6" stroke="#fff" strokeWidth="2" fill="none" />
                <path d="M18 18 L18 12 M30 18 L30 12" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
                <path d="M12 24 C12 24 15 20 18 24 C21 28 27 20 30 24 C33 28 36 24 36 24" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            <h3 className={styles.hintTitle}>AR Controls</h3>
            <div className={styles.hintList}>
              <span>1 finger drag — move shoe</span>
              <span>Pinch — resize</span>
              <span>2-finger twist — rotate</span>
              <span>Compare — add a 2nd shoe</span>
              <span>Tap anywhere to dismiss</span>
            </div>
          </div>
        </div>
      )}

      {/* Top bar */}
      <div className={styles.topBar}>
        <button onClick={onClose} className={styles.closeBtn}>Close</button>
        <span className={styles.arLabel}>{productName ? `AR: ${productName.slice(0, 25)}` : 'AR Try-On'}</span>
        <button onClick={captureScreenshot} className={styles.captureBtn}>Capture</button>
      </div>

      {/* Colorway picker — applies to active shoe */}
      {surfaceState === 'placed' && (
        <div className={styles.colorBar}>
          {shoes.length > 1 && (
            <span className={styles.activeLabel}>
              {activeShoeId === 1 ? 'Left' : 'Right'}
            </span>
          )}
          {COLORWAYS.map((c) => (
            <button
              key={c.name}
              className={`${styles.colorBtn} ${activeShoe.colorway.name === c.name ? styles.colorActive : ''}`}
              onClick={() => setColorway(c)}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}

      {/* Multi-shoe compare indicator */}
      {shoes.length > 1 && surfaceState === 'placed' && (
        <div className={styles.compareBar}>
          {shoes.map((s) => (
            <button
              key={s.id}
              className={`${styles.compareTab} ${s.id === activeShoeId ? styles.compareActive : ''}`}
              onClick={() => setActiveShoeId(s.id)}
            >
              {s.colorway.name}
            </button>
          ))}
        </div>
      )}

      {/* Share menu */}
      {showShareMenu && lastCapture && (
        <div className={styles.shareOverlay} onClick={() => setShowShareMenu(false)}>
          <div className={styles.shareCard} onClick={(e) => e.stopPropagation()}>
            <img src={lastCapture} alt="AR Capture" className={styles.sharePreview} />
            <div className={styles.shareActions}>
              <button onClick={downloadCapture} className={styles.shareBtn}>Download</button>
              <button onClick={copyCapture} className={styles.shareBtn}>Copy</button>
              <button onClick={shareCapture} className={`${styles.shareBtn} ${styles.sharePrimary}`}>Share</button>
            </div>
            <button onClick={() => setShowShareMenu(false)} className={styles.shareDismiss}>Dismiss</button>
          </div>
        </div>
      )}

      {/* Bottom controls */}
      {surfaceState === 'placed' && (
        <div className={styles.hud}>
          <div className={styles.controlRow}>
            <button onClick={() => updateActiveShoe({ scale: Math.max(0.5, activeShoe.scale - 0.3) })} className={styles.ctrlBtn}>-</button>
            <button onClick={flipCamera} className={styles.ctrlBtn} title="Flip Camera (F)">Flip</button>
            <button onClick={() => setBgBlur(b => !b)} className={`${styles.ctrlBtn} ${bgBlur ? styles.blurActive : ''}`} title="Background Blur (B)">Blur</button>
            <button onClick={toggleFreeze} className={`${styles.ctrlBtn} ${styles.freezeBtn} ${frozen ? styles.frozenActive : ''}`}>
              {frozen ? 'Unfreeze' : 'Freeze'}
            </button>
            <button onClick={toggleSpin} className={`${styles.ctrlBtn} ${activeShoe.spinning ? styles.spinActive : ''}`} title="360 Spin (S)">
              Spin
            </button>
            {shoes.length < 2 ? (
              <button onClick={addCompareShoe} className={`${styles.ctrlBtn} ${styles.compareBtn}`} title="Compare (C)">Compare</button>
            ) : (
              <button onClick={removeCompareShoe} className={`${styles.ctrlBtn} ${styles.removeCmpBtn}`}>Remove</button>
            )}
            <button onClick={() => {
              setShoes([{ id: 1, pos: [0, surfaceY, 0], scale: 2.5, rotation: 0.8, spinning: false, colorway: COLORWAYS[0], visible: true }])
              setActiveShoeId(1)
            }} className={styles.ctrlBtn}>Reset</button>
            <button onClick={() => updateActiveShoe({ scale: Math.min(6, activeShoe.scale + 0.3) })} className={styles.ctrlBtn}>+</button>
          </div>
          <p className={styles.hint}>Drag to move | Pinch to resize | Twist to rotate | B=blur | C=compare</p>
        </div>
      )}
    </div>
  )
}
