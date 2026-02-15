import { Suspense, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, useGLTF, ContactShadows, Environment } from '@react-three/drei'
import styles from './Viewer3D.module.css'

const COLORS = [
  { name: 'Original', items: { laces: '#fff', mesh: '#fff', caps: '#fff', inner: '#fff', sole: '#fff', stripes: '#fff', band: '#fff', patch: '#fff' } },
  { name: 'Chicago', items: { laces: '#fff', mesh: '#d32f2f', caps: '#111', inner: '#111', sole: '#fff', stripes: '#d32f2f', band: '#111', patch: '#d32f2f' } },
  { name: 'Royal', items: { laces: '#fff', mesh: '#1565c0', caps: '#111', inner: '#111', sole: '#fff', stripes: '#1565c0', band: '#111', patch: '#1565c0' } },
  { name: 'Shadow', items: { laces: '#555', mesh: '#333', caps: '#222', inner: '#222', sole: '#444', stripes: '#333', band: '#222', patch: '#333' } },
  { name: 'Bred', items: { laces: '#111', mesh: '#111', caps: '#d32f2f', inner: '#111', sole: '#d32f2f', stripes: '#d32f2f', band: '#d32f2f', patch: '#111' } },
]

function Shoe({ colorway, autoRotate }) {
  const ref = useRef()
  const { nodes, materials } = useGLTF('/models/shoe.glb')

  useFrame((state) => {
    if (!autoRotate) return
    const t = state.clock.getElapsedTime()
    ref.current.rotation.y = t * 0.3
  })

  const c = colorway.items

  return (
    <group ref={ref} dispose={null} scale={3} position={[0, -0.3, 0]}>
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

// Preset camera angles
const ANGLES = [
  { name: 'Front', pos: [0, 0, 2.5] },
  { name: 'Side', pos: [2.5, 0, 0] },
  { name: 'Top', pos: [0, 2.5, 0] },
  { name: 'Bottom', pos: [0, -2.5, 0] },
  { name: 'Back', pos: [0, 0, -2.5] },
]

export default function Viewer3D() {
  const [colorway, setColorway] = useState(COLORS[0])
  const [autoRotate, setAutoRotate] = useState(true)
  const controlsRef = useRef()

  const handleAngle = (pos) => {
    if (controlsRef.current) {
      controlsRef.current.object.position.set(...pos)
      controlsRef.current.update()
    }
    setAutoRotate(false)
  }

  return (
    <div className={styles.container}>
      <div className={styles.canvasWrap}>
        <Canvas camera={{ position: [0, 0, 2.5], fov: 45 }}>
          <ambientLight intensity={0.5} />
          <spotLight intensity={0.5} angle={0.15} penumbra={1} position={[5, 15, 10]} />
          <Suspense fallback={null}>
            <Shoe colorway={colorway} autoRotate={autoRotate} />
            <ContactShadows
              rotation-x={Math.PI / 2}
              position={[0, -0.8, 0]}
              opacity={0.3}
              width={10}
              height={10}
              blur={2}
              far={1}
            />
          </Suspense>
          <OrbitControls
            ref={controlsRef}
            enablePan={false}
            minDistance={1.5}
            maxDistance={5}
            onStart={() => setAutoRotate(false)}
          />
        </Canvas>
      </div>

      <div className={styles.controls}>
        <div className={styles.section}>
          <span className={styles.label}>View</span>
          <div className={styles.btnGroup}>
            {ANGLES.map((a) => (
              <button key={a.name} className={styles.btn} onClick={() => handleAngle(a.pos)}>
                {a.name}
              </button>
            ))}
            <button className={`${styles.btn} ${autoRotate ? styles.active : ''}`} onClick={() => setAutoRotate(!autoRotate)}>
              Spin
            </button>
          </div>
        </div>

        <div className={styles.section}>
          <span className={styles.label}>Colorway</span>
          <div className={styles.btnGroup}>
            {COLORS.map((c) => (
              <button
                key={c.name}
                className={`${styles.btn} ${colorway.name === c.name ? styles.active : ''}`}
                onClick={() => setColorway(c)}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

useGLTF.preload('/models/shoe.glb')
