import { Link } from 'react-router-dom'
import { ArrowLeft, Compass } from 'lucide-react'
import { Logo } from '@/components/Logo'
import { Button } from '@/components/ui/Button'

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col bg-cream">
      <div className="container-page flex h-20 items-center justify-between">
        <Logo />
        <Link to="/" className="text-sm font-semibold text-forest-700 hover:text-forest-900">
          Volver al inicio
        </Link>
      </div>
      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="max-w-lg text-center">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-forest-50 text-forest-700">
            <Compass className="h-8 w-8" />
          </span>
          <p className="mt-6 font-display text-7xl font-semibold text-forest-950">404</p>
          <h1 className="mt-2 font-display text-3xl font-semibold text-forest-950">
            No encontramos esta página
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-ink/55">
            Puede que el enlace haya cambiado o que la página ya no exista. Podés volver al inicio
            o ingresar a tu portal.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link to="/">
              <Button>
                <ArrowLeft className="h-4 w-4" /> Volver al inicio
              </Button>
            </Link>
            <Link to="/login">
              <Button variant="outline">Ingresar a mi cuenta</Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
