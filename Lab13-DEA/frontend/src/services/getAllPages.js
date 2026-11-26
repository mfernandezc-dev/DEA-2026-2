// Aggregate the existing numbered DRF pages, never follow an arbitrary next URL.
export async function getAllPages(service, { signal } = {}) {
  const records = []
  const ids = new Set()
  for (let page = 1; page <= 10000; page += 1) {
    const data = await service.getAll({ page }, { signal })
    if (!Array.isArray(data.results) || !Number.isInteger(data.count) || data.count < 0) throw new Error('Invalid paginated API response.')
    for (const item of data.results) {
      if (ids.has(item.id)) throw new Error('Repeated records in API pagination.')
      ids.add(item.id)
      records.push(item)
    }
    if (!data.next) {
      if (records.length !== data.count) throw new Error('Incomplete API pagination.')
      return records
    }
    if (!data.results.length) throw new Error('API pagination made no progress.')
  }
  throw new Error('API pagination did not terminate.')
}
