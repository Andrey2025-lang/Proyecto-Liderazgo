/** Las fechas de formulario sin hora corresponden al día civil en Costa Rica. */
export function parseBusinessDate(value: string): Date {
  return new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00-06:00` : value);
}
