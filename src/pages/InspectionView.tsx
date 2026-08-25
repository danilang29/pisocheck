import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { countPhotosByRoom, getInspection, photosByInspection, saveInspection } from '../db'
import { generateReport } from '../pdf/report'
import type { Inspection } from '../types'
import { isUnlocked, REPORT_PRICE, STRIPE_PAYMENT_LINK, tryUnlock } from '../utils/license'
import { fmtDate, uid } from '../utils/photo'

export default function InspectionView() {
  const { id } = useParams<{ id: string }>()
  const [inspection, setInspection] = useState<Inspection | null>(null)
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [progress, setProgress] = useState<string | null>(null)
  const [paywall, setPaywall] = useState(false)
  const [unlocked, setUnlocked] = useState(isUnlocked())
  const [code, setCode] = useState('')
  const [codeError, setCodeError] = useState(false)

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

  async function generate(sample: boolean) {
    if (!inspection) return
    setPaywall(false)
    setProgress('Preparando informe…')
    try {
      const photos = await photosByInspection(inspection.id)
      await generateReport(inspection, photos, {
        sample,
        onProgress: (done, total) => setProgress(`Preparando foto ${done} de ${total}…`),
      })
    } catch (err) {
      alert('No se pudo generar el informe. Inténtalo de nuevo.')
      console.error(err)
    } finally {
      setProgress(null)
    }
  }

  function onGenerateClick() {
    if (unlocked) generate(false)
    else setPaywall(true)
  }

  async function onValidateCode() {
    if (await tryUnlock(code)) {
      setUnlocked(true)
      setCodeError(false)
      generate(false)
    } else {
      setCodeError(true)
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
          onClick={onGenerateClick}
        >
          {progress ?? '📄 Generar informe PDF'}
        </button>
      </div>

      {paywall && (
        <div className="overlay" onClick={() => setPaywall(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Tu informe está listo</h2>
            <p className="muted">
              El informe completo incluye todas tus fotos con fecha, GPS y huella digital SHA-256,
              sin marca de agua — listo para enviar al propietario o a la agencia.
            </p>

            {STRIPE_PAYMENT_LINK ? (
              <>
                <a
                  className="btn btn-primary btn-block"
                  href={STRIPE_PAYMENT_LINK}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Informe completo — {REPORT_PRICE}
                </a>
                <p className="hint">
                  Tras el pago verás tu código de desbloqueo. Introdúcelo aquí:
                </p>
              </>
            ) : (
              <p className="hint">
                ¿Ya tienes un código de desbloqueo? Introdúcelo aquí:
              </p>
            )}

            <div className="addrow">
              <input
                value={code}
                onChange={(e) => {
                  setCode(e.target.value)
                  setCodeError(false)
                }}
                placeholder="Código de desbloqueo"
                autoCapitalize="characters"
              />
              <button type="button" className="btn btn-secondary" onClick={onValidateCode}>
                Validar
              </button>
            </div>
            {codeError && <p className="error">Código no válido. Revisa que esté bien escrito.</p>}

            <button className="btn-link" onClick={() => generate(true)}>
              Descargar muestra gratis (con marca de agua)
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
