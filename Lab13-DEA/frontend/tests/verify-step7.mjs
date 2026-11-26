// Read-only Django verification plus the existing browser suite. No migrations or seeds.
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import net from 'node:net'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { setTimeout as delay } from 'node:timers/promises'
import { stopOwnedProcess } from './helpers/ownedProcess.mjs'

const frontend = fileURLToPath(new URL('../', import.meta.url))
const backend = path.resolve(frontend, '../backend')
const evidenceRoot = path.join(frontend, 'evidencias/lab12/paso7-verificacion')
await mkdir(evidenceRoot, { recursive: true })
const evidence = await mkdtemp(path.join(evidenceRoot, 'readonly-'))
console.log(`Step 7 report directory: ${path.relative(frontend, evidence)}`)
const protectedFiles = [
  path.join(backend, 'db.sqlite3'), path.join(backend, 'config/settings.py'),
  path.join(backend, 'requirements.txt'), path.join(frontend, 'package.json'), path.join(frontend, 'package-lock.json'),
  // Originals stay local and are intentionally absent from a published checkout.
  ...['07-error-validacion-respuesta-http.png', '07a-error-validacion-http400.png'].map((name) => path.join(frontend, 'evidencias/lab12/run-DgJS4v', name)).filter(existsSync),
]
const hash = async (file) => createHash('sha256').update(await readFile(file)).digest('hex')
const baseline = await Promise.all(protectedFiles.map(hash))
const report = { checkedAt: new Date().toISOString(), target: 'real Django; GET only; existing SQLite opened read-only', checks: [] }
let django
let sentinel
let output = ''

async function freePort(port) {
  const server = net.createServer()
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, 'localhost', resolve) })
  await new Promise((resolve) => server.close(resolve))
}

async function command(file, args) {
  const child = spawn(file, args, { cwd: frontend, stdio: 'inherit' })
  const status = await new Promise((resolve, reject) => { child.once('error', reject); child.once('exit', resolve) })
  assert.equal(status, 0, `${args.join(' ')} failed.`)
}

try {
  await freePort(5173)
  await freePort(8000)
  await assert.rejects(stopOwnedProcess({ pid: process.pid }), /owned ChildProcess/)
  sentinel = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { stdio: 'ignore' })
  const source = [
    'import os',
    'os.environ["DJANGO_SETTINGS_MODULE"] = "config.settings"',
    'from django.conf import settings',
    'db = settings.DATABASES["default"]',
    'db["NAME"] = "file:" + str(db["NAME"]).replace(chr(92), "/") + "?mode=ro"',
    'db["OPTIONS"] = {"uri": True}',
    'from django.core.management import execute_from_command_line',
    'execute_from_command_line(["manage.py", "runserver", "127.0.0.1:8000", "--noreload"])',
  ].join('\n')
  django = spawn(path.join(backend, '.venv/Scripts/python.exe'), ['-B', '-c', source], {
    cwd: backend, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1', PYTHONPATH: '', PYTHONUNBUFFERED: '1' },
  })
  django.stdout.on('data', (data) => { output += data })
  django.stderr.on('data', (data) => { output += data })
  django.on('error', (error) => { output += error.message })
  let ready = false
  for (let attempt = 0; attempt < 100; attempt += 1) {
    assert.equal(django.exitCode, null, 'Owned Django exited during startup.')
    try {
      const response = await fetch('http://127.0.0.1:8000/api/exams/', { headers: { Origin: 'http://localhost:5173' }, signal: AbortSignal.timeout(1000) })
      assert.equal(response.status, 200)
      assert.equal(response.headers.get('access-control-allow-origin'), 'http://localhost:5173')
      ready = true
      break
    } catch { await delay(100) }
  }
  assert.ok(ready, 'Read-only Django did not become ready.')
  report.checks.push({ name: 'read-only Django GET and exact CORS origin', passed: true })
  await command(process.execPath, ['tests/browser.test.mjs'])
  report.checks.push({ name: 'existing browser suite, including real ERR_ABORTED and recovery', passed: true })
  assert.ok(!/"(?:POST|PUT|PATCH|DELETE) /.test(output), 'The read-only browser run must not write.')
  await stopOwnedProcess(django)
  await stopOwnedProcess(django) // Already-exited handles must be safe too.
  assert.equal(sentinel.exitCode, null, 'An unrelated sibling must stay alive.')
  await assert.rejects(fetch('http://127.0.0.1:8000/api/', { signal: AbortSignal.timeout(1500) }))
  await freePort(8000)
  await freePort(5173)
  report.checks.push({ name: 'owned Django launcher/tree stopped; repeat stop safe; sibling alive; ports released', passed: true })
} catch (error) {
  report.checks.push({ name: 'step 7 verification', passed: false, error: error.message })
  console.error(error)
  process.exitCode = 1
} finally {
  for (const child of [django, sentinel]) if (child) await stopOwnedProcess(child)
  report.protectedFiles = []
  for (let index = 0; index < protectedFiles.length; index += 1) {
    const actual = await hash(protectedFiles[index])
    report.protectedFiles.push({ file: path.relative(path.resolve(frontend, '..'), protectedFiles[index]).split(path.sep).join('/'), sha256: baseline[index], unchanged: actual === baseline[index] })
  }
  if (!report.protectedFiles.every((file) => file.unchanged)) process.exitCode = 1
  report.exitCode = process.exitCode || 0
  await writeFile(path.join(evidence, 'read-only-browser.json'), JSON.stringify(report, null, 2) + '\n')
  await writeFile(path.join(evidence, 'django-read-only.log'), output)
}
