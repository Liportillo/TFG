// Archivo: frontend/src/components/MonitoreoDashboard.jsx

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './MonitoreoDashboard.css';

const MonitoreoDashboard = () => {
  const [estudiantes, setEstudiantes] = useState([]);
  const [segundos, setSegundos] = useState(2631);
  const navigate = useNavigate();

  useEffect(() => {
    // 1. Cronómetro de la clase
    const intervalo = setInterval(() => setSegundos(s => s + 1), 1000);
    const token = localStorage.getItem('eduvirt_token');

    // 2. CARGA INICIAL SEGURA (Para que las barras aparezcan instantáneamente)
    fetch('http://localhost:8000/api/estudiantes', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setEstudiantes(data))
      .catch(err => console.error("Error en carga inicial:", err));
    
    // 3. CONEXIÓN WEBSOCKET (Para escuchar cambios en vivo desde Moodle)
    const ws = new WebSocket('ws://localhost:8000/api/ws/monitoreo');

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data && data.length > 0) {
        setEstudiantes(data); // Actualiza la pantalla en vivo
      }
    };

    ws.onerror = (error) => {
      console.error("Error en WebSocket:", error);
    };

    return () => {
      clearInterval(intervalo);
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, []);

  const formatTime = (totalSegundos) => {
    const horas = Math.floor(totalSegundos / 3600).toString().padStart(2, '0');
    const minutos = Math.floor((totalSegundos % 3600) / 60).toString().padStart(2, '0');
    const segs = (totalSegundos % 60).toString().padStart(2, '0');
    return `${horas}:${minutos}:${segs}`;
  };

  const getRiskColor = (riesgo) => {
    if (riesgo >= 60) return "riesgo-alto";
    if (riesgo >= 30) return "riesgo-medio";
    return "riesgo-bajo";
  };

  return (
    <div className="live-container">
      <header className="live-header">
        <div className="live-title">
          <h1>Sesión en vivo: Clase 12</h1>
          <span className="live-badge">🟢 Conectado vía WebSockets</span>
        </div>
        <div className="live-actions">
          <span className="live-timer">⏱ Duración: {formatTime(segundos)}</span>
          <button className="end-session-btn" onClick={() => navigate('/docente')}>Finalizar sesión</button>
        </div>
      </header>

      <div className="filter-tabs">
        <span className="tab-label">Estudiantes:</span>
        <button className="tab active">Todos</button>
        <button className="tab">Solo activos</button>
        <button className="tab">Desconectados</button>
      </div>

      <div className="live-grid">
        <div className="main-column">
          <section className="live-card metrics-card">
            <h2>Métricas de Participación Agregadas</h2>
            <div className="participation-stats">
              <div className="stat-item">
                <span className="stat-label">Promedio de participación</span>
                <span className="stat-value">3.2</span>
                <span className="stat-sub">(escala 1-5 basada en IA activa)</span>
              </div>
              <div className="alert-box yellow-alert">
                <span className="alert-title">Baja participación</span>
                <span className="alert-number">7 estudiantes</span>
              </div>
            </div>
          </section>

          <section className="live-card predictions-card">
            <h2>📈 Predicciones de Brechas (IA en Tiempo Real)</h2>
            <div className="predictions-list">
              {/* Si estudiantes está vacío, mostramos un mensaje de carga. Si tiene datos, dibuja las barras */}
              {estudiantes.length === 0 ? (
                <p>Cargando predicciones de la IA...</p>
              ) : (
                estudiantes.map((est, index) => (
                  <div key={index} className="prediction-item">
                    <div className="prediction-info">
                      <strong>{est.nombre}</strong>
                      <span className="prediction-detail">
                        {est.riesgo_desvinculacion >= 60 ? "Alto Riesgo - Desconexión" : 
                         est.riesgo_desvinculacion >= 30 ? "Riesgo Moderado - Participación" : 
                         "Buen Ritmo - Participando"}
                      </span>
                    </div>
                    <div className="prediction-bar-container">
                      <span className="risk-label">Riesgo de abandono</span>
                      <div className="progress-bg">
                        <div className={`progress-fill ${getRiskColor(est.riesgo_desvinculacion)}`} 
                             style={{ width: `${est.riesgo_desvinculacion}%` }}></div>
                      </div>
                      <span className="risk-percent">{est.riesgo_desvinculacion}%</span>
                    </div>
                    <div className="suggestion-pill">
                      💡 Sugerencia: {est.sugerencias_adaptadas?.[0] || "Monitorear progreso."}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        <div className="side-column">
          <section className="live-card motivation-card">
            <h2>🎁 Motivación Adaptativa</h2>
            <p className="subtitle">Logros desbloqueados en esta sesión</p>
            <div className="unlocked-badges">
              <div className="badge-item">
                <span className="badge-icon">💬</span>
                <div>
                  <strong>Luis Fernández</strong>
                  <span className="badge-name">Participante Activo</span>
                  <span className="badge-tag visual">Chat Visual</span>
                </div>
              </div>
            </div>
          </section>

          <section className="live-card actions-card">
            <h2>Acciones Inclusivas</h2>
            <button className="action-btn purple">Asignar badge personalizado</button>
            <button className="action-btn blue">Crear grupo colaborativo</button>
            <button className="action-btn green">Activar apoyo adaptativo</button>
          </section>
        </div>
      </div>
    </div>
  );
};

export default MonitoreoDashboard;