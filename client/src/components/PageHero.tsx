import type { ReactNode } from 'react'

export function PageHero({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string
  title: string
  description?: string
  children?: ReactNode
}) {
  return (
    <section className="relative overflow-hidden border-b border-forest-900/10 bg-gradient-to-b from-forest-50/80 to-cream">
      <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-gold/10 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-32 -left-20 h-72 w-72 rounded-full bg-forest-300/20 blur-2xl" />
      <div className="container-page relative py-14 sm:py-20">
        {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
        <h1 className="max-w-3xl font-display text-4xl font-semibold tracking-tight text-forest-950 sm:text-5xl">
          {title}
        </h1>
        {description && (
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-ink/65 sm:text-lg">
            {description}
          </p>
        )}
        {children && <div className="mt-8">{children}</div>}
      </div>
    </section>
  )
}
