import api from './api'

export const projectService = {
  getAll:    async ()          => { const { data } = await api.get('/projects');             return data.data },
  getPublic: async ()          => { const { data } = await api.get('/projects/public');      return data.data },
  getOne:    async (id)        => { const { data } = await api.get(`/projects/${id}`);       return data.data },
  create:    async (payload)   => { const { data } = await api.post('/projects', payload);   return data.data },
  update:    async (id, body)  => { const { data } = await api.put(`/projects/${id}`, body); return data.data },
  delete:    async (id)        => { await api.delete(`/projects/${id}`) },
  duplicate: async (id)        => { const { data } = await api.post(`/projects/${id}/duplicate`); return data.data },
  adminGetAll: async ()        => { const { data } = await api.get('/admin/projects');       return data.data },
  adminSetVisibility: async (id, isPublic) => {
    const { data } = await api.put(`/admin/projects/${id}/visibility`, { isPublic })
    return data.data
  },
  adminDelete: async (id)      => { await api.delete(`/admin/projects/${id}`) },
  exportPDF: async (id)        => { const { data } = await api.get(`/projects/${id}/export/pdf`, { responseType: 'blob' }); return data },
  render:    async (id)        => { const { data } = await api.post(`/projects/${id}/render`); return data.data },
}