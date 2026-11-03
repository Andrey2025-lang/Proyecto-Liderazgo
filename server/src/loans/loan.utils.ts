import { round2 } from './loan-calculator';

export function summarizeLoan(loan: any) {
  if (!loan) return loan;
  const installments = loan.installments || [];
  const balance = round2(
    installments.reduce(
      (sum: number, item: any) => sum + Math.max(0, item.total - item.paidAmount),
      0,
    ),
  );
  const paid = round2(
    installments.reduce((sum: number, item: any) => sum + item.paidAmount, 0),
  );
  const next = installments
    .filter((item: any) => item.paidAmount < item.total - 0.01)
    .sort((a: any, b: any) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0];
  const overdue = installments.filter(
    (item: any) =>
      item.paidAmount < item.total - 0.01 && new Date(item.dueDate) < new Date(),
  );
  const overdueAmount = round2(
    overdue.reduce(
      (sum: number, item: any) => sum + Math.max(0, item.total - item.paidAmount),
      0,
    ),
  );

  return {
    ...loan,
    balance,
    paidAmount: paid,
    nextDueDate: next?.dueDate ?? null,
    overdueCount: overdue.length,
    overdueAmount,
  };
}
