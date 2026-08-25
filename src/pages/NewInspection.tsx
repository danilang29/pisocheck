import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { saveInspection } from '../db'
import { DEFAULT_ROOMS, type InspectionType, type Room } from '../types'
import { uid } from '../utils/photo'

export default function NewInspection() {
  const navigate = useNavigate()
  const [type, setType] = useState<InspectionType>('entrada')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [tenant, setTenant] = useState('')
  const [landlord, setLandlord] = useState('')
  const [selected, setSelected] = useState<boolean[]>(DEFAULT_ROOMS.map(() => true))
  const [extraRooms, setExtraRooms] = useState<string[]>([])
  const [extraInput, setExtraInput] = useState('')

  function addExtraRoom() {
    const name = extraInput.trim()
    if (!name) return
    setExtraRooms([...extraRooms, name])
    setExtraInput('')
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const rooms: Room[] = [
      ...DEFAULT_ROOMS.filter((_, i) => selected[i]).map((r) => ({ id: uid(), ...r })),
      ...extraRooms.map((name) => ({ id: uid(), name, icon: '📷' })),
    ]
    if (!address.trim() || rooms.length === 0) return
    const id = uid()
    await saveInspection({
      id,
      type,
      address: address.trim(),
      city: city.trim(),
      tenant: tenant.trim(),
      landlord: landlord.trim(),
      createdAt: Date.now(),
      rooms,
    })
    navigate(`/inspeccion/${id}`, { replace: true })
  }

  return (
    <div className="app">
      <nav className="topbar">
        <Link to="/" className="back">
          ← Inicio
        </Link>
      </nav>
      <h1>Nueva inspección</h1>

      <form onSubmit={onSubmit}>
        <div className="seg">
          <button
            type="button"
            className={type === 'entrada' ? 'active' : ''}
            onClick={() => setType('entrada')}
          >
            🔑 Entrada
          </button>
          <button
            type="button"
            className={type === 'salida' ? 'active' : ''}
            onClick={() => setType('salida')}
          >
            📦 Salida
          </button>
        </div>

        <label>
          Dirección de la vivienda *
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Calle Mayor 12, 3ºB"
            required
          />
        </label>
        <label>
          Ciudad
          <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Madrid" />
        </label>
        <div className="two-col">
          <label>
            Inquilino/a
            <input value={tenant} onChange={(e) => setTenant(e.target.value)} placeholder="Tu nombre" />
          </label>
          <label>
            Propietario/a
            <input
              value={landlord}
              onChange={(e) => setLandlord(e.target.value)}
              placeholder="Opcional"
            />
          </label>
        </div>

        <h2>Estancias a documentar</h2>
        <div className="card">
          {DEFAULT_ROOMS.map((room, i) => (
            <label key={room.name} className="checkrow">
              <input
                type="checkbox"
                checked={selected[i]}
                onChange={() => setSelected(selected.map((v, j) => (j === i ? !v : v)))}
              />
              <span>
                {room.icon} {room.name}
              </span>
            </label>
          ))}
          {extraRooms.map((name, i) => (
            <label key={`extra-${i}`} className="checkrow">
              <input
                type="checkbox"
                checked
                onChange={() => setExtraRooms(extraRooms.filter((_, j) => j !== i))}
              />
              <span>📷 {name}</span>
            </label>
          ))}
          <div className="addrow">
            <input
              value={extraInput}
              onChange={(e) => setExtraInput(e.target.value)}
              placeholder="Otra estancia (ej. Dormitorio 2)"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addExtraRoom()
                }
              }}
            />
            <button type="button" className="btn btn-secondary" onClick={addExtraRoom}>
              Añadir
            </button>
          </div>
        </div>

        <button type="submit" className="btn btn-primary btn-block">
          Empezar inspección →
        </button>
      </form>
    </div>
  )
}
