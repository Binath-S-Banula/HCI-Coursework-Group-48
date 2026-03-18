import { Suspense, useEffect, useState, useMemo, useRef } from 'react'
import { Canvas, useLoader, useThree, useFrame } from '@react-three/fiber'
import { OrbitControls, Environment, Grid, Box, Plane, Sky, ContactShadows, useTexture, useGLTF, Clone } from '@react-three/drei'
import { useDispatch, useSelector } from 'react-redux'
import { ChevronDown } from 'lucide-react'
import * as THREE from 'three'
import { setLightIntensity, setTimeOfDay } from '../../store/slices/editorSlice'
import '../../styles/editor/Canvas3D.css'

// ── Auto-positions camera when room data arrives ─────────────────────────────
function CameraController({ hasWalls, roomSpanMeters = 4 }) {
  const { camera } = useThree()
  const moved = useRef(false)

  useEffect(() => {
    if (hasWalls && !moved.current) {
      const span = Math.min(Math.max(roomSpanMeters, 2.5), 12)
      const distance = Math.max(3.4, span * 1.05)
      const height = Math.max(1.5, WALL_HEIGHT * 0.85)
      camera.position.set(distance * 0.78, height, distance * 1.05)
      camera.lookAt(0, WALL_HEIGHT * 0.36, 0)
      moved.current = true
    }
    if (!hasWalls) {
      moved.current = false
      camera.position.set(2.8, 2.4, 3.8)
      camera.lookAt(0, 1, 0)
    }
  }, [hasWalls, roomSpanMeters, camera])

  return null
}


const CM_PER_WORLD_UNIT = 1
const LEGACY_CM_PER_WORLD_UNIT = 5
const SCALE = CM_PER_WORLD_UNIT / 100
const WALL_THICKNESS_CM = 7
const WALL_THICKNESS = WALL_THICKNESS_CM / 100
const WALL_HALF_THICKNESS = WALL_THICKNESS / 2
const WALL_HEIGHT = 1.68
const MIN_LIGHT_INTENSITY = 0.2
const MAX_LIGHT_INTENSITY = 2
const SHADING_PRESETS = {
  morning: {
    ambient: 0.52,
    directional: 1.1,
    point: 0.65,
    pointColor: '#fff2d9',
    sunPosition: [35, 18, 28],
    skyColor: '#f8e3c2',
  },
  day: {
    ambient: 0.6,
    directional: 1.4,
    point: 0.8,
    pointColor: '#fff9e6',
    sunPosition: [100, 20, 100],
    skyColor: '#d4e4f7',
  },
  evening: {
    ambient: 0.42,
    directional: 0.95,
    point: 0.9,
    pointColor: '#ffd4a6',
    sunPosition: [-30, 10, -20],
    skyColor: '#f2be91',
  },
  night: {
    ambient: 0.24,
    directional: 0.4,
    point: 1.05,
    pointColor: '#cbdcff',
    sunPosition: [-100, -25, -90],
    skyColor: '#0e1a2b',
  },
}

function clampLightIntensity(value) {
  return Math.min(Math.max(value, MIN_LIGHT_INTENSITY), MAX_LIGHT_INTENSITY)
}

function normalizeTimeOfDay(value) {
  const normalized = String(value || '').toLowerCase()
  return SHADING_PRESETS[normalized] ? normalized : 'day'
}

function normalizeOpeningWidthCm(width, fallback = 90) {
  const value = Number(width)
  if (!Number.isFinite(value) || value <= 0) return fallback
  if (value <= 12) return value * 100
  if (value > 1000) return value / 10
  if (value <= 45) return value * LEGACY_CM_PER_WORLD_UNIT
  return value
}

function shadeColor(color, scalar = 1) {
  const c = new THREE.Color(color || '#8b6b4a')
  c.multiplyScalar(scalar)
  return `#${c.getHexString()}`
}

// ── Compute center offset from all walls so room is centered ─────────────────
function getSceneCenter(walls, floor) {
  const xs = walls.flatMap(w => [w.start.x, w.end.x])
  const ys = walls.flatMap(w => [w.start.y, w.end.y])
  if (floor && floor.w > 0 && floor.h > 0) {
    xs.push(floor.x, floor.x + floor.w)
    ys.push(floor.y, floor.y + floor.h)
  }
  if (!xs.length || !ys.length) return { cx: 0, cz: 0 }
  return {
    cx: (Math.min(...xs) + Math.max(...xs)) / 2,
    cz: (Math.min(...ys) + Math.max(...ys)) / 2,
  }
}


// ── Beautiful Window 3D component ───────────────────────────────────────────
function Window3D({ gmx, gmz, gLen, angle, wallColor, design = 'casement' }) {
  const fw  = 0.06   // frame width
  const fd  = 0.12   // frame depth
  const sillY = 0.85 // window bottom
  const topY  = WALL_HEIGHT - 0.42 // window top
  const winH  = topY - sillY
  const rot = [0, -angle, 0]
  const wc  = wallColor || '#e8e2d8'

  return (
    <group position={[gmx, 0, gmz]} rotation={rot}>
      {/* Wall fill below window (sill base) */}
      <Box args={[gLen, sillY, WALL_THICKNESS]} position={[0, sillY/2, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={wc} roughness={0.85} side={THREE.DoubleSide} />
      </Box>
      {/* Wall fill above window (lintel) */}
      <Box args={[gLen, WALL_HEIGHT - topY, WALL_THICKNESS]} position={[0, topY + (WALL_HEIGHT-topY)/2, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={wc} roughness={0.85} side={THREE.DoubleSide} />
      </Box>

      {/* Wall-colored side fills — close gaps at window sides */}
      <Box args={[WALL_THICKNESS, WALL_HEIGHT, fw]} position={[-gLen/2 - WALL_HALF_THICKNESS, WALL_HEIGHT/2, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={wc} roughness={0.85} side={THREE.DoubleSide} />
      </Box>
      <Box args={[WALL_THICKNESS, WALL_HEIGHT, fw]} position={[gLen/2 + WALL_HALF_THICKNESS, WALL_HEIGHT/2, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={wc} roughness={0.85} side={THREE.DoubleSide} />
      </Box>

      {/* Outer frame — top */}
      <Box args={[gLen + fw*2, fw, fd]} position={[0, topY + fw/2, 0]} castShadow>
        <meshStandardMaterial color="#ffffff" roughness={0.3} />
      </Box>
      {/* Outer frame — bottom (sill) */}
      <Box args={[gLen + fw*2, fw, fd*1.5]} position={[0, sillY - fw/2, 0]} castShadow>
        <meshStandardMaterial color="#ffffff" roughness={0.3} />
      </Box>
      {/* Outer frame — left */}
      <Box args={[fw, winH + fw*2, fd]} position={[-gLen/2 - fw/2, sillY + winH/2, 0]} castShadow>
        <meshStandardMaterial color="#ffffff" roughness={0.3} />
      </Box>
      {/* Outer frame — right */}
      <Box args={[fw, winH + fw*2, fd]} position={[gLen/2 + fw/2, sillY + winH/2, 0]} castShadow>
        <meshStandardMaterial color="#ffffff" roughness={0.3} />
      </Box>

      {design !== 'sliding' && (
        <>
          {/* Center mullion (vertical divider) */}
          <Box args={[fw*0.7, winH, fd*0.8]} position={[0, sillY + winH/2, 0]}>
            <meshStandardMaterial color="#f0f0f0" roughness={0.3} />
          </Box>
          {/* Center rail (horizontal divider) */}
          <Box args={[gLen, fw*0.7, fd*0.8]} position={[0, sillY + winH*0.52, 0]}>
            <meshStandardMaterial color="#f0f0f0" roughness={0.3} />
          </Box>
        </>
      )}

      {design === 'bay' ? (
        <>
          {/* Bay center panel */}
          <Box args={[gLen*0.5, winH - fw*0.8, 0.025]} position={[0, sillY + winH/2, 0.02]}>
            <meshPhysicalMaterial color="#c8e8f8" transparent opacity={0.24} roughness={0} metalness={0.05} reflectivity={0.9} />
          </Box>
          {/* Bay side glass facets */}
          <Box args={[gLen*0.22, winH - fw, 0.025]} position={[-gLen*0.34, sillY + winH/2, 0.06]} rotation={[0, 0.38, 0]}>
            <meshPhysicalMaterial color="#c8e8f8" transparent opacity={0.22} roughness={0} metalness={0.05} reflectivity={0.9} />
          </Box>
          <Box args={[gLen*0.22, winH - fw, 0.025]} position={[gLen*0.34, sillY + winH/2, 0.06]} rotation={[0, -0.38, 0]}>
            <meshPhysicalMaterial color="#c8e8f8" transparent opacity={0.22} roughness={0} metalness={0.05} reflectivity={0.9} />
          </Box>
        </>
      ) : (
        <>
          {/* Glass pane — left panel */}
          <Box args={[gLen/2 - fw*0.9, winH - fw*0.8, 0.025]} position={[-gLen/4 - fw*0.1, sillY + winH/2, design === 'sliding' ? 0.02 : 0.01]}>
            <meshPhysicalMaterial color="#c8e8f8" transparent opacity={0.25} roughness={0} metalness={0.05} reflectivity={0.9} />
          </Box>
          {/* Glass pane — right panel */}
          <Box args={[gLen/2 - fw*0.9, winH - fw*0.8, 0.025]} position={[gLen/4 + fw*0.1, sillY + winH/2, design === 'sliding' ? -0.005 : 0.01]}>
            <meshPhysicalMaterial color="#c8e8f8" transparent opacity={0.25} roughness={0} metalness={0.05} reflectivity={0.9} />
          </Box>
        </>
      )}
    </group>
  )
}

// ── Single Door leaf — hinged on one side ────────────────────────────────────
function SingleDoorLeaf({ doorW, doorH, isOpen, inwardSign = -1 }) {
  const groupRef = useRef()
  const openAngle = -inwardSign * (Math.PI / 2)
  const handleZ = -inwardSign * 0.06
  const closedAngle = 0
  const targetRef = useRef(isOpen ? openAngle : closedAngle)
  const currentRef = useRef(isOpen ? openAngle : closedAngle)

  useEffect(() => {
    targetRef.current = isOpen ? openAngle : closedAngle
  }, [isOpen])

  useFrame(() => {
    if (!groupRef.current) return
    const diff = targetRef.current - currentRef.current
    if (Math.abs(diff) < 0.001) return
    currentRef.current += diff * 0.12
    groupRef.current.rotation.y = currentRef.current
  })

  return (
    <group ref={groupRef} position={[-doorW / 2, 0, 0]}>
      <group position={[doorW / 2, 0, 0]}>
        <Box args={[doorW - 0.02, doorH - 0.04, 0.06]} position={[0, doorH / 2, 0]} castShadow receiveShadow>
          <meshStandardMaterial color="#c8a878" roughness={0.6} />
        </Box>
        <Box args={[doorW * 0.72, doorH * 0.34, 0.022]} position={[0, doorH * 0.68, 0.041]} castShadow>
          <meshStandardMaterial color="#b89455" roughness={0.55} />
        </Box>
        <Box args={[doorW * 0.72, doorH * 0.26, 0.022]} position={[0, doorH * 0.28, 0.041]} castShadow>
          <meshStandardMaterial color="#b89455" roughness={0.55} />
        </Box>
        <Box args={[0.045, 0.045, 0.09]} position={[doorW * 0.38, doorH * 0.46, handleZ]} castShadow>
          <meshStandardMaterial color="#d4a820" roughness={0.05} metalness={0.95} />
        </Box>
      </group>
    </group>
  )
}

// ── Double Door 3D — two leaves swinging inward ──────────────────────────────
function DoubleDoorLeaf({ halfW, doorH, isOpen, side, inwardSign = -1 }) {
  const groupRef   = useRef()
  const baseAngle = side === 'left' ? 1 : -1
  const openAngle   = baseAngle * (-inwardSign) * (Math.PI / 2)
  const handleZ = -inwardSign * 0.06
  const closedAngle = 0
  const targetRef  = useRef(isOpen ? openAngle : closedAngle)
  const currentRef = useRef(isOpen ? openAngle : closedAngle)

  useEffect(() => {
    targetRef.current = isOpen ? openAngle : closedAngle
  }, [isOpen])

  useFrame(() => {
    if (!groupRef.current) return
    const diff = targetRef.current - currentRef.current
    if (Math.abs(diff) < 0.001) return
    currentRef.current += diff * 0.12
    groupRef.current.rotation.y = currentRef.current
  })

  // left leaf: pivot at left edge (-halfW), panel extends right (+halfW/2 center)
  // right leaf: pivot at right edge (+halfW), panel extends left (-halfW/2 center)
  const pivotX  = side === 'left' ? -halfW : halfW
  const offsetX = side === 'left' ?  halfW / 2 : -halfW / 2
  const lw = halfW - 0.02

  return (
    <group ref={groupRef} position={[pivotX, 0, 0]}>
      <group position={[offsetX, 0, 0]}>
        {/* Main panel */}
        <Box args={[lw, doorH - 0.04, 0.06]} position={[0, doorH/2, 0]} castShadow receiveShadow>
          <meshStandardMaterial color="#c8a878" roughness={0.6} />
        </Box>
        {/* Raised panel top */}
        <Box args={[lw*0.7, doorH*0.38, 0.022]} position={[0, doorH*0.68, 0.041]} castShadow>
          <meshStandardMaterial color="#b89455" roughness={0.55} />
        </Box>
        {/* Raised panel bottom */}
        <Box args={[lw*0.7, doorH*0.26, 0.022]} position={[0, doorH*0.27, 0.041]} castShadow>
          <meshStandardMaterial color="#b89455" roughness={0.55} />
        </Box>
        {/* Knob on meeting edge */}
        <Box args={[0.04, 0.04, 0.09]}
          position={[side === 'left' ? lw*0.42 : -lw*0.42, doorH*0.46, handleZ]}
          castShadow>
          <meshStandardMaterial color="#d4a820" roughness={0.05} metalness={0.95} />
        </Box>
        {/* Hinge top on outer edge */}
        <Box args={[0.02, 0.08, 0.02]}
          position={[side === 'left' ? -lw*0.46 : lw*0.46, doorH*0.8, 0]}
          castShadow>
          <meshStandardMaterial color="#aaa" roughness={0.2} metalness={0.8} />
        </Box>
        {/* Hinge bottom */}
        <Box args={[0.02, 0.08, 0.02]}
          position={[side === 'left' ? -lw*0.46 : lw*0.46, doorH*0.2, 0]}
          castShadow>
          <meshStandardMaterial color="#aaa" roughness={0.2} metalness={0.8} />
        </Box>
      </group>
    </group>
  )
}

function Door3D({ gmx, gmz, gLen, angle, wallColor, design = 'double', inwardSign = -1 }) {
  const fw    = 0.06
  const fd    = WALL_THICKNESS
  const wt    = WALL_THICKNESS   // wall thickness
  const doorH = WALL_HEIGHT - 0.25
  const rot   = [0, -angle, 0]
  const wc    = wallColor || '#e8e2d8'
  const halfW = gLen / 2
  const [isOpen, setIsOpen] = useState(false)

  if (design === 'single') {
    return (
      <group position={[gmx, 0, gmz]} rotation={rot}>
        <Box args={[gLen + wt*2, WALL_HEIGHT - doorH, wt]}
          position={[0, doorH + (WALL_HEIGHT - doorH) / 2, 0]}
          castShadow receiveShadow>
          <meshStandardMaterial color={wc} roughness={0.85} side={THREE.DoubleSide} />
        </Box>

        <Box args={[wt, doorH, wt]} position={[-halfW - wt/2, doorH/2, 0]} castShadow receiveShadow>
          <meshStandardMaterial color={wc} roughness={0.85} side={THREE.DoubleSide} />
        </Box>
        <Box args={[wt, doorH, wt]} position={[halfW + wt/2, doorH/2, 0]} castShadow receiveShadow>
          <meshStandardMaterial color={wc} roughness={0.85} side={THREE.DoubleSide} />
        </Box>

        <Box args={[gLen + fw*2, fw, fd]} position={[0, doorH + fw/2, 0]} castShadow>
          <meshStandardMaterial color="#d4c4a8" roughness={0.4} />
        </Box>
        <Box args={[fw, doorH, fd]} position={[-halfW - fw/2, doorH/2, 0]} castShadow>
          <meshStandardMaterial color="#d4c4a8" roughness={0.4} />
        </Box>
        <Box args={[fw, doorH, fd]} position={[halfW + fw/2, doorH/2, 0]} castShadow>
          <meshStandardMaterial color="#d4c4a8" roughness={0.4} />
        </Box>

        <SingleDoorLeaf doorW={gLen} doorH={doorH} isOpen={isOpen} inwardSign={inwardSign} />

        <Box args={[gLen, 0.025, fd * 1.3]} position={[0, 0.012, 0]} receiveShadow>
          <meshStandardMaterial color="#b0a090" roughness={0.35} metalness={0.25} />
        </Box>

        <mesh position={[0, doorH / 2, 0]} onClick={() => setIsOpen((open) => !open)}>
          <boxGeometry args={[gLen + WALL_THICKNESS, doorH, 0.5]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>

        <mesh position={[0, doorH + 0.22, 0]}>
          <planeGeometry args={[0.45, 0.16]} />
          <meshBasicMaterial color={isOpen ? '#43d9ad' : '#6c63ff'} transparent opacity={0.82} />
        </mesh>
      </group>
    )
  }

  if (design === 'sliding') {
    return (
      <group position={[gmx, 0, gmz]} rotation={rot}>
        <Box args={[gLen + wt*2, WALL_HEIGHT - doorH, wt]}
          position={[0, doorH + (WALL_HEIGHT - doorH) / 2, 0]}
          castShadow receiveShadow>
          <meshStandardMaterial color={wc} roughness={0.85} side={THREE.DoubleSide} />
        </Box>

        <Box args={[wt, doorH, wt]} position={[-halfW - wt/2, doorH/2, 0]} castShadow receiveShadow>
          <meshStandardMaterial color={wc} roughness={0.85} side={THREE.DoubleSide} />
        </Box>
        <Box args={[wt, doorH, wt]} position={[halfW + wt/2, doorH/2, 0]} castShadow receiveShadow>
          <meshStandardMaterial color={wc} roughness={0.85} side={THREE.DoubleSide} />
        </Box>

        <Box args={[gLen + fw*2, fw, fd]} position={[0, doorH + fw/2, 0]} castShadow>
          <meshStandardMaterial color="#d4c4a8" roughness={0.4} />
        </Box>
        <Box args={[fw, doorH, fd]} position={[-halfW - fw/2, doorH/2, 0]} castShadow>
          <meshStandardMaterial color="#d4c4a8" roughness={0.4} />
        </Box>
        <Box args={[fw, doorH, fd]} position={[halfW + fw/2, doorH/2, 0]} castShadow>
          <meshStandardMaterial color="#d4c4a8" roughness={0.4} />
        </Box>

        <Box args={[gLen*0.54, doorH - 0.06, 0.045]} position={[-gLen*0.13, doorH/2, 0.025]} castShadow receiveShadow>
          <meshPhysicalMaterial color="#c8e8f8" transparent opacity={0.25} roughness={0} metalness={0.05} reflectivity={0.9} />
        </Box>
        <Box args={[gLen*0.54, doorH - 0.06, 0.045]} position={[gLen*0.13, doorH/2, -0.015]} castShadow receiveShadow>
          <meshPhysicalMaterial color="#c8e8f8" transparent opacity={0.25} roughness={0} metalness={0.05} reflectivity={0.9} />
        </Box>
        <Box args={[0.06, 0.015, 0.03]} position={[-gLen*0.04, doorH*0.45, 0.05]} castShadow>
          <meshStandardMaterial color="#d4a820" roughness={0.2} metalness={0.8} />
        </Box>
      </group>
    )
  }

  return (
    <group position={[gmx, 0, gmz]} rotation={rot}>

      {/* Lintel — wall above door */}
      <Box args={[gLen + wt*2, WALL_HEIGHT - doorH, wt]}
        position={[0, doorH + (WALL_HEIGHT - doorH) / 2, 0]}
        castShadow receiveShadow>
        <meshStandardMaterial color={wc} roughness={0.85} side={THREE.DoubleSide} />
      </Box>

      {/* Left reveal — fills the wall depth on left side of opening */}
      <Box args={[wt, doorH, wt]}
        position={[-halfW - wt/2, doorH/2, 0]}
        castShadow receiveShadow>
        <meshStandardMaterial color={wc} roughness={0.85} side={THREE.DoubleSide} />
      </Box>
      {/* Right reveal — fills the wall depth on right side of opening */}
      <Box args={[wt, doorH, wt]}
        position={[halfW + wt/2, doorH/2, 0]}
        castShadow receiveShadow>
        <meshStandardMaterial color={wc} roughness={0.85} side={THREE.DoubleSide} />
      </Box>

      {/* Door frame — top rail */}
      <Box args={[gLen + fw*2, fw, fd]} position={[0, doorH + fw/2, 0]} castShadow>
        <meshStandardMaterial color="#d4c4a8" roughness={0.4} />
      </Box>
      {/* Door frame — left jamb */}
      <Box args={[fw, doorH, fd]} position={[-halfW - fw/2, doorH/2, 0]} castShadow>
        <meshStandardMaterial color="#d4c4a8" roughness={0.4} />
      </Box>
      {/* Door frame — right jamb */}
      <Box args={[fw, doorH, fd]} position={[halfW + fw/2, doorH/2, 0]} castShadow>
        <meshStandardMaterial color="#d4c4a8" roughness={0.4} />
      </Box>

      {/* Left leaf — hinged at left, swings inward */}
      <DoubleDoorLeaf halfW={halfW} doorH={doorH} isOpen={isOpen} side="left" inwardSign={inwardSign} />
      {/* Right leaf — hinged at right, swings inward */}
      <DoubleDoorLeaf halfW={halfW} doorH={doorH} isOpen={isOpen} side="right" inwardSign={inwardSign} />

      {/* Threshold */}
      <Box args={[gLen, 0.025, fd * 1.3]} position={[0, 0.012, 0]} receiveShadow>
        <meshStandardMaterial color="#b0a090" roughness={0.35} metalness={0.25} />
      </Box>

      {/* Click target */}
      <mesh position={[0, doorH / 2, 0]} onClick={() => setIsOpen(o => !o)}>
          <boxGeometry args={[gLen + WALL_THICKNESS, doorH, 0.5]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {/* Status badge */}
      <mesh position={[0, doorH + 0.22, 0]}>
        <planeGeometry args={[0.45, 0.16]} />
        <meshBasicMaterial color={isOpen ? '#43d9ad' : '#6c63ff'} transparent opacity={0.82} />
      </mesh>
    </group>
  )
}

// ── A single wall segment ─────────────────────────────────────────────────────
function WallSegment({ sx, sz, ex, ez, wallTexUrl, wallColor }) {
  const dx  = ex - sx, dz = ez - sz
  const len = Math.sqrt(dx * dx + dz * dz)
  if (len < 0.01) return null
  const midX = (sx + ex) / 2, midZ = (sz + ez) / 2
  const angle = Math.atan2(dz, dx)
  const texture = wallTexUrl ? useTexture(wallTexUrl) : null
  if (texture) { texture.wrapS = THREE.RepeatWrapping; texture.wrapT = THREE.RepeatWrapping; texture.repeat.set(len, WALL_HEIGHT / 2) }
  return (
    <Box args={[len, WALL_HEIGHT, WALL_THICKNESS]} position={[midX, WALL_HEIGHT / 2, midZ]} rotation={[0, -angle, 0]} castShadow receiveShadow>
      <meshStandardMaterial map={texture || undefined} color={texture ? undefined : (wallColor || '#e8e2d8')} roughness={0.85} side={THREE.DoubleSide} />
    </Box>
  )
}

function Wall3D({ wall, wallTexUrl, wallColor, cx, cz, openings }) {
  const sx0 = (wall.start.x - cx) * SCALE, sz0 = (wall.start.y - cz) * SCALE
  const ex0 = (wall.end.x   - cx) * SCALE, ez0 = (wall.end.y   - cz) * SCALE
  const dx = ex0 - sx0, dz = ez0 - sz0
  const totalLen = Math.sqrt(dx * dx + dz * dz)
  const mx = (sx0 + ex0) / 2
  const mz = (sz0 + ez0) / 2
  const nPlusX = totalLen > 0 ? -dz / totalLen : 0
  const nPlusZ = totalLen > 0 ? dx / totalLen : 0
  const toCenterX = -mx
  const toCenterZ = -mz
  const inwardSign = (nPlusX * toCenterX + nPlusZ * toCenterZ) >= 0 ? 1 : -1

  const wallOpenings = openings
    .filter(o => o.wallId === wall.id)
    .sort((a, b) => a.t - b.t)

  if (wallOpenings.length === 0) {
    return <WallSegment sx={sx0} sz={sz0} ex={ex0} ez={ez0} wallTexUrl={wallTexUrl} wallColor={wallColor} />
  }

  const segments = []
  let prevT = 0
  wallOpenings.forEach(op => {
    const openingWidth = normalizeOpeningWidthCm(op.width, op.type === 'door' ? 90 : 120)
    const halfW = (openingWidth * SCALE) / 2 / totalLen
    const t1 = Math.max(prevT, op.t - halfW)
    const t2 = Math.min(1, op.t + halfW)
    if (t1 > prevT + 0.001) {
      segments.push({ t1: prevT, t2: t1 })
    }
    const gx1 = sx0 + dx * t1, gz1 = sz0 + dz * t1
    const gx2 = sx0 + dx * t2, gz2 = sz0 + dz * t2
    const gLen = Math.sqrt((gx2-gx1)**2 + (gz2-gz1)**2)
    const gmx = (gx1+gx2)/2, gmz = (gz1+gz2)/2
    const angle = Math.atan2(dz, dx)
    const design = op.design || (op.type === 'window' ? 'casement' : 'double')

    if (op.type === 'window') {
      segments.push({ window3d: true, gmx, gmz, gLen, angle, design })
    } else {
      segments.push({ door3d: true, gmx, gmz, gLen, angle, design, inwardSign })
    }
    prevT = t2
  })
  if (prevT < 0.999) segments.push({ t1: prevT, t2: 1 })

  return (
    <group>
      {segments.map((seg, i) => {
        if (seg.t1 !== undefined && seg.t2 !== undefined) {
          const ax = sx0 + dx * seg.t1, az = sz0 + dz * seg.t1
          const bx = sx0 + dx * seg.t2, bz = sz0 + dz * seg.t2
          return <WallSegment key={i} sx={ax} sz={az} ex={bx} ez={bz} wallTexUrl={wallTexUrl} wallColor={wallColor} />
        }
        if (seg.window3d) return <Window3D key={i} gmx={seg.gmx} gmz={seg.gmz} gLen={seg.gLen} angle={seg.angle} wallColor={wallColor} design={seg.design} />
        if (seg.door3d)   return <Door3D   key={i} gmx={seg.gmx} gmz={seg.gmz} gLen={seg.gLen} angle={seg.angle} wallColor={wallColor} design={seg.design} inwardSign={seg.inwardSign} />
        return null
      })}
    </group>
  )
}

// ── Floor ─────────────────────────────────────────────────────────────────────
function Floor({ walls, floor, floorTexUrl, floorColor, cx, cz }) {
  const floorTex = floorTexUrl ? useTexture(floorTexUrl) : null

  const hasDrawnFloor = !!(floor && floor.w > 0 && floor.h > 0)

  let planeWidth = 2
  let planeDepth = 2
  let planeX = 0
  let planeZ = 0

  if (hasDrawnFloor) {
    planeWidth = Math.max(floor.w * SCALE, 0.5)
    planeDepth = Math.max(floor.h * SCALE, 0.5)
    planeX = ((floor.x + floor.w / 2) - cx) * SCALE
    planeZ = ((floor.y + floor.h / 2) - cz) * SCALE
  } else if (walls.length) {
    const xs = walls.flatMap(w => [w.start.x, w.end.x])
    const ys = walls.flatMap(w => [w.start.y, w.end.y])
    planeWidth = (Math.max(...xs) - Math.min(...xs)) * SCALE + 2
    planeDepth = (Math.max(...ys) - Math.min(...ys)) * SCALE + 2
  }

  if (floorTex) {
    floorTex.wrapS = THREE.RepeatWrapping
    floorTex.wrapT = THREE.RepeatWrapping
    floorTex.repeat.set(Math.max(planeWidth, 1), Math.max(planeDepth, 1))
  }

  return (
    <Plane
      args={[Math.max(planeWidth, 2), Math.max(planeDepth, 2)]}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[planeX, 0, planeZ]}
      receiveShadow
    >
      <meshStandardMaterial
        map={floorTex || undefined}
        color={floorTex ? undefined : (floorColor || '#c8b89a')}
        roughness={0.9}
      />
    </Plane>
  )
}

// ── 3D Furniture — clean geometry, image shown as floor decal ───────────────

function Bed3D({ w, d, color }) {
  const wood = shadeColor(color || '#8b6b4a', 1)
  const fh = 0.14
  const mh = 0.20
  const legs = [[-w/2+0.09,-d/2+0.09],[w/2-0.09,-d/2+0.09],[-w/2+0.09,d/2-0.09],[w/2-0.09,d/2-0.09]]
  return (
    <group>
      {legs.map(([lx,lz],i) => (
        <Box key={i} args={[0.09,0.14,0.09]} position={[lx,0.07,lz]} castShadow receiveShadow>
          <meshStandardMaterial color={shadeColor(wood, 0.75)} roughness={0.8} />
        </Box>
      ))}
      <Box args={[w, fh, d]} position={[0, 0.14+fh/2, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={wood} roughness={0.85} />
      </Box>
      <Box args={[w*0.93, mh, d*0.9]} position={[0, 0.14+fh+mh/2, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#f5f0e8" roughness={0.95} />
      </Box>
      <Box args={[w*0.88, 0.07, d*0.5]} position={[0, 0.14+fh+mh+0.035, d*0.16]} castShadow receiveShadow>
        <meshStandardMaterial color="#c8d4e0" roughness={0.95} />
      </Box>
      {[-w*0.17, w*0.17].map((px,i) => (
        <Box key={i} args={[w*0.28, 0.09, d*0.17]} position={[px, 0.14+fh+mh+0.045, -d*0.31]} castShadow receiveShadow>
          <meshStandardMaterial color="#ffffff" roughness={1} />
        </Box>
      ))}
      <Box args={[w, 0.72, 0.11]} position={[0, 0.14+0.36, -d/2+0.055]} castShadow receiveShadow>
        <meshStandardMaterial color={shadeColor(wood, 0.8)} roughness={0.85} />
      </Box>
    </group>
  )
}

function Sofa3D({ w, d, color }) {
  const base = shadeColor(color || '#7272a0', 1)
  const sw    = Math.max(w, 0.45)
  const sd    = Math.max(d, 0.45)
  const sh    = 0.40
  const legH  = 0.10
  const legW  = 0.07
  const backH = 0.52
  const armW  = 0.13
  const n     = sw > 1.5 ? 3 : sw > 0.95 ? 2 : 1
  const innerW = sw - armW * 2
  const cw    = innerW / n

  return (
    <group>
      {/* Legs */}
      {[[-sw/2+0.15,-sd/2+0.08],[sw/2-0.15,-sd/2+0.08],
        [-sw/2+0.15, sd/2-0.08],[sw/2-0.15, sd/2-0.08]].map(([lx,lz],i)=>(
        <Box key={i} args={[legW,legH,legW]} position={[lx,legH/2,lz]} castShadow receiveShadow>
          <meshStandardMaterial color="#222" roughness={0.4} />
        </Box>
      ))}
      {/* Seat base — front portion only */}
      <Box args={[sw, sh, sd*0.62]} position={[0, legH+sh/2, sd*0.19]} castShadow receiveShadow>
        <meshStandardMaterial color={base} roughness={0.9} />
      </Box>
      {/* Backrest — upright at back edge */}
      <Box args={[sw, backH, sd*0.14]} position={[0, legH+backH/2, -sd/2+sd*0.07]} castShadow receiveShadow>
        <meshStandardMaterial color={shadeColor(base, 0.85)} roughness={0.9} />
      </Box>
      {/* Armrests — left & right only */}
      {[-sw/2+armW/2, sw/2-armW/2].map((ax,i)=>(
        <Box key={i} args={[armW, sh+0.12, sd*0.76]} position={[ax, legH+(sh+0.12)/2, sd*0.12]} castShadow receiveShadow>
          <meshStandardMaterial color={shadeColor(base, 0.85)} roughness={0.9} />
        </Box>
      ))}
      {/* Seat cushions */}
      {Array.from({length:n},(_,i)=>(
        <Box key={i} args={[cw*0.88, 0.14, sd*0.55]} position={[-sw/2+armW+cw/2+i*cw, legH+sh+0.07, sd*0.15]} castShadow receiveShadow>
          <meshStandardMaterial color={shadeColor(base, 1.12)} roughness={0.95} />
        </Box>
      ))}
      {/* Back cushions */}
      {Array.from({length:n},(_,i)=>(
        <Box key={i} args={[cw*0.86, backH*0.75, 0.14]} position={[-sw/2+armW+cw/2+i*cw, legH+backH*0.42, -sd/2+0.18]} castShadow receiveShadow>
          <meshStandardMaterial color={shadeColor(base, 1.2)} roughness={0.95} />
        </Box>
      ))}
    </group>
  )
}

function Chair3D({ w, d, color }) {
  const wood = shadeColor(color || '#7a5535', 1)
  const cw = Math.max(w, 0.35)
  const cd = Math.max(d, 0.35)
  const legH = 0.42
  const legW = 0.06

  return (
    <group>
      {/* 4 legs */}
      {[[-cw/2+legW/2, -cd/2+legW/2],[cw/2-legW/2, -cd/2+legW/2],
        [-cw/2+legW/2,  cd/2-legW/2],[cw/2-legW/2,  cd/2-legW/2]].map(([lx,lz],i)=>(
        <Box key={i} args={[legW, legH, legW]} position={[lx, legH/2, lz]} castShadow receiveShadow>
          <meshStandardMaterial color={shadeColor(wood, 0.7)} roughness={0.8} />
        </Box>
      ))}
      {/* Seat frame */}
      <Box args={[cw, 0.06, cd]} position={[0, legH+0.03, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={wood} roughness={0.8} />
      </Box>
      {/* Seat cushion */}
      <Box args={[cw*0.9, 0.1, cd*0.9]} position={[0, legH+0.11, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={shadeColor(wood, 1.25)} roughness={0.95} />
      </Box>
      {/* Backrest — tall, upright at BACK of seat only */}
      <Box args={[cw, 0.55, 0.07]} position={[0, legH+0.38, -cd/2+0.035]} castShadow receiveShadow>
        <meshStandardMaterial color={wood} roughness={0.8} />
      </Box>
      {/* Backrest cushion */}
      <Box args={[cw*0.88, 0.44, 0.05]} position={[0, legH+0.39, -cd/2+0.085]} castShadow receiveShadow>
        <meshStandardMaterial color={shadeColor(wood, 1.25)} roughness={0.95} />
      </Box>
    </group>
  )
}

function Table3D({ w, d, color }) {
  const wood = shadeColor(color || '#c8a228', 1)
  const tw     = Math.max(w, 0.45)
  const td     = Math.max(d, 0.45)
  const legH   = 0.72
  const topH   = 0.05
  const legW   = 0.07
  const isRound = Math.abs(td/tw - 1) < 0.25

  return (
    <group>
      {/* Tabletop */}
      <Box args={[tw, topH, td]} position={[0, legH+topH/2, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={wood} roughness={0.3} metalness={0.05} />
      </Box>
      {isRound ? (
        <>
          {/* Round table: central pedestal + cross base */}
          <Box args={[legW*1.5, legH, legW*1.5]} position={[0, legH/2, 0]} castShadow receiveShadow>
            <meshStandardMaterial color={shadeColor(wood, 0.75)} roughness={0.6} />
          </Box>
          {[[tw*0.28,0],[-tw*0.28,0],[0,td*0.28],[0,-td*0.28]].map(([bx,bz],i)=>(
            <Box key={i} args={[tw*0.28,0.05,legW]} position={[bx*0.5,0.025,bz*0.5]} castShadow receiveShadow>
              <meshStandardMaterial color={shadeColor(wood, 0.65)} roughness={0.6} />
            </Box>
          ))}
        </>
      ) : (
        /* Rectangular: 4 legs flush with tabletop */
        [[-tw/2+legW/2,-td/2+legW/2],[tw/2-legW/2,-td/2+legW/2],
         [-tw/2+legW/2, td/2-legW/2],[tw/2-legW/2, td/2-legW/2]].map(([lx,lz],i)=>(
          <Box key={i} args={[legW,legH,legW]} position={[lx,legH/2,lz]} castShadow receiveShadow>
            <meshStandardMaterial color={shadeColor(wood, 0.65)} roughness={0.7} />
          </Box>
        ))
      )}
    </group>
  )
}

function Storage3D({ w, d, color }) {
  const wood = shadeColor(color || '#c8a97e', 1)
  const h = Math.min(Math.max(w*0.9, 0.8), 1.6)
  const shelves = Math.max(1, Math.round(h/0.38) - 1)
  return (
    <group>
      <Box args={[w, h, d]} position={[0, h/2, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={wood} roughness={0.8} />
      </Box>
      {Array.from({length:shelves},(_,i)=>(
        <Box key={i} args={[w*0.97,0.018,d*0.97]} position={[0, h/(shelves+1)*(i+1), 0]}>
          <meshStandardMaterial color={shadeColor(wood, 0.75)} roughness={0.6} />
        </Box>
      ))}
      <Box args={[0.18,0.04,0.04]} position={[0, h*0.5, d/2+0.02]} castShadow>
        <meshStandardMaterial color="#c4962a" roughness={0.2} metalness={0.7} />
      </Box>
    </group>
  )
}

function Lighting3D({ w, d, color }) {
  const lampColor = shadeColor(color || '#fffbe0', 1)
  return (
    <group>
      <Box args={[0.06,1.5,0.06]} position={[0,0.75,0]} castShadow>
        <meshStandardMaterial color="#aaa" roughness={0.3} metalness={0.6} />
      </Box>
      <Box args={[Math.max(w, 0.2), 0.22, Math.max(d, 0.2)]} position={[0,1.56,0]} castShadow>
        <meshStandardMaterial color={lampColor} roughness={0.05} emissive={shadeColor(lampColor, 0.75)} emissiveIntensity={0.7} />
      </Box>
    </group>
  )
}

function GenericFurniture3D({ w, d, color }) {
  return (
    <Box args={[w, Math.min(w,d)*0.45, d]} position={[0, Math.min(w,d)*0.225, 0]} castShadow receiveShadow>
      <meshStandardMaterial color={color || '#c8a97e'} roughness={0.85} />
    </Box>
  )
}

// ── Custom 3D model loader — loads GLB from a blob URL ───────────────────────
// We store the base64 → convert to blob URL on render
const blobCache = {}
function base64ToBlobUrl(base64) {
  if (!base64) return null
  if (blobCache[base64]) return blobCache[base64]
  try {
    const arr  = base64.split(',')
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'model/gltf-binary'
    const bstr = atob(arr[1])
    let n = bstr.length
    const u8 = new Uint8Array(n)
    while (n--) u8[n] = bstr.charCodeAt(n)
    const blob = new Blob([u8], { type: mime })
    const url  = URL.createObjectURL(blob)
    blobCache[base64] = url
    return url
  } catch(e) {
    console.error('base64ToBlobUrl failed:', e)
    return null
  }
}

function resolveModelUrl(model3d) {
  if (!model3d || typeof model3d !== 'string') return null
  return model3d.startsWith('data:') ? base64ToBlobUrl(model3d) : model3d
}

function CustomModel({ url, w, d, color }) {
  const { scene } = useGLTF(url)
  const tintedScene = useMemo(() => {
    const clonedScene = scene.clone(true)
    clonedScene.traverse((child) => {
      if (!child.isMesh || !child.material) return
      const applyTint = (material) => {
        if (!material || !material.color) return material
        const clonedMaterial = material.clone()
        if (color) {
          clonedMaterial.color = new THREE.Color(color)
          clonedMaterial.map = null
          clonedMaterial.emissiveMap = null
        }
        return clonedMaterial
      }
      if (Array.isArray(child.material)) {
        child.material = child.material.map(applyTint)
      } else {
        child.material = applyTint(child.material)
      }
    })
    return clonedScene
  }, [scene, color])

  // Auto-scale model to fit the furniture footprint (w × d)
  const { scale, offsetY } = useMemo(() => {
    const box = new THREE.Box3().setFromObject(tintedScene)
    const size = new THREE.Vector3()
    box.getSize(size)
    const scaleX = w / (size.x || 1)
    const scaleZ = d / (size.z || 1)
    const nextScale = Math.min(scaleX, scaleZ)
    const nextOffsetY = -box.min.y * nextScale
    return { scale: nextScale, offsetY: nextOffsetY }
  }, [tintedScene, w, d])

  return (
    <Clone
      object={tintedScene}
      scale={[scale, scale, scale]}
      position={[0, offsetY, 0]}
      castShadow
      receiveShadow
    />
  )
}

function FurnitureItem3D({ item, cx, cz }) {
  const x   = (item.x - cx) * SCALE + (item.w * SCALE) / 2
  const z   = (item.y - cz) * SCALE + (item.h * SCALE) / 2
  const w   = Math.max((item.w || 80) * SCALE, 0.08)
  const d   = Math.max((item.h || 80) * SCALE, 0.08)
  const cat = (item.cat || item.category || item.name || '').toLowerCase()
  const color = item.color || null

  // Support both old base64 models and uploaded model URLs
  const modelUrl = resolveModelUrl(item.model3d)

  const fallback = (() => {
    if (cat.includes('bed'))                                                          return <Bed3D w={w} d={d} color={color} />
    if (cat.includes('sofa') || cat.includes('couch'))                               return <Sofa3D w={w} d={d} color={color} />
    if (cat.includes('chair') || cat.includes('armchair') || cat.includes('stool'))  return <Chair3D w={w} d={d} color={color} />
    if (cat.includes('table') || cat.includes('desk') || cat.includes('coffee'))     return <Table3D w={w} d={d} color={color} />
    if (cat.includes('storage') || cat.includes('cabinet') || cat.includes('shelf') || cat.includes('wardrobe')) return <Storage3D w={w} d={d} color={color} />
    if (cat.includes('light') || cat.includes('lamp'))                               return <Lighting3D w={w} d={d} color={color} />
    if (cat.includes('kitchen'))   return <GenericFurniture3D w={w} d={d} color="#e8e0d0" />
    if (cat.includes('bathroom'))  return <GenericFurniture3D w={w} d={d} color="#d4eef7" />
    if (cat.includes('decor'))     return <GenericFurniture3D w={w} d={d} color="#d4c8a0" />
    return <GenericFurniture3D w={w} d={d} color={color || undefined} />
  })()

  const model = modelUrl ? (
    <Suspense fallback={fallback}>
      <CustomModel url={modelUrl} w={w} d={d} color={color} />
    </Suspense>
  ) : fallback

  return <group position={[x, 0, z]} rotation={[0, -(item.angle || 0), 0]}>{model}</group>
}

// ── Demo room ─────────────────────────────────────────────────────────────────
function DemoRoom({ wallTexUrl, floorTexUrl, wallColor }) {
  const wallTex  = wallTexUrl  ? useTexture(wallTexUrl)  : null
  const floorTex = floorTexUrl ? useTexture(floorTexUrl) : null

  if (floorTex) { floorTex.wrapS = THREE.RepeatWrapping; floorTex.wrapT = THREE.RepeatWrapping; floorTex.repeat.set(5, 4) }
  if (wallTex)  { wallTex.wrapS  = THREE.RepeatWrapping; wallTex.wrapT  = THREE.RepeatWrapping; wallTex.repeat.set(5, 1.4) }

  const wallMat = <meshStandardMaterial map={wallTex||undefined} color={wallTex?undefined:(wallColor||'#e8e2d8')} roughness={0.85} />
  const floorMat = <meshStandardMaterial map={floorTex||undefined} color={floorTex?undefined:'#c8b89a'} roughness={0.9} />

  return (
    <group>
      <Plane args={[10, 8]} rotation={[-Math.PI/2, 0, 0]} receiveShadow>{floorMat}</Plane>
      {/* back wall */}
      <Box args={[10, WALL_HEIGHT, WALL_THICKNESS]} position={[0, WALL_HEIGHT/2, -4]} castShadow receiveShadow>{wallMat}</Box>
      {/* left wall */}
      <Box args={[8, WALL_HEIGHT, WALL_THICKNESS]} position={[-5, WALL_HEIGHT/2, 0]} rotation={[0, Math.PI/2, 0]} castShadow receiveShadow>{wallMat}</Box>
      {/* right wall */}
      <Box args={[8, WALL_HEIGHT, WALL_THICKNESS]} position={[5, WALL_HEIGHT/2, 0]} rotation={[0, Math.PI/2, 0]} castShadow receiveShadow>{wallMat}</Box>

      {/* sofa */}
      <group position={[0, 0, -2.5]}>
        <Box args={[3, 0.6, 0.9]} position={[0, 0.3, 0]} castShadow><meshStandardMaterial color="#4a4a6a" roughness={0.9} /></Box>
        <Box args={[3, 0.8, 0.25]} position={[0, 0.7, -0.33]} castShadow><meshStandardMaterial color="#4a4a6a" roughness={0.9} /></Box>
        {[-1.3, 1.3].map(x => <Box key={x} args={[0.3, 0.8, 0.9]} position={[x, 0.7, 0]} castShadow><meshStandardMaterial color="#3d3d5a" roughness={0.9} /></Box>)}
      </group>
      {/* coffee table */}
      <group position={[0, 0, -0.8]}>
        <Box args={[1.2, 0.05, 0.6]} position={[0, 0.42, 0]} castShadow><meshStandardMaterial color="#8b6914" roughness={0.5} /></Box>
        {[[-0.5,-0.25],[-0.5,0.25],[0.5,-0.25],[0.5,0.25]].map(([x,z],i) =>
          <Box key={i} args={[0.04, 0.4, 0.04]} position={[x, 0.2, z]} castShadow><meshStandardMaterial color="#8b6914" /></Box>
        )}
      </group>
    </group>
  )
}

// ── Live room ─────────────────────────────────────────────────────────────────
function LiveRoom({ walls, floor, placed, openings, wallTexUrl, floorTexUrl, wallColor, floorColor }) {
  const { cx, cz } = useMemo(() => getSceneCenter(walls, floor), [walls, floor])

  return (
    <group>
      <Floor walls={walls} floor={floor} floorTexUrl={floorTexUrl} floorColor={floorColor} cx={cx} cz={cz} />
      {walls.map(wall => (
        <Wall3D key={wall.id} wall={wall} wallTexUrl={wallTexUrl} wallColor={wallColor} cx={cx} cz={cz} openings={openings} />
      ))}
      {placed.map(item => (
        <FurnitureItem3D key={item.id} item={item} cx={cx} cz={cz} />
      ))}
    </group>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Canvas3D() {
  const dispatch = useDispatch()
  const mode = useSelector((s) => s.editor.mode)
  const lightIntensity = useSelector((s) => s.editor.lightIntensity)
  const timeOfDay = useSelector((s) => s.editor.timeOfDay)
  const [liveData, setLiveData] = useState({ walls: [], floor: null, placed: [], openings: [], floorTex: null, floorColor: '#f5f2ee', wallTex: null, wallColor: '#e8e2d8' })
  const [isShadingMinimized, setIsShadingMinimized] = useState(true)
  const [canvasResetKey, setCanvasResetKey] = useState(0)

  const readEditorState = () => ({
    walls: window.__editorWalls || [],
    floor: window.__editorFloor || null,
    placed: window.__editorPlaced || [],
    openings: window.__editorOpenings || [],
    floorTex: window.__editorFloorTex || null,
    floorColor: window.__editorFloorColor || '#f5f2ee',
    wallTex: window.__editorWallTex || null,
    wallColor: window.__editorWallColor || '#e8e2d8',
  })

  useEffect(() => {
    if (mode === '3d') {
      setIsShadingMinimized(true)
    }
  }, [mode])

  useEffect(() => {
    const persisted = Number(window.__editorLightIntensity)
    if (Number.isFinite(persisted)) {
      dispatch(setLightIntensity(clampLightIntensity(persisted)))
    }
  }, [dispatch])

  useEffect(() => {
    dispatch(setTimeOfDay(normalizeTimeOfDay(window.__editorTimeOfDay)))
  }, [dispatch])

  useEffect(() => {
    window.__editorLightIntensity = lightIntensity
  }, [lightIntensity])

  useEffect(() => {
    window.__editorTimeOfDay = normalizeTimeOfDay(timeOfDay)
  }, [timeOfDay])

  useEffect(() => {
    const applyState = () => {
      setLiveData(prev => {
        const next = readEditorState()
        if (
          prev.walls === next.walls &&
          prev.floor === next.floor &&
          prev.placed === next.placed &&
          prev.openings === next.openings &&
          prev.floorTex === next.floorTex &&
          prev.floorColor === next.floorColor &&
          prev.wallTex === next.wallTex &&
          prev.wallColor === next.wallColor
        ) return prev
        return next
      })
    }

    applyState()
    window.addEventListener('editor-state-change', applyState)
    return () => window.removeEventListener('editor-state-change', applyState)
  }, [])

  useEffect(() => {
    const handleReset = () => {
      setCanvasResetKey((prev) => prev + 1)
    }
    window.addEventListener('editor-3d-reset', handleReset)
    return () => window.removeEventListener('editor-3d-reset', handleReset)
  }, [])

  useEffect(() => {
    liveData.placed.forEach((item) => {
      const modelUrl = resolveModelUrl(item.model3d)
      if (modelUrl) useGLTF.preload(modelUrl)
    })
  }, [liveData.placed])

  const hasDesign = liveData.walls.length > 0 || liveData.placed.length > 0 || (liveData.floor && liveData.floor.w > 0 && liveData.floor.h > 0)
  const preset = SHADING_PRESETS[normalizeTimeOfDay(timeOfDay)]

  const { width: sceneWidth, depth: sceneDepth } = useMemo(() => getSceneBounds(liveData.walls, liveData.floor), [liveData.walls, liveData.floor])
  const roomSpanMeters = Math.max(sceneWidth, sceneDepth) * SCALE

  return (
    <div className="canvas3d-root">
      <Canvas
        key={canvasResetKey}
        shadows
        camera={{ position: [2.8, 2.4, 3.8], fov: 50 }}
        style={{ background: preset.skyColor }}
        gl={{ preserveDrawingBuffer: true }}
      >
        <Suspense fallback={null}>
          <CameraController hasWalls={hasDesign} roomSpanMeters={roomSpanMeters} />
          <ambientLight intensity={preset.ambient * lightIntensity} />
          <directionalLight position={[10, 12, 8]} intensity={preset.directional * lightIntensity} castShadow
            shadow-mapSize={[1024, 1024]}
            shadow-camera-left={-15} shadow-camera-right={15}
            shadow-camera-top={15}  shadow-camera-bottom={-15}
          />
          <pointLight position={[0, 2.4, 0]} intensity={preset.point * lightIntensity} color={preset.pointColor} />

          <Sky sunPosition={preset.sunPosition} />
          <Environment preset="apartment" />

          {hasDesign ? (
            <LiveRoom
              walls={liveData.walls}
              floor={liveData.floor}
              placed={liveData.placed}
              openings={liveData.openings || []}
              wallTexUrl={liveData.wallTex?.image  || null}
              floorTexUrl={liveData.floorTex?.image || null}
              wallColor={liveData.wallColor || '#e8e2d8'}
              floorColor={liveData.floorColor || '#f5f2ee'}
            />
          ) : (
            <DemoRoom
              wallTexUrl={liveData.wallTex?.image  || null}
              floorTexUrl={liveData.floorTex?.image || null}
              wallColor={liveData.wallColor || '#e8e2d8'}
            />
          )}

          <ContactShadows position={[0, -0.01, 0]} opacity={0.35} scale={20} blur={1.5} far={10} />

          <OrbitControls
            enableDamping dampingFactor={0.05}
            minDistance={3} maxDistance={30}
            maxPolarAngle={Math.PI / 2.05}
            target={[0, 1, 0]}
          />

          <Grid
            args={[40, 40]} position={[0, -0.01, 0]}
            cellColor="#9da5b4" sectionColor="#bcc5d4"
            fadeDistance={40} infiniteGrid
          />
        </Suspense>
      </Canvas>

      {/* Controls hint */}
      <div className="canvas3d-controls">
        <span>🖱 Drag to orbit</span>
        <span>🖱 Right-drag to pan</span>
        <span>🖲 Scroll to zoom</span>
      </div>

      <div className={`canvas3d-lighting ${isShadingMinimized ? 'canvas3d-lighting--collapsed' : ''}`}>
        <div className="canvas3d-lighting__header">
          <label htmlFor="canvas3d-light-intensity" className="canvas3d-lighting__label">Shading</label>
          <div className="canvas3d-lighting__header-right">
            <span className="canvas3d-lighting__chip">{normalizeTimeOfDay(timeOfDay)}</span>
            <button
              type="button"
              className="canvas3d-lighting__toggle"
              onClick={() => setIsShadingMinimized((prev) => !prev)}
              aria-label={isShadingMinimized ? 'Expand shading panel' : 'Collapse shading panel'}
              aria-expanded={!isShadingMinimized}
            >
              <ChevronDown className={`canvas3d-lighting__toggle-icon ${isShadingMinimized ? '' : 'canvas3d-lighting__toggle-icon--open'}`} size={15} strokeWidth={2.6} />
            </button>
          </div>
        </div>
        {!isShadingMinimized && (
          <>
            <div className="canvas3d-lighting__presets">
              {[
                { id: 'morning', label: 'Morning' },
                { id: 'day', label: 'Day' },
                { id: 'evening', label: 'Evening' },
                { id: 'night', label: 'Night' },
              ].map((presetItem) => (
                <button
                  key={presetItem.id}
                  type="button"
                  onClick={() => dispatch(setTimeOfDay(presetItem.id))}
                  className={`canvas3d-lighting__preset-btn ${timeOfDay === presetItem.id ? 'canvas3d-lighting__preset-btn--active' : ''}`}
                >
                  {presetItem.label}
                </button>
              ))}
            </div>
            <div className="canvas3d-lighting__intensity-row">
              <span className="canvas3d-lighting__intensity-label">Intensity</span>
              <input
                id="canvas3d-light-intensity"
                type="range"
                min={MIN_LIGHT_INTENSITY}
                max={MAX_LIGHT_INTENSITY}
                step={0.05}
                value={lightIntensity}
                onChange={(e) => dispatch(setLightIntensity(Number(e.target.value)))}
                className="canvas3d-lighting__slider"
              />
              <span className="canvas3d-lighting__value">{Math.round(lightIntensity * 100)}%</span>
            </div>
          </>
        )}
      </div>

      {/* Status */}
      <div className="canvas3d-status">
        {hasDesign
          ? <span className="canvas3d-status__badge canvas3d-status__badge--purple">
              ✓ {liveData.walls.length} walls · {liveData.placed.length} furniture
            </span>
          : <span className="canvas3d-status__badge canvas3d-status__badge--gray">
              Demo room — draw walls in 2D first
            </span>
        }
        {liveData.floorTex && <span className="canvas3d-status__badge canvas3d-status__badge--teal">Floor: {liveData.floorTex.name}</span>}
        {liveData.wallTex  && <span className="canvas3d-status__badge canvas3d-status__badge--purple">Wall: {liveData.wallTex.name}</span>}
      </div>
    </div>
  )
}

function getSceneBounds(walls, floor) {
  const xs = walls.flatMap(w => [w.start.x, w.end.x])
  const ys = walls.flatMap(w => [w.start.y, w.end.y])
  if (floor && floor.w > 0 && floor.h > 0) {
    xs.push(floor.x, floor.x + floor.w)
    ys.push(floor.y, floor.y + floor.h)
  }
  if (!xs.length || !ys.length) return { width: 0, depth: 0 }
  return {
    width: Math.max(...xs) - Math.min(...xs),
    depth: Math.max(...ys) - Math.min(...ys),
  }
}