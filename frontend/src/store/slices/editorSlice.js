import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  mode:             '2d',       // '2d' | '3d'
  activeTool:       'select',   // 'select'|'wall'|'floor'|'room'|'door'|'window'|'measure'
  openingDesigns:   { door: 'single', window: 'casement' },
  activeRoomId:     null,
  selectedObjectId: null,
  lightIntensity:   1,
  timeOfDay:        'day',
  zoom:             1.5,
  panOffset:        { x: 0, y: 0 },
  showGrid:         true,
  showDimensions:   true,
}

const editorSlice = createSlice({
  name: 'editor',
  initialState,
  reducers: {
    setMode(state, action)         { state.mode = action.payload },
    setTool(state, action)         { state.activeTool = action.payload; state.selectedObjectId = null },
    setOpeningDesign(state, action) {
      const { type, design } = action.payload || {}
      if ((type === 'door' || type === 'window') && typeof design === 'string' && design.trim()) {
        state.openingDesigns[type] = design
      }
    },
    setActiveRoom(state, action)   { state.activeRoomId = action.payload },
    selectObject(state, action)    { state.selectedObjectId = action.payload },
    setLightIntensity(state, action) {
      const value = Number(action.payload)
      if (Number.isFinite(value)) state.lightIntensity = Math.min(Math.max(value, 0.2), 2)
    },
    setTimeOfDay(state, action) {
      const value = String(action.payload || '').toLowerCase()
      const allowed = ['morning', 'day', 'evening', 'night']
      if (allowed.includes(value)) state.timeOfDay = value
    },
    setZoom(state, action)         { state.zoom = Math.min(Math.max(action.payload, 0.1), 5) },
    setPanOffset(state, action)    { state.panOffset = action.payload },
    toggleGrid(state)              { state.showGrid = !state.showGrid },
    toggleDimensions(state)        { state.showDimensions = !state.showDimensions },
    resetView(state)               { state.zoom = 1.5; state.panOffset = { x: 0, y: 0 } },
  },
})

export const {
  setMode, setTool, setOpeningDesign, setActiveRoom, selectObject,
  setLightIntensity, setTimeOfDay, setZoom, setPanOffset, toggleGrid, toggleDimensions, resetView,
} = editorSlice.actions

export default editorSlice.reducer