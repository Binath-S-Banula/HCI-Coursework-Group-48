import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { authService } from '../../services/auth.service'

const initialState = {
  user:            JSON.parse(localStorage.getItem('user') || 'null'),
  token:           localStorage.getItem('token'),
  isAuthenticated: !!localStorage.getItem('token'),
  loading:         false,
  error:           null,
}

export const login = createAsyncThunk('auth/login', async (credentials, { rejectWithValue }) => {
  try {
    return await authService.login(credentials)
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Login failed')
  }
})

export const register = createAsyncThunk('auth/register', async (data, { rejectWithValue }) => {
  try {
    return await authService.register(data)
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Registration failed')
  }
})

export const fetchMe = createAsyncThunk('auth/fetchMe', async (_, { rejectWithValue }) => {
  try {
    return await authService.getMe()
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch user')
  }
})

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout(state) {
      state.user           = null
      state.token          = null
      state.isAuthenticated = false
      localStorage.removeItem('token')
      localStorage.removeItem('user')
    },
    clearError(state) { state.error = null },
  },
  extraReducers: (builder) => {
    // login
    builder.addCase(login.pending,   (s) => { s.loading = true;  s.error = null })
    builder.addCase(login.fulfilled, (s, { payload }) => {
      s.loading         = false
      s.user            = payload.user
      s.token           = payload.token
      s.isAuthenticated = true
      localStorage.setItem('token', payload.token)
      localStorage.setItem('user',  JSON.stringify(payload.user))
    })
    builder.addCase(login.rejected, (s, { payload }) => { s.loading = false; s.error = payload })

    // register
    builder.addCase(register.pending,   (s) => { s.loading = true;  s.error = null })
    builder.addCase(register.fulfilled, (s, { payload }) => {
      s.loading         = false
      s.user            = payload.user
      s.token           = payload.token
      s.isAuthenticated = true
      localStorage.setItem('token', payload.token)
      localStorage.setItem('user',  JSON.stringify(payload.user))
    })
    builder.addCase(register.rejected, (s, { payload }) => { s.loading = false; s.error = payload })

    // fetchMe
    builder.addCase(fetchMe.fulfilled, (s, { payload }) => {
      s.user = payload; s.isAuthenticated = true
    })
    builder.addCase(fetchMe.rejected, (s) => {
      s.user = null; s.token = null; s.isAuthenticated = false
      localStorage.removeItem('token')
      localStorage.removeItem('user')
    })
  },
})

export const { logout, clearError } = authSlice.actions
export default authSlice.reducer