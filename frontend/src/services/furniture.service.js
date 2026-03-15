import api from './api'

export const furnitureService = {
  getAll:     async (params) => { const { data } = await api.get('/furniture', { params }); return data },
  getOne:     async (id)     => { const { data } = await api.get(`/furniture/${id}`);       return data.data },
  getFeatured:async ()       => { const { data } = await api.get('/furniture/featured');    return data.data },
}