import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  mode:             '2d',       // '2d' | '3d'
  activeTool:       'select',   // 'select'|'wall'|'room'|'door'|'window'|'measure'
  activeRoomId:     null,
  selectedObjectId: null,
  zoom:             1,
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
    setActiveRoom(state, action)   { state.activeRoomId = action.payload },
    selectObject(state, action)    { state.selectedObjectId = action.payload },
    setZoom(state, action)         { state.zoom = Math.min(Math.max(action.payload, 0.1), 5) },
    setPanOffset(state, action)    { state.panOffset = action.payload },
    toggleGrid(state)              { state.showGrid = !state.showGrid },
    toggleDimensions(state)        { state.showDimensions = !state.showDimensions },
    resetView(state)               { state.zoom = 1; state.panOffset = { x: 0, y: 0 } },
  },
})

export const {
  setMode, setTool, setActiveRoom, selectObject,
  setZoom, setPanOffset, toggleGrid, toggleDimensions, resetView,
} = editorSlice.actions

export default editorSlice.reducer