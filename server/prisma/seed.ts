import 'dotenv/config';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { addPeriods, calculateSchedule } from '../src/loans/loan-calculator';

const prisma = new PrismaClient();
const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';

const daysAgo = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(10, 0, 0, 0);
  return date;
};

const weeksAgo = (weeks: number) => daysAgo(weeks * 7);

async function main() {
  console.log('Limpiando datos anteriores...');
  await prisma.paymentAllocation.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.installment.deleteMany();
  await prisma.loan.deleteMany();
  await prisma.applicationDocument.deleteMany();
  await prisma.loanApplication.deleteMany();
  await prisma.consent.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.clientProfile.deleteMany();
  await prisma.user.deleteMany();
  await prisma.setting.deleteMany();

  console.log('Creando configuración...');
  const settings: Record<string, string> = {
    minAmount: '50000',
    maxAmount: '100000',
    annualRate: '5',
    loanAmounts: '50000,75000,100000',
    minTerm: '1',
    maxTerm: '8',
    contactPhone: '8515-7835',
    contactPhone2: '6272-2143',
    contactPhone3: '8812-6956',
    contactEmail: 'info@jycprestamos.cr',
    address: 'Nandayure, Guanacaste, Costa Rica',
    hours: 'Lunes a viernes, 8:00 a.m. a 5:00 p.m.',
    heroTitle: 'Crédito cercano, claro y a tu ritmo.',
    heroSubtitle:
      'Préstamos personales para las comunidades de la Península de Nicoya, con acompañamiento de principio a fin.',
    privacyVersion: '2026-10',
  };
  for (const [key, value] of Object.entries(settings)) {
    await prisma.setting.create({ data: { key, value } });
  }

  console.log('Creando usuarios...');
  const password = await bcrypt.hash('Cliente123!', 10);
  const staffPassword = await bcrypt.hash('Staff123!', 10);

  const admin = await prisma.user.create({
    data: {
      name: 'José Jiménez',
      email: 'admin@jyc.cr',
      phone: '8888-1000',
      passwordHash: staffPassword,
      role: 'ADMIN',
    },
  });

  const supervisor = await prisma.user.create({
    data: {
      name: 'María Rodríguez',
      email: 'supervisor@jyc.cr',
      phone: '8888-2000',
      passwordHash: staffPassword,
      role: 'SUPERVISOR',
    },
  });

  await prisma.user.create({ data: { name: 'Oficinista', email: 'oficinista@jyc.cr', passwordHash: staffPassword, role: 'CLERK' } });

  const collector = await prisma.user.create({
    data: {
      name: 'Carlos Vargas',
      email: 'cobrador@jyc.cr',
      phone: '8888-3000',
      passwordHash: staffPassword,
      role: 'COLLECTOR',
    },
  });

  const collector2 = await prisma.user.create({
    data: {
      name: 'Karla Sánchez',
      email: 'cobrador2@jyc.cr',
      phone: '8888-3001',
      passwordHash: staffPassword,
      role: 'COLLECTOR',
    },
  });

  const clientSeeds = [
    {
      name: 'Ana Mora',
      email: 'cliente@jyc.cr',
      phone: '8700-1001',
      cedula: '5-0456-0789',
      community: 'Nicoya',
      occupation: 'Comerciante',
      employer: 'Emprendimiento propio',
      birthDate: new Date('1992-05-18'),
      employmentStartDate: new Date('2019-03-01'),
      monthlyIncome: 450000,
      otherIncome: 50000,
      collectorId: collector.id,
    },
    {
      name: 'Luis Hernández',
      email: 'luis@jyc.cr',
      phone: '8700-1002',
      cedula: '5-0789-0123',
      community: 'Nandayure',
      occupation: 'Agricultor',
      employer: 'Finca familiar',
      birthDate: new Date('1987-11-02'),
      employmentStartDate: new Date('2015-01-15'),
      monthlyIncome: 380000,
      otherIncome: 0,
      collectorId: collector.id,
    },
    {
      name: 'Carla Jiménez',
      email: 'carla@jyc.cr',
      phone: '8700-1003',
      cedula: '5-0123-0456',
      community: 'Jicaral',
      occupation: 'Docente',
      employer: 'MEP',
      birthDate: new Date('1990-02-14'),
      employmentStartDate: new Date('2014-02-01'),
      monthlyIncome: 520000,
      otherIncome: 0,
      collectorId: collector2.id,
    },
    {
      name: 'Mario Solano',
      email: 'mario@jyc.cr',
      phone: '8700-1004',
      cedula: '5-0567-0890',
      community: 'Carmona',
      occupation: 'Mecánico',
      employer: 'Taller Solano',
      birthDate: new Date('1985-08-22'),
      employmentStartDate: new Date('2012-06-01'),
      monthlyIncome: 420000,
      otherIncome: 30000,
      collectorId: collector.id,
    },
    {
      name: 'Paola Ruiz',
      email: 'paola@jyc.cr',
      phone: '8700-1005',
      cedula: '5-0890-0123',
      community: 'Hojancha',
      occupation: 'Comerciante',
      employer: 'Pulpería La Esperanza',
      birthDate: new Date('1994-04-09'),
      employmentStartDate: new Date('2018-09-01'),
      monthlyIncome: 350000,
      otherIncome: 40000,
      collectorId: collector2.id,
    },
    {
      name: 'Jorge Vega',
      email: 'jorge@jyc.cr',
      phone: '8700-1006',
      cedula: '5-0234-0567',
      community: 'Sámara',
      occupation: 'Guía turístico',
      employer: 'Tours del Pacífico',
      birthDate: new Date('1989-12-30'),
      employmentStartDate: new Date('2016-07-01'),
      monthlyIncome: 480000,
      otherIncome: 60000,
      collectorId: collector2.id,
    },
  ];

  const clients: Record<string, any> = {};
  for (const seed of clientSeeds) {
    const client = await prisma.user.create({
      data: {
        name: seed.name,
        email: seed.email,
        phone: seed.phone,
        passwordHash: password,
        role: 'CLIENT',
        profile: {
          create: {
            cedula: seed.cedula,
            birthDate: seed.birthDate,
            address: `${seed.community}, Guanacaste`,
            community: seed.community,
            occupation: seed.occupation,
            employer: seed.employer,
            employmentStartDate: seed.employmentStartDate,
            monthlyIncome: seed.monthlyIncome,
            otherIncome: seed.otherIncome,
            assignedCollectorId: seed.collectorId,
          },
        },
      },
      include: { profile: true },
    });
    clients[seed.email] = client;
  }

  mkdirSync(UPLOAD_DIR, { recursive: true });
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2n1cAAAAASUVORK5CYII=',
    'base64',
  );
  writeFileSync(join(UPLOAD_DIR, 'seed-cedula.png'), png);
  writeFileSync(join(UPLOAD_DIR, 'seed-ingresos.png'), png);

  console.log('Creando solicitudes...');

  const anaApplication = await prisma.loanApplication.create({
    data: {
      clientId: clients['cliente@jyc.cr'].id,
      amountRequested: 50000,
      termWeeks: 8,
      termInstallments: 8,
      paymentFrequency: 'WEEKLY',
      purpose: 'Capital de trabajo para ampliar el inventario del negocio.',
      status: 'SUBMITTED',
      submittedAt: daysAgo(2),
      createdAt: daysAgo(2),
    },
  });
  await prisma.applicationDocument.createMany({
    data: [
      {
        applicationId: anaApplication.id,
        type: 'ID_CARD',
        originalName: 'cedula-ana.png',
        storedName: 'seed-cedula.png',
        mimeType: 'image/png',
        size: png.length,
      },
      {
        applicationId: anaApplication.id,
        type: 'INCOME_PROOF',
        originalName: 'comprobante-ingresos-ana.png',
        storedName: 'seed-ingresos.png',
        mimeType: 'image/png',
        size: png.length,
      },
    ],
  });

  const luisApplication = await prisma.loanApplication.create({
    data: {
      clientId: clients['luis@jyc.cr'].id,
      amountRequested: 75000,
      termWeeks: 8,
      termInstallments: 4,
      paymentFrequency: 'BIWEEKLY',
      purpose: 'Compra de insumos y herramientas para la finca.',
      status: 'UNDER_REVIEW',
      submittedAt: daysAgo(5),
      reviewedById: supervisor.id,
      reviewNotes: 'Pendiente verificar comprobante de ingresos.',
      createdAt: daysAgo(6),
    },
  });
  await prisma.applicationDocument.create({
    data: {
      applicationId: luisApplication.id,
      type: 'ID_CARD',
      originalName: 'cedula-luis.png',
      storedName: 'seed-cedula.png',
      mimeType: 'image/png',
      size: png.length,
    },
  });

  await prisma.loanApplication.create({
    data: {
      clientId: clients['jorge@jyc.cr'].id,
      amountRequested: 50000,
      termWeeks: 8,
      termInstallments: 8,
      paymentFrequency: 'WEEKLY',
      purpose: 'Mejoras en el equipo de tours.',
      status: 'SUBMITTED',
      submittedAt: daysAgo(1),
      createdAt: daysAgo(1),
    },
  });

  await prisma.loanApplication.create({
    data: {
      clientId: clients['paola@jyc.cr'].id,
      amountRequested: 100000,
      termWeeks: 8,
      termInstallments: 8,
      paymentFrequency: 'WEEKLY',
      purpose: 'Remodelación de la pulpería.',
      status: 'REJECTED',
      submittedAt: daysAgo(12),
      reviewedById: admin.id,
      decisionAt: daysAgo(10),
      rejectionReason:
        'El monto solicitado supera la capacidad de pago con los ingresos actuales.',
      createdAt: daysAgo(13),
    },
  });

  console.log('Creando préstamos y pagos...');

  const carlaApplication = await prisma.loanApplication.create({
    data: {
      clientId: clients['carla@jyc.cr'].id,
      amountRequested: 75000,
      termWeeks: 8,
      termInstallments: 8,
      paymentFrequency: 'WEEKLY',
      purpose: 'Compra de equipo para clases virtuales.',
      status: 'APPROVED',
      submittedAt: daysAgo(30),
      reviewedById: admin.id,
      decisionAt: daysAgo(25),
      approvedAmount: 75000,
      annualRate: 15,
      approvedTermWeeks: 8,
      approvedTerm: 8,
      approvedFrequency: 'WEEKLY',
      firstDueDate: weeksAgo(3),
      reviewNotes: 'Capacidad de pago verificada.',
      createdAt: daysAgo(31),
    },
  });
  await createLoanWithPayments({
    applicationId: carlaApplication.id,
    clientId: clients['carla@jyc.cr'].id,
    principal: 75000,
    annualRate: 15,
    termWeeks: 8,
    termInstallments: 8,
    paymentFrequency: 'WEEKLY',
    firstDueDate: weeksAgo(3),
    paidInstallments: 2,
    collectorId: collector2.id,
    listoRecaudoLoanId: 'LR-2026-0042',
    status: 'ACTIVE',
  });

  const marioApplication = await prisma.loanApplication.create({
    data: {
      clientId: clients['mario@jyc.cr'].id,
      amountRequested: 50000,
      termWeeks: 8,
      termInstallments: 8,
      paymentFrequency: 'WEEKLY',
      purpose: 'Repuestos y herramientas para el taller.',
      status: 'APPROVED',
      submittedAt: daysAgo(50),
      reviewedById: admin.id,
      decisionAt: daysAgo(45),
      approvedAmount: 50000,
      annualRate: 15,
      approvedTermWeeks: 8,
      approvedTerm: 8,
      approvedFrequency: 'WEEKLY',
      firstDueDate: weeksAgo(6),
      reviewNotes: 'Aprobado con seguimiento de ruta.',
      createdAt: daysAgo(51),
    },
  });
  await createLoanWithPayments({
    applicationId: marioApplication.id,
    clientId: clients['mario@jyc.cr'].id,
    principal: 50000,
    annualRate: 15,
    termWeeks: 8,
    termInstallments: 8,
    paymentFrequency: 'WEEKLY',
    firstDueDate: weeksAgo(6),
    paidInstallments: 2,
    collectorId: collector.id,
    listoRecaudoLoanId: 'LR-2026-0031',
    status: 'ACTIVE',
  });

  const paolaPaidApplication = await prisma.loanApplication.create({
    data: {
      clientId: clients['paola@jyc.cr'].id,
      amountRequested: 50000,
      termWeeks: 8,
      termInstallments: 8,
      paymentFrequency: 'WEEKLY',
      purpose: 'Capital para inventario de temporada.',
      status: 'APPROVED',
      submittedAt: daysAgo(150),
      reviewedById: admin.id,
      decisionAt: daysAgo(145),
      approvedAmount: 50000,
      annualRate: 15,
      approvedTermWeeks: 8,
      approvedTerm: 8,
      approvedFrequency: 'WEEKLY',
      firstDueDate: weeksAgo(20),
      createdAt: daysAgo(151),
    },
  });
  await createLoanWithPayments({
    applicationId: paolaPaidApplication.id,
    clientId: clients['paola@jyc.cr'].id,
    principal: 50000,
    annualRate: 15,
    termWeeks: 8,
    termInstallments: 8,
    paymentFrequency: 'WEEKLY',
    firstDueDate: weeksAgo(20),
    paidInstallments: 8,
    collectorId: collector2.id,
    listoRecaudoLoanId: 'LR-2025-0198',
    status: 'PAID',
  });

  console.log('Creando notificaciones y auditoría...');
  await prisma.notification.createMany({
    data: [
      {
        userId: clients['cliente@jyc.cr'].id,
        title: 'Solicitud recibida',
        message: 'Tu solicitud fue recibida y está pendiente de revisión.',
        createdAt: daysAgo(2),
      },
      {
        userId: clients['carla@jyc.cr'].id,
        title: 'Pago registrado',
        message: 'Recibimos tu pago semanal. Gracias por mantener tu crédito al día.',
        createdAt: daysAgo(7),
      },
      {
        userId: clients['mario@jyc.cr'].id,
        title: 'Cuota pendiente',
        message: 'Tienes una cuota pendiente. Comunicate con tu cobrador para coordinar el pago.',
        createdAt: daysAgo(3),
      },
    ],
  });

  await prisma.auditLog.createMany({
    data: [
      {
        userId: admin.id,
        action: 'SEED_DATA',
        entity: 'System',
        metadata: JSON.stringify({ message: 'Datos iniciales cargados' }),
      },
      {
        userId: supervisor.id,
        action: 'REVIEW_APPLICATION',
        entity: 'LoanApplication',
        entityId: luisApplication.id,
        metadata: JSON.stringify({ status: 'UNDER_REVIEW' }),
      },
      {
        userId: admin.id,
        action: 'APPROVE_APPLICATION',
        entity: 'LoanApplication',
        entityId: carlaApplication.id,
        metadata: JSON.stringify({ approvedAmount: 75000 }),
      },
    ],
  });

  console.log('Datos iniciales listos.');
  console.log('Admin: admin@jyc.cr / Staff123!');
  console.log('Supervisor: supervisor@jyc.cr / Staff123!');
  console.log('Cobrador: cobrador@jyc.cr / Staff123!');
  console.log('Cliente: cliente@jyc.cr / Cliente123!');
}

async function createLoanWithPayments(options: {
  applicationId: string;
  clientId: string;
  principal: number;
  annualRate: number;
  termWeeks: number;
  termInstallments: number;
  paymentFrequency: string;
  firstDueDate: Date;
  paidInstallments: number;
  collectorId: string;
  listoRecaudoLoanId: string;
  status: 'ACTIVE' | 'PAID';
}) {
  const schedule = calculateSchedule(
    options.principal,
    options.annualRate,
    options.termInstallments,
    options.paymentFrequency,
    options.firstDueDate,
  );

  const loan = await prisma.loan.create({
    data: {
      applicationId: options.applicationId,
      clientId: options.clientId,
      principal: options.principal,
      annualRate: options.annualRate,
      termWeeks: options.termWeeks,
      termInstallments: options.termInstallments,
      paymentFrequency: options.paymentFrequency,
      startDate: options.firstDueDate,
      firstDueDate: options.firstDueDate,
      status: options.status,
      disbursedAt: options.firstDueDate,
      listoRecaudoLoanId: options.listoRecaudoLoanId,
      assignedCollectorId: options.collectorId,
    },
  });

  const installments = [];
  for (const item of schedule) {
    const installment = await prisma.installment.create({
      data: {
        loanId: loan.id,
        number: item.number,
        dueDate: item.dueDate,
        principal: item.principal,
        interest: item.interest,
        total: item.total,
        paidAmount: 0,
        status: 'PENDING',
      },
    });
    installments.push(installment);
  }

  const paidCount = Math.min(options.paidInstallments, installments.length);
  for (let index = 0; index < paidCount; index += 1) {
    const installment = installments[index];
    const payment = await prisma.payment.create({
      data: {
        loanId: loan.id,
        amount: installment.total,
        paidAt: addPeriods(options.firstDueDate, options.paymentFrequency, index),
        method: index % 3 === 0 ? 'SINPE' : 'CASH',
        receiptNumber: `SEED-${loan.id.slice(-6)}-${index + 1}`,
        listoRecaudoReceipt: `LR-REC-${index + 1}`,
        collectorId: options.collectorId,
        createdById: options.collectorId,
      },
    });
    await prisma.paymentAllocation.create({
      data: {
        paymentId: payment.id,
        installmentId: installment.id,
        amount: installment.total,
      },
    });
    await prisma.installment.update({
      where: { id: installment.id },
      data: { paidAmount: installment.total, status: 'PAID' },
    });
  }

  if (paidCount < installments.length) {
    await prisma.installment.updateMany({
      where: {
        loanId: loan.id,
        dueDate: { lt: new Date() },
        status: 'PENDING',
      },
      data: { status: 'OVERDUE' },
    });
  }

  return loan;
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
