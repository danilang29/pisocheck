export interface GpsFix {
  lat: number
  lon: number
  accuracy: number
}

export interface PhotoRecord {
  id: string
  inspectionId: string
  roomId: string
  blob: Blob
  takenAt: number
  gps: GpsFix | null
  hash: string
  note: string
}

export interface Room {
  id: string
  name: string
  icon: string
}

export type InspectionType = 'entrada' | 'salida'

export interface Inspection {
  id: string
  type: InspectionType
  address: string
  city: string
  tenant: string
  landlord: string
  createdAt: number
  rooms: Room[]
}

export const DEFAULT_ROOMS: { name: string; icon: string }[] = [
  { name: 'Entrada / Pasillo', icon: '🚪' },
  { name: 'Salón', icon: '🛋️' },
  { name: 'Cocina', icon: '🍳' },
  { name: 'Baño', icon: '🚿' },
  { name: 'Dormitorio', icon: '🛏️' },
  { name: 'Terraza / Balcón', icon: '🌿' },
]
