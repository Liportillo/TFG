// Archivo: frontend/src/components/MonitoreoDashboard.jsx

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './MonitoreoDashboard.css';

const MonitoreoDashboard = () => {
  const [estudiantes, setEstudiantes] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('eduvirt_token');

    // Carga inicial de datos
    fetch('http://localhost:8000/api/estudiantes', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setEstudiantes(data))
      .catch(err => console.error("Error en carga inicial:", err));
    
    // Conexión WebSocket para telemetría en tiempo real
    const ws = new WebSocket('ws://localhost:8000/api/ws/monitoreo');

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data && data.length > 0) {
        setEstudiantes(data);
      }
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, []);

  return (
    <div className="live-container">
      <header className="live-header" style={{ borderLeftColor: '#3b82f6' }}>
        <div className="live-title">
          <h1>📡 Radar de Alertas Proactivas (IA)</h1>
          <span className="live-badge" style={{ background: '#3b82f6' }}>Monitor Activo</span>
        </div>
        <div className="live-actions">
          <button 
            className="end-session-btn" 
            style={{ background: '#64748b' }} 
            onClick={() => navigate('/docente')}
          >
            Volver a la Planilla
          </button>
        </div>
      </header>

      <div className="live-grid">
        <div className="main-column">
          <section className="live-card">
            <h2>Telemetría de Estudiantes en Tiempo Real</h2>
            <p className="subtitle" style={{marginBottom: '20px'}}>Sincronizado con el LMS vía WebSockets</p>
            
            <div className="student-grid">
              {estudiantes.length === 0 ? (
                <p style={{color: '#94a3b8'}}>Escaneando actividades en la base de datos...</p>
              ) : (
                estudiantes.map((est, idx) => (
                  <div key={idx} className="student-live-card">
                    <div className="student-header">
                      <span className="student-name">{est.nombre}</span>
                      <span className="status-dot active"></span>
                    </div>
                    
                    <div className="metrics-row">
                      <div className="metric">
                        <span className="metric-val">{est.progreso_general}%</span>
                        <span className="metric-label">Progreso</span>
                      </div>
                      <div className="metric">
                        <span className="metric-val" style={{color: est.riesgo_desvinculacion > 50 ? '#ef4444' : '#10b981'}}>
                          {est.riesgo_desvinculacion}%
                        </span>
                        <span className="metric-label">Riesgo IA</span>
                      </div>
                    </div>
                    
                    <div className="suggestion-pill" style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      <strong style={{color: '#e2e8f0'}}>💡 Plan de Acción Sugerido:</strong>
                      {est.sugerencias_adaptadas && est.sugerencias_adaptadas.length > 0 ? (
                        est.sugerencias_adaptadas.map((sug, i) => (
                          <span key={i} style={{color: i === 0 && est.riesgo_desvinculacion > 50 ? '#fca5a5' : '#cbd5e1', fontWeight: i === 0 ? 'bold' : 'normal'}}>
                            {sug}
                          </span>
                        ))
                      ) : (
                        <span style={{color: '#cbd5e1'}}>Monitorear progreso constante.</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default MonitoreoDashboard;