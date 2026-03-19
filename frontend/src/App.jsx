import { useState, useEffect } from 'react'
import ProgressChart from './components/ProgressChart'
import './App.css'

function App() {
  const [estudiante, setEstudiante] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    // Simulamos el login de Ana Torres llamando a nuestro backend en FastAPI
    fetch('http://localhost:8000/api/estudiantes/ana.torres@eduvirt.com')
      .then(res => {
        if (!res.ok) throw new Error('Error al conectar con la API')
        return res.json()
      })
      .then(data => setEstudiante(data))
      .catch(err => setError(err.message))
  }, [])

  if (error) return <div className="error">Error: {error}</div>
  if (!estudiante) return <div className="loading">Cargando el dashboard inclusivo...</div>

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1>EduVirt</h1>
        <div className="user-profile">
          <p>Bienvenida, <strong>{estudiante.nombre}</strong></p>
        </div>
      </header>

      <main className="dashboard-grid">
        {/* Módulo de Progreso */}
        <div className="card progress-card">
          <h2>Progreso General</h2>
        <div className="progress-circle">
          <ProgressChart percentage={estudiante.progreso_general} />
        </div>
          <p>Módulos completados: {estudiante.modulos_completados} de {estudiante.total_modulos}</p>
        </div>

        {/* Módulo de Alerta Proactiva (IA Simulada por ahora) */}
        <div className="card alert-card">
          <h2>Alerta Proactiva - IA Predictiva</h2>
          <p className="risk-level">Riesgo de Desvinculación: {estudiante.riesgo_desvinculacion}%</p>
          <p className="suggestion">Sugerencia: Revisar contenido {estudiante.perfil_inclusivo.estilo_aprendizaje} del módulo actual.</p>
        </div>

        {/* Módulo de Gamificación */}
        <div className="card gamification-card">
          <h2>Logros Adaptativos 🏆</h2>
          <ul className="badges-list">
            {estudiante.logros.map((logro, index) => (
              <li key={index} className="badge">{logro}</li>
            ))}
          </ul>
        </div>
      </main>
    </div>
  )
}

export default App