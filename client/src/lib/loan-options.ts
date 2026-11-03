export const LOAN_AMOUNTS = [50000, 75000, 100000] as const

export const LOAN_TERM_WEEKS = [1, 2, 3, 4, 5, 6, 7, 8] as const

export type PaymentFrequency = 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY'

export function weeksPerInstallment(frequency: string) {
  if (frequency === 'WEEKLY') return 1
  if (frequency === 'BIWEEKLY') return 2
  return 4
}

/**
 * Plazos válidos para una frecuencia: el plazo debe ser un múltiplo exacto del
 * período de pago. Así un crédito mensual no puede tener un plazo de 3 semanas.
 */
export function termsForFrequency(
  frequency: string,
  settings?: { minTerm: number; maxTerm: number },
) {
  const period = weeksPerInstallment(frequency)
  return availableTerms(settings).filter((weeks) => weeks % period === 0)
}

/** Ajusta un plazo al siguiente valor válido sin acortar el crédito. */
export function adjustTermForFrequency(weeks: number, frequency: string, settings?: { minTerm: number; maxTerm: number }) {
  const options = termsForFrequency(frequency, settings)
  if (!options.length) return weeks
  return options.find((option) => option >= weeks) ?? options[options.length - 1]
}

export function formatTermForFrequency(weeks: number, frequency: string) {
  const period = weeksPerInstallment(frequency)
  if (frequency === 'MONTHLY' && weeks % period === 0) {
    const months = weeks / period
    return months === 1 ? '1 mes' : `${months} meses`
  }
  if (frequency === 'BIWEEKLY' && weeks % period === 0) {
    const fortnights = weeks / period
    return fortnights === 1 ? '1 quincena' : `${fortnights} quincenas`
  }
  return weeks === 1 ? '1 semana' : `${weeks} semanas`
}

/**
 * Convierte el plazo en semanas a la cantidad de cuotas completas según la frecuencia.
 * Por ejemplo: 5 semanas quincenales = 3 cuotas.
 */
export function installmentsForTermWeeks(weeks: number, frequency: string) {
  const termWeeks = Math.max(1, Math.round(weeks))
  return Math.max(1, Math.ceil(termWeeks / weeksPerInstallment(frequency)))
}

export function termWeeksForInstallments(installments: number, frequency: string) {
  return Math.max(1, Math.round(installments) * weeksPerInstallment(frequency))
}

export function availableTerms(settings?: { minTerm: number; maxTerm: number }) {
  if (!settings) return [...LOAN_TERM_WEEKS]
  return Array.from({ length: settings.maxTerm - settings.minTerm + 1 }, (_, index) => settings.minTerm + index)
}

export const ZONES = [
  'Nicoya',
  'Nandayure',
  'Hojancha',
  'Sámara',
  'Jicaral',
  'Carmona',
  'Nosara',
  'Santa Cruz',
  'Liberia',
  'Otra zona',
] as const

export const OCCUPATIONS = [
  'Comerciante',
  'Agricultor',
  'Docente',
  'Mecánico',
  'Guía turístico',
  'Empleado',
  'Independiente',
  'Pensionado',
  'Estudiante',
  'Otro',
] as const

export const INCOME_RANGES = [
  { value: 200000, label: 'Menos de ₡250.000' },
  { value: 350000, label: '₡250.000 a ₡400.000' },
  { value: 500000, label: '₡400.000 a ₡600.000' },
  { value: 700000, label: '₡600.000 a ₡800.000' },
  { value: 900000, label: 'Más de ₡800.000' },
] as const

export const LOAN_PURPOSES = [
  'Capital de trabajo',
  'Compra de inventario',
  'Mejoras del negocio',
  'Gastos personales',
  'Educación',
  'Salud',
  'Vivienda',
  'Otra',
] as const
