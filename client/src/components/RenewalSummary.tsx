import { formatCurrency } from '@/lib/format'

export function RenewalSummary({ amount, balance, rate, estimated = true }: { amount: number; balance: number; rate: number; estimated?: boolean }) {
  const interest = Math.round(amount * rate) / 100
  const net = Math.round((amount - balance) * 100) / 100
  return (
    <div className="my-4 rounded-3xl border border-gold/40 bg-amber-50 p-5 text-sm text-forest-950">
      <h2 className="font-display text-xl font-semibold">Renovación de préstamo{estimated ? ' · estimación' : ''}</h2>
      <dl className="mt-3 space-y-2">
        <div className="flex justify-between gap-3"><dt>Nuevo monto</dt><dd>{formatCurrency(amount)}</dd></div>
        <div className="flex justify-between gap-3"><dt>Saldo anterior a cancelar</dt><dd>− {formatCurrency(balance)}</dd></div>
        <div className="flex justify-between gap-3 border-t border-gold/30 pt-2 font-bold"><dt>Neto a entregar</dt><dd>{formatCurrency(net)}</dd></div>
        <div className="flex justify-between gap-3"><dt>Interés total nuevo ({rate} %)</dt><dd>{formatCurrency(interest)}</dd></div>
        <div className="flex justify-between gap-3 font-semibold"><dt>Total del nuevo plan</dt><dd>{formatCurrency(amount + interest)}</dd></div>
      </dl>
      <p className="mt-3 text-xs leading-relaxed">El interés se aplica una sola vez al nuevo monto completo, no al neto entregado. {estimated ? 'La renovación depende de la evaluación del historial y de la aprobación administrativa. El saldo anterior se recalcula al desembolsar.' : 'La cancelación anterior es un movimiento interno, no un cobro en efectivo.'}</p>
      {net <= 0 && <p role="alert" className="mt-2 font-semibold text-red-700">Elegí un monto mayor que el saldo pendiente anterior.</p>}
    </div>
  )
}
