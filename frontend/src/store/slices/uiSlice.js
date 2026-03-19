import { createSlice } from '@reduxjs/toolkit'

const uiSlice = createSlice({
  name: 'ui',
  initialState: {
    sidebarOpen:         true,
    furniturePanelOpen:  false,
    propertiesPanelOpen: false,
    activeModal:         null,
  },
  reducers: {
    toggleSidebar(state)          { state.sidebarOpen         = !state.sidebarOpen },
    toggleFurniturePanel(state)   { state.furniturePanelOpen  = !state.furniturePanelOpen },
    togglePropertiesPanel(state)  { state.propertiesPanelOpen = !state.propertiesPanelOpen },
    openModal(state, action)      { state.activeModal         = action.payload },
    closeModal(state)             { state.activeModal         = null },
  },
})

export const {
  toggleSidebar, toggleFurniturePanel,
  togglePropertiesPanel, openModal, closeModal,
} = uiSlice.actions
export default uiSlice.reducer