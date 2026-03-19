import api from './api'

export const authService = {
  login: async (credentials) => {
    const { data } = await api.post('/auth/login', credentials)
    return data.data
  },
  register: async (payload) => {
    const { data } = await api.post('/auth/register', payload)
    return data.data
  },
  getMe: async () => {
    const { data } = await api.get('/auth/me')
    return data.data
  },
  forgotPassword: async (email) => {
    await api.post('/auth/forgot-password', { email })
  },
  resetPassword: async (token, password) => {
    await api.post('/auth/reset-password', { token, password })
  },
}