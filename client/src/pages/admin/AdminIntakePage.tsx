import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api, apiErrorMessage } from '@/lib/api'
import { adjustTermForFrequency, formatTermForFrequency, installmentsForTermWeeks, termsForFrequency } from '@/lib/loan-options'
import { formatCurrency, formatInstallmentCount } from '@/lib/format'
import type { Application, Loan, Settings, User } from '@/lib/types'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Select } from '@/components/ui/Select'
import { PageHeader } from '@/components/ui/PageHeader'
import { CommunityField } from '@/components/ui/CommunityField'

export function AdminIntakePage() {
  const navigate = useNavigate()
  const queries = useQueryClient()
  const [clientId, setClientId] = useState('')
  const [account, setAccount] = useState({ name: '', email: '', cedula: '', phone: '', password: '', community: '', occupation: '', acceptPrivacy: false, acceptEquifax: false })
  const [conditions, setConditions] = useState({ amount: 50000, weeks: 8, frequency: 'WEEKLY', purpose: '', consent: false })
  const clients = useQuery<User[]>({ queryKey: ['intake-clients'], queryFn: async () => (await api.get('/clients')).data })
  const settings = useQuery<Settings>({ queryKey: ['public-settings'], queryFn: async () => (await api.get('/public/settings')).data })
  const selected = clients.data?.find((client) => client.id === clientId)
  const history = useQuery<User & { clientLoans: Loan[]; applications: Application[] }>({ queryKey: ['intake-history', clientId], queryFn: async () => (await api.get(`/clients/${clientId}`)).data, enabled: Boolean(clientId) })
  const existingApplication = history.data?.applications.find((item) => ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'INFO_REQUESTED', 'RECOMMENDED'].includes(item.status))
  const pendingLoan = history.data?.clientLoans.find((loan) => loan.status === 'PENDING_DISBURSEMENT')
  const activeLoan = history.data?.clientLoans.find((loan) => ['ACTIVE', 'DEFAULTED'].includes(loan.status))
  useEffect(() => {
    if (!settings.data) return
    const data = settings.data
    setConditions((current) => ({
      ...current,
      amount: data.loanAmounts.includes(current.amount) ? current.amount : data.loanAmounts[0],
      weeks: adjustTermForFrequency(Math.max(data.minTerm, Math.min(data.maxTerm, current.weeks)), current.frequency, data),
    }))
  }, [settings.data])
  const register = useMutation({
    mutationFn: async () => (await api.post<User>('/clients', account)).data,
    onSuccess: (client) => {
      queries.invalidateQueries({ queryKey: ['intake-clients'] })
      queries.invalidateQueries({ queryKey: ['admin-clients'] })
      queries.invalidateQueries({ queryKey: ['dashboard'] })
      setClientId(client.id)
      setAccount({ name: '', email: '', cedula: '', phone: '', password: '', community: '', occupation: '', acceptPrivacy: false, acceptEquifax: false })
      toast.success('Cliente registrado. Ahora podés recibir su solicitud.')
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  })
  const application = useMutation({
    mutationFn: async () => {
      if (!selected) throw new Error('Seleccioná un cliente.')
      if (!history.data || existingApplication || pendingLoan) throw new Error('El cliente ya tiene una solicitud en proceso o un préstamo pendiente de desembolso.')
      if (activeLoan && conditions.amount <= (activeLoan.balance || 0)) throw new Error('El monto de renovación debe superar el saldo anterior.')
      return (await api.post<Application>('/applications/assisted', {
        clientId, name: selected.name, phone: selected.phone || '', cedula: selected.profile?.cedula,
        community: selected.profile?.community || undefined, occupation: selected.profile?.occupation || undefined,
        amountRequested: conditions.amount, termWeeks: conditions.weeks,
        termInstallments: installmentsForTermWeeks(conditions.weeks, conditions.frequency), paymentFrequency: conditions.frequency,
        purpose: conditions.purpose, acceptPrivacy: conditions.consent, acceptEquifax: conditions.consent, saveAsDraft: false,
        renewalOfLoanId: activeLoan?.id,
      })).data
    },
    onSuccess: (data) => {
      queries.invalidateQueries({ queryKey: ['admin-applications'] })
      queries.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success('Solicitud recibida. La aprobación corresponde a administración.')
      navigate(`/admin/solicitudes/${data.id}`)
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  })
  return <div>
    <PageHeader eyebrow="Atención al cliente" title="Recepción" description="Registrá clientes y recibí solicitudes presenciales, telefónicas o por WhatsApp. No se aprueban créditos desde esta pantalla." />
    <div className="grid gap-6 lg:grid-cols-2">
      <Card><CardHeader title="1. Registrar un cliente nuevo" description="Si ya tiene cuenta, no la dupliqués: seleccionalo en el formulario de solicitud." /><CardContent>
        <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); register.mutate() }}>
          {(['name', 'email', 'cedula', 'phone', 'password'] as const).map((field) => <div key={field}>
            <Label htmlFor={`intake-${field}`}>{({ name: 'Nombre completo', email: 'Correo', cedula: 'Cédula (1-2345-6789)', phone: 'Teléfono', password: 'Contraseña inicial (acordada con el cliente)' })[field]}</Label>
            <Input id={`intake-${field}`} required type={field === 'password' ? 'password' : field === 'email' ? 'email' : 'text'} minLength={field === 'password' ? 8 : undefined} value={account[field]} onChange={(event) => setAccount((current) => ({ ...current, [field]: event.target.value }))} />
          </div>)}
          <CommunityField id="intake-community" value={account.community} onChange={(community) => setAccount((current) => ({ ...current, community }))} required />
          <div>
            <Label htmlFor="intake-occupation">Ocupación *</Label>
            <Input id="intake-occupation" required maxLength={120} placeholder="Escribí la ocupación del cliente" value={account.occupation} onChange={(event) => setAccount((current) => ({ ...current, occupation: event.target.value }))} />
          </div>
          <label className="flex gap-2 text-sm"><input type="checkbox" required checked={account.acceptPrivacy} onChange={(event) => setAccount((current) => ({ ...current, acceptPrivacy: event.target.checked }))} />El cliente dio su consentimiento para tratar sus datos.</label>
          <label className="flex gap-2 text-sm"><input type="checkbox" checked={account.acceptEquifax} onChange={(event) => setAccount((current) => ({ ...current, acceptEquifax: event.target.checked }))} />Autorizó la consulta de referencias.</label>
          <Button type="submit" loading={register.isPending}>Registrar cliente</Button>
        </form>
      </CardContent></Card>
      <Card><CardHeader title="2. Recibir una solicitud" description="Se registra en nombre del cliente, con trazabilidad de la persona que la recibe." /><CardContent>
        <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); application.mutate() }}>
          <div><Label htmlFor="intake-client">Cliente</Label><Select id="intake-client" required value={clientId} onChange={(event) => { setClientId(event.target.value); setConditions((current) => ({ ...current, consent: false })) }}><option value="">Seleccioná un cliente</option>{clients.data?.filter((client) => client.status === 'ACTIVE').map((client) => <option key={client.id} value={client.id}>{client.name} · {client.profile?.cedula}</option>)}</Select></div>
          {existingApplication && <p role="alert" className="rounded-2xl bg-amber-50 p-3 text-sm">Este cliente ya tiene una solicitud en proceso. Revisala antes de recibir otra.</p>}
          {pendingLoan && <p role="alert" className="rounded-2xl bg-amber-50 p-3 text-sm">El cliente tiene un préstamo aprobado pendiente de desembolso.</p>}
          {activeLoan && !existingApplication && !pendingLoan && <p className="rounded-2xl bg-forest-50 p-3 text-sm">Solo se permite renovación del préstamo activo. Saldo anterior: {formatCurrency(activeLoan.balance)}. El monto solicitado debe superar ese saldo.</p>}
          {history.isError && <p role="alert" className="text-sm text-red-700">No se pudo verificar el historial. Recargá antes de continuar.</p>}
          <div><Label htmlFor="intake-amount">Monto solicitado</Label><Select id="intake-amount" value={conditions.amount} onChange={(event) => setConditions((current) => ({ ...current, amount: Number(event.target.value) }))}>{settings.data?.loanAmounts.map((amount) => <option key={amount} value={amount}>{formatCurrency(amount)}</option>)}</Select></div>
          <div><Label htmlFor="intake-weeks">Plazo</Label><Select id="intake-weeks" value={conditions.weeks} disabled={termsForFrequency(conditions.frequency, settings.data).length === 0} onChange={(event) => setConditions((current) => ({ ...current, weeks: Number(event.target.value) }))}>{termsForFrequency(conditions.frequency, settings.data).map((weeks) => <option key={weeks} value={weeks}>{formatTermForFrequency(weeks, conditions.frequency)}</option>)}</Select><p className="mt-1 text-[11px] text-ink/40">{formatInstallmentCount(installmentsForTermWeeks(conditions.weeks, conditions.frequency))} · plazos ajustados a la frecuencia</p></div>
          <div><Label htmlFor="intake-frequency">Frecuencia</Label><Select id="intake-frequency" value={conditions.frequency} onChange={(event) => { const frequency = event.target.value; setConditions((current) => ({ ...current, frequency, weeks: adjustTermForFrequency(current.weeks, frequency, settings.data) })) }}><option value="WEEKLY">Semanal</option><option value="BIWEEKLY" disabled={termsForFrequency('BIWEEKLY', settings.data).length === 0}>Quincenal</option><option value="MONTHLY" disabled={termsForFrequency('MONTHLY', settings.data).length === 0}>Mensual</option></Select></div>
          <div><Label htmlFor="intake-purpose">Destino del préstamo</Label><Input id="intake-purpose" required value={conditions.purpose} onChange={(event) => setConditions((current) => ({ ...current, purpose: event.target.value }))} /></div>
          <p className="rounded-2xl bg-forest-50 p-3 text-sm">Interés total vigente: {settings.data?.annualRate ?? '…'} %, una sola vez. Total estimado: {settings.data ? formatCurrency(conditions.amount * (1 + settings.data.annualRate / 100)) : '…'}.</p>
          <label className="flex gap-2 text-sm"><input type="checkbox" required checked={conditions.consent} onChange={(event) => setConditions((current) => ({ ...current, consent: event.target.checked }))} />Confirmo que verifiqué la cédula de identidad y que el cliente autorizó esta solicitud, el tratamiento de datos y la consulta de referencias. No se requieren otros documentos.</label>
          {clients.isError || settings.isError ? <p role="alert" className="text-red-700">No se pudo cargar la información. Recargá para continuar.</p> : null}
          <Button type="submit" disabled={!selected || !history.data || history.isFetching || Boolean(existingApplication || pendingLoan) || !settings.data || !conditions.consent || Boolean(activeLoan && conditions.amount <= (activeLoan.balance || 0))} loading={application.isPending}>{activeLoan ? 'Recibir renovación' : 'Recibir solicitud'}</Button>
        </form>
      </CardContent></Card>
    </div>
  </div>
}
