import api from './api'

export const furnitureService = {
  getAll:     async (params) => { const { data } = await api.get('/furniture', { params }); return data },
  getOne:     async (id)     => { const { data } = await api.get(`/furniture/${id}`);       return data.data },
  getFeatured:async ()       => { const { data } = await api.get('/furniture/featured');    return data.data },
  create:     async (payload) => {
    const { data } = await api.post('/furniture', payload, {
      headers: payload instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : undefined,
    })
    return data.data
  },
  update:     async (id, payload) => {
    const { data } = await api.put(`/furniture/${id}`, payload, {
      headers: payload instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : undefined,
    })
    return data.data
  },
  delete:     async (id) => {
    await api.delete(`/furniture/${id}`)
  },
}