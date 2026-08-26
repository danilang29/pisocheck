import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { LogoMark } from '../components/Logo'
import { countPhotos, deleteInspection, listInspections } from '../db'
import type { Inspection } from '../types'
import { fmtDate } from '../utils/photo'

export default function Home() {
  const [inspections, setInspections] = useState<Inspection[] | null>(null)
  const [counts, setCounts] = useState<Record<string, number>>({})

  async function refresh() {
    const list = await listInspections()
    setInspections(list)
    const entries = await Promise.all(
      list.map(async (i) => [i.id, await countPhotos(i.id)] as const),
    )
    setCounts(Object.fromEntries(entries))
  }

  useEffect(() => {
    refresh()
  }, [])

  async function onDelete(inspection: Inspection) {
    const ok = confirm(
      `¿Eliminar la inspección de "${inspection.address}"? Se borrarán todas sus fotos. Esta acción no se puede deshacer.`,
    )
    if (!ok) return
    await deleteInspection(inspection.id)
    refresh()
  }

  if (inspections === null) return <div className="app" />

  // Usuario recurrente: sus inspecciones, sin marketing
  if (inspections.length > 0) {
    return (
      <div className="app">
        <header className="brand">
          <h1>
            <LogoMark size={32} /> PisoCheck
          </h1>
          <p>Documenta el estado de tu piso y protege tu fianza.</p>
        </header>

        <Link to="/nueva" className="btn btn-primary btn-block">
          ＋ Nueva inspección
        </Link>

        <section className="list">
          {inspections.map((i) => (
            <div key={i.id} className="card inspection-card">
              <Link to={`/inspeccion/${i.id}`} className="inspection-link">
                <div className="inspection-head">
                  <span className={`badge badge-${i.type}`}>
                    {i.type === 'entrada' ? 'Entrada' : 'Salida'}
                  </span>
                  <span className="muted">{fmtDate(i.createdAt)}</span>
                </div>
                <h2>{i.address}</h2>
                <p className="muted">
                  {i.city ? `${i.city} · ` : ''}
                  {i.rooms.length} estancias · {counts[i.id] ?? 0} fotos
                </p>
              </Link>
              <button className="btn-ghost danger" onClick={() => onDelete(i)} aria-label="Eliminar">
                🗑️
              </button>
            </div>
          ))}
        </section>
      </div>
    )
  }

  // Primera visita: landing
  return (
    <div className="app landing">
      <header className="hero">
        <div className="hero-brand">
          <LogoMark size={34} />
          <span>PisoCheck</span>
        </div>
        <h1>Que no te quiten la fianza</h1>
        <p className="hero-sub">
          Documenta el estado de tu piso de alquiler <strong>el día que entras</strong>: fotos
          guiadas habitación por habitación, selladas con fecha, GPS y huella digital, y un informe
          PDF listo para enviar al propietario.
        </p>
        <Link to="/nueva" className="btn btn-primary btn-block btn-hero">
          Empezar gratis · 10 minutos
        </Link>
        <p className="hero-trust">Sin registro · Sin instalar nada · Tus fotos no salen de tu móvil</p>
      </header>

      <div className="card stat-card">
        <p>
          La fianza en España son <strong>1-2 meses de alquiler: 700-2.000 €</strong>. Sin pruebas
          del estado inicial, recuperarla es tu palabra contra la del casero.
        </p>
      </div>

      <section>
        <h2>Así funciona</h2>
        <ol className="steps">
          <li>
            <strong>Crea la inspección</strong> con la dirección del piso y las estancias a
            documentar.
          </li>
          <li>
            <strong>Haz las fotos guiadas</strong> — paredes, suelos, muebles y cada desperfecto.
            Cada foto queda registrada con fecha, hora, GPS y huella SHA-256.
          </li>
          <li>
            <strong>Descarga el informe PDF</strong> y envíaselo al propietario o a la agencia ese
            mismo día. Si hay disputa al salir, tienes la evidencia.
          </li>
        </ol>
      </section>

      <section>
        <h2>Qué incluye el informe</h2>
        <ul className="checklist">
          <li>Todas tus fotos organizadas por estancia</li>
          <li>Fecha, hora y ubicación GPS de cada captura</li>
          <li>Huella digital SHA-256: demuestra que las fotos no se han manipulado</li>
          <li>Tus notas de cada desperfecto ("arañazo en la puerta")</li>
          <li>PDF profesional listo para enviar o imprimir</li>
        </ul>
      </section>

      <section>
        <h2>Precio</h2>
        <div className="price-row">
          <div className="card price-card">
            <h3>Muestra</h3>
            <p className="price">Gratis</p>
            <p className="muted">El informe completo con marca de agua, para que veas lo que compras.</p>
          </div>
          <div className="card price-card featured">
            <h3>Informe completo</h3>
            <p className="price">8,99 €</p>
            <p className="muted">Pago único por informe. Sin suscripciones ni sorpresas.</p>
          </div>
        </div>
      </section>

      <div className="cta-final">
        <Link to="/nueva" className="btn btn-primary btn-block btn-hero">
          Empezar mi inspección →
        </Link>
        <p className="hero-trust">Hazlo antes de meter los muebles. Tu yo del futuro te lo agradecerá.</p>
      </div>

      <footer className="site-footer">
        <p className="muted">
          PisoCheck · pisocheck.es · Tus fotos se guardan solo en tu dispositivo
        </p>
      </footer>
    </div>
  )
}
