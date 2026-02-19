# Lesson 5: 3D Rendering and AR with React Three Fiber

## What You'll Learn
- Three.js basics: scenes, cameras, lights, meshes
- React Three Fiber (R3F): Three.js as React components
- Loading 3D models (.glb files)
- WebRTC camera access for AR
- Touch gesture handling (drag, pinch, rotate)
- Canvas-based light estimation
- Screenshot capture and sharing

## Project Context
The StockX Clone has two 3D features: a product viewer (rotate a 3D shoe model) and an AR camera (overlay shoes on your real environment through the camera).

---

## Part 1: 3D Product Viewer (Intro to R3F)

### `client/src/components/Viewer3D.jsx` (124 lines)

This is the simpler component -- a good starting point before tackling AR.

```jsx
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, useGLTF, Environment } from '@react-three/drei'

function ShoeModel({ colorway }) {
  const { scene } = useGLTF('/shoe.glb')

  useEffect(() => {
    scene.traverse((child) => {
      if (child.isMesh) {
        child.material = child.material.clone()
        child.material.color.set(colorway)
      }
    })
  }, [colorway, scene])

  return <primitive object={scene} scale={2.5} position={[0, -0.5, 0]} />
}
```

**Breaking it down:**
- `useGLTF('/shoe.glb')` -- loads a 3D model file. GLB is the binary version of glTF (the "JPEG of 3D")
- `scene.traverse()` -- walks every object in the 3D model tree
- `child.isMesh` -- meshes are the visible surfaces (geometry + material)
- `child.material.clone()` -- clone so we can change color without affecting the original
- `child.material.color.set(colorway)` -- change the shoe color
- `<primitive object={scene}>` -- R3F way to render a raw Three.js object

#### The Canvas
```jsx
<Canvas camera={{ position: [0, 1, 4], fov: 45 }}>
  <ambientLight intensity={0.5} />
  <directionalLight position={[5, 5, 5]} intensity={1} />
  <ShoeModel colorway={selectedColor} />
  <OrbitControls enablePan={false} />
  <Environment preset="studio" />
</Canvas>
```

**Three.js concepts as React components:**
- `<Canvas>` -- creates a WebGL rendering context. Everything inside is 3D
- `camera={{ position: [0, 1, 4] }}` -- camera at x=0, y=1 (slightly above), z=4 (pulled back)
- `fov: 45` -- field of view in degrees (human eye is ~60)
- `<ambientLight>` -- uniform light everywhere (prevents pure black shadows)
- `<directionalLight>` -- like the sun, shining from a specific direction
- `<OrbitControls>` -- click and drag to rotate, scroll to zoom
- `<Environment preset="studio">` -- adds realistic reflections

#### Camera Angle Presets
```jsx
function CameraController({ angle }) {
  const { camera } = useThree()

  useEffect(() => {
    const positions = {
      front: [0, 1, 4],
      side: [4, 1, 0],
      top: [0, 4, 0.1],
      back: [0, 1, -4],
    }
    const pos = positions[angle] || positions.front
    camera.position.set(...pos)
    camera.lookAt(0, 0, 0)
  }, [angle, camera])

  return null // This component doesn't render anything visible
}
```

`useThree()` gives access to the Three.js camera, scene, and renderer from within R3F.

---

## Part 2: AR Camera (Advanced)

### `client/src/components/ARCamera.jsx` (787 lines)

The AR camera is the most complex component in the project. It layers a Three.js scene on top of a live camera feed.

#### Architecture
```
+---------------------------+
|  <video> (camera feed)    |  <- WebRTC getUserMedia
|  +---------------------+  |
|  | <Canvas> (3D scene)  |  |  <- React Three Fiber, transparent background
|  |   - 3D shoe model    |  |
|  |   - product billboard |  |
|  |   - lights            |  |
|  +---------------------+  |
|  +---------------------+  |
|  | HUD (buttons, UI)    |  |  <- Regular HTML overlaid on top
|  +---------------------+  |
+---------------------------+
```

#### Camera Access (WebRTC)
```jsx
useEffect(() => {
  navigator.mediaDevices.getUserMedia({
    video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
  })
  .then((stream) => {
    videoRef.current.srcObject = stream
    videoRef.current.play()
    setCameraReady(true)
  })
  .catch(() => setCameraError(true))

  return () => {
    // Cleanup: stop all camera tracks when component unmounts
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(t => t.stop())
    }
  }
}, [])
```

- `facingMode: 'environment'` -- use the back camera (not selfie cam)
- `ideal: 1280` -- request 720p, but accept whatever the device supports
- **Cleanup function** -- critical! Without it, the camera stays on after leaving AR mode

#### Touch Gesture Controls
```jsx
function DragControls({ children, onDrag, onPinch, onTwoFingerRotate }) {
  const groupRef = useRef()
  const lastTouch = useRef(null)
  const lastDist = useRef(null)
  const lastAngle = useRef(null)

  const onPointerDown = (e) => {
    e.stopPropagation()
    lastTouch.current = { x: e.clientX, y: e.clientY }
  }

  const onPointerMove = (e) => {
    if (!lastTouch.current) return
    const dx = e.clientX - lastTouch.current.x
    const dy = e.clientY - lastTouch.current.y
    onDrag(dx * 0.005, -dy * 0.005)
    lastTouch.current = { x: e.clientX, y: e.clientY }
  }

  // Scroll wheel for trackpad/mouse zoom
  const onWheel = (e) => {
    e.preventDefault()
    const delta = -e.deltaY * 0.005
    onPinch(delta)
  }
```

- **One finger**: drag the shoe around the screen
- **Two fingers pinch**: resize the shoe (zoom in/out)
- **Two finger rotate**: spin the shoe
- **Scroll wheel**: alternative resize for trackpad users
- All deltas are multiplied by small values (0.005) to convert pixel movement to 3D space movement

#### Light Estimation
```jsx
useEffect(() => {
  if (!cameraReady || frozen) return
  const canvas = document.createElement('canvas')
  canvas.width = 64; canvas.height = 48
  const ctx = canvas.getContext('2d', { willReadFrequently: true })

  const interval = setInterval(() => {
    ctx.drawImage(videoRef.current, 0, 0, 64, 48)
    const frame = ctx.getImageData(0, 0, 64, 48)
    let total = 0
    for (let i = 0; i < frame.data.length; i += 4) {
      total += frame.data[i] * 0.299 + frame.data[i+1] * 0.587 + frame.data[i+2] * 0.114
    }
    const avgBrightness = total / (64 * 48) / 255
    const intensity = 0.3 + avgBrightness * 0.9
    setLightIntensity(prev => prev + (intensity - prev) * 0.15)
  }, 500)

  return () => clearInterval(interval)
}, [cameraReady, frozen])
```

**How it works:**
1. Every 500ms, draw the camera frame onto a tiny 64x48 canvas (for speed)
2. Read all pixels and calculate average brightness using the luminance formula: `0.299*R + 0.587*G + 0.114*B` (matches human eye sensitivity)
3. Map brightness to a light intensity value (0.3 to 1.2)
4. Smooth transition with `prev + (intensity - prev) * 0.15` (lerp/easing)
5. The Three.js lights use this intensity, so the 3D shoe brightness matches the real room

#### Screenshot and Share
```jsx
const capturePhoto = () => {
  const canvas = document.createElement('canvas')
  canvas.width = videoRef.current.videoWidth
  canvas.height = videoRef.current.videoHeight
  const ctx = canvas.getContext('2d')

  // Draw camera frame
  ctx.drawImage(videoRef.current, 0, 0)

  // Draw 3D scene on top
  const glCanvas = document.querySelector('.ar-canvas canvas')
  if (glCanvas) ctx.drawImage(glCanvas, 0, 0, canvas.width, canvas.height)

  const dataUrl = canvas.toDataURL('image/png')
  setLastCapture(dataUrl)
  setShowShareMenu(true)
}
```

Composites the camera feed + 3D overlay into one image. Then shows Download/Copy/Share buttons using the Web Share API.

---

## Exercises

1. **Add a shoe size reference**: Place a flat plane in the 3D scene at the shoe's base that shows the actual shoe size dimensions.
2. **Add multiple models**: Load different .glb files based on the product category (sneaker, boot, sandal).
3. **Add rotation animation**: Make the shoe slowly auto-rotate when the user isn't touching it.

## Key Takeaways
- React Three Fiber lets you write Three.js as JSX components
- `useGLTF` loads 3D models, `scene.traverse` modifies their materials
- WebRTC `getUserMedia` accesses the camera -- always clean up on unmount
- Touch gestures: track pointer events, calculate deltas, apply to 3D transforms
- Light estimation: sample camera brightness, match 3D lighting to the real environment
- Canvas compositing: draw camera + 3D + UI layers together for screenshots
