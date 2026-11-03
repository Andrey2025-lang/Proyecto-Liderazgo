// Inicio idempotente: configura SQLite, sincroniza sin borrar y crea el primer administrador.
const { mkdirSync, existsSync } = require('node:fs')
const { resolve, isAbsolute } = require('node:path')
const { spawnSync, spawn } = require('node:child_process')

async function main() {
  process.env.NODE_ENV ||= 'production'
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32 || ['cambia-esta-clave-en-produccion', 'jyc-digital-dev-secret'].includes(process.env.JWT_SECRET)) {
    throw new Error('Falta JWT_SECRET: definí una clave aleatoria privada de al menos 32 caracteres.')
  }
  const dataDir = resolve(process.env.DATA_DIR || '/var/data')
  process.env.DATABASE_URL ||= `file:${resolve(dataDir, 'jyc.db').replace(/\\/g, '/')}`
  if (!process.env.DATABASE_URL.startsWith('file:') || !isAbsolute(process.env.DATABASE_URL.slice(5))) {
    throw new Error('DATABASE_URL debe ser una ruta SQLite absoluta, por ejemplo file:/var/data/jyc.db.')
  }
  process.env.UPLOAD_DIR ||= resolve(dataDir, 'uploads')
  const { dirname } = require('node:path')
  mkdirSync(dirname(process.env.DATABASE_URL.slice(5)), { recursive: true })
  mkdirSync(process.env.UPLOAD_DIR, { recursive: true })
  const root = resolve(__dirname, '../..')
  if (!existsSync(resolve(root, 'client/dist/index.html')) || !existsSync(resolve(root, 'server/dist/main.js'))) {
    throw new Error('Falta compilar el proyecto. Usá npm run render:build como Build Command.')
  }
  const schema = spawnSync(process.execPath, [require.resolve('prisma/build/index.js'), 'db', 'push', '--skip-generate', '--schema', resolve(root, 'server/prisma/schema.prisma')], {
    cwd: root, env: process.env, stdio: 'inherit',
  })
  if (schema.error) throw schema.error
  if (schema.status !== 0) throw new Error('No se pudo sincronizar el esquema. No se autorizaron borrados ni reinicios de la base.')

  const { PrismaClient } = require('@prisma/client')
  const bcrypt = require('bcryptjs')
  const prisma = new PrismaClient()
  try {
    const admin = await prisma.user.findFirst({ where: { role: 'ADMIN', status: 'ACTIVE' } })
    if (!admin) {
      const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase()
      const password = process.env.ADMIN_PASSWORD || ''
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 12 || ['Staff123!', 'Cliente123!'].includes(password)) {
        throw new Error('Para el primer inicio, configurá ADMIN_EMAIL y ADMIN_PASSWORD (contraseña propia de al menos 12 caracteres).')
      }
      if (await prisma.user.findUnique({ where: { email } })) {
        throw new Error('ADMIN_EMAIL ya pertenece a otra cuenta. No se modificará su rol ni su contraseña automáticamente.')
      }
      await prisma.user.create({ data: {
        email, name: process.env.ADMIN_NAME || 'Administración',
        passwordHash: await bcrypt.hash(password, 12), role: 'ADMIN',
      } })
      console.log('Cuenta administradora inicial creada. Las cuentas existentes no se modifican.')
    } else {
      console.log('Se conserva la cuenta administradora existente.')
    }
  } finally {
    await prisma.$disconnect()
  }
  // La API no necesita conservar la contraseña de aprovisionamiento en su entorno.
  delete process.env.ADMIN_PASSWORD
  const server = spawn(process.execPath, [resolve(root, 'server/dist/main.js')], {
    cwd: resolve(root, 'server'), env: process.env, stdio: 'inherit',
  })
  server.on('error', (error) => { console.error(error.message); process.exitCode = 1 })
  for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => server.kill(signal))
  server.on('exit', (code) => process.exit(code ?? 1))
}

main().catch((error) => {
  console.error('No se pudo preparar JyC Digital:', error.message)
  process.exit(1)
})
