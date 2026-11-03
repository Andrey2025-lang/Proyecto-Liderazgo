import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

// Actualización aditiva. No modifica préstamos ni elimina datos.
async function main() {
  const prisma = new PrismaClient();
  try {
    await prisma.setting.upsert({ where: { key: 'annualRate' }, create: { key: 'annualRate', value: '5' }, update: { value: '5' } });
    await prisma.setting.upsert({ where: { key: 'loanAmounts' }, create: { key: 'loanAmounts', value: '50000,75000,100000' }, update: {} });
    await prisma.user.upsert({ where: { email: 'oficinista@jyc.cr' }, update: {}, create: { email: 'oficinista@jyc.cr', name: 'Oficinista', role: 'CLERK', passwordHash: await bcrypt.hash('Staff123!', 10) } });
    console.log('Configuración inicial al 5 % y cuenta oficinista@jyc.cr disponibles. Préstamos existentes intactos.');
  } finally { await prisma.$disconnect(); }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
