import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { countPhotosByRoom, getInspection, photosByInspection, saveInspection } from '../db'
import { generateReport } from '../pdf/report'
import type { Inspection } from '../types'
import { fmtDate, uid } from '../utils/photo'

export default function InspectionView() {
  const { id } = useParams<{ id: string }>()
  const [inspection, setInspection] = useState<Inspection | null>(null)
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [progress, setProgress] = useState<string | null>(null)

  async function refresh() {
    if (!id) return
    const i = await getInspection(id)
    if (!i) return
    setInspection(i)
    const entries = await Promise.all(
      i.rooms.map(async (r) => [r.id, await countPhotosByRoom(r.id)] as const),
    )
    setCounts(Object.fromEntries(entries))
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function addRoom() {
    if (!inspection) return
    const name = prompt('Nombre de la estancia (ej. Dormitorio 2):')?.trim()
    if (!name) return
    const updated = { ...inspection, rooms: [...inspection.rooms, { id: uid(), name, icon: '📷' }] }
    await saveInspection(updated)
    setInspection(updated)
  }

  async function onGenerate() {
    if (!inspection) return
    setProgress('Preparando informe…')
    try {
      const photos = await photosByInspection(inspection.id)
      await generateReport(inspection, photos, (done, total) =>
        setProgress(`Preparando foto ${done} de ${total}…`),
      )
    } catch (err) {
      alert('No se pudo generar el informe. Inténtalo de nuevo.')
      console.error(err)
    } finally {
      setProgress(null)
    }
  }

  if (!inspection) return <div className="app" />

  const totalPhotos = Object.values(counts).reduce((a, b) => a + b, 0)
  const pendingRooms = inspection.rooms.filter((r) => (counts[r.id] ?? 0) === 0).length

  return (
    <div className="app">
      <nav className="topbar">
        <Link to="/" className="back">
          ← Inicio
        </Link>
      </nav>

      <div className="inspection-head">
        <span className={`badge badge-${inspection.type}`}>
          {inspection.type === 'entrada' ? 'Entrada' : 'Salida'}
        </span>
        <span className="muted">{fmtDate(inspection.createdAt)}</span>
      </div>
      <h1>{inspection.address}</h1>
      {inspection.city && <p className="muted">{inspection.city}</p>}

      <p className="hint">
        {totalPhotos === 0
          ? 'Entra en cada estancia y fotografía paredes, suelos, muebles y electrodomésticos. Acércate a cualquier desperfecto que veas.'
          : pendingRooms > 0
            ? `${totalPhotos} fotos hechas · te quedan ${pendingRooms} estancias sin documentar.`
            : `${totalPhotos} fotos · todas las estancias documentadas ✅`}
      </p>

      <section className="list">
        {inspection.rooms.map((room) => (
          <Link
            key={room.id}
            to={`/inspeccion/${inspection.id}/estancia/${room.id}`}
            className="card room-row"
          >
            <span className="room-name">
              {room.icon} {room.name}
            </span>
            <span className={`room-count ${(counts[room.id] ?? 0) > 0 ? 'ok' : ''}`}>
              {counts[room.id] ?? 0} fotos ›
            </span>
          </Link>
        ))}
      </section>

      <button className="btn btn-secondary btn-block" onClick={addRoom}>
        ＋ Añadir estancia
      </button>

      <div className="bottom-actions">
        <button
          className="btn btn-primary btn-block"
          disabled={totalPhotos === 0 || progress !== null}
          onClick={onGenerate}
        >
          {progress ?? '📄 Generar informe PDF'}
        </button>
      </div>
    </div>
  )
}
