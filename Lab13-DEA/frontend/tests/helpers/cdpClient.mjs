import assert from 'node:assert/strict'
import { setTimeout as delay } from 'node:timers/promises'
import { writeFile } from 'node:fs/promises'

export async function connectCdp(url) {
  const socket = new WebSocket(url)
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true })
    socket.addEventListener('error', reject, { once: true })
  })
  let nextId = 0
  const pending = new Map()
  const listeners = new Set()
  socket.addEventListener('message', ({ data }) => {
    const message = JSON.parse(data)
    if (message.id) {
      const job = pending.get(message.id)
      if (!job) return
      pending.delete(message.id)
      clearTimeout(job.timer)
      if (message.error) job.reject(new Error(JSON.stringify(message.error)))
      else job.resolve(message.result)
    } else {
      for (const listener of listeners) listener(message)
    }
  })
  const client = {
    send(method, params = {}) {
      return new Promise((resolve, reject) => {
        const id = ++nextId
        const timer = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timeout: ${method}`)) }, 20000)
        pending.set(id, { resolve, reject, timer })
        socket.send(JSON.stringify({ id, method, params }))
      })
    },
    onEvent(listener) { listeners.add(listener); return () => listeners.delete(listener) },
    async evaluate(expression) {
      const response = await client.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
      assert.equal(response.exceptionDetails, undefined, JSON.stringify(response.exceptionDetails))
      return response.result.value
    },
    async waitFor(expression, attempts = 150) {
      for (let attempt = 0; attempt < attempts; attempt += 1) {
        if (await client.evaluate(expression)) return
        await delay(100)
      }
      throw new Error(`Condition timed out: ${expression}`)
    },
    async screenshot(filename) {
      const image = await client.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
      await writeFile(filename, Buffer.from(image.data, 'base64'))
    },
    close() { socket.close() },
  }
  await client.send('Runtime.enable')
  await client.send('Page.enable')
  return client
}
