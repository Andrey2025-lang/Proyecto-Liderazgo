import { useState } from 'react'
import { formatCurrency } from '@/lib/format'
import { Input } from './Input'

export function CurrencyInput({ id, value, onChange }: { id: string; value: string; onChange: (value: string) => void }) {
  const [editing, setEditing] = useState(false)
  return <Input id={id} type={editing ? 'number' : 'text'} inputMode="decimal" min={1} max={10000000} step="0.01"
    value={editing ? value : value ? formatCurrency(Number(value), Number(value) % 1 !== 0) : ''}
    placeholder="₡0" onFocus={() => setEditing(true)} onBlur={() => setEditing(false)} onChange={(event) => onChange(event.target.value)} />
}
