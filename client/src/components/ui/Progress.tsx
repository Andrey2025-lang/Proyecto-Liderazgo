export function Progress({ value, max = 100 }: { value: number; max?: number }) {
  const percent = Math.min(100, Math.max(0, (value / max) * 100))
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-forest-900/10">
      <div
        className="h-full rounded-full bg-gradient-to-r from-forest-600 to-forest-900 transition-all"
        style={{ width: `${percent}%` }}
      />
    </div>
  )
}
