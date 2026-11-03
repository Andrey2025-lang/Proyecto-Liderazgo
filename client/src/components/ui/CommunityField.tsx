import { useEffect, useState } from 'react'
import { ZONES } from '@/lib/loan-options'
import { Input } from './Input'
import { Label } from './Label'
import { Select } from './Select'

const OTHER = 'Otra zona'
const knownZones: readonly string[] = ZONES.filter((zone) => zone !== OTHER)

export function CommunityField({ id = 'community', value, onChange, error, required = false }: { id?: string; value: string; onChange: (value: string) => void; error?: string; required?: boolean }) {
  const [other, setOther] = useState(value === OTHER || Boolean(value && !knownZones.includes(value)))
  useEffect(() => {
    if (value && knownZones.includes(value)) setOther(false)
    else if (value) setOther(true)
  }, [value])
  const customValue = value === OTHER ? '' : value
  return <div>
    <Label htmlFor={id}>Zona / comunidad{required ? ' *' : ''}</Label>
    <Select id={id} value={other ? OTHER : value} required={required} error={!other ? error : undefined} onChange={(event) => {
      const selected = event.target.value
      setOther(selected === OTHER)
      onChange(selected === OTHER ? '' : selected)
    }}>
      <option value="">Seleccioná tu zona</option>
      {ZONES.map((zone) => <option key={zone} value={zone}>{zone}</option>)}
    </Select>
    {other && <div className="mt-3">
      <Label htmlFor={`${id}-other`}>Especificá la zona *</Label>
      <Input id={`${id}-other`} value={customValue} required maxLength={120} placeholder="Ej.: San Pablo de Nandayure" error={error} onChange={(event) => onChange(event.target.value)} />
    </div>}
  </div>
}
