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

function ARShoe({ position, scale, colorway, visible }) {
  const ref = useRef()
  const { nodes, materials } = useGLTF('/models/shoe.glb')
  const [opacity, setOpacity] = useState(0)

  // Entrance animation — fade in and slight bounce
  useFrame((state, delta) => {
    if (!ref.current) return
    if (opacity < 1) {
      setOpacity(o => Math.min(o + delta * 2, 1))
      ref.current.scale.setScalar(scale * opacity)
      ref.current.position.y = position[1] + (1 - opacity) * 0.3
    } else {
      // Subtle floating animation
      const t = state.clock.getElapsedTime()
      ref.current.position.y = position[1] + Math.sin(t * 1.5) * 0.02
    }
  })

  if (!visible) return null

  const c = colorway.items

  return (
    <group ref={ref} position={position} rotation={[0.3, 0.8, 0]} scale={scale}>
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

// Handles touch/mouse drag to move the shoe in screen space
function DragControls({ onDrag, onPinch }) {
  const { gl, camera, size } = useThree()
  const dragging = useRef(false)
  const lastPos = useRef({ x: 0, y: 0 })
  const lastPinchDist = useRef(0)

  useEffect(() => {
    const canvas = gl.domElement

    // Mouse drag
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

    // Touch drag + pinch
    const getTouchDist = (touches) => {
      const dx = touches[0].clientX - touches[1].clientX
      const dy = touches[0].clientY - touches[1].clientY
      return Math.sqrt(dx * dx + dy * dy)
    }

    const onTouchStart = (e) => {
      if (e.touches.length === 1) {
        dragging.current = true
        lastPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
      } else if (e.touches.length === 2) {
        lastPinchDist.current = getTouchDist(e.touches)
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
        const delta = dist - lastPinchDist.current
        onPinch(delta * 0.01)
        lastPinchDist.current = dist
      }
    }
    const onTouchEnd = () => { dragging.current = false }

    canvas.addEventListener('mousedown', onMouseDown)
    canvas.addEventListener('mousemove', onMouseMove)
    canvas.addEventListener('mouseup', onMouseUp)
    canvas.addEventListener('touchstart', onTouchStart, { passive: false })
    canvas.addEventListener('touchmove', onTouchMove, { passive: false })
    canvas.addEventListener('touchend', onTouchEnd)

    return () => {
      canvas.removeEventListener('mousedown', onMouseDown)
      canvas.removeEventListener('mousemove', onMouseMove)
      canvas.removeEventListener('mouseup', onMouseUp)
      canvas.removeEventListener('touchstart', onTouchStart)
      canvas.removeEventListener('touchmove', onTouchMove)
      canvas.removeEventListener('touchend', onTouchEnd)
    }
  }, [gl, size, onDrag, onPinch])

  return null
}

export default function ARCamera({ onClose }) {
  const videoRef = useRef()
  const canvasRef = useRef()
  const streamRef = useRef(null)
  const [cameraReady, setCameraReady] = useState(false)
  const [error, setError] = useState(null)
  const [shoePos, setShoePos] = useState([0, -0.3, 0])
  const [scale, setScale] = useState(2.5)
  const [colorway, setColorway] = useState(COLORWAYS[0])
  const [frozen, setFrozen] = useState(false)
  const [showShoe, setShowShoe] = useState(false)
  const [captureFlash, setCaptureFlash] = useState(false)

  // Start camera
  useEffect(() => {
    let cancelled = false
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment', width: 1280, height: 720 } })
      .then((stream) => {
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return }
        streamRef.current = stream
        videoRef.current.srcObject = stream
        videoRef.current.play()
        setCameraReady(true)
        // Delay shoe appearance for entrance animation
        setTimeout(() => setShowShoe(true), 500)
      })
      .catch(() => {
        navigator.mediaDevices
          .getUserMedia({ video: true })
          .then((stream) => {
            if (cancelled) { stream.getTracks().forEach(t => t.stop()); return }
            streamRef.current = stream
            videoRef.current.srcObject = stream
            videoRef.current.play()
            setCameraReady(true)
            setTimeout(() => setShowShoe(true), 500)
          })
          .catch(() => setError('Camera access denied. Please allow camera permissions.'))
      })

    return () => {
      cancelled = true
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop())
      }
    }
  }, [])

  // Keyboard controls
  const handleKey = useCallback((e) => {
    const step = 0.1
    switch (e.key) {
      case 'ArrowUp': setShoePos(p => [p[0], p[1] + step, p[2]]); break
      case 'ArrowDown': setShoePos(p => [p[0], p[1] - step, p[2]]); break
      case 'ArrowLeft': setShoePos(p => [p[0] - step, p[1], p[2]]); break
      case 'ArrowRight': setShoePos(p => [p[0] + step, p[1], p[2]]); break
      case '+': case '=': setScale(s => Math.min(s + 0.2, 6)); break
      case '-': case '_': setScale(s => Math.max(s - 0.2, 0.5)); break
      case ' ': setFrozen(f => !f); e.preventDefault(); break
      case 'Escape': onClose(); break
    }
  }, [onClose])

  useEffect(() => {
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [handleKey])

  // Drag handler
  const handleDrag = useCallback((dx, dy) => {
    setShoePos(p => [p[0] + dx, p[1] + dy, p[2]])
  }, [])

  // Pinch handler
  const handlePinch = useCallback((delta) => {
    setScale(s => Math.max(0.5, Math.min(6, s + delta)))
  }, [])

  // Freeze / unfreeze camera
  const toggleFreeze = () => {
    if (!frozen && videoRef.current) {
      videoRef.current.pause()
    } else if (frozen && videoRef.current) {
      videoRef.current.play()
    }
    setFrozen(!frozen)
  }

  // Screenshot
  const captureScreenshot = () => {
    try {
      const overlay = document.createElement('canvas')
      overlay.width = window.innerWidth
      overlay.height = window.innerHeight
      const ctx = overlay.getContext('2d')

      // Draw video frame
      if (videoRef.current) {
        ctx.drawImage(videoRef.current, 0, 0, overlay.width, overlay.height)
      }

      // Draw 3D canvas on top
      const threeCanvas = document.querySelector('canvas')
      if (threeCanvas) {
        ctx.drawImage(threeCanvas, 0, 0, overlay.width, overlay.height)
      }

      // Download
      const link = document.createElement('a')
      link.download = 'stockx-ar-tryon.png'
      link.href = overlay.toDataURL('image/png')
      link.click()

      // Flash effect
      setCaptureFlash(true)
      setTimeout(() => setCaptureFlash(false), 200)
    } catch (err) {
      console.error('Screenshot failed:', err)
    }
  }

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

      <video ref={videoRef} className={styles.video} playsInline muted />

      {cameraReady && (
        <div className={styles.canvasOverlay}>
          <Canvas
            ref={canvasRef}
            camera={{ position: [0, 0, 3], fov: 50 }}
            gl={{ alpha: true, preserveDrawingBuffer: true }}
            style={{ background: 'transparent' }}
          >
            <ambientLight intensity={0.7} />
            <directionalLight position={[5, 5, 5]} intensity={0.6} />
            <pointLight position={[-3, 3, 2]} intensity={0.3} />
            <Suspense fallback={null}>
              <ARShoe position={shoePos} scale={scale} colorway={colorway} visible={showShoe} />
              <ContactShadows
                rotation-x={Math.PI / 2}
                position={[shoePos[0], shoePos[1] - 0.4, shoePos[2]]}
                opacity={0.4}
                width={4}
                height={4}
                blur={2.5}
                far={1}
              />
            </Suspense>
            <DragControls onDrag={handleDrag} onPinch={handlePinch} />
          </Canvas>
        </div>
      )}

      {/* Top bar */}
      <div className={styles.topBar}>
        <button onClick={onClose} className={styles.closeBtn}>Close</button>
        <span className={styles.arLabel}>AR Try-On</span>
        <button onClick={captureScreenshot} className={styles.captureBtn}>Capture</button>
      </div>

      {/* Colorway picker */}
      <div className={styles.colorBar}>
        {COLORWAYS.map((c) => (
          <button
            key={c.name}
            className={`${styles.colorBtn} ${colorway.name === c.name ? styles.colorActive : ''}`}
            onClick={() => setColorway(c)}
          >
            {c.name}
          </button>
        ))}
      </div>

      {/* Bottom controls */}
      <div className={styles.hud}>
        <div className={styles.controlRow}>
          <button onClick={() => setScale(s => Math.max(0.5, s - 0.3))} className={styles.ctrlBtn}>-</button>
          <button onClick={toggleFreeze} className={`${styles.ctrlBtn} ${styles.freezeBtn} ${frozen ? styles.frozenActive : ''}`}>
            {frozen ? 'Unfreeze' : 'Freeze'}
          </button>
          <button onClick={() => setShoePos([0, -0.3, 0])} className={styles.ctrlBtn}>Reset</button>
          <button onClick={() => setScale(s => Math.min(6, s + 0.3))} className={styles.ctrlBtn}>+</button>
        </div>
        <p className={styles.hint}>Drag to move shoe | Pinch to resize | Space to freeze</p>
      </div>
    </div>
  )
}
