/**
 * Montos iniciales del sistema. Las validaciones utilizan SettingsService
 * para respetar la configuración vigente de administración.
 */
export const PERSONAL_LOAN_AMOUNTS = [50000, 75000, 100000] as const;

/**
 * Plazos disponibles para personas naturales, expresados en semanas.
 * El cliente puede elegir desde 1 hasta 8 semanas.
 */
export const PERSONAL_LOAN_TERM_WEEKS = [1, 2, 3, 4, 5, 6, 7, 8] as const;

/**
 * Cuotas que puede generar un plazo de 1 a 8 semanas según la frecuencia.
 * El máximo de cuotas también es 8 (plan semanal).
 */
export const PERSONAL_LOAN_INSTALLMENTS = [1, 2, 3, 4, 5, 6, 7, 8] as const;

export type PersonalLoanAmount = (typeof PERSONAL_LOAN_AMOUNTS)[number];
export type PersonalLoanTermWeeks = (typeof PERSONAL_LOAN_TERM_WEEKS)[number];

export function isPersonalLoanAmount(value: number): value is PersonalLoanAmount {
  return PERSONAL_LOAN_AMOUNTS.includes(value as PersonalLoanAmount);
}

export function isPersonalLoanInstallments(value: number): boolean {
  return PERSONAL_LOAN_INSTALLMENTS.includes(
    value as (typeof PERSONAL_LOAN_INSTALLMENTS)[number],
  );
}
