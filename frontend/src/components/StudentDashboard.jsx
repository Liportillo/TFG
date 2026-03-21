// Archivo: frontend/src/components/StudentDashboard.jsx

import { useState, useEffect } from 'react'
import ProgressChart from './ProgressChart' // Ajustamos la ruta
import '../App.css' // Ajustamos la ruta

const StudentDashboard = () => {
  const [estudiante, setEstudiante] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
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
        <div className="card progress-card">
          <h2>Progreso General</h2>
          <div className="progress-circle">
            <ProgressChart percentage={estudiante.progreso_general} />
          </div>
          <p>Módulos completados: {estudiante.modulos_completados} de {estudiante.total_modulos}</p>
        </div>

        <div className="card alert-card">
          <h2>Alerta Proactiva - IA Predictiva</h2>
          <p className="risk-level">Riesgo de Desvinculación: {estudiante.riesgo_desvinculacion}%</p>
          <p className="suggestion">Analizando métricas de interacción en tiempo real...</p>
        </div>

        <div className="card gamification-card">
          <h2>Logros Adaptativos 🏆</h2>
          <ul className="badges-list">
            {estudiante.logros.map((logro, index) => (
              <li key={index} className="badge">{logro}</li>
            ))}
          </ul>
        </div>

        <div className="card suggestions-card">
          <h2>Sugerencias Adaptadas 💡</h2>
          <p className="perfil-text">Basado en tu estilo de aprendizaje: <strong>{estudiante.perfil_inclusivo.estilo_aprendizaje}</strong></p>
          <ul className="suggestions-list">
            {estudiante.sugerencias_adaptadas.map((sug, index) => (
              <li key={index} className="suggestion-item">{sug}</li>
            ))}
          </ul>
        </div>
      </main>
    </div>
  )
}

export default StudentDashboard;