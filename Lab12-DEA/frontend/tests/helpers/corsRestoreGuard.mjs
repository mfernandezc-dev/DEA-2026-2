import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { openSync } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'

const [backend, evidence] = process.argv.slice(2)
const settingsPath = path.join(backend, 'config', 'settings.py')
const original = await readFile(settingsPath)
const allowedLine = "CORS_ALLOWED_ORIGINS = ['http://localhost:5173']"
assert.equal(original.toString('utf8').split(allowedLine).length, 2, 'Unexpected CORS configuration; refusing to change it.')
const restricted = Buffer.from(original.toString('utf8').replace(allowedLine, 'CORS_ALLOWED_ORIGINS = []'))
const originalHash = createHash('sha256').update(original).digest('hex')
await writeFile(path.join(evidence, 'settings.py.original'), original, { flag: 'wx' })
const log = openSync(path.join(evidence, 'django-console.log'), 'ax')
let django
let dirty = false
let watchdog
let finished = false
let queue = Promise.resolve()

async function stopDjango() {
  if (!django || django.exitCode !== null) return
  const child = django
  const exited = new Promise((resolve) => child.once('exit', resolve))
  // The Windows venv launcher creates a Python child; stop only this owned tree.
  const killer = spawn('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true, stdio: ['ignore', log, log] })
  const status = await new Promise((resolve, reject) => { killer.once('error', reject); killer.once('exit', resolve) })
  assert.equal(status, 0, 'Could not stop the owned Django process tree.')
  await exited
  django = undefined
}

async function startDjango() {
  if (django && django.exitCode === null) return
  django = spawn(path.join(backend, '.venv', 'Scripts', 'python.exe'), ['-B', 'manage.py', 'runserver', '127.0.0.1:8000', '--noreload'], {
    cwd: backend, detached: true, windowsHide: true, stdio: ['ignore', log, log],
    env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1', PYTHONPATH: '', DJANGO_SETTINGS_MODULE: 'config.settings', PYTHONUNBUFFERED: '1' },
  })
  await writeFile(path.join(evidence, 'owned-servers.json'), JSON.stringify({ guardPid: process.pid, djangoLauncherPid: django.pid, startedAt: new Date().toISOString() }, null, 2))
  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (django.exitCode !== null) throw new Error('The owned Django server exited during startup.')
    try {
      const response = await fetch('http://127.0.0.1:8000/api/', { headers: { Connection: 'close' }, signal: AbortSignal.timeout(750) })
      if (response.status === 200) return
    } catch { /* Startup can briefly refuse connections. */ }
    await delay(100)
  }
  throw new Error('Django startup timed out.')
}

async function restoreAndRestart(reason) {
  clearTimeout(watchdog)
  if (dirty) {
    // Restore the bytes before restarting, including on parent disconnect or timeout.
    await writeFile(settingsPath, original)
    dirty = false
    await stopDjango()
  }
  assert.ok((await readFile(settingsPath)).equals(original), 'Original settings were not restored byte-for-byte.')
  await startDjango()
  const response = await fetch('http://127.0.0.1:8000/api/exams/', { headers: { Origin: 'http://localhost:5173', Connection: 'close' }, signal: AbortSignal.timeout(5000) })
  assert.equal(response.headers.get('access-control-allow-origin'), 'http://localhost:5173')
  await writeFile(path.join(evidence, 'cors-restoration.json'), JSON.stringify({ restored: true, reason, sha256: originalHash, djangoPid: django.pid, checkedAt: new Date().toISOString() }, null, 2))
}

async function releaseServers(reason) {
  await restoreAndRestart(reason)
  django.unref()
  finished = true
  if (process.connected) process.disconnect()
}

process.on('message', (message) => {
  queue = queue.then(async () => {
    try {
      if (message.action === 'start') await startDjango()
      else if (message.action === 'stop') await stopDjango()
      else if (message.action === 'disable') {
        assert.ok((await readFile(settingsPath)).equals(original), 'Settings changed before the test.')
        await stopDjango()
        dirty = true
        watchdog = setTimeout(() => {
          queue = queue.then(() => restoreAndRestart('45-second safety timeout')).catch((error) => console.error(error))
        }, 45000)
        await writeFile(settingsPath, restricted)
        await startDjango()
      } else if (message.action === 'restore') await restoreAndRestart('explicit restoration after CORS evidence')
      else if (message.action === 'finish') {
        await restoreAndRestart('final safety verification')
        process.send({ id: message.id, ok: true, pid: django.pid, sha256: originalHash })
        django.unref()
        finished = true
        process.disconnect()
        return
      } else throw new Error('Unknown guard action.')
      process.send({ id: message.id, ok: true, pid: django?.pid, sha256: originalHash })
    } catch (error) {
      if (dirty) await restoreAndRestart('action failed; restoring immediately')
      if (process.connected) process.send({ id: message.id, ok: false, error: error.stack })
    }
  }).catch((error) => { console.error(error); process.exitCode = 1 })
})

process.on('disconnect', () => {
  if (!finished) queue = queue.then(() => releaseServers('parent disconnected; automatic restoration'))
})
process.send({ ready: true, sha256: originalHash })
