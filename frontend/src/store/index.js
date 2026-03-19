import { configureStore } from '@reduxjs/toolkit'
import authReducer from './slices/authSlice'
import projectReducer from './slices/projectSlice'
import editorReducer from './slices/editorSlice'
import furnitureReducer from './slices/furnitureSlice'
import uiReducer from './slices/uiSlice'

export const store = configureStore({
  reducer: {
    auth:      authReducer,
    projects:  projectReducer,
    editor:    editorReducer,
    furniture: furnitureReducer,
    ui:        uiReducer,
  },
})