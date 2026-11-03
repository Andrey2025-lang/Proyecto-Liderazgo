export type PaymentFrequency = 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';

export type ScheduleItem = {
  number: number;
  dueDate: Date;
  principal: number;
  interest: number;
  total: number;
};

export const FREQUENCY_LABEL: Record<string, string> = {
  WEEKLY: 'Semanal',
  BIWEEKLY: 'Quincenal',
  MONTHLY: 'Mensual',
};

export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function addPeriods(date: Date, frequency: string, periods: number): Date {
  const result = new Date(date);
  if (frequency === 'WEEKLY') {
    result.setDate(result.getDate() + 7 * periods);
  } else if (frequency === 'BIWEEKLY') {
    result.setDate(result.getDate() + 14 * periods);
  } else {
    result.setMonth(result.getMonth() + periods);
  }
  return result;
}

/**
 * Calcula un plan de cuotas fijas con interés total sobre el monto prestado.
 * El porcentaje recibido se aplica una sola vez al capital y se reparte
 * proporcionalmente entre todas las cuotas.
 */
export function calculateSchedule(
  principal: number,
  interestRatePercent: number,
  termInstallments: number,
  frequency: string,
  firstDueDate: Date,
): ScheduleItem[] {
  const n = Math.max(1, Math.round(termInstallments));
  const principalTotal = round2(Math.max(0, principal));
  const interestTotal = round2(
    principalTotal * (Math.max(0, interestRatePercent) / 100),
  );
  const basePrincipal = round2(principalTotal / n);
  const baseInterest = round2(interestTotal / n);

  let principalRemaining = principalTotal;
  let interestRemaining = interestTotal;
  const schedule: ScheduleItem[] = [];

  for (let index = 1; index <= n; index += 1) {
    const isLast = index === n;
    const principalPart = isLast ? principalRemaining : basePrincipal;
    const interest = isLast ? interestRemaining : baseInterest;
    const total = round2(principalPart + interest);

    principalRemaining = round2(Math.max(0, principalRemaining - principalPart));
    interestRemaining = round2(Math.max(0, interestRemaining - interest));

    schedule.push({
      number: index,
      dueDate: addPeriods(firstDueDate, frequency, index - 1),
      principal: round2(principalPart),
      interest: round2(interest),
      total,
    });
  }

  return schedule;
}

export function summarizeSchedule(schedule: ScheduleItem[]) {
  const totalInterest = round2(schedule.reduce((sum, item) => sum + item.interest, 0));
  const totalPayment = round2(schedule.reduce((sum, item) => sum + item.total, 0));
  return {
    installment: schedule[0]?.total ?? 0,
    totalInterest,
    totalPayment,
    installments: schedule.length,
  };
}
