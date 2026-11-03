import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreatePaymentDto } from '../payments/dto/create-payment.dto';
import { DisburseLoanDto } from './dto/disburse-loan.dto';
import { round2 } from './loan-calculator';
import { summarizeLoan } from './loan.utils';
import { addReportSheet, createWorkbook, CRC_FORMAT, DATETIME_FORMAT, DATE_FORMAT, localExcelDate } from '../common/workbook';

type AuthUser = { id: string; role: string };

@Injectable()
export class LoansService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async listMine(clientId: string) {
    await this.markOverdue();
    const loans = await this.prisma.loan.findMany({
      where: { clientId },
      orderBy: { createdAt: 'desc' },
      include: {
        installments: { orderBy: { number: 'asc' } },
        payments: { where: { voidedAt: null }, orderBy: { paidAt: 'desc' } },
        assignedCollector: { select: { id: true, name: true, phone: true } },
      },
    });
    return loans.map((loan) => summarizeLoan(loan));
  }

  async getMine(clientId: string, id: string) {
    await this.markOverdue();
    const loan = await this.prisma.loan.findFirst({
      where: { id, clientId },
      include: {
        installments: { orderBy: { number: 'asc' } },
        payments: {
          where: { voidedAt: null },
          orderBy: { paidAt: 'desc' },
          include: { collector: { select: { id: true, name: true } } },
        },
        assignedCollector: { select: { id: true, name: true, phone: true } },
        application: true,
      },
    });
    if (!loan) throw new NotFoundException('Préstamo no encontrado.');
    return summarizeLoan(loan);
  }

  async listAll(user: AuthUser, status?: string, search?: string) {
    await this.markOverdue();
    const where: any = {};
    if (status) where.status = status;
    if (user.role === 'COLLECTOR') where.assignedCollectorId = user.id;
    if (search) {
      where.OR = [
        { client: { is: { name: { contains: search } } } },
        { client: { is: { email: { contains: search } } } },
        { client: { is: { profile: { is: { cedula: { contains: search } } } } } },
      ];
    }

    const loans = await this.prisma.loan.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        client: { include: { profile: true } },
        installments: { orderBy: { number: 'asc' } },
        assignedCollector: { select: { id: true, name: true } },
        _count: { select: { payments: true } },
      },
    });
    return loans.map((loan) => summarizeLoan(loan));
  }

  async getOne(user: AuthUser, id: string) {
    await this.markOverdue();
    const loan = await this.prisma.loan.findUnique({
      where: { id },
      include: {
        client: { include: { profile: true } },
        installments: { orderBy: { number: 'asc' } },
        payments: {
          orderBy: { paidAt: 'desc' },
          include: {
            collector: { select: { id: true, name: true } },
            voidedBy: { select: { id: true, name: true } },
          },
        },
        assignedCollector: { select: { id: true, name: true, phone: true } },
        application: true,
      },
    });
    if (!loan) throw new NotFoundException('Préstamo no encontrado.');
    if (user.role === 'COLLECTOR' && loan.assignedCollectorId !== user.id) {
      throw new ForbiddenException('No tienes acceso a este préstamo.');
    }
    return summarizeLoan(loan);
  }

  async disburse(user: AuthUser, id: string, dto: DisburseLoanDto) {
    if (!['ADMIN', 'SUPERVISOR'].includes(user.role)) throw new ForbiddenException('No podés desembolsar préstamos.');
    if (dto.assignedCollectorId) {
      const collector = await this.prisma.user.findUnique({
        where: { id: dto.assignedCollectorId },
      });
      if (!collector || collector.role !== 'COLLECTOR') {
        throw new NotFoundException('Cobrador no encontrado.');
      }
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const loan = await tx.loan.findUnique({ where: { id }, include: { application: true } });
      if (!loan) throw new NotFoundException('Préstamo no encontrado.');
      if (loan.status !== 'PENDING_DISBURSEMENT') throw new BadRequestException('Este préstamo ya fue desembolsado.');
      let renewalPayoff = 0;
      const sourceId = loan.application.renewalOfLoanId;
      if (sourceId) {
        const source = await tx.loan.findUnique({ where: { id: sourceId }, include: { installments: { orderBy: { number: 'asc' } } } });
        const alreadyRenewed = await tx.loanApplication.findFirst({ where: { renewalOfLoanId: sourceId, loan: { is: { disbursedAt: { not: null } } } } });
        if (!source || source.clientId !== loan.clientId || !['ACTIVE', 'DEFAULTED', 'PAID'].includes(source.status) || alreadyRenewed) throw new BadRequestException('El préstamo anterior ya no se puede renovar.');
        renewalPayoff = round2(source.installments.reduce((sum, item) => sum + Math.max(0, item.total - item.paidAmount), 0));
        if (dto.expectedRenewalPayoff === undefined || Math.abs(dto.expectedRenewalPayoff - renewalPayoff) > 0.005) throw new BadRequestException('El saldo anterior cambió o no fue confirmado. Actualizá el detalle y revisá el neto antes de desembolsar.');
        if (renewalPayoff >= loan.principal) throw new BadRequestException('El saldo anterior debe ser menor que el nuevo monto.');
        if (renewalPayoff > 0) {
          const settlement = await tx.payment.create({ data: { loanId: source.id, amount: renewalPayoff, paidAt: new Date(), method: 'REFINANCE', receiptNumber: this.receiptNumber(), createdById: user.id, refinancingLoanId: id, notes: `Cancelación por renovación ${id}. No es un cobro en efectivo.` } });
          for (const item of source.installments) {
            const remaining = round2(Math.max(0, item.total - item.paidAmount));
            if (remaining > 0) await tx.paymentAllocation.create({ data: { paymentId: settlement.id, installmentId: item.id, amount: remaining } });
            await tx.installment.update({ where: { id: item.id }, data: { paidAmount: item.total, status: 'PAID' } });
          }
        }
        await tx.loan.update({ where: { id: source.id }, data: { status: 'REFINANCED' } });
        await tx.auditLog.create({ data: { userId: user.id, action: 'SETTLE_RENEWAL', entity: 'Loan', entityId: sourceId, metadata: JSON.stringify({ newLoanId: id, renewalPayoff, netDisbursement: round2(loan.principal - renewalPayoff) }) } });
      }
      const claimed = await tx.loan.updateMany({ where: { id, status: 'PENDING_DISBURSEMENT' }, data: { status: 'ACTIVE' } });
      if (claimed.count !== 1) throw new BadRequestException('El préstamo ya fue desembolsado.');
      return tx.loan.update({
      where: { id },
      data: {
        status: 'ACTIVE',
        disbursedAt: new Date(),
        renewalPayoff,
        netDisbursement: round2(loan.principal - renewalPayoff),
        listoRecaudoLoanId: dto.listoRecaudoLoanId,
        assignedCollectorId: dto.assignedCollectorId ?? loan.assignedCollectorId,
      },
      include: {
        installments: { orderBy: { number: 'asc' } },
        assignedCollector: { select: { id: true, name: true } },
      },
      });
    });

    await this.prisma.notification.create({
      data: {
        userId: updated.clientId,
        title: 'Préstamo desembolsado',
        message: `Tu préstamo fue desembolsado. Saldo anterior cancelado: ₡${updated.renewalPayoff}. Monto neto a entregar: ₡${updated.netDisbursement}.`,
      },
    });
    await this.audit.log(user.id, 'DISBURSE_LOAN', 'Loan', id, {
      listoRecaudoLoanId: dto.listoRecaudoLoanId,
    });
    return summarizeLoan(updated);
  }

  async assignCollector(user: AuthUser, id: string, collectorId?: string | null) {
    const loan = await this.prisma.loan.findUnique({ where: { id } });
    if (!loan) throw new NotFoundException('Préstamo no encontrado.');

    if (collectorId) {
      const collector = await this.prisma.user.findUnique({ where: { id: collectorId } });
      if (!collector || collector.role !== 'COLLECTOR') {
        throw new NotFoundException('Cobrador no encontrado.');
      }
    }

    const updated = await this.prisma.loan.update({
      where: { id },
      data: { assignedCollectorId: collectorId || null },
      include: { assignedCollector: { select: { id: true, name: true } } },
    });
    await this.audit.log(user.id, 'ASSIGN_LOAN_COLLECTOR', 'Loan', id, {
      collectorId: collectorId || null,
    });
    return updated;
  }

  async addPayment(user: AuthUser, loanId: string, dto: CreatePaymentDto) {
    await this.markOverdue();
    let clientId: string;
    const payment = await this.prisma.$transaction(async (tx) => {
      const loan = await tx.loan.findUnique({
        where: { id: loanId },
        include: {
          installments: { orderBy: { number: 'asc' } },
          client: true,
        },
      });
      if (!loan) throw new NotFoundException('Préstamo no encontrado.');
      clientId = loan.clientId;
      if (user.role === 'COLLECTOR' && loan.assignedCollectorId !== user.id) {
        throw new ForbiddenException('Este préstamo no está asignado a tu ruta.');
      }
      if (!['ACTIVE', 'DEFAULTED'].includes(loan.status)) {
        throw new BadRequestException('El préstamo no está activo para recibir pagos.');
      }

      const outstanding = round2(
        loan.installments.reduce(
          (sum, item) => sum + Math.max(0, item.total - item.paidAmount),
          0,
        ),
      );
      if (dto.amount > outstanding + 0.01) {
        throw new BadRequestException(
          `El pago excede el saldo pendiente (${outstanding.toFixed(2)}).`,
        );
      }

      const created = await tx.payment.create({
        data: {
          loanId,
          amount: round2(dto.amount),
          paidAt: dto.paidAt ? parseBusinessDate(dto.paidAt) : new Date(),
          method: dto.method,
          receiptNumber: this.receiptNumber(),
          listoRecaudoReceipt: dto.listoRecaudoReceipt,
          notes: dto.notes,
          collectorId: user.role === 'COLLECTOR' ? user.id : null,
          createdById: user.id,
        },
      });

      let remaining = round2(dto.amount);
      for (const installment of loan.installments) {
        if (remaining <= 0.005) break;
        const due = round2(installment.total - installment.paidAmount);
        if (due <= 0.005) continue;

        const allocation = Math.min(remaining, due);
        await tx.paymentAllocation.create({
          data: {
            paymentId: created.id,
            installmentId: installment.id,
            amount: round2(allocation),
          },
        });

        const paidAmount = round2(installment.paidAmount + allocation);
        await tx.installment.update({
          where: { id: installment.id },
          data: {
            paidAmount,
            status: paidAmount >= installment.total - 0.01 ? 'PAID' : 'PARTIAL',
          },
        });
        remaining = round2(remaining - allocation);
      }

      const updatedInstallments = await tx.installment.findMany({
        where: { loanId },
      });
      const allPaid = updatedInstallments.every(
        (item) => item.paidAmount >= item.total - 0.01,
      );
      if (allPaid) {
        await tx.loan.update({ where: { id: loanId }, data: { status: 'PAID' } });
      }

      return tx.payment.findUnique({
        where: { id: created.id },
        include: {
          allocations: { include: { installment: true } },
          collector: { select: { id: true, name: true } },
        },
      });
    });

    await this.prisma.notification.create({
      data: {
        userId: clientId,
        title: 'Pago registrado',
        message: `Recibimos un pago de ₡${round2(dto.amount).toLocaleString('es-CR')}. Recibo ${payment?.receiptNumber}.`,
      },
    });
    await this.audit.log(user.id, 'REGISTER_PAYMENT', 'Payment', payment?.id, {
      loanId,
      amount: dto.amount,
      receiptNumber: payment?.receiptNumber,
    });

    return payment;
  }

  async listPayments(
    user: AuthUser,
    from?: string,
    to?: string,
    loanId?: string,
  ) {
    const where: any = { voidedAt: null };
    if (loanId) where.loanId = loanId;
    if (from || to) {
      where.paidAt = {};
      if (from) {
        const start = new Date(/^\d{4}-\d{2}-\d{2}$/.test(from) ? `${from}T00:00:00-06:00` : from);
        if (Number.isNaN(start.getTime())) throw new BadRequestException('La fecha inicial no es válida.');
        where.paidAt.gte = start;
      }
      if (to) {
        const end = new Date(/^\d{4}-\d{2}-\d{2}$/.test(to) ? `${to}T23:59:59.999-06:00` : to);
        if (Number.isNaN(end.getTime())) throw new BadRequestException('La fecha final no es válida.');
        where.paidAt.lte = end;
      }
      if (where.paidAt.gte && where.paidAt.lte && where.paidAt.gte > where.paidAt.lte) throw new BadRequestException('La fecha inicial no puede ser posterior a la final.');
    }
    if (user.role === 'COLLECTOR') {
      where.loan = { is: { assignedCollectorId: user.id } };
    }

    return this.prisma.payment.findMany({
      where,
      orderBy: { paidAt: 'desc' },
      include: {
        loan: {
          include: {
            client: { include: { profile: true } },
          },
        },
        collector: { select: { id: true, name: true } },
      },
    });
  }

  async getPayment(user: AuthUser, id: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: {
        loan: {
          include: {
            client: { include: { profile: true } },
            application: true,
          },
        },
        collector: { select: { id: true, name: true } },
        allocations: { include: { installment: true } },
      },
    });
    if (!payment) throw new NotFoundException('Pago no encontrado.');

    if (user.role === 'CLIENT' && payment.loan.clientId !== user.id) {
      throw new ForbiddenException('No tienes acceso a este pago.');
    }
    if (user.role === 'COLLECTOR' && payment.loan.assignedCollectorId !== user.id) {
      throw new ForbiddenException('No tienes acceso a este pago.');
    }
    return payment;
  }

  async voidPayment(user: AuthUser, id: string, reason: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: { allocations: true, loan: true },
    });
    if (!payment) throw new NotFoundException('Pago no encontrado.');
    if (payment.voidedAt) {
      throw new BadRequestException('Este pago ya fue anulado.');
    }
    if (payment.refinancingLoanId || payment.loan.status === 'REFINANCED') throw new BadRequestException('No se pueden anular pagos de una cancelación por renovación ni de un préstamo renovado.');

    await this.prisma.$transaction(async (tx) => {
      const current = await tx.payment.findUnique({ where: { id }, include: { loan: true } });
      if (!current || current.voidedAt || current.refinancingLoanId || current.loan.status === 'REFINANCED') throw new BadRequestException('El pago ya no se puede anular.');
      for (const allocation of payment.allocations) {
        const installment = await tx.installment.findUnique({
          where: { id: allocation.installmentId },
        });
        if (!installment) continue;
        const paidAmount = round2(
          Math.max(0, installment.paidAmount - allocation.amount),
        );
        const isOverdue = new Date(installment.dueDate) < new Date();
        await tx.installment.update({
          where: { id: installment.id },
          data: {
            paidAmount,
            status:
              paidAmount >= installment.total - 0.01
                ? 'PAID'
                : paidAmount > 0
                  ? isOverdue
                    ? 'OVERDUE'
                    : 'PARTIAL'
                  : isOverdue
                    ? 'OVERDUE'
                    : 'PENDING',
          },
        });
      }

      await tx.paymentAllocation.deleteMany({ where: { paymentId: id } });
      await tx.payment.update({
        where: { id },
        data: {
          voidedAt: new Date(),
          voidedById: user.id,
          voidReason: reason,
        },
      });

      const installments = await tx.installment.findMany({
        where: { loanId: payment.loanId },
      });
      const allPaid = installments.every(
        (item) => item.paidAmount >= item.total - 0.01,
      );
      await tx.loan.update({
        where: { id: payment.loanId },
        data: { status: allPaid ? 'PAID' : 'ACTIVE' },
      });
    });

    await this.audit.log(user.id, 'VOID_PAYMENT', 'Payment', id, { reason });
    return { ok: true };
  }

  private async exportPayments(user: AuthUser, from?: string, to?: string, search?: string, loanId?: string) {
    const payments = await this.listPayments(user, from, to, loanId);
    const term = search?.trim().toLocaleLowerCase('es-CR');
    return term ? payments.filter((payment) => [payment.receiptNumber, payment.listoRecaudoReceipt, payment.loan.client.name, payment.loan.client.profile?.cedula, payment.collector?.name].some((value) => value?.toLocaleLowerCase('es-CR').includes(term))) : payments;
  }

  async exportWorkbook(user: AuthUser, from?: string, to?: string, search?: string, loanId?: string) {
    const payments = await this.exportPayments(user, from, to, search, loanId);
    const workbook = createWorkbook();
    const methods: Record<string, string> = { CASH: 'Efectivo', SINPE: 'SINPE Móvil', TRANSFER: 'Transferencia', DEPOSIT: 'Depósito', OTHER: 'Otro', REFINANCE: 'Renovación · movimiento interno' };
    const collected = round2(payments.filter((payment) => payment.method !== 'REFINANCE').reduce((sum, payment) => sum + payment.amount, 0));
    const refinanced = round2(payments.filter((payment) => payment.method === 'REFINANCE').reduce((sum, payment) => sum + payment.amount, 0));
    addReportSheet(workbook, {
      name: 'Pagos', title: 'Reporte de pagos y movimientos',
      description: `Período: ${from || 'Inicio'} a ${to || 'Hoy'}. Búsqueda: ${search || 'Todas'}. Las renovaciones (CRC ${refinanced.toFixed(2)}) son movimientos internos y NO se incluyen en el total cobrado.`,
      columns: [
        { key: 'receipt', title: 'Recibo', width: 26 }, { key: 'date', title: 'Fecha · Costa Rica', width: 22, format: DATETIME_FORMAT },
        { key: 'client', title: 'Cliente', width: 32 }, { key: 'cedula', title: 'Cédula', width: 18 }, { key: 'loan', title: 'Préstamo', width: 20 },
        { key: 'amount', title: 'Monto / total cobrado', width: 25, format: CRC_FORMAT }, { key: 'method', title: 'Medio / movimiento', width: 35 },
        { key: 'collector', title: 'Cobrador', width: 28 }, { key: 'reference', title: 'Referencia externa', width: 26 },
      ],
      rows: payments.map((payment) => ({ receipt: payment.receiptNumber, date: localExcelDate(payment.paidAt), client: payment.loan.client.name, cedula: payment.loan.client.profile?.cedula || '—', loan: `PRE-${payment.loanId.slice(-6).toUpperCase()}`, amount: payment.amount, method: methods[payment.method] || payment.method, collector: payment.collector?.name || 'Administración', reference: payment.listoRecaudoReceipt || '—' })),
      totals: { receipt: 'TOTAL COBRADO', amount: collected },
    });
    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  async exportLoanWorkbook(user: AuthUser, id: string) {
    const loan = user.role === 'CLIENT' ? await this.getMine(user.id, id) : await this.getOne(user, id);
    const workbook = createWorkbook();
    const description = `Préstamo PRE-${id.slice(-6).toUpperCase()} · Interés total: ${loan.annualRate} % aplicado una sola vez. Saldo: CRC ${loan.balance.toFixed(2)}. Neto de desembolso: CRC ${(loan.netDisbursement ?? loan.principal).toFixed(2)}.`;
    const statuses: Record<string, string> = { PAID: 'Pagada', PARTIAL: 'Pago parcial', OVERDUE: 'Vencida', PENDING: 'Pendiente' };
    addReportSheet(workbook, {
      name: 'Plan de pagos', title: 'Estado de cuenta y plan de pagos', description,
      columns: [{ key: 'number', title: 'Cuota', width: 12 }, { key: 'date', title: 'Vencimiento', width: 18, format: DATE_FORMAT }, { key: 'principal', title: 'Capital', format: CRC_FORMAT }, { key: 'interest', title: 'Interés', format: CRC_FORMAT }, { key: 'total', title: 'Total cuota', format: CRC_FORMAT }, { key: 'paid', title: 'Aplicado', format: CRC_FORMAT }, { key: 'balance', title: 'Pendiente', format: CRC_FORMAT }, { key: 'status', title: 'Estado' }],
      rows: loan.installments.map((item: any) => ({ number: item.number, date: localExcelDate(item.dueDate), principal: item.principal, interest: item.interest, total: item.total, paid: item.paidAmount, balance: round2(Math.max(0, item.total - item.paidAmount)), status: statuses[item.status] || item.status })),
      totals: { number: 'TOTALES', principal: loan.principal, total: round2(loan.installments.reduce((sum: number, item: any) => sum + item.total, 0)), paid: loan.paidAmount, balance: loan.balance },
    });
    addReportSheet(workbook, {
      name: 'Movimientos', title: 'Historial de movimientos del préstamo', description: 'Incluye anulados para trazabilidad. Las cancelaciones por renovación no representan ingresos en efectivo.',
      columns: [{ key: 'receipt', title: 'Recibo', width: 26 }, { key: 'date', title: 'Fecha · Costa Rica', format: DATETIME_FORMAT }, { key: 'amount', title: 'Monto', format: CRC_FORMAT }, { key: 'method', title: 'Medio / movimiento', width: 32 }, { key: 'status', title: 'Estado' }],
      rows: (loan.payments || []).map((payment: any) => ({ receipt: payment.receiptNumber, date: localExcelDate(payment.paidAt), amount: payment.amount, method: payment.method === 'REFINANCE' ? 'Cancelación por renovación' : ({ CASH: 'Efectivo', SINPE: 'SINPE Móvil', TRANSFER: 'Transferencia', DEPOSIT: 'Depósito' }[payment.method] || payment.method), status: payment.voidedAt ? 'Anulado' : 'Vigente' })),
    });
    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  async exportCsv(user: AuthUser, from?: string, to?: string, search?: string, loanId?: string) {
    const payments = await this.exportPayments(user, from, to, search, loanId);
    const header = [
      'recibo',
      'fecha',
      'cliente',
      'cedula',
      'prestamo',
      'monto',
      'metodo',
      'cobrador',
      'recibo_listo_recaudo',
    ];
    const rows = payments.map((payment: any) => [
      payment.receiptNumber,
      new Date(payment.paidAt).toISOString().slice(0, 10),
      payment.loan.client.name,
      payment.loan.client.profile?.cedula || '',
      payment.loanId,
      payment.amount.toFixed(2),
      payment.method,
      payment.collector?.name || '',
      payment.listoRecaudoReceipt || '',
    ]);
    return [header, ...rows]
      .map((row) => row.map((value) => `"${String(value).replace(/^[=+@\-\t\r]/, "'$&").replace(/"/g, '""')}"`).join(','))
      .join('\n');
  }

  async markOverdue() {
    await this.prisma.installment.updateMany({
      where: {
        dueDate: { lt: new Date() },
        status: { in: ['PENDING', 'PARTIAL'] },
      },
      data: { status: 'OVERDUE' },
    });
  }

  private receiptNumber() {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.random().toString(36).slice(2, 7).toUpperCase();
    return `REC-${date}-${random}`;
  }
}
import { parseBusinessDate } from '../common/dates';
