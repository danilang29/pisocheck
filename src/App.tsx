import { HashRouter, Route, Routes } from 'react-router-dom'
import Home from './pages/Home'
import InspectionView from './pages/InspectionView'
import NewInspection from './pages/NewInspection'
import RoomView from './pages/RoomView'

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/nueva" element={<NewInspection />} />
        <Route path="/inspeccion/:id" element={<InspectionView />} />
        <Route path="/inspeccion/:id/estancia/:roomId" element={<RoomView />} />
      </Routes>
    </HashRouter>
  )
}
