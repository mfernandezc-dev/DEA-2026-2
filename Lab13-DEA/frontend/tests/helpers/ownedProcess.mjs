import assert from 'node:assert/strict'
import { ChildProcess, spawn } from 'node:child_process'

export async function stopOwnedProcess(child) {
  assert.ok(child instanceof ChildProcess, 'Only an owned ChildProcess handle may be stopped.')
  if (child.exitCode !== null || child.signalCode !== null) return
  assert.ok(Number.isInteger(child.pid) && child.pid > 0, 'Missing owned process PID.')
  const exited = new Promise((resolve) => child.once('exit', resolve))
  if (process.platform === 'win32') {
    // Windows venv launchers can have a Python child; never kill by executable name.
    const killer = spawn('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true, stdio: 'pipe' })
    let output = ''
    killer.stdout.on('data', (data) => { output += data })
    killer.stderr.on('data', (data) => { output += data })
    const status = await new Promise((resolve, reject) => { killer.once('error', reject); killer.once('exit', resolve) })
    if (status !== 0 && child.exitCode === null && child.signalCode === null) throw new Error(`Owned process tree could not be stopped: ${output}`)
  } else {
    assert.ok(child.kill('SIGTERM'), 'Could not stop the owned process.')
  }
  await exited
}
