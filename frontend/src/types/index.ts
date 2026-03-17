// ── Auth ──────────────────────────────────────────────────────────────────────
export interface User {
  _id: string
  name: string
  email: string
  avatar?: string
  plan: 'free' | 'pro' | 'business'
  createdAt: string
}

export interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  loading: boolean
  error: string | null
}

// ── Project ───────────────────────────────────────────────────────────────────
export interface Project {
  _id: string
  name: string
  description?: string
  thumbnail?: string
  owner: string
  collaborators: string[]
  rooms: Room[]
  settings: ProjectSettings
  isPublic: boolean
  createdAt: string
  updatedAt: string
}

export interface ProjectSettings {
  unit: 'metric' | 'imperial'
  floorHeight: number
  wallThickness: number
  gridSize: number
}

// ── Room ──────────────────────────────────────────────────────────────────────
export interface Room {
  _id: string
  name: string
  type: RoomType
  floor: number
  walls: Wall[]
  furniture: PlacedFurniture[]
  flooring?: Material
  wallMaterial?: Material
  ceilingMaterial?: Material
  area: number                   // computed m²
}

export type RoomType =
  | 'living_room' | 'bedroom' | 'kitchen' | 'bathroom'
  | 'dining_room' | 'office' | 'garage' | 'hallway' | 'other'

// ── Wall ──────────────────────────────────────────────────────────────────────
export interface Wall {
  _id: string
  start: Vector2
  end: Vector2
  thickness: number
  height: number
  openings: Opening[]
}

export interface Opening {
  type: 'door' | 'window'
  position: number   // 0-1 along wall
  width: number
  height: number
  offsetFromFloor?: number
}

// ── Furniture ─────────────────────────────────────────────────────────────────
export interface Furniture {
  _id: string
  name: string
  brand?: string
  category: FurnitureCategory
  subcategory: string
  price?: number
  width: number       // cm
  depth: number       // cm
  height: number      // cm
  modelUrl: string    // .glb
  thumbnailUrl: string
  colors: string[]
  materials: string[]
  tags: string[]
}

export type FurnitureCategory =
  | 'sofa' | 'chair' | 'table' | 'bed' | 'storage'
  | 'lighting' | 'decor' | 'kitchen' | 'bathroom' | 'outdoor'

export interface PlacedFurniture {
  _id: string
  furnitureId: string
  furniture?: Furniture
  position: Vector3
  rotation: number       // radians around Y axis
  scale: Vector3
  color?: string
  material?: string
}

// ── Material ──────────────────────────────────────────────────────────────────
export interface Material {
  _id: string
  name: string
  category: 'flooring' | 'wall' | 'ceiling'
  textureUrl: string
  color: string
  repeat?: number
}

// ── Vector Utils ──────────────────────────────────────────────────────────────
export interface Vector2 { x: number; y: number }
export interface Vector3 { x: number; y: number; z: number }

// ── API ───────────────────────────────────────────────────────────────────────
export interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
}

export interface PaginatedResponse<T> {
  success: boolean
  data: T[]
  total: number
  page: number
  pages: number
}

// ── Editor ────────────────────────────────────────────────────────────────────
export type EditorMode = '2d' | '3d'
export type Tool = 'select' | 'wall' | 'floor' | 'door' | 'window' | 'room' | 'measure'

export interface EditorState {
  mode: EditorMode
  activeTool: Tool
  activeRoomId: string | null
  selectedObjectId: string | null
  zoom: number
  panOffset: Vector2
  showGrid: boolean
  showDimensions: boolean
  history: HistoryEntry[]
  historyIndex: number
}

export interface HistoryEntry {
  timestamp: number
  description: string
  state: Partial<Project>
}
