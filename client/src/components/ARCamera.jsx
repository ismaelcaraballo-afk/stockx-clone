import { Suspense, useRef, useState, useEffect, useCallback } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, useGLTF } from '@react-three/drei'
import styles from './ARCamera.module.css'

function DraggableShoe({ position }) {
  const { nodes, materials } = useGLTF('/models/shoe.glb')

  return (
    <group scale={2.5} position={position} rotation={[0.3, 0.8, 0]}>
      <mesh geometry={nodes.shoe.geometry} material={materials.laces} />
      <mesh geometry={nodes.shoe_1.geometry} material={materials.mesh} />
      <mesh geometry={nodes.shoe_2.geometry} material={materials.caps} />
      <mesh geometry={nodes.shoe_3.geometry} material={materials.inner} />
      <mesh geometry={nodes.shoe_4.geometry} material={materials.sole} />
      <mesh geometry={nodes.shoe_5.geometry} material={materials.stripes} />
      <mesh geometry={nodes.shoe_6.geometry} material={materials.band} />
      <mesh geometry={nodes.shoe_7.geometry} material={materials.patch} />
    </group>
  )
}

export default function ARCamera({ onClose }) {
  const videoRef = useRef()
  const streamRef = useRef(null)
  const [cameraReady, setCameraReady] = useState(false)
  const [error, setError] = useState(null)
  const [shoePos, setShoePos] = useState([0, -0.5, 0])
  const [scale, setScale] = useState(2.5)

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
      })
      .catch(() => {
        // Fallback to any camera
        navigator.mediaDevices
          .getUserMedia({ video: true })
          .then((stream) => {
            if (cancelled) { stream.getTracks().forEach(t => t.stop()); return }
            streamRef.current = stream
            videoRef.current.srcObject = stream
            videoRef.current.play()
            setCameraReady(true)
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

  // Keyboard controls for position
  const handleKey = useCallback((e) => {
    const step = 0.1
    switch (e.key) {
      case 'ArrowUp': setShoePos(p => [p[0], p[1] + step, p[2]]); break
      case 'ArrowDown': setShoePos(p => [p[0], p[1] - step, p[2]]); break
      case 'ArrowLeft': setShoePos(p => [p[0] - step, p[1], p[2]]); break
      case 'ArrowRight': setShoePos(p => [p[0] + step, p[1], p[2]]); break
      case '+': case '=': setScale(s => Math.min(s + 0.2, 6)); break
      case '-': case '_': setScale(s => Math.max(s - 0.2, 0.5)); break
      case 'Escape': onClose(); break
    }
  }, [onClose])

  useEffect(() => {
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [handleKey])

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
      <video ref={videoRef} className={styles.video} playsInline muted />

      {cameraReady && (
        <div className={styles.canvasOverlay}>
          <Canvas camera={{ position: [0, 0, 3], fov: 50 }} style={{ background: 'transparent' }} gl={{ alpha: true }}>
            <ambientLight intensity={0.8} />
            <directionalLight position={[5, 5, 5]} intensity={0.5} />
            <Suspense fallback={null}>
              <DraggableShoe position={shoePos} />
            </Suspense>
            <OrbitControls enablePan={true} enableZoom={true} />
          </Canvas>
        </div>
      )}

      <div className={styles.hud}>
        <button onClick={onClose} className={styles.closeBtn}>Close AR</button>
        <div className={styles.instructions}>
          <p>Drag to rotate | Scroll to zoom</p>
          <p>Arrow keys to move | +/- to scale</p>
        </div>
        <div className={styles.posControls}>
          <button onClick={() => setShoePos(p => [p[0], p[1] + 0.1, p[2]])} className={styles.arrowBtn}>Up</button>
          <div className={styles.posRow}>
            <button onClick={() => setShoePos(p => [p[0] - 0.1, p[1], p[2]])} className={styles.arrowBtn}>Left</button>
            <button onClick={() => setShoePos([0, -0.5, 0])} className={styles.arrowBtn}>Reset</button>
            <button onClick={() => setShoePos(p => [p[0] + 0.1, p[1], p[2]])} className={styles.arrowBtn}>Right</button>
          </div>
          <button onClick={() => setShoePos(p => [p[0], p[1] - 0.1, p[2]])} className={styles.arrowBtn}>Down</button>
        </div>
      </div>
    </div>
  )
}
