import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { summarizeLoan } from '../loans/loan.utils';
import { round2 } from '../loans/loan-calculator';
import { addReportSheet, createWorkbook, CRC_FORMAT, DATE_FORMAT, localExcelDate } from '../common/workbook';

type AuthUser = { id: string; role: string };

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async exportWorkbook(user: AuthUser) {
    const [portfolio, aging, collections, communities, collectors] = await Promise.all([
      this.portfolio(user), this.aging(user), this.collections(user), this.communities(), this.collectorsPerformance(),
    ]);
    const workbook = createWorkbook();
    addReportSheet(workbook, {
      name: 'Cartera', title: 'Cartera activa de créditos', description: 'Préstamos activos y en mora. El saldo incluye capital e interés pactado pendiente.',
      columns: [{ key: 'client', title: 'Cliente', width: 32 }, { key: 'cedula', title: 'Cédula', width: 18 }, { key: 'community', title: 'Comunidad', width: 28 }, { key: 'loan', title: 'Préstamo', width: 20 }, { key: 'principal', title: 'Monto original', format: CRC_FORMAT }, { key: 'balance', title: 'Saldo pendiente', format: CRC_FORMAT }, { key: 'overdue', title: 'Saldo vencido', format: CRC_FORMAT }, { key: 'next', title: 'Próximo vencimiento', format: DATE_FORMAT }, { key: 'collector', title: 'Cobrador', width: 28 }],
      rows: portfolio.map((loan) => ({ client: loan.client.name, cedula: loan.client.profile?.cedula || '—', community: loan.client.profile?.community || 'Sin comunidad', loan: `PRE-${loan.id.slice(-6).toUpperCase()}`, principal: loan.principal, balance: loan.balance, overdue: loan.overdueAmount, next: localExcelDate(loan.nextDueDate), collector: loan.assignedCollector?.name || 'Sin asignar' })),
      totals: { principal: round2(portfolio.reduce((sum, loan) => sum + loan.principal, 0)), balance: round2(portfolio.reduce((sum, loan) => sum + loan.balance, 0)), overdue: round2(portfolio.reduce((sum, loan) => sum + loan.overdueAmount, 0)) },
    });
    addReportSheet(workbook, { name: 'Morosidad', title: 'Antigüedad de saldos vencidos', columns: [{ key: 'bucket', title: 'Días de atraso', width: 28 }, { key: 'count', title: 'Cuotas vencidas' }, { key: 'amount', title: 'Saldo vencido', format: CRC_FORMAT }], rows: aging, totals: { count: aging.reduce((sum, row) => sum + row.count, 0), amount: round2(aging.reduce((sum, row) => sum + row.amount, 0)) } });
    addReportSheet(workbook, { name: 'Cobros', title: 'Cobros de los últimos seis meses', description: 'Excluye pagos anulados y cancelaciones internas por renovación.', columns: [{ key: 'key', title: 'Período (año-mes)', width: 28 }, { key: 'total', title: 'Total cobrado', format: CRC_FORMAT }], rows: collections.map((row) => ({ key: row.key, total: row.total })), totals: { total: round2(collections.reduce((sum, row) => sum + row.total, 0)) } });
    addReportSheet(workbook, { name: 'Comunidades', title: 'Distribución de clientes por comunidad', columns: [{ key: 'community', title: 'Comunidad', width: 38 }, { key: 'count', title: 'Clientes registrados' }], rows: communities, totals: { count: communities.reduce((sum, row) => sum + row.count, 0) } });
    addReportSheet(workbook, { name: 'Equipo', title: 'Desempeño del equipo de cobro', description: 'Cobros históricos vigentes. No incluye movimientos internos de renovación.', columns: [{ key: 'name', title: 'Cobrador', width: 32 }, { key: 'phone', title: 'Teléfono' }, { key: 'clients', title: 'Clientes asignados' }, { key: 'activeLoans', title: 'Préstamos activos' }, { key: 'collected', title: 'Total cobrado', format: CRC_FORMAT }], rows: collectors.map((row) => ({ name: row.name, phone: row.phone || '—', clients: row.clients, activeLoans: row.activeLoans, collected: row.collected })), totals: { collected: round2(collectors.reduce((sum, row) => sum + row.collected, 0)) } });
    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  async dashboard(user: AuthUser) {
    await this.markOverdue();
    const now = new Date();
    const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    const isCollector = user.role === 'COLLECTOR';
    const loanWhere: any = { status: { in: ['ACTIVE', 'DEFAULTED'] } };
    if (isCollector) loanWhere.assignedCollectorId = user.id;

    const [activeLoans, applications, monthlyPayments, clientCount, communityRows] =
      await Promise.all([
        this.prisma.loan.findMany({
          where: loanWhere,
          include: {
            installments: true,
            client: { include: { profile: true } },
            assignedCollector: { select: { id: true, name: true } },
          },
        }),
        isCollector
          ? Promise.resolve([] as any[])
          : this.prisma.loanApplication.findMany({
              orderBy: { createdAt: 'desc' },
              include: { client: { include: { profile: true } } },
            }),
        this.prisma.payment.findMany({
          where: {
            voidedAt: null,
            method: { not: 'REFINANCE' },
            paidAt: { gte: sixMonthsAgo },
            ...(isCollector
              ? { loan: { is: { assignedCollectorId: user.id } } }
              : {}),
          },
          select: { amount: true, paidAt: true },
        }),
        this.clientCount(user),
        this.prisma.clientProfile.findMany({
          where: { user: { role: 'CLIENT' } },
          select: { community: true },
        }),
      ]);

    const allInstallments = activeLoans.flatMap((loan) => loan.installments);
    const portfolio = round2(
      allInstallments.reduce(
        (sum, item) => sum + Math.max(0, item.total - item.paidAmount),
        0,
      ),
    );
    const overdueInstallments = allInstallments.filter(
      (item) => item.paidAmount < item.total - 0.01 && new Date(item.dueDate) < now,
    );
    const overdueAmount = round2(
      overdueInstallments.reduce(
        (sum, item) => sum + Math.max(0, item.total - item.paidAmount),
        0,
      ),
    );
    const collectedMonth = round2(
      monthlyPayments
        .filter((payment) => new Date(payment.paidAt) >= startMonth)
        .reduce((sum, payment) => sum + payment.amount, 0),
    );

    const statusMap = applications.reduce((acc: Record<string, number>, application) => {
      acc[application.status] = (acc[application.status] || 0) + 1;
      return acc;
    }, {});
    const applicationsByStatus = Object.entries(statusMap).map(([status, count]) => ({
      status,
      count,
    }));

    const months = Array.from({ length: 6 }).map((_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - 5 + index, 1);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      return {
        key,
        label: new Intl.DateTimeFormat('es-CR', { month: 'short' })
          .format(date)
          .replace('.', ''),
        total: 0,
      };
    });

    for (const payment of monthlyPayments) {
      const date = new Date(payment.paidAt);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const month = months.find((item) => item.key === key);
      if (month) month.total = round2(month.total + payment.amount);
    }

    const communities = this.countCommunities(communityRows);
    const aging = this.buildAging(overdueInstallments);
    const collectors = isCollector ? [] : await this.collectorsPerformance();

    return {
      role: user.role,
      kpis: {
        clients: clientCount,
        pendingApplications: applications.filter((item) =>
          ['SUBMITTED', 'UNDER_REVIEW', 'INFO_REQUESTED'].includes(item.status),
        ).length,
        activeLoans: activeLoans.filter((loan) => loan.status === 'ACTIVE').length,
        portfolio,
        collectedMonth,
        overdueAmount,
        overdueCount: overdueInstallments.length,
        collectedTotal: round2(
          monthlyPayments.reduce((sum, payment) => sum + payment.amount, 0),
        ),
      },
      applicationsByStatus,
      monthlyCollections: months,
      recentApplications: applications.slice(0, 6).map((application) => ({
        id: application.id,
        status: application.status,
        amountRequested: application.amountRequested,
        createdAt: application.createdAt,
        client: {
          id: application.client.id,
          name: application.client.name,
          community: application.client.profile?.community,
        },
      })),
      recentLoans: activeLoans.slice(0, 6).map((loan) => summarizeLoan(loan)),
      aging,
      communities,
      collectors,
    };
  }

  async portfolio(user: AuthUser) {
    await this.markOverdue();
    const where: any = { status: { in: ['ACTIVE', 'DEFAULTED'] } };
    if (user.role === 'COLLECTOR') where.assignedCollectorId = user.id;
    const loans = await this.prisma.loan.findMany({
      where,
      include: {
        client: { include: { profile: true } },
        installments: true,
        assignedCollector: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return loans.map((loan) => summarizeLoan(loan));
  }

  async aging(user: AuthUser) {
    await this.markOverdue();
    const where: any = {
      loan: {
        is: { status: { in: ['ACTIVE', 'DEFAULTED'] } },
      },
    };
    if (user.role === 'COLLECTOR') {
      where.loan = {
        is: {
          status: { in: ['ACTIVE', 'DEFAULTED'] },
          assignedCollectorId: user.id,
        },
      };
    }
    const installments = await this.prisma.installment.findMany({ where });
    return this.buildAging(
      installments.filter(
        (item) =>
          item.paidAmount < item.total - 0.01 && new Date(item.dueDate) < new Date(),
      ),
    );
  }

  async collections(user: AuthUser) {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const payments = await this.prisma.payment.findMany({
      where: {
        voidedAt: null,
        method: { not: 'REFINANCE' },
        paidAt: { gte: from },
        ...(user.role === 'COLLECTOR'
          ? { loan: { is: { assignedCollectorId: user.id } } }
          : {}),
      },
      select: { amount: true, paidAt: true },
    });
    const months = Array.from({ length: 6 }).map((_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - 5 + index, 1);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      return {
        key,
        label: new Intl.DateTimeFormat('es-CR', { month: 'short' })
          .format(date)
          .replace('.', ''),
        total: 0,
      };
    });
    for (const payment of payments) {
      const date = new Date(payment.paidAt);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const month = months.find((item) => item.key === key);
      if (month) month.total = round2(month.total + payment.amount);
    }
    return months;
  }

  async communities() {
    const rows = await this.prisma.clientProfile.findMany({
      where: { user: { role: 'CLIENT' } },
      select: { community: true },
    });
    return this.countCommunities(rows);
  }

  async collectorsPerformance() {
    const collectors = await this.prisma.user.findMany({
      where: { role: 'COLLECTOR' },
      select: {
        id: true,
        name: true,
        phone: true,
        status: true,
        assignedClients: { select: { id: true } },
        collectorLoans: {
          where: { status: { in: ['ACTIVE', 'DEFAULTED'] } },
          select: { id: true },
        },
        paymentsCollected: {
          where: { voidedAt: null, method: { not: 'REFINANCE' } },
          select: { amount: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return collectors.map((collector) => ({
      id: collector.id,
      name: collector.name,
      phone: collector.phone,
      status: collector.status,
      clients: collector.assignedClients.length,
      activeLoans: collector.collectorLoans.length,
      collected: round2(
        collector.paymentsCollected.reduce((sum, payment) => sum + payment.amount, 0),
      ),
    }));
  }

  private async clientCount(user: AuthUser) {
    if (user.role !== 'COLLECTOR') {
      return this.prisma.user.count({ where: { role: 'CLIENT' } });
    }
    return this.prisma.user.count({
      where: {
        role: 'CLIENT',
        OR: [
          { profile: { assignedCollectorId: user.id } },
          { clientLoans: { some: { assignedCollectorId: user.id } } },
        ],
      },
    });
  }

  private countCommunities(rows: { community: string | null }[]) {
    const map = new Map<string, number>();
    for (const row of rows) {
      const key = row.community?.trim() || 'Sin comunidad';
      map.set(key, (map.get(key) || 0) + 1);
    }
    return Array.from(map.entries())
      .map(([community, count]) => ({ community, count }))
      .sort((a, b) => b.count - a.count);
  }

  private buildAging(installments: any[]) {
    const now = new Date();
    const buckets = [
      { bucket: '1-30 días', min: 1, max: 30, count: 0, amount: 0 },
      { bucket: '31-60 días', min: 31, max: 60, count: 0, amount: 0 },
      { bucket: '61-90 días', min: 61, max: 90, count: 0, amount: 0 },
      { bucket: '90+ días', min: 91, max: Infinity, count: 0, amount: 0 },
    ];

    for (const item of installments) {
      const days = Math.ceil(
        (now.getTime() - new Date(item.dueDate).getTime()) / 86400000,
      );
      if (days < 1) continue;
      const bucket = buckets.find((item2) => days >= item2.min && days <= item2.max);
      if (bucket) {
        bucket.count += 1;
        bucket.amount = round2(
          bucket.amount + Math.max(0, item.total - item.paidAmount),
        );
      }
    }
    return buckets;
  }

  private async markOverdue() {
    await this.prisma.installment.updateMany({
      where: {
        dueDate: { lt: new Date() },
        status: { in: ['PENDING', 'PARTIAL'] },
      },
      data: { status: 'OVERDUE' },
    });
  }
}
