import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../../', import.meta.url))
const manifest = (await readFile(path.join(root, 'PUBLICACION-LAB12.txt'), 'utf8')).trim().split(/\r?\n/)
const selected = new Set(manifest)
assert.equal(selected.size, manifest.length, 'Duplicate publication paths.')
const forbidden = /(?:^|\/)(?:\.venv|node_modules|dist|\.npm-cache|__pycache__|\.env(?:\..*)?|settings\.py\.original)(?:\/|$)|\.(?:sqlite3(?:-(?:journal|shm|wal))?|log|pyc|bak)$/i
for (const file of manifest) {
  assert.ok(!path.isAbsolute(file) && !file.includes('\\') && !file.split('/').includes('..') && !/[*?]/.test(file), `Non-exact or unsafe path: ${file}`)
  assert.ok(!forbidden.test(file), `Local/private artifact selected: ${file}`)
  assert.ok((await stat(path.join(root, file))).isFile(), `Not a file: ${file}`)
  assert.ok(!/^frontend\/evidencias\/lab12\/run-DgJS4v\/07(?:a-error-validacion-http400|-error-validacion-respuesta-http)\.png$/.test(file), 'Original screenshot selected.')
}

const ignored = spawnSync('git', ['check-ignore', '--stdin'], { cwd: root, input: manifest.join('\n') + '\n', encoding: 'utf8' })
assert.equal(ignored.status, 1, `Selected files must not be ignored: ${ignored.stdout || ignored.stderr}`)

let links = 0
for (const document of manifest.filter((file) => file.endsWith('.md'))) {
  const content = await readFile(path.join(root, document), 'utf8')
  for (const match of content.matchAll(/!?\[[^\]]*\]\(([^\s)]+)\)/g)) {
    const target = match[1]
    assert.ok(!/^[a-z]+:/i.test(target), `Review external documentation link manually: ${target}`)
    const [relative, anchor] = decodeURIComponent(target).split('#')
    assert.ok(!anchor, `Anchor validation not implemented: ${target}`)
    const resolved = path.relative(root, path.resolve(root, path.dirname(document), relative)).split(path.sep).join('/')
    assert.ok(selected.has(resolved), `${document} links outside the closed publication list: ${target}`)
    assert.ok((await stat(path.join(root, resolved))).isFile(), `Broken documentation link: ${target}`)
    links += 1
  }
}
console.log(JSON.stringify({ files: manifest.length, markdownLinks: links, brokenLinks: 0, ignoredSelectedFiles: 0, exitCode: 0 }, null, 2))
