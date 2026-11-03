const assert = require('node:assert/strict')
const { spawn, spawnSync } = require('node:child_process')
const { mkdtempSync, rmSync, existsSync } = require('node:fs')
const { join, resolve } = require('node:path')
const { tmpdir } = require('node:os')
const { randomBytes } = require('node:crypto')
const net = require('node:net')

const root = resolve(__dirname, '../..')
const base = process.env.LOCALAPPDATA ? join(process.env.LOCALAPPDATA, 'Temp/opencode') : tmpdir()
const directory = mkdtempSync(join(base, 'jyc-deploy-'))
const email = 'deployment@test.invalid'
const password = randomBytes(20).toString('hex')
let child

async function freePort() {
  const socket = net.createServer()
  await new Promise((resolve) => socket.listen(0, '127.0.0.1', resolve))
  const port = socket.address().port
  await new Promise((resolve) => socket.close(resolve))
  return port
}

async function start(extra = {}) {
  const port = await freePort()
  child = spawn(process.execPath, ['server/scripts/start-production.cjs'], {
    cwd: root, detached: process.platform !== 'win32',
    env: { ...process.env, DATABASE_URL: '', UPLOAD_DIR: '', NODE_ENV: 'production', DATA_DIR: directory, JWT_SECRET: randomBytes(32).toString('hex'), ADMIN_EMAIL: email, ADMIN_PASSWORD: password, PORT: String(port), ...extra },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  await new Promise((resolve, reject) => {
    let output = ''
    const timeout = setTimeout(() => reject(new Error(`El arranque tardó demasiado: ${output}`)), 45000)
    const capture = (chunk) => {
      output += chunk.toString()
      if (output.includes('JyC Digital API en')) { clearTimeout(timeout); resolve() }
    }
    child.stdout.on('data', capture)
    child.stderr.on('data', capture)
    child.once('error', (error) => { clearTimeout(timeout); reject(error) })
    child.once('exit', (code) => { clearTimeout(timeout); reject(new Error(`Inicio fallido (${code}): ${output}`)) })
  })
  return `http://127.0.0.1:${port}`
}

async function stop() {
  if (!child || child.exitCode !== null) return
  const exited = new Promise((resolve) => child.once('exit', resolve))
  if (process.platform === 'win32') spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' })
  else process.kill(-child.pid, 'SIGTERM')
  await exited
  child = undefined
}

async function checkLogin(url, value) {
  const response = await fetch(`${url}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: value }) })
  return response
}

async function main() {
  try {
    const invalid = spawnSync(process.execPath, ['server/scripts/start-production.cjs'], { cwd: root, env: { ...process.env, NODE_ENV: 'production', JWT_SECRET: '', DATA_DIR: directory }, encoding: 'utf8' })
    assert.equal(invalid.status, 1)
    assert.ok(invalid.stderr.includes('JWT_SECRET'))
    const url = await start()
    for (const path of ['/', '/login', '/app/prestamos/ejemplo']) {
      const response = await fetch(`${url}${path}`)
      assert.equal(response.status, 200)
      assert.ok((await response.text()).includes('id="root"'))
    }
    assert.equal((await fetch(`${url}/api/health`)).status, 200)
    const missing = await fetch(`${url}/api/no-existe`)
    assert.equal(missing.status, 404)
    assert.ok(missing.headers.get('content-type').includes('json'))
    assert.equal((await fetch(`${url}/assets/no-existe.js`)).status, 404)
    const login = await checkLogin(url, password)
    assert.equal(login.status, 200)
    assert.equal((await login.json()).role, 'ADMIN')
    const cookie = login.headers.get('set-cookie')
    assert.match(cookie, /HttpOnly/i)
    assert.match(cookie, /Secure/i)
    assert.match(cookie, /SameSite=Lax/i)
    assert.ok(existsSync(join(directory, 'jyc.db')))
    assert.ok(existsSync(join(directory, 'uploads')))
    await stop()
    const next = await start({ ADMIN_PASSWORD: randomBytes(20).toString('hex') })
    assert.equal((await checkLogin(next, password)).status, 200, 'Reiniciar no debe cambiar la contraseña ni borrar la base')
    console.log('OK: despliegue completo, rutas React, API, base persistente, administrador inicial, cookies seguras y reinicio sin pérdida de datos.')
  } finally {
    await stop()
    rmSync(directory, { recursive: true, force: true })
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1 })
