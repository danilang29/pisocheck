import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { deletePhoto, getInspection, photosByRoom, savePhoto } from '../db'
import type { Inspection, PhotoRecord, Room } from '../types'
import { compressImage, fmtDateTime, getGps, sha256Hex, uid } from '../utils/photo'

export default function RoomView() {
  const { id, roomId } = useParams<{ id: string; roomId: string }>()
  const [inspection, setInspection] = useState<Inspection | null>(null)
  const [room, setRoom] = useState<Room | null>(null)
  const [photos, setPhotos] = useState<PhotoRecord[]>([])
  const [urls, setUrls] = useState<Record<string, string>>({})
  const [processing, setProcessing] = useState<string | null>(null)
  const cameraRef = useRef<HTMLInputElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)

  async function refresh() {
    if (!id || !roomId) return
    const i = await getInspection(id)
    if (!i) return
    setInspection(i)
    setRoom(i.rooms.find((r) => r.id === roomId) ?? null)
    setPhotos(await photosByRoom(roomId))
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, roomId])

  useEffect(() => {
    const next: Record<string, string> = {}
    for (const p of photos) next[p.id] = URL.createObjectURL(p.blob)
    setUrls(next)
    return () => {
      for (const u of Object.values(next)) URL.revokeObjectURL(u)
    }
  }, [photos])

  async function onFiles(files: FileList | null) {
    if (!files || files.length === 0 || !id || !roomId) return
    const list = [...files]
    const gpsPromise = getGps()
    for (let i = 0; i < list.length; i++) {
      setProcessing(`Guardando foto ${i + 1} de ${list.length}…`)
      try {
        const blob = await compressImage(list[i])
        const [hash, gps] = await Promise.all([sha256Hex(blob), gpsPromise])
        await savePhoto({
          id: uid(),
          inspectionId: id,
          roomId,
          blob,
          takenAt: list[i].lastModified || Date.now(),
          gps,
          hash,
          note: '',
        })
      } catch (err) {
        console.error(err)
        alert(`No se pudo guardar la foto ${i + 1}.`)
      }
    }
    setProcessing(null)
    if (cameraRef.current) cameraRef.current.value = ''
    if (galleryRef.current) galleryRef.current.value = ''
    refresh()
  }

  async function onNoteChange(photo: PhotoRecord, note: string) {
    await savePhoto({ ...photo, note })
    setPhotos((prev) => prev.map((p) => (p.id === photo.id ? { ...p, note } : p)))
  }

  async function onDelete(photo: PhotoRecord) {
    if (!confirm('¿Eliminar esta foto?')) return
    await deletePhoto(photo.id)
    refresh()
  }

  if (!inspection || !room) return <div className="app" />

  return (
    <div className="app">
      <nav className="topbar">
        <Link to={`/inspeccion/${inspection.id}`} className="back">
          ← {inspection.address}
        </Link>
      </nav>
      <h1>
        {room.icon} {room.name}
      </h1>
      <p className="hint">
        Fotografía cada pared, el suelo, el techo, muebles y electrodomésticos. Haz un primer plano
        de cualquier desperfecto y anótalo debajo de la foto.
      </p>

      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => onFiles(e.target.files)}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => onFiles(e.target.files)}
      />

      <div className="two-col">
        <button
          className="btn btn-primary"
          disabled={processing !== null}
          onClick={() => cameraRef.current?.click()}
        >
          📷 Hacer foto
        </button>
        <button
          className="btn btn-secondary"
          disabled={processing !== null}
          onClick={() => galleryRef.current?.click()}
        >
          🖼️ Desde galería
        </button>
      </div>

      {processing && <p className="hint processing">{processing}</p>}

      <div className="photo-grid">
        {photos.map((p, idx) => (
          <div key={p.id} className="photo-card">
            <img src={urls[p.id]} alt={`Foto ${idx + 1} de ${room.name}`} />
            <div className="photo-meta">
              <span className="muted">{fmtDateTime(p.takenAt)}</span>
              <button className="btn-ghost danger" onClick={() => onDelete(p)} aria-label="Eliminar foto">
                🗑️
              </button>
            </div>
            <input
              className="note-input"
              placeholder="Nota (ej. arañazo en la puerta)"
              defaultValue={p.note}
              onBlur={(e) => {
                if (e.target.value !== p.note) onNoteChange(p, e.target.value)
              }}
            />
          </div>
        ))}
      </div>

      {photos.length === 0 && !processing && (
        <div className="card empty">
          <p>Aún no hay fotos de esta estancia.</p>
        </div>
      )}
    </div>
  )
}
