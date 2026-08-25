import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
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

  return (
    <div className="app">
      <header className="brand">
        <h1>🏠 PisoCheck</h1>
        <p>Documenta el estado de tu piso y protege tu fianza.</p>
      </header>

      <Link to="/nueva" className="btn btn-primary btn-block">
        ＋ Nueva inspección
      </Link>

      {inspections === null ? null : inspections.length === 0 ? (
        <div className="card empty">
          <h2>Así funciona</h2>
          <ol>
            <li>
              <strong>Crea una inspección</strong> al entrar (o salir) de la vivienda.
            </li>
            <li>
              <strong>Fotografía cada estancia</strong> siguiendo la guía. Cada foto queda
              registrada con fecha, hora, GPS y huella digital SHA-256.
            </li>
            <li>
              <strong>Descarga el informe PDF</strong> y envíaselo al propietario o a la agencia.
              Si hay disputa con la fianza, tendrás la evidencia.
            </li>
          </ol>
          <p className="hint">Tus fotos no salen de este dispositivo.</p>
        </div>
      ) : (
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
      )}
    </div>
  )
}
