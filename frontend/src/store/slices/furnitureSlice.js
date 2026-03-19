import { createSlice } from '@reduxjs/toolkit'

const furnitureSlice = createSlice({
  name: 'furniture',
  initialState: {
    items:          [],
    activeCategory: 'all',
    searchQuery:    '',
    loading:        false,
    total:          0,
    page:           1,
  },
  reducers: {
    setCategory(state, action) { state.activeCategory = action.payload; state.page = 1 },
    setSearch(state, action)   { state.searchQuery    = action.payload; state.page = 1 },
    setPage(state, action)     { state.page           = action.payload },
  },
})

export const { setCategory, setSearch, setPage } = furnitureSlice.actions
export default furnitureSlice.reducer