import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bell, CheckCheck } from 'lucide-react'
import { api } from '@/lib/api'
import { formatDateTime } from '@/lib/format'
import type { NotificationItem } from '@/lib/types'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { LoadingBlock } from '@/components/ui/Spinner'

interface NotificationResponse {
  items: NotificationItem[]
  unread: number
}

export function NotificationsPanel() {
  const queryClient = useQueryClient()
  const notificationsQuery = useQuery<NotificationResponse>({
    queryKey: ['notifications'],
    queryFn: async () => (await api.get('/notifications')).data,
  })
  const readMutation = useMutation({
    mutationFn: async (id: string) => (await api.patch(`/notifications/${id}/read`)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  })
  const readAllMutation = useMutation({
    mutationFn: async () => (await api.patch('/notifications/read-all')).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  })

  if (notificationsQuery.isLoading) {
    return (
      <Card>
        <LoadingBlock label="Cargando avisos…" />
      </Card>
    )
  }

  const items = notificationsQuery.data?.items || []
  const unread = notificationsQuery.data?.unread || 0

  return (
    <Card>
      <CardHeader
        title="Avisos"
        description="Novedades de tus solicitudes y pagos."
        action={
          unread > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => readAllMutation.mutate()}
              loading={readAllMutation.isPending}
            >
              <CheckCheck className="h-4 w-4" /> Marcar leídas
            </Button>
          ) : (
            <span className="rounded-full bg-forest-50 px-2.5 py-1 text-xs font-semibold text-forest-700">
              Al día
            </span>
          )
        }
      />
      <CardContent>
        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-6 text-sm text-ink/40">
            <Bell className="h-6 w-6 text-forest-300" />
            No tenés avisos por ahora.
          </div>
        ) : (
          <div className="space-y-2">
            {items.slice(0, 5).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => !item.readAt && readMutation.mutate(item.id)}
                className={`flex w-full items-start gap-3 rounded-2xl border p-3 text-left transition ${
                  item.readAt
                    ? 'border-forest-900/5 bg-white'
                    : 'border-forest-200 bg-forest-50/70 hover:bg-forest-50'
                }`}
              >
                <span
                  className={`mt-1 h-2 w-2 shrink-0 rounded-full ${
                    item.readAt ? 'bg-forest-200' : 'bg-gold'
                  }`}
                />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-forest-950">{item.title}</span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-ink/55">
                    {item.message}
                  </span>
                  <span className="mt-1 block text-[10px] text-ink/35">
                    {formatDateTime(item.createdAt)}
                  </span>
                </span>
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
