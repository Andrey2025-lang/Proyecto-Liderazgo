export function PrintHeading({ title, reference, client }: { title: string; reference: string; client?: string }) {
  return <div className="print-only print-heading">
    <p className="text-sm font-bold uppercase tracking-wide">Préstamos J&C · JyC Digital</p>
    <h1 className="mt-1 text-xl font-semibold">{title}</h1>
    <p>{reference}{client ? ` · ${client}` : ''}</p>
    <p className="mt-1 text-xs">Emitido: {new Intl.DateTimeFormat('es-CR', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Costa_Rica' }).format(new Date())} · Moneda CRC.</p>
  </div>
}
