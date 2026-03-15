import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { projectService } from '../../services/project.service'

const initialState = {
  projects:       [],
  currentProject: null,
  loading:        false,
  error:          null,
}

export const fetchProjects   = createAsyncThunk('projects/fetchAll',  async (_, { rejectWithValue }) => {
  try { return await projectService.getAll() }
  catch (e) { return rejectWithValue(e.response?.data?.message) }
})
export const fetchProject    = createAsyncThunk('projects/fetchOne',  async (id, { rejectWithValue }) => {
  try { return await projectService.getOne(id) }
  catch (e) { return rejectWithValue(e.response?.data?.message) }
})
export const createProject   = createAsyncThunk('projects/create',    async (data, { rejectWithValue }) => {
  try { return await projectService.create(data) }
  catch (e) { return rejectWithValue(e.response?.data?.message) }
})
export const updateProject   = createAsyncThunk('projects/update',    async ({ id, data }, { rejectWithValue }) => {
  try { return await projectService.update(id, data) }
  catch (e) { return rejectWithValue(e.response?.data?.message) }
})
export const deleteProject   = createAsyncThunk('projects/delete',    async (id, { rejectWithValue }) => {
  try { await projectService.delete(id); return id }
  catch (e) { return rejectWithValue(e.response?.data?.message) }
})

const projectSlice = createSlice({
  name: 'projects',
  initialState,
  reducers: {
    setCurrentProject(state, action) { state.currentProject = action.payload },
    clearCurrentProject(state)       { state.currentProject = null },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProjects.pending,    (s) => { s.loading = true })
      .addCase(fetchProjects.fulfilled,  (s, { payload }) => { s.loading = false; s.projects = payload })
      .addCase(fetchProjects.rejected,   (s, { payload }) => { s.loading = false; s.error = payload })
      .addCase(fetchProject.fulfilled,   (s, { payload }) => { s.currentProject = payload })
      .addCase(createProject.fulfilled,  (s, { payload }) => { s.projects.unshift(payload) })
      .addCase(updateProject.fulfilled,  (s, { payload }) => {
        const i = s.projects.findIndex(p => p._id === payload._id)
        if (i !== -1) s.projects[i] = payload
        if (s.currentProject?._id === payload._id) s.currentProject = payload
      })
      .addCase(deleteProject.fulfilled,  (s, { payload }) => {
        s.projects = s.projects.filter(p => p._id !== payload)
      })
  },
})

export const { setCurrentProject, clearCurrentProject } = projectSlice.actions
export default projectSlice.reducer