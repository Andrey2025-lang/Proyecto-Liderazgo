import { Children, cloneElement, isValidElement, useEffect, useId, useState, type ReactElement, type ReactNode, type TableHTMLAttributes } from 'react'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { Button } from './Button'

function usePagination(items: ReactNode[]) {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const identity = items.map((item, index) => isValidElement(item) ? item.key ?? index : index).join('|')
  useEffect(() => { setPage(1) }, [identity, pageSize])
  const pages = Math.max(1, Math.ceil(items.length / pageSize))
  const current = Math.min(page, pages)
  return { page: current, pageSize, pages, total: items.length, setPage, setPageSize, visible: items.slice((current - 1) * pageSize, current * pageSize) }
}

function Pagination({ page, pages, pageSize, total, setPage, setPageSize, label }: ReturnType<typeof usePagination> & { label: string }) {
  const id = useId()
  const start = total ? (page - 1) * pageSize + 1 : 0
  const end = Math.min(page * pageSize, total)
  return (
    <div className="no-print max-w-full border-t border-forest-900/10 bg-white">
      <nav aria-label={`Paginación: ${label}`} className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 text-xs text-ink/65">
        <span role="status" aria-live="polite">{start}–{end} de {total}</span>
        <label htmlFor={id} className="ml-auto flex items-center gap-2">Por página
          <select id={id} className="rounded-xl border border-forest-900/15 bg-white px-2 py-1.5 text-forest-950" value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))}>
            {[10, 25, 50].map((size) => <option key={size} value={size}>{size}</option>)}
          </select>
        </label>
        <span>Página {page} de {pages}</span>
        <div className="flex shrink-0 items-center gap-1">
          <Button size="sm" variant="ghost" aria-label="Primera página" disabled={page === 1} onClick={() => setPage(1)}><ChevronsLeft className="h-4 w-4" /></Button>
          <Button size="sm" variant="ghost" aria-label="Página anterior" disabled={page === 1} onClick={() => setPage(page - 1)}><ChevronLeft className="h-4 w-4" /></Button>
          <Button size="sm" variant="ghost" aria-label="Página siguiente" disabled={page === pages} onClick={() => setPage(page + 1)}><ChevronRight className="h-4 w-4" /></Button>
          <Button size="sm" variant="ghost" aria-label="Última página" disabled={page === pages} onClick={() => setPage(pages)}><ChevronsRight className="h-4 w-4" /></Button>
        </div>
      </nav>
    </div>
  )
}

// Conserva el marcado de cada tabla y pagina sus filas, sin paginar los totales
// calculados por la página. Al imprimir se incluyen todos los registros.
export function PaginatedTable({ children, label = 'Registros', className = '', responsive = false, ...props }: TableHTMLAttributes<HTMLTableElement> & { label?: string; responsive?: boolean }) {
  const sections = Children.toArray(children)
  const body = sections.find((section) => isValidElement(section) && section.type === 'tbody') as ReactElement<{ children: ReactNode }> | undefined
  const rows = Children.toArray(body?.props.children)
  const empty = rows.length === 1 && isValidElement(rows[0]) && Children.toArray((rows[0].props as { children: ReactNode }).children).some((cell) => isValidElement(cell) && Number((cell.props as { colSpan?: number }).colSpan) > 1)
  const pagination = usePagination(empty ? [] : rows)
  const head = sections.find((section) => isValidElement(section) && section.type === 'thead') as ReactElement<{ children: ReactNode }> | undefined
  const headerRow = Children.toArray(head?.props.children)[0] as ReactElement<{ children: ReactNode }> | undefined
  const labels = Children.toArray(headerRow?.props.children).map((cell) => isValidElement(cell) ? (cell.props as { children: ReactNode }).children : '')
  const visible = responsive ? pagination.visible.map((row) => {
    if (!isValidElement(row)) return row
    const element = row as ReactElement<{ children: ReactNode }>
    return cloneElement(element, {}, Children.map(element.props.children, (cell, index) => isValidElement(cell)
      ? cloneElement(cell as ReactElement<Record<string, unknown>>, { 'data-label': labels[index] }) : cell))
  }) : pagination.visible
  return (
    <section className={`paginated-region min-w-0 max-w-full ${responsive ? 'responsive-table' : ''}`} aria-label={label}>
      <div className="table-scroll max-w-full overflow-x-auto" tabIndex={0} role="region" aria-label={`Tabla: ${label}`}>
        <table {...props} className={className}>
          {sections.filter((section) => !isValidElement(section) || section.type !== 'tbody')}
          <tbody className="screen-rows">{empty ? rows : visible}</tbody>
          <tbody className="print-only">{rows}</tbody>
        </table>
      </div>
      <Pagination {...pagination} label={label} />
    </section>
  )
}

export function PaginatedList({ children, className = 'space-y-3', label = 'Registros' }: { children: ReactNode; className?: string; label?: string }) {
  const items = Children.toArray(children)
  const pagination = usePagination(items)
  return <section className="min-w-0 max-w-full" aria-label={label}>
    <div className={`screen-rows ${className}`}>{pagination.visible}</div>
    <div className={`print-only ${className}`}>{items}</div>
    <Pagination {...pagination} label={label} />
  </section>
}
