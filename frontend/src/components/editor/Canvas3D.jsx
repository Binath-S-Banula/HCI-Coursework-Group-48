import { Suspense, useEffect, useState, useMemo, useRef } from 'react'
import { Canvas, useLoader, useThree, useFrame } from '@react-three/fiber'
import { OrbitControls, Environment, Grid, Box, Plane, Sky, ContactShadows, useTexture } from '@react-three/drei'
import * as THREE from 'three'
import '../../styles/editor/Canvas3D.css';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────
const SCALE       = 0.05
const WALL_HEIGHT = 2.8

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Returns the geometric centre (x, z) of all wall endpoints. */
function getRoomCenter(walls) {
  if (!walls.length) return { cx: 0, cz: 0 }
  const xs = walls.flatMap(w => [w.start.x, w.end.x])
  const ys = walls.flatMap(w => [w.start.y, w.end.y])
  return {
    cx: (Math.min(...xs) + Math.max(...xs)) / 2,
    cz: (Math.min(...ys) + Math.max(...ys)) / 2,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CameraController
// ─────────────────────────────────────────────────────────────────────────────

/** Auto-positions the camera when room data arrives. */
function CameraController({ hasWalls, cx, cz }) {
  const { camera } = useThree()
  const moved = useRef(false)

  useEffect(() => {
    if (hasWalls && !moved.current) {
      const tx = cx * SCALE
      const tz = cz * SCALE
      camera.position.set(tx + 7, 6, tz + 9)
      camera.lookAt(tx, 1, tz)
      moved.current = true
    }
    if (!hasWalls) {
      moved.current = false
      camera.position.set(6, 5, 8)
      camera.lookAt(0, 1, 0)
    }
  }, [hasWalls, cx, cz, camera])

  return null
}

// ─────────────────────────────────────────────────────────────────────────────
// Window3D
// ─────────────────────────────────────────────────────────────────────────────

function Window3D({ gmx, gmz, gLen, angle }) {
  const fw    = 0.06
  const fd    = 0.12
  const sillY = 0.85
  const topY  = WALL_HEIGHT - 0.42
  const winH  = topY - sillY
  const rot   = [0, -angle, 0]

  return (
    <group position={[gmx, 0, gmz]} rotation={rot}>
      {/* Wall fill below window (sill base) */}
      <Box args={[gLen, sillY, 0.15]} position={[0, sillY / 2, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#e8e2d8" roughness={0.85} />
      </Box>
      {/* Wall fill above window (lintel) */}
      <Box args={[gLen, WALL_HEIGHT - topY, 0.15]} position={[0, topY + (WALL_HEIGHT - topY) / 2, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#e8e2d8" roughness={0.85} />
      </Box>

      {/* Outer frame — top */}
      <Box args={[gLen + fw * 2, fw, fd]} position={[0, topY + fw / 2, 0]} castShadow>
        <meshStandardMaterial color="#ffffff" roughness={0.3} />
      </Box>
      {/* Outer frame — bottom (sill) */}
      <Box args={[gLen + fw * 2, fw, fd * 1.5]} position={[0, sillY - fw / 2, 0]} castShadow>
        <meshStandardMaterial color="#ffffff" roughness={0.3} />
      </Box>
      {/* Outer frame — left */}
      <Box args={[fw, winH + fw * 2, fd]} position={[-gLen / 2 - fw / 2, sillY + winH / 2, 0]} castShadow>
        <meshStandardMaterial color="#ffffff" roughness={0.3} />
      </Box>
      {/* Outer frame — right */}
      <Box args={[fw, winH + fw * 2, fd]} position={[gLen / 2 + fw / 2, sillY + winH / 2, 0]} castShadow>
        <meshStandardMaterial color="#ffffff" roughness={0.3} />
      </Box>

      {/* Center mullion (vertical divider) */}
      <Box args={[fw * 0.7, winH, fd * 0.8]} position={[0, sillY + winH / 2, 0]}>
        <meshStandardMaterial color="#f0f0f0" roughness={0.3} />
      </Box>
      {/* Center rail (horizontal divider) */}
      <Box args={[gLen, fw * 0.7, fd * 0.8]} position={[0, sillY + winH * 0.52, 0]}>
        <meshStandardMaterial color="#f0f0f0" roughness={0.3} />
      </Box>

      {/* Glass pane — left panel */}
      <Box args={[gLen / 2 - fw * 0.9, winH - fw * 0.8, 0.025]} position={[-gLen / 4 - fw * 0.1, sillY + winH / 2, 0.01]}>
        <meshPhysicalMaterial color="#c8e8f8" transparent opacity={0.25} roughness={0} metalness={0.05} reflectivity={0.9} />
      </Box>
      {/* Glass pane — right panel */}
      <Box args={[gLen / 2 - fw * 0.9, winH - fw * 0.8, 0.025]} position={[gLen / 4 + fw * 0.1, sillY + winH / 2, 0.01]}>
        <meshPhysicalMaterial color="#c8e8f8" transparent opacity={0.25} roughness={0} metalness={0.05} reflectivity={0.9} />
      </Box>

      {/* Window sill ledge (exterior protrusion) */}
      <Box args={[gLen + fw * 3, 0.05, fd * 2.5]} position={[0, sillY - fw - 0.025, fd * 0.7]} castShadow receiveShadow>
        <meshStandardMaterial color="#f5f5f5" roughness={0.2} />
      </Box>
    </group>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// DoorLeaf  (animated, swings open / closed on click)
// ─────────────────────────────────────────────────────────────────────────────

function DoorLeaf({ gLen, doorH, isOpen }) {
  const groupRef    = useRef()
  const openAngle   = -Math.PI / 2
  const closedAngle = 0
  const targetRef   = useRef(isOpen ? openAngle : closedAngle)
  const currentRef  = useRef(isOpen ? openAngle : closedAngle)
  const fw          = 0.07

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
    // Pivot at the LEFT (hinge) edge of the door
    <group ref={groupRef} position={[-gLen / 2, 0, 0]}>
      <group position={[gLen / 2, 0, 0]}>
        {/* Main door panel */}
        <Box args={[gLen - 0.04, doorH - 0.04, 0.07]} position={[0, doorH / 2, 0]} castShadow receiveShadow>
          <meshStandardMaterial color="#c8a878" roughness={0.6} />
        </Box>
        {/* Raised panel — top */}
        <Box args={[gLen * 0.72, doorH * 0.4, 0.025]} position={[0, doorH * 0.7, 0.048]} castShadow>
          <meshStandardMaterial color="#b89455" roughness={0.55} />
        </Box>
        {/* Raised panel — bottom */}
        <Box args={[gLen * 0.72, doorH * 0.26, 0.025]} position={[0, doorH * 0.27, 0.048]} castShadow>
          <meshStandardMaterial color="#b89455" roughness={0.55} />
        </Box>
        {/* Panel shadow lines — top */}
        <Box args={[gLen * 0.74, doorH * 0.42, 0.005]} position={[0, doorH * 0.7, 0.036]}>
          <meshStandardMaterial color="#8a6a35" roughness={1} />
        </Box>
        {/* Panel shadow lines — bottom */}
        <Box args={[gLen * 0.74, doorH * 0.28, 0.005]} position={[0, doorH * 0.27, 0.036]}>
          <meshStandardMaterial color="#8a6a35" roughness={1} />
        </Box>
        {/* Door knob */}
        <Box args={[0.05, 0.05, 0.1]} position={[gLen * 0.34, doorH * 0.46, 0.07]} castShadow>
          <meshStandardMaterial color="#d4a820" roughness={0.05} metalness={0.95} />
        </Box>
        {/* Knob back plate */}
        <Box args={[0.035, 0.14, 0.018]} position={[gLen * 0.34, doorH * 0.46, 0.045]} castShadow>
          <meshStandardMaterial color="#b89010" roughness={0.1} metalness={0.9} />
        </Box>
        {/* Hinge — top */}
        <Box args={[0.025, 0.1, 0.025]} position={[-gLen / 2 + 0.015, doorH * 0.8, 0]} castShadow>
          <meshStandardMaterial color="#aaa" roughness={0.2} metalness={0.8} />
        </Box>
        {/* Hinge — bottom */}
        <Box args={[0.025, 0.1, 0.025]} position={[-gLen / 2 + 0.015, doorH * 0.2, 0]} castShadow>
          <meshStandardMaterial color="#aaa" roughness={0.2} metalness={0.8} />
        </Box>
      </group>
    </group>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Door3D
// ─────────────────────────────────────────────────────────────────────────────

function Door3D({ gmx, gmz, gLen, angle }) {
  const fw    = 0.06
  const fd    = 0.15
  const doorH = WALL_HEIGHT - 0.25
  const rot   = [0, -angle, 0]
  const [isOpen, setIsOpen] = useState(false)

  return (
    <group position={[gmx, 0, gmz]} rotation={rot}>
      {/* Lintel — wall fill above opening */}
      <Box
        args={[gLen + fw * 2, WALL_HEIGHT - doorH, 0.15]}
        position={[0, doorH + (WALL_HEIGHT - doorH) / 2, 0]}
        castShadow receiveShadow
      >
        <meshStandardMaterial color="#e8e2d8" roughness={0.85} side={THREE.DoubleSide} />
      </Box>

      {/* Door frame — top rail */}
      <Box args={[gLen + fw * 2, fw, fd]} position={[0, doorH + fw / 2, 0]} castShadow>
        <meshStandardMaterial color="#d4c4a8" roughness={0.4} />
      </Box>
      {/* Door frame — left jamb */}
      <Box args={[fw, doorH, fd]} position={[-gLen / 2 - fw / 2, doorH / 2, 0]} castShadow>
        <meshStandardMaterial color="#d4c4a8" roughness={0.4} />
      </Box>
      {/* Door frame — right jamb */}
      <Box args={[fw, doorH, fd]} position={[gLen / 2 + fw / 2, doorH / 2, 0]} castShadow>
        <meshStandardMaterial color="#d4c4a8" roughness={0.4} />
      </Box>

      <DoorLeaf gLen={gLen} doorH={doorH} isOpen={isOpen} />

      {/* Threshold strip */}
      <Box args={[gLen, 0.025, fd * 1.3]} position={[0, 0.012, 0]} receiveShadow>
        <meshStandardMaterial color="#b0a090" roughness={0.35} metalness={0.25} />
      </Box>

      {/* Invisible wide click target */}
      <mesh position={[0, doorH / 2, 0]} onClick={() => setIsOpen(o => !o)}>
        <boxGeometry args={[gLen + 0.15, doorH, 0.5]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {/* Status badge (open / closed colour) */}
      <mesh position={[0, doorH + 0.22, 0]}>
        <planeGeometry args={[0.45, 0.16]} />
        <meshBasicMaterial color={isOpen ? '#43d9ad' : '#6c63ff'} transparent opacity={0.82} />
      </mesh>
    </group>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// WallSegment
// ─────────────────────────────────────────────────────────────────────────────

function WallSegment({ sx, sz, ex, ez, wallTexUrl }) {
  const dx  = ex - sx
  const dz  = ez - sz
  const len = Math.sqrt(dx * dx + dz * dz)
  if (len < 0.01) return null

  const midX  = (sx + ex) / 2
  const midZ  = (sz + ez) / 2
  const angle = Math.atan2(dz, dx)

  const texture = wallTexUrl ? useTexture(wallTexUrl) : null
  if (texture) {
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.repeat.set(len, WALL_HEIGHT / 2)
  }

  return (
    <Box
      args={[len, WALL_HEIGHT, 0.15]}
      position={[midX, WALL_HEIGHT / 2, midZ]}
      rotation={[0, -angle, 0]}
      castShadow receiveShadow
    >
      <meshStandardMaterial
        map={texture || undefined}
        color={texture ? undefined : '#e8e2d8'}
        roughness={0.85}
        side={THREE.DoubleSide}
      />
    </Box>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Wall3D  (with openings cut out)
// ─────────────────────────────────────────────────────────────────────────────

function Wall3D({ wall, wallTexUrl, cx, cz, openings }) {
  const sx0 = (wall.start.x - cx) * SCALE
  const sz0 = (wall.start.y - cz) * SCALE
  const ex0 = (wall.end.x   - cx) * SCALE
  const ez0 = (wall.end.y   - cz) * SCALE
  const dx       = ex0 - sx0
  const dz       = ez0 - sz0
  const totalLen = Math.sqrt(dx * dx + dz * dz)

  const wallOpenings = openings
    .filter(o => o.wallId === wall.id)
    .sort((a, b) => a.t - b.t)

  if (wallOpenings.length === 0) {
    return <WallSegment sx={sx0} sz={sz0} ex={ex0} ez={ez0} wallTexUrl={wallTexUrl} />
  }

  const segments = []
  let prevT = 0

  wallOpenings.forEach(op => {
    const halfW = (op.width * SCALE) / 2 / totalLen
    const t1    = Math.max(prevT, op.t - halfW)
    const t2    = Math.min(1, op.t + halfW)

    if (t1 > prevT + 0.001) {
      segments.push({ t1: prevT, t2: t1 })
    }

    const gx1  = sx0 + dx * t1
    const gz1  = sz0 + dz * t1
    const gx2  = sx0 + dx * t2
    const gz2  = sz0 + dz * t2
    const gLen = Math.sqrt((gx2 - gx1) ** 2 + (gz2 - gz1) ** 2)
    const gmx  = (gx1 + gx2) / 2
    const gmz  = (gz1 + gz2) / 2
    const ang  = Math.atan2(dz, dx)

    if (op.type === 'window') {
      segments.push({ window3d: true, gmx, gmz, gLen, angle: ang })
    } else {
      segments.push({ door3d: true, gmx, gmz, gLen, angle: ang })
    }
    prevT = t2
  })

  if (prevT < 0.999) segments.push({ t1: prevT, t2: 1 })

  return (
    <group>
      {segments.map((seg, i) => {
        if (seg.t1 !== undefined && seg.t2 !== undefined) {
          const ax = sx0 + dx * seg.t1
          const az = sz0 + dz * seg.t1
          const bx = sx0 + dx * seg.t2
          const bz = sz0 + dz * seg.t2
          return <WallSegment key={i} sx={ax} sz={az} ex={bx} ez={bz} wallTexUrl={wallTexUrl} />
        }
        if (seg.window3d) {
          return <Window3D key={i} gmx={seg.gmx} gmz={seg.gmz} gLen={seg.gLen} angle={seg.angle} />
        }
        if (seg.door3d) {
          return <Door3D key={i} gmx={seg.gmx} gmz={seg.gmz} gLen={seg.gLen} angle={seg.angle} />
        }
        return null
      })}
    </group>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Floor
// ─────────────────────────────────────────────────────────────────────────────

function Floor({ walls, floorTexUrl }) {
  const floorTex = floorTexUrl ? useTexture(floorTexUrl) : null
  if (floorTex) {
    floorTex.wrapS = THREE.RepeatWrapping
    floorTex.wrapT = THREE.RepeatWrapping
    floorTex.repeat.set(8, 8)
  }

  const xs = walls.flatMap(w => [w.start.x, w.end.x])
  const ys = walls.flatMap(w => [w.start.y, w.end.y])
  const W  = (Math.max(...xs) - Math.min(...xs)) * SCALE + 2
  const D  = (Math.max(...ys) - Math.min(...ys)) * SCALE + 2

  return (
    <Plane
      args={[Math.max(W, 2), Math.max(D, 2)]}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0, 0]}
      receiveShadow
    >
      <meshStandardMaterial
        map={floorTex || undefined}
        color={floorTex ? undefined : '#c8b89a'}
        roughness={0.9}
      />
    </Plane>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Ceiling
// ─────────────────────────────────────────────────────────────────────────────

function Ceiling({ walls }) {
  const xs = walls.flatMap(w => [w.start.x, w.end.x])
  const ys = walls.flatMap(w => [w.start.y, w.end.y])
  const W  = (Math.max(...xs) - Math.min(...xs)) * SCALE + 0.3
  const D  = (Math.max(...ys) - Math.min(...ys)) * SCALE + 0.3

  return (
    <Plane
      args={[Math.max(W, 2), Math.max(D, 2)]}
      rotation={[Math.PI / 2, 0, 0]}
      position={[0, WALL_HEIGHT, 0]}
      receiveShadow
    >
      <meshStandardMaterial color="#f0ece4" roughness={1} side={THREE.DoubleSide} transparent opacity={0.6} />
    </Plane>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Furniture models
// ─────────────────────────────────────────────────────────────────────────────

function Bed3D({ w, d }) {
  const fh   = 0.14
  const mh   = 0.20
  const legs = [
    [-w / 2 + 0.09, -d / 2 + 0.09],
    [ w / 2 - 0.09, -d / 2 + 0.09],
    [-w / 2 + 0.09,  d / 2 - 0.09],
    [ w / 2 - 0.09,  d / 2 - 0.09],
  ]

  return (
    <group>
      {legs.map(([lx, lz], i) => (
        <Box key={i} args={[0.09, 0.14, 0.09]} position={[lx, 0.07, lz]} castShadow receiveShadow>
          <meshStandardMaterial color="#5c3d2e" roughness={0.8} />
        </Box>
      ))}
      <Box args={[w, fh, d]} position={[0, 0.14 + fh / 2, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#8b6b4a" roughness={0.85} />
      </Box>
      <Box args={[w * 0.93, mh, d * 0.9]} position={[0, 0.14 + fh + mh / 2, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#f5f0e8" roughness={0.95} />
      </Box>
      <Box args={[w * 0.88, 0.07, d * 0.5]} position={[0, 0.14 + fh + mh + 0.035, d * 0.16]} castShadow receiveShadow>
        <meshStandardMaterial color="#c8d4e0" roughness={0.95} />
      </Box>
      {[-w * 0.17, w * 0.17].map((px, i) => (
        <Box key={i} args={[w * 0.28, 0.09, d * 0.17]} position={[px, 0.14 + fh + mh + 0.045, -d * 0.31]} castShadow receiveShadow>
          <meshStandardMaterial color="#ffffff" roughness={1} />
        </Box>
      ))}
      <Box args={[w, 0.72, 0.11]} position={[0, 0.14 + 0.36, -d / 2 + 0.055]} castShadow receiveShadow>
        <meshStandardMaterial color="#6b4c30" roughness={0.85} />
      </Box>
    </group>
  )
}

function Sofa3D({ w, d }) {
  const sw     = Math.min(w, 2.4)
  const sd     = Math.min(d, 0.95)
  const sh     = 0.40
  const legH   = 0.10
  const legW   = 0.07
  const backH  = 0.52
  const armW   = 0.13
  const n      = sw > 1.5 ? 3 : sw > 0.95 ? 2 : 1
  const innerW = sw - armW * 2
  const cw     = innerW / n

  return (
    <group>
      {[[-sw / 2 + 0.15, -sd / 2 + 0.08], [sw / 2 - 0.15, -sd / 2 + 0.08],
        [-sw / 2 + 0.15,  sd / 2 - 0.08], [sw / 2 - 0.15,  sd / 2 - 0.08]].map(([lx, lz], i) => (
        <Box key={i} args={[legW, legH, legW]} position={[lx, legH / 2, lz]} castShadow receiveShadow>
          <meshStandardMaterial color="#222" roughness={0.4} />
        </Box>
      ))}
      <Box args={[sw, sh, sd * 0.62]} position={[0, legH + sh / 2, sd * 0.19]} castShadow receiveShadow>
        <meshStandardMaterial color="#7272a0" roughness={0.9} />
      </Box>
      <Box args={[sw, backH, sd * 0.14]} position={[0, legH + backH / 2, -sd / 2 + sd * 0.07]} castShadow receiveShadow>
        <meshStandardMaterial color="#5e5e88" roughness={0.9} />
      </Box>
      {[-sw / 2 + armW / 2, sw / 2 - armW / 2].map((ax, i) => (
        <Box key={i} args={[armW, sh + 0.12, sd * 0.76]} position={[ax, legH + (sh + 0.12) / 2, sd * 0.12]} castShadow receiveShadow>
          <meshStandardMaterial color="#5e5e88" roughness={0.9} />
        </Box>
      ))}
      {Array.from({ length: n }, (_, i) => (
        <Box key={i} args={[cw * 0.88, 0.14, sd * 0.55]} position={[-sw / 2 + armW + cw / 2 + i * cw, legH + sh + 0.07, sd * 0.15]} castShadow receiveShadow>
          <meshStandardMaterial color="#8484b0" roughness={0.95} />
        </Box>
      ))}
      {Array.from({ length: n }, (_, i) => (
        <Box key={i} args={[cw * 0.86, backH * 0.75, 0.14]} position={[-sw / 2 + armW + cw / 2 + i * cw, legH + backH * 0.42, -sd / 2 + 0.18]} castShadow receiveShadow>
          <meshStandardMaterial color="#9090bc" roughness={0.95} />
        </Box>
      ))}
    </group>
  )
}

function Chair3D({ w, d }) {
  const cw   = Math.min(w, 0.65)
  const cd   = Math.min(d, 0.65)
  const legH = 0.42
  const legW = 0.06

  return (
    <group>
      {[[-cw / 2 + legW / 2, -cd / 2 + legW / 2], [cw / 2 - legW / 2, -cd / 2 + legW / 2],
        [-cw / 2 + legW / 2,  cd / 2 - legW / 2], [cw / 2 - legW / 2,  cd / 2 - legW / 2]].map(([lx, lz], i) => (
        <Box key={i} args={[legW, legH, legW]} position={[lx, legH / 2, lz]} castShadow receiveShadow>
          <meshStandardMaterial color="#4a2e1a" roughness={0.8} />
        </Box>
      ))}
      <Box args={[cw, 0.06, cd]} position={[0, legH + 0.03, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#7a5535" roughness={0.8} />
      </Box>
      <Box args={[cw * 0.9, 0.1, cd * 0.9]} position={[0, legH + 0.11, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#9e8878" roughness={0.95} />
      </Box>
      <Box args={[cw, 0.55, 0.07]} position={[0, legH + 0.38, -cd / 2 + 0.035]} castShadow receiveShadow>
        <meshStandardMaterial color="#7a5535" roughness={0.8} />
      </Box>
      <Box args={[cw * 0.88, 0.44, 0.05]} position={[0, legH + 0.39, -cd / 2 + 0.085]} castShadow receiveShadow>
        <meshStandardMaterial color="#9e8878" roughness={0.95} />
      </Box>
    </group>
  )
}

function Table3D({ w, d }) {
  const tw      = Math.min(w, 2.0)
  const td      = Math.min(d, 1.2)
  const legH    = 0.72
  const topH    = 0.05
  const legW    = 0.07
  const isRound = Math.abs(td / tw - 1) < 0.25

  return (
    <group>
      <Box args={[tw, topH, td]} position={[0, legH + topH / 2, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#c8a228" roughness={0.3} metalness={0.05} />
      </Box>
      {isRound ? (
        <>
          <Box args={[legW * 1.5, legH, legW * 1.5]} position={[0, legH / 2, 0]} castShadow receiveShadow>
            <meshStandardMaterial color="#8b6914" roughness={0.6} />
          </Box>
          {[[tw * 0.28, 0], [-tw * 0.28, 0], [0, td * 0.28], [0, -td * 0.28]].map(([bx, bz], i) => (
            <Box key={i} args={[tw * 0.28, 0.05, legW]} position={[bx * 0.5, 0.025, bz * 0.5]} castShadow receiveShadow>
              <meshStandardMaterial color="#7a5510" roughness={0.6} />
            </Box>
          ))}
        </>
      ) : (
        [[-tw / 2 + legW / 2, -td / 2 + legW / 2], [tw / 2 - legW / 2, -td / 2 + legW / 2],
         [-tw / 2 + legW / 2,  td / 2 - legW / 2], [tw / 2 - legW / 2,  td / 2 - legW / 2]].map(([lx, lz], i) => (
          <Box key={i} args={[legW, legH, legW]} position={[lx, legH / 2, lz]} castShadow receiveShadow>
            <meshStandardMaterial color="#7a5510" roughness={0.7} />
          </Box>
        ))
      )}
    </group>
  )
}

function Storage3D({ w, d }) {
  const h      = Math.min(Math.max(w * 0.9, 0.8), 1.6)
  const shelves = Math.max(1, Math.round(h / 0.38) - 1)

  return (
    <group>
      <Box args={[w, h, d]} position={[0, h / 2, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#c8a97e" roughness={0.8} />
      </Box>
      {Array.from({ length: shelves }, (_, i) => (
        <Box key={i} args={[w * 0.97, 0.018, d * 0.97]} position={[0, h / (shelves + 1) * (i + 1), 0]}>
          <meshStandardMaterial color="#9a7a4e" roughness={0.6} />
        </Box>
      ))}
      <Box args={[0.18, 0.04, 0.04]} position={[0, h * 0.5, d / 2 + 0.02]} castShadow>
        <meshStandardMaterial color="#c4962a" roughness={0.2} metalness={0.7} />
      </Box>
    </group>
  )
}

function Lighting3D({ w, d }) {
  return (
    <group>
      <Box args={[0.06, 1.5, 0.06]} position={[0, 0.75, 0]} castShadow>
        <meshStandardMaterial color="#aaa" roughness={0.3} metalness={0.6} />
      </Box>
      <Box args={[Math.min(w, 0.45), 0.22, Math.min(d, 0.45)]} position={[0, 1.56, 0]} castShadow>
        <meshStandardMaterial color="#fffbe0" roughness={0.05} emissive="#ffe060" emissiveIntensity={0.7} />
      </Box>
    </group>
  )
}

function GenericFurniture3D({ w, d, color }) {
  return (
    <Box
      args={[w, Math.min(w, d) * 0.45, d]}
      position={[0, Math.min(w, d) * 0.225, 0]}
      castShadow receiveShadow
    >
      <meshStandardMaterial color={color || '#c8a97e'} roughness={0.85} />
    </Box>
  )
}

function FurnitureItem3D({ item, cx, cz }) {
  const x   = (item.x - cx) * SCALE + (item.w * SCALE) / 2
  const z   = (item.y - cz) * SCALE + (item.h * SCALE) / 2
  const w   = Math.max((item.w || 80) * SCALE, 0.3)
  const d   = Math.max((item.h || 80) * SCALE, 0.3)
  const cat = (item.cat || item.category || item.name || '').toLowerCase()

  const model = (() => {
    if (cat.includes('bed'))                                                          return <Bed3D w={w} d={d} />
    if (cat.includes('sofa') || cat.includes('couch'))                               return <Sofa3D w={w} d={d} />
    if (cat.includes('chair') || cat.includes('armchair') || cat.includes('stool'))  return <Chair3D w={w} d={d} />
    if (cat.includes('table') || cat.includes('desk') || cat.includes('coffee'))     return <Table3D w={w} d={d} />
    if (cat.includes('storage') || cat.includes('cabinet') || cat.includes('shelf') || cat.includes('wardrobe'))
      return <Storage3D w={w} d={d} />
    if (cat.includes('light') || cat.includes('lamp'))                               return <Lighting3D w={w} d={d} />
    if (cat.includes('kitchen'))   return <GenericFurniture3D w={w} d={d} color="#e8e0d0" />
    if (cat.includes('bathroom'))  return <GenericFurniture3D w={w} d={d} color="#d4eef7" />
    if (cat.includes('decor'))     return <GenericFurniture3D w={w} d={d} color="#d4c8a0" />
    return <GenericFurniture3D w={w} d={d} />
  })()

  return (
    <group position={[x, 0, z]} rotation={[0, -(item.angle || 0), 0]}>
      {model}
    </group>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// DemoRoom  (shown when no walls have been drawn yet)
// ─────────────────────────────────────────────────────────────────────────────

function DemoRoom({ wallTexUrl, floorTexUrl }) {
  const wallTex  = wallTexUrl  ? useTexture(wallTexUrl)  : null
  const floorTex = floorTexUrl ? useTexture(floorTexUrl) : null

  if (floorTex) { floorTex.wrapS = THREE.RepeatWrapping; floorTex.wrapT = THREE.RepeatWrapping; floorTex.repeat.set(5, 4) }
  if (wallTex)  { wallTex.wrapS  = THREE.RepeatWrapping; wallTex.wrapT  = THREE.RepeatWrapping; wallTex.repeat.set(5, 1.4) }

  const wallMat  = <meshStandardMaterial map={wallTex  || undefined} color={wallTex  ? undefined : '#e8e2d8'} roughness={0.85} />
  const floorMat = <meshStandardMaterial map={floorTex || undefined} color={floorTex ? undefined : '#c8b89a'} roughness={0.9} />

  return (
    <group>
      <Plane args={[10, 8]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>{floorMat}</Plane>
      <Box args={[10, WALL_HEIGHT, 0.15]} position={[0, WALL_HEIGHT / 2, -4]}                    castShadow receiveShadow>{wallMat}</Box>
      <Box args={[8,  WALL_HEIGHT, 0.15]} position={[-5, WALL_HEIGHT / 2, 0]} rotation={[0, Math.PI / 2, 0]} castShadow receiveShadow>{wallMat}</Box>
      <Box args={[8,  WALL_HEIGHT, 0.15]} position={[5,  WALL_HEIGHT / 2, 0]} rotation={[0, Math.PI / 2, 0]} castShadow receiveShadow>{wallMat}</Box>

      {/* Demo sofa */}
      <group position={[0, 0, -2.5]}>
        <Box args={[3, 0.6, 0.9]} position={[0, 0.3, 0]} castShadow>
          <meshStandardMaterial color="#4a4a6a" roughness={0.9} />
        </Box>
        <Box args={[3, 0.8, 0.25]} position={[0, 0.7, -0.33]} castShadow>
          <meshStandardMaterial color="#4a4a6a" roughness={0.9} />
        </Box>
        {[-1.3, 1.3].map(x => (
          <Box key={x} args={[0.3, 0.8, 0.9]} position={[x, 0.7, 0]} castShadow>
            <meshStandardMaterial color="#3d3d5a" roughness={0.9} />
          </Box>
        ))}
      </group>

      {/* Demo coffee table */}
      <group position={[0, 0, -0.8]}>
        <Box args={[1.2, 0.05, 0.6]} position={[0, 0.42, 0]} castShadow>
          <meshStandardMaterial color="#8b6914" roughness={0.5} />
        </Box>
        {[[-0.5, -0.25], [-0.5, 0.25], [0.5, -0.25], [0.5, 0.25]].map(([x, z], i) => (
          <Box key={i} args={[0.04, 0.4, 0.04]} position={[x, 0.2, z]} castShadow>
            <meshStandardMaterial color="#8b6914" />
          </Box>
        ))}
      </group>
    </group>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// LiveRoom  (renders actual user-drawn walls + furniture)
// ─────────────────────────────────────────────────────────────────────────────

function LiveRoom({ walls, placed, openings, wallTexUrl, floorTexUrl }) {
  const { cx, cz } = useMemo(() => getRoomCenter(walls), [walls])

  return (
    <group>
      <Floor walls={walls} floorTexUrl={floorTexUrl} />
      <Ceiling walls={walls} />
      {walls.map(wall => (
        <Wall3D key={wall.id} wall={wall} wallTexUrl={wallTexUrl} cx={cx} cz={cz} openings={openings} />
      ))}
      {placed.map(item => (
        <FurnitureItem3D key={item.id} item={item} cx={cx} cz={cz} />
      ))}
    </group>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Canvas3D  — default export, main component
// ─────────────────────────────────────────────────────────────────────────────

export default function Canvas3D() {
  const [liveData, setLiveData] = useState({
    walls: [], placed: [], openings: [], floorTex: null, wallTex: null,
  })

  useEffect(() => {
    const id = setInterval(() => {
      if (window.__editorWalls === undefined) return
      setLiveData(prev => {
        const placed   = window.__editorPlaced   || []
        const walls    = window.__editorWalls    || []
        const openings = window.__editorOpenings || []
        const floorTex = window.__editorFloorTex || null
        const wallTex  = window.__editorWallTex  || null

        const placedSig = placed.map(p => `${p.id}:${p.x},${p.y},${p.w},${p.h},${p.angle || 0}`).join('|')
        const prevSig   = prev.placed.map(p => `${p.id}:${p.x},${p.y},${p.w},${p.h},${p.angle || 0}`).join('|')

        if (
          placedSig === prevSig &&
          walls.length    === prev.walls.length &&
          openings.length === prev.openings.length &&
          floorTex        === prev.floorTex &&
          wallTex         === prev.wallTex
        ) return prev

        return { walls, placed, openings, floorTex, wallTex }
      })
    }, 100)
    return () => clearInterval(id)
  }, [])

  const hasWalls      = liveData.walls.length > 0 || liveData.placed.length > 0
  const { cx: rcx, cz: rcz } = useMemo(() => getRoomCenter(liveData.walls), [liveData.walls])

  return (
    <div className="canvas3d-wrapper">
      <Canvas
        shadows
        camera={{ position: [6, 5, 8], fov: 50 }}
        style={{ background: '#d4e4f7' }}
        gl={{ preserveDrawingBuffer: true }}
      >
        <Suspense fallback={null}>
          <CameraController hasWalls={hasWalls} cx={rcx} cz={rcz} />

          <ambientLight intensity={0.6} />
          <directionalLight
            position={[10, 12, 8]} intensity={1.4} castShadow
            shadow-mapSize={[2048, 2048]}
            shadow-camera-left={-15} shadow-camera-right={15}
            shadow-camera-top={15}  shadow-camera-bottom={-15}
          />
          <pointLight position={[0, 2.4, 0]} intensity={0.8} color="#fff9e6" />

          <Sky sunPosition={[100, 20, 100]} />
          <Environment preset="apartment" />

          {hasWalls ? (
            <LiveRoom
              walls={liveData.walls}
              placed={liveData.placed}
              openings={liveData.openings || []}
              wallTexUrl={liveData.wallTex?.image  || null}
              floorTexUrl={liveData.floorTex?.image || null}
            />
          ) : (
            <DemoRoom
              wallTexUrl={liveData.wallTex?.image  || null}
              floorTexUrl={liveData.floorTex?.image || null}
            />
          )}

          <ContactShadows position={[0, -0.01, 0]} opacity={0.35} scale={20} blur={1.5} far={10} />

          <OrbitControls
            enableDamping dampingFactor={0.05}
            minDistance={2} maxDistance={30}
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
      <div className="canvas3d-controls-hint">
        <span>🖱 Drag to orbit</span>
        <span>🖱 Right-drag to pan</span>
        <span>🖲 Scroll to zoom</span>
      </div>

      {/* Status badges */}
      <div className="canvas3d-status">
        {hasWalls ? (
          <span className="canvas3d-status__badge canvas3d-status__badge--live">
            ✓ {liveData.walls.length} walls · {liveData.placed.length} furniture
          </span>
        ) : (
          <span className="canvas3d-status__badge canvas3d-status__badge--demo">
            Demo room — draw walls in 2D first
          </span>
        )}
        {liveData.floorTex && (
          <span className="canvas3d-status__badge canvas3d-status__badge--floor">
            Floor: {liveData.floorTex.name}
          </span>
        )}
        {liveData.wallTex && (
          <span className="canvas3d-status__badge canvas3d-status__badge--wall">
            Wall: {liveData.wallTex.name}
          </span>
        )}
      </div>
    </div>
  )
}