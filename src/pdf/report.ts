import { jsPDF } from 'jspdf'
import type { Inspection, PhotoRecord, Room } from '../types'
import { blobToDataURL, fmtDate, fmtDateTime, fmtGps } from '../utils/photo'

const PAGE_W = 210
const PAGE_H = 297
const MARGIN = 15
const CONTENT_W = PAGE_W - MARGIN * 2
const FOOTER_Y = PAGE_H - 10

const BRAND: [number, number, number] = [37, 99, 235]
const INK: [number, number, number] = [28, 35, 48]
const GRAY: [number, number, number] = [110, 118, 130]
const LIGHT: [number, number, number] = [241, 245, 249]

const CELL_W = 87
const CELL_GAP = CONTENT_W - CELL_W * 2
const IMG_BOX_H = 62
const CAPTION_H = 16
const CELL_H = IMG_BOX_H + CAPTION_H

interface LoadedPhoto {
  rec: PhotoRecord
  dataUrl: string
  w: number
  h: number
  num: number
}

async function loadPhoto(rec: PhotoRecord, num: number): Promise<LoadedPhoto> {
  const dataUrl = await blobToDataURL(rec.blob)
  const img = new Image()
  img.src = dataUrl
  await img.decode()
  return { rec, dataUrl, w: img.naturalWidth, h: img.naturalHeight, num }
}

export interface ReportOptions {
  sample?: boolean
  onProgress?: (done: number, total: number) => void
}

export async function generateReport(
  inspection: Inspection,
  photos: PhotoRecord[],
  { sample = false, onProgress }: ReportOptions = {},
): Promise<void> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const generatedAt = Date.now()
  const typeLabel = inspection.type === 'entrada' ? 'INSPECCIÓN DE ENTRADA' : 'INSPECCIÓN DE SALIDA'

  // ---- Portada ----
  doc.setFillColor(...BRAND)
  doc.rect(0, 0, PAGE_W, 48, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text('PisoCheck', MARGIN, 16)
  doc.setFontSize(22)
  doc.text('Informe de estado de la vivienda', MARGIN, 30)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.text(typeLabel, MARGIN, 40)

  let y = 62
  doc.setTextColor(...INK)
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text(inspection.address, MARGIN, y)
  y += 7
  if (inspection.city) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(12)
    doc.text(inspection.city, MARGIN, y)
    y += 7
  }
  y += 4

  const rows: [string, string][] = [
    ['Fecha de la inspección', fmtDate(inspection.createdAt)],
    ['Informe generado el', fmtDateTime(generatedAt)],
  ]
  if (inspection.tenant) rows.push(['Inquilino/a', inspection.tenant])
  if (inspection.landlord) rows.push(['Propietario/a', inspection.landlord])
  rows.push(['Estancias documentadas', String(inspection.rooms.length)])
  rows.push(['Fotografías', String(photos.length)])
  if (photos.length > 0) {
    const first = photos[0].takenAt
    const last = photos[photos.length - 1].takenAt
    rows.push(['Capturas realizadas', `${fmtDateTime(first)} — ${fmtDateTime(last)}`])
  }

  doc.setFontSize(10.5)
  for (const [label, value] of rows) {
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...GRAY)
    doc.text(label, MARGIN, y)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...INK)
    doc.text(value, MARGIN + 62, y)
    y += 6.5
  }

  y += 6
  doc.setFillColor(...LIGHT)
  doc.roundedRect(MARGIN, y, CONTENT_W, 34, 2, 2, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...INK)
  doc.text('Sobre la integridad de este informe', MARGIN + 5, y + 7)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...GRAY)
  const integrity = doc.splitTextToSize(
    'Cada fotografía de este informe se acompaña de su fecha y hora de captura, de las coordenadas GPS del ' +
      'dispositivo (cuando estaban disponibles) y de su huella digital SHA-256. La huella identifica de forma ' +
      'única el archivo original: cualquier modificación posterior de la imagen produce una huella distinta. ' +
      'El anexo final recoge la lista completa de huellas.',
    CONTENT_W - 10,
  )
  doc.text(integrity, MARGIN + 5, y + 13)

  // ---- Fotos por estancia ----
  const loaded: LoadedPhoto[] = []
  for (let i = 0; i < photos.length; i++) {
    loaded.push(await loadPhoto(photos[i], i + 1))
    onProgress?.(i + 1, photos.length)
  }
  const byRoom = new Map<string, LoadedPhoto[]>()
  for (const p of loaded) {
    const list = byRoom.get(p.rec.roomId) ?? []
    list.push(p)
    byRoom.set(p.rec.roomId, list)
  }

  const roomsWithPhotos = inspection.rooms.filter((r) => (byRoom.get(r.id) ?? []).length > 0)

  for (const room of roomsWithPhotos) {
    doc.addPage()
    y = drawRoomHeader(doc, room, byRoom.get(room.id)!.length)
    let col = 0
    for (const photo of byRoom.get(room.id)!) {
      if (col === 0 && y + CELL_H > PAGE_H - 16) {
        doc.addPage()
        y = drawRoomHeader(doc, room, byRoom.get(room.id)!.length, true)
      }
      drawPhotoCell(doc, photo, MARGIN + col * (CELL_W + CELL_GAP), y)
      col = (col + 1) % 2
      if (col === 0) y += CELL_H + 4
    }
  }

  // ---- Anexo de huellas ----
  if (loaded.length > 0) {
    doc.addPage()
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(14)
    doc.setTextColor(...INK)
    doc.text('Anexo: huellas digitales (SHA-256)', MARGIN, 22)
    y = 32
    const roomName = new Map(inspection.rooms.map((r) => [r.id, r.name]))
    for (const p of loaded) {
      if (y + 11 > PAGE_H - 16) {
        doc.addPage()
        y = 22
      }
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8.5)
      doc.setTextColor(...INK)
      doc.text(
        `Foto ${p.num} — ${roomName.get(p.rec.roomId) ?? 'Estancia'} — ${fmtDateTime(p.rec.takenAt)}`,
        MARGIN,
        y,
      )
      doc.setFont('courier', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(...GRAY)
      doc.text(p.rec.hash, MARGIN, y + 4)
      y += 11
    }
  }

  // ---- Pie de página y marca de agua ----
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    if (sample) {
      doc.saveGraphicsState()
      doc.setGState(doc.GState({ opacity: 0.16 }))
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(72)
      doc.setTextColor(...BRAND)
      doc.text('MUESTRA', PAGE_W / 2, PAGE_H / 2 + 30, { align: 'center', angle: 45 })
      doc.restoreGraphicsState()
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8)
      doc.setTextColor(...BRAND)
      doc.text('VERSIÓN DE MUESTRA — el informe completo se entrega sin marca de agua', PAGE_W / 2, 6, {
        align: 'center',
      })
    }
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...GRAY)
    doc.text(`Generado con PisoCheck · ${fmtDateTime(generatedAt)}`, MARGIN, FOOTER_Y)
    doc.text(`Página ${i} de ${pageCount}`, PAGE_W - MARGIN, FOOTER_Y, { align: 'right' })
  }

  const slug = inspection.address
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40)
  doc.save(`pisocheck-${sample ? 'muestra-' : ''}${inspection.type}-${slug || 'informe'}.pdf`)
}

function drawRoomHeader(doc: jsPDF, room: Room, count: number, continued = false): number {
  doc.setFillColor(...LIGHT)
  doc.roundedRect(MARGIN, 14, CONTENT_W, 12, 2, 2, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(...INK)
  doc.text(`${room.name}${continued ? ' (cont.)' : ''}`, MARGIN + 4, 22)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...GRAY)
  doc.text(`${count} fotos`, PAGE_W - MARGIN - 4, 22, { align: 'right' })
  return 32
}

function drawPhotoCell(doc: jsPDF, photo: LoadedPhoto, x: number, y: number) {
  const scale = Math.min(CELL_W / photo.w, IMG_BOX_H / photo.h)
  const w = photo.w * scale
  const h = photo.h * scale
  const imgX = x + (CELL_W - w) / 2
  const imgY = y + (IMG_BOX_H - h) / 2
  doc.setFillColor(248, 249, 251)
  doc.rect(x, y, CELL_W, IMG_BOX_H, 'F')
  doc.addImage(photo.dataUrl, 'JPEG', imgX, imgY, w, h)

  let cy = y + IMG_BOX_H + 4
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...INK)
  doc.text(`Foto ${photo.num} · ${fmtDateTime(photo.rec.takenAt)}`, x, cy)
  cy += 3.6
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.2)
  doc.setTextColor(...GRAY)
  const gps = fmtGps(photo.rec.gps)
  doc.text(gps ? `GPS: ${gps}` : 'GPS: no disponible', x, cy)
  cy += 3.4
  doc.setFont('courier', 'normal')
  doc.text(`SHA-256: ${photo.rec.hash.slice(0, 24)}…`, x, cy)
  if (photo.rec.note) {
    cy += 3.4
    doc.setFont('helvetica', 'italic')
    doc.setTextColor(...INK)
    const note = photo.rec.note.length > 60 ? photo.rec.note.slice(0, 57) + '…' : photo.rec.note
    doc.text(note, x, cy)
  }
}
