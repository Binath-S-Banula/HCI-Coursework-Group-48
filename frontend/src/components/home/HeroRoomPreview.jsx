import { Suspense, useMemo, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, useGLTF } from '@react-three/drei'
import { clone } from 'three/examples/jsm/utils/SkeletonUtils'
import { Color } from 'three'
import { Move } from 'lucide-react'
import modelA from '../../uploads/3d-room/1773810976470-795604059.glb'
import modelB from '../../uploads/3d-room/1773832482916-914491207.glb'
import modelE from '../../uploads/3d-room/1773859167970-807773799.glb'

const roomAssets = [
  { url: modelA, position: [-1.95, 0.04, -1.95], rotation: [0, 0.95, 0], scale: 2.16, tint: '#6b63dd' },
  { url: modelB, position: [0.95, 0.04, 0.85], rotation: [0, -2.15, 0], scale: 0.66, tint: '#33b892' },
  { url: modelE, position: [-0.15, 0.04, 2.2], rotation: [0, -1.92, 0], scale: 0.58, tint: '#cf7257' },
]

function tintMaterial(material, tint) {
  const materialClone = material.clone()
  const tintColor = new Color(tint)

  materialClone.map = null
  materialClone.emissiveMap = null
  materialClone.aoMap = null
  materialClone.lightMap = null
  materialClone.needsUpdate = true

  if (materialClone.color) {
    materialClone.color.copy(tintColor)
  }
  if (materialClone.emissive) {
    materialClone.emissive.copy(tintColor).multiplyScalar(0.07)
  }
  if (typeof materialClone.emissiveIntensity === 'number') {
    materialClone.emissiveIntensity = 0.22
  }
  if (typeof materialClone.roughness === 'number') {
    materialClone.roughness = 0.62
  }
  if (typeof materialClone.metalness === 'number') {
    materialClone.metalness = 0.1
  }

  return materialClone
}

function FurnishedModel({ url, position, rotation, scale, tint }) {
  const gltf = useGLTF(url)
  const scene = useMemo(() => {
    const clonedScene = clone(gltf.scene)

    clonedScene.traverse((node) => {
      if (!node.isMesh) {
        return
      }

      if (Array.isArray(node.material)) {
        node.material = node.material.map((materialItem) => tintMaterial(materialItem, tint))
      } else if (node.material) {
        node.material = tintMaterial(node.material, tint)
      }
    })

    return clonedScene
  }, [gltf.scene, tint])

  return <primitive object={scene} position={position} rotation={rotation} scale={scale} castShadow receiveShadow />
}

function RoomModel() {
  return (
    <group>
      <mesh position={[0, -0.04, 0]}>
        <boxGeometry args={[9, 0.08, 9]} />
        <meshStandardMaterial color="#35354e" roughness={0.72} metalness={0.08} />
      </mesh>

      <mesh position={[0, 2.25, -4.5]}>
        <planeGeometry args={[9, 4.5]} />
        <meshStandardMaterial color="#2d2d45" roughness={0.84} metalness={0.05} />
      </mesh>

      <mesh position={[-4.5, 2.25, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[9, 4.5]} />
        <meshStandardMaterial color="#2a2a42" roughness={0.84} metalness={0.04} />
      </mesh>

      {roomAssets.map((asset) => (
        <FurnishedModel
          key={asset.url}
          url={asset.url}
          position={asset.position}
          rotation={asset.rotation}
          scale={asset.scale}
          tint={asset.tint}
        />
      ))}
    </group>
  )
}

export default function HeroRoomPreview() {
  const resumeTimerRef = useRef(null)
  const [isUserInteracting, setIsUserInteracting] = useState(false)

  const handleControlStart = () => {
    if (resumeTimerRef.current) {
      clearTimeout(resumeTimerRef.current)
      resumeTimerRef.current = null
    }
    setIsUserInteracting(true)
  }

  const handleControlEnd = () => {
    if (resumeTimerRef.current) {
      clearTimeout(resumeTimerRef.current)
    }
    resumeTimerRef.current = setTimeout(() => {
      setIsUserInteracting(false)
    }, 1200)
  }

  return (
    <div className="hp-room" aria-label="Interactive 3D room preview">
      <Canvas
        gl={{ antialias: false, powerPreference: 'low-power' }}
        camera={{ position: [5.4, 2.9, 6.2], fov: 38 }}
        dpr={[1, 1.25]}
      >
        <color attach="background" args={['#1f1f33']} />
        <hemisphereLight intensity={0.62} groundColor="#171727" />
        <ambientLight intensity={0.56} />
        <directionalLight
          position={[4.8, 6.2, 3.2]}
          intensity={1.05}
        />
        <spotLight position={[-3.5, 4.8, 1.8]} intensity={0.3} angle={0.42} penumbra={0.55} color="#d7d4ff" />
        <spotLight position={[0.5, 3.8, -3.9]} intensity={0.24} angle={0.44} penumbra={0.6} color="#e4fff7" />

        <Suspense fallback={null}>
          <RoomModel />
        </Suspense>

        <OrbitControls
          enablePan={false}
          enableZoom={false}
          minPolarAngle={0.95}
          maxPolarAngle={1.52}
          enableDamping
          dampingFactor={0.075}
          rotateSpeed={0.55}
          autoRotate={!isUserInteracting}
          autoRotateSpeed={0.26}
          onStart={handleControlStart}
          onEnd={handleControlEnd}
        />
      </Canvas>
      <div className="hp-room__dragIcon" aria-hidden="true">
        <Move size={15} />
      </div>
    </div>
  )
}
