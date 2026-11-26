import api from './api.js'

export function createCrudService(resource) {
  const collection = `${resource}/`
  const detail = (id) => `${collection}${encodeURIComponent(id)}/`

  return {
    // Return the DRF envelope: { count, next, previous, results }.
    async getAll(params = {}, config = {}) {
      const { data } = await api.get(collection, { ...config, params })
      return data
    },
    async getById(id, config = {}) {
      const { data } = await api.get(detail(id), config)
      return data
    },
    async create(payload, config = {}) {
      const { data } = await api.post(collection, payload, config)
      return data
    },
    async update(id, payload, { replace = false, ...config } = {}) {
      const method = replace ? 'put' : 'patch'
      const { data } = await api[method](detail(id), payload, config)
      return data
    },
    async remove(id, config = {}) {
      await api.delete(detail(id), config)
    },
  }
}
