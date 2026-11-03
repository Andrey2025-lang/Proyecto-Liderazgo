import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Save, Settings2, ShieldCheck, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { api, apiErrorMessage } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Textarea } from '@/components/ui/Textarea'
import { PageHeader } from '@/components/ui/PageHeader'
import { LoadingBlock } from '@/components/ui/Spinner'
import { CurrencyInput } from '@/components/ui/CurrencyInput'

type SettingsRecord = Record<string, string>

export function AdminSettingsPage() {
  const queryClient = useQueryClient()
  const [form, setForm] = useState<SettingsRecord>({})
  const settingsQuery = useQuery<SettingsRecord>({
    queryKey: ['settings'],
    queryFn: async () => (await api.get('/settings')).data,
  })

  useEffect(() => {
    if (settingsQuery.data) setForm(settingsQuery.data)
  }, [settingsQuery.data])

  const mutation = useMutation({
    mutationFn: async () => {
      const amounts = (form.loanAmounts || '').split(',')
      if (amounts.some((amount) => !amount.trim() || !Number.isFinite(Number(amount)) || Number(amount) <= 0)) throw new Error('Completá todos los montos con un valor mayor que cero.')
      if (new Set(amounts.map(Number)).size !== amounts.length) throw new Error('Hay montos repetidos. Revisalos antes de guardar.')
      return (await api.put('/settings', form)).data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
      queryClient.invalidateQueries({ queryKey: ['public-settings'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['simulate'] })
      queryClient.invalidateQueries({ queryKey: ['application-simulate'] })
      toast.success('Configuración guardada.')
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  })

  if (settingsQuery.isLoading) return <LoadingBlock label="Cargando configuración…" />

  const setField = (key: string, value: string) => {
    setForm((current) => ({ ...current, [key]: value }))
  }
  const amounts = form.loanAmounts === undefined ? [] : form.loanAmounts.split(',')
  const setAmounts = (values: string[]) => setField('loanAmounts', values.join(','))

  return (
    <div>
      <PageHeader
        eyebrow="Configuración"
        title="Parámetros del sistema"
        description="Ajustá el interés total vigente, los datos de contacto y los textos del sitio público."
        actions={
          <Button onClick={() => mutation.mutate()} loading={mutation.isPending}>
            <Save className="h-4 w-4" /> Guardar cambios
          </Button>
        }
      />

      <div className="mb-5 flex items-start gap-3 rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />
        <p>
           El interés total, los montos y los plazos son configurables para nuevas solicitudes.
           Los préstamos existentes conservan sus condiciones. Las condiciones se comunican antes de contratar.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Condiciones del crédito"
            description="Aplican a nuevas simulaciones y aprobaciones."
          />
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-forest-950">Montos disponibles</h3>
                <span className="rounded-full bg-forest-50 px-3 py-1 text-xs text-forest-700">{amounts.length} de 20</span>
              </div>
              <div className="space-y-3">
                {amounts.map((amount, index) => <div key={index} className="flex items-end gap-2 rounded-2xl border border-forest-900/10 bg-forest-50/50 p-3">
                  <div className="min-w-0 flex-1">
                    <Label htmlFor={`loan-amount-${index}`}>Monto {index + 1} (₡)</Label>
                    <CurrencyInput id={`loan-amount-${index}`} value={amount} onChange={(value) => setAmounts(amounts.map((current, position) => position === index ? value : current))} />
                  </div>
                  <Button variant="ghost" aria-label={`Eliminar monto ${index + 1}`} disabled={amounts.length <= 1} onClick={() => setAmounts(amounts.filter((_, position) => position !== index))}><Trash2 className="h-4 w-4 text-red-700" /></Button>
                </div>)}
              </div>
              <Button className="mt-3" variant="outline" disabled={amounts.length >= 20} onClick={() => setAmounts([...amounts, ''])}><Plus className="h-4 w-4" /> Agregar monto</Button>
              <p className="mt-2 text-xs text-ink/50">Cada opción es un monto que el cliente podrá elegir. Al guardar se ordenan de menor a mayor.</p>
            </div>
            <div>
              <Label htmlFor="minTerm">Plazo mínimo (semanas)</Label>
              <Input id="minTerm" type="number" min={1} max={104} value={form.minTerm || ''} onChange={(event) => setField('minTerm', event.target.value)} />
            </div>
            <div>
              <Label htmlFor="maxTerm">Plazo máximo (semanas)</Label>
              <Input id="maxTerm" type="number" min={1} max={104} value={form.maxTerm || ''} onChange={(event) => setField('maxTerm', event.target.value)} />
              <p className="mt-1 text-xs text-ink/50">Quincenal usa múltiplos de 2 semanas y mensual múltiplos de 4. Con máximo 12 se ofrecen hasta 3 meses.</p>
            </div>
            <div>
              <Label htmlFor="annualRate">Interés total (%)</Label>
              <Input
                id="annualRate"
                type="number"
                step="0.01"
                value={form.annualRate || ''}
                onChange={(event) => setField('annualRate', event.target.value)}
              />
              <p className="mt-1 text-[11px] text-ink/40">
                Se aplica una sola vez sobre el monto y se reparte entre las cuotas.
              </p>
            </div>
            <div>
              <Label htmlFor="privacyVersion">Versión de privacidad</Label>
              <Input
                id="privacyVersion"
                value={form.privacyVersion || ''}
                onChange={(event) => setField('privacyVersion', event.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="Contacto" description="Información visible en el sitio público." />
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="contactPhone">Teléfono / WhatsApp 1</Label>
              <Input
                id="contactPhone"
                value={form.contactPhone || ''}
                onChange={(event) => setField('contactPhone', event.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="contactPhone2">Teléfono / WhatsApp 2</Label>
              <Input
                id="contactPhone2"
                value={form.contactPhone2 || ''}
                onChange={(event) => setField('contactPhone2', event.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="contactPhone3">Teléfono / WhatsApp 3</Label>
              <Input
                id="contactPhone3"
                value={form.contactPhone3 || ''}
                onChange={(event) => setField('contactPhone3', event.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="contactEmail">Correo</Label>
              <Input
                id="contactEmail"
                type="email"
                value={form.contactEmail || ''}
                onChange={(event) => setField('contactEmail', event.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="address">Dirección</Label>
              <Input
                id="address"
                value={form.address || ''}
                onChange={(event) => setField('address', event.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="hours">Horario</Label>
              <Input
                id="hours"
                value={form.hours || ''}
                onChange={(event) => setField('hours', event.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader
            title="Contenido del sitio"
            description="Textos principales de la página de inicio (el diseño actual usa contenido propio)."
            action={<Settings2 className="h-5 w-5 text-forest-500" />}
          />
          <CardContent className="grid gap-4">
            <div>
              <Label htmlFor="heroTitle">Título principal</Label>
              <Input
                id="heroTitle"
                value={form.heroTitle || ''}
                onChange={(event) => setField('heroTitle', event.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="heroSubtitle">Subtítulo</Label>
              <Textarea
                id="heroSubtitle"
                value={form.heroSubtitle || ''}
                onChange={(event) => setField('heroSubtitle', event.target.value)}
              />
            </div>
            <div className="flex justify-end">
              <Button onClick={() => mutation.mutate()} loading={mutation.isPending}>
                <Save className="h-4 w-4" /> Guardar configuración
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
