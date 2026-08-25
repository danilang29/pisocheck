import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { Inspection, PhotoRecord } from './types'

interface PisoCheckDB extends DBSchema {
  inspections: { key: string; value: Inspection }
  photos: {
    key: string
    value: PhotoRecord
    indexes: { 'by-inspection': string; 'by-room': string }
  }
}

let dbPromise: Promise<IDBPDatabase<PisoCheckDB>> | null = null

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<PisoCheckDB>('pisocheck', 1, {
      upgrade(db) {
        db.createObjectStore('inspections', { keyPath: 'id' })
        const photos = db.createObjectStore('photos', { keyPath: 'id' })
        photos.createIndex('by-inspection', 'inspectionId')
        photos.createIndex('by-room', 'roomId')
      },
    })
  }
  return dbPromise
}

export async function saveInspection(inspection: Inspection) {
  await (await getDB()).put('inspections', inspection)
}

export async function listInspections(): Promise<Inspection[]> {
  const all = await (await getDB()).getAll('inspections')
  return all.sort((a, b) => b.createdAt - a.createdAt)
}

export async function getInspection(id: string) {
  return (await getDB()).get('inspections', id)
}

export async function deleteInspection(id: string) {
  const db = await getDB()
  const keys = await db.getAllKeysFromIndex('photos', 'by-inspection', id)
  const tx = db.transaction(['inspections', 'photos'], 'readwrite')
  await Promise.all([
    tx.objectStore('inspections').delete(id),
    ...keys.map((k) => tx.objectStore('photos').delete(k)),
    tx.done,
  ])
}

export async function savePhoto(photo: PhotoRecord) {
  await (await getDB()).put('photos', photo)
}

export async function deletePhoto(id: string) {
  await (await getDB()).delete('photos', id)
}

export async function photosByRoom(roomId: string) {
  const list = await (await getDB()).getAllFromIndex('photos', 'by-room', roomId)
  return list.sort((a, b) => a.takenAt - b.takenAt)
}

export async function photosByInspection(inspectionId: string) {
  const list = await (await getDB()).getAllFromIndex('photos', 'by-inspection', inspectionId)
  return list.sort((a, b) => a.takenAt - b.takenAt)
}

export async function countPhotos(inspectionId: string) {
  return (await getDB()).countFromIndex('photos', 'by-inspection', inspectionId)
}

export async function countPhotosByRoom(roomId: string) {
  return (await getDB()).countFromIndex('photos', 'by-room', roomId)
}
