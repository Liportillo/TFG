// Archivo: frontend/src/components/StudentDashboard.jsx

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom';
import ProgressChart from './ProgressChart'
import '../App.css'

const StudentDashboard = () => {
  const [estudiante, setEstudiante] = useState(null)
  const [error, setError] = useState(null)
  const [showConfig, setShowConfig] = useState(false);
  const [formConfig, setFormConfig] = useState({
    requiere_alto_contraste: false,
    requiere_lector_pantalla: false,
    estilo_aprendizaje: 'visual'
  });
  const navigate = useNavigate();

  const fetchEstudiante = () => {
    const token = localStorage.getItem('eduvirt_token');
    const email = localStorage.getItem('eduvirt_email');

    if (!email) return navigate('/');

    // Carga inicial rápida
    fetch(`http://localhost:8000/api/estudiantes/${email}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => {
        if (!res.ok) throw new Error('Error al conectar con la API')
        return res.json()
      })
      .then(data => {
        setEstudiante(data);
        setFormConfig(data.perfil_inclusivo);
      })
      .catch(err => setError(err.message));
  };

  useEffect(() => {
    fetchEstudiante();
    const email = localStorage.getItem('eduvirt_email');

    // CONEXIÓN WEBSOCKET PARA TIEMPO REAL
    const ws = new WebSocket('ws://localhost:8000/api/ws/monitoreo');
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      // Buscamos los datos específicos del alumno logueado
      const miData = data.find(e => e.email === email);
      if (miData) {
        setEstudiante(miData);
        setFormConfig(miData.perfil_inclusivo);
      }
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) ws.close();
    };
  }, [navigate]);

  const handleGuardarConfig = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('eduvirt_token');
    const email = localStorage.getItem('eduvirt_email');

    try {
      const res = await fetch(`http://localhost:8000/api/estudiantes/${email}/perfil`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formConfig)
      });
      if (res.ok) {
        setShowConfig(false);
        fetchEstudiante(); 
      } else {
        alert("Error al guardar preferencias");
      }
    } catch (error) {
      console.error(error);
    }
  };

  const leerDashboardVozAlta = () => {
    if (!estudiante) return;
    const texto = `Hola ${estudiante.nombre}. Tu progreso general es del ${estudiante.progreso_general} por ciento. 
      La inteligencia artificial te sugiere: ${estudiante.sugerencias_adaptadas[0] || 'Continúa así.'}`;
    const utterance = new SpeechSynthesisUtterance(texto);
    utterance.lang = 'es-ES'; 
    window.speechSynthesis.speak(utterance);
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
  };

  if (error) return <div className="error">Error: {error}</div>
  if (!estudiante) return <div className="loading" aria-live="polite">Cargando el dashboard inclusivo...</div>

  const requiereAltoContraste = estudiante.perfil_inclusivo?.requiere_alto_contraste;
  const requiereLector = estudiante.perfil_inclusivo?.requiere_lector_pantalla;

  return (
    <div className={`dashboard-container ${requiereAltoContraste ? 'alto-contraste' : ''}`}>
      <header className="dashboard-header" role="banner">
        <h1>EduVirt</h1>
        <div className="user-profile" style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
          <p>Bienvenido/a, <strong>{estudiante.nombre}</strong></p>
          <button onClick={() => setShowConfig(true)} style={{padding: '5px 10px', borderRadius: '5px', cursor: 'pointer', background: 'white', color: 'black', border: 'none', fontWeight: 'bold'}}>
            ⚙️ Preferencias
          </button>
          <button onClick={handleLogout} style={{padding: '5px 10px', borderRadius: '5px', cursor: 'pointer', background: 'transparent', color: 'inherit', border: '1px solid currentColor'}}>Salir</button>
        </div>
      </header>

      {showConfig && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', padding: '30px', borderRadius: '10px', width: '400px', color: '#333' }}>
            <h2 style={{marginTop: 0}}>Configuración Inclusiva</h2>
            <form onSubmit={handleGuardarConfig}>
              <div style={{marginBottom: '15px'}}>
                <label style={{display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer'}}>
                  <input type="checkbox" checked={formConfig.requiere_alto_contraste} onChange={(e) => setFormConfig({...formConfig, requiere_alto_contraste: e.target.checked})} />
                  Modo Alto Contraste
                </label>
              </div>
              <div style={{marginBottom: '15px'}}>
                <label style={{display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer'}}>
                  <input type="checkbox" checked={formConfig.requiere_lector_pantalla} onChange={(e) => setFormConfig({...formConfig, requiere_lector_pantalla: e.target.checked})} />
                  Activar Lector de Pantalla
                </label>
              </div>
              <div style={{marginBottom: '20px'}}>
                <label style={{display: 'block', marginBottom: '5px', fontWeight: 'bold'}}>Estilo de Aprendizaje Principal</label>
                <select style={{width: '100%', padding: '8px'}} value={formConfig.estilo_aprendizaje} onChange={(e) => setFormConfig({...formConfig, estilo_aprendizaje: e.target.value})}>
                  <option value="visual">Visual</option>
                  <option value="auditivo">Auditivo</option>
                  <option value="kinestesico">Kinestésico</option>
                </select>
              </div>
              <div style={{display: 'flex', justifyContent: 'flex-end', gap: '10px'}}>
                <button type="button" onClick={() => setShowConfig(false)} style={{padding: '8px 15px', border: '1px solid #ccc', background: 'transparent', cursor: 'pointer', borderRadius: '5px'}}>Cancelar</button>
                <button type="submit" style={{padding: '8px 15px', border: 'none', background: '#3b82f6', color: 'white', fontWeight: 'bold', cursor: 'pointer', borderRadius: '5px'}}>Guardar Cambios</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {requiereLector && (
        <div style={{marginBottom: '20px', textAlign: 'center'}}>
          <button 
            onClick={leerDashboardVozAlta}
            aria-label="Escuchar resumen del dashboard en voz alta"
            style={{background: '#3b82f6', color: 'white', border: 'none', padding: '12px 25px', borderRadius: '8px', fontSize: '1.1rem', cursor: 'pointer', fontWeight: 'bold'}}
          >
            🔊 Escuchar Dashboard en Voz Alta
          </button>
        </div>
      )}

      <main className="dashboard-grid" role="main">
        <div className="card progress-card" aria-labelledby="progreso-titulo">
          <h2 id="progreso-titulo">Progreso General (En Vivo)</h2>
          <div className="progress-circle" aria-hidden="true">
            <ProgressChart percentage={estudiante.progreso_general} />
          </div>
          <p aria-live="polite">Módulos completados: {estudiante.modulos_completados} de {estudiante.total_modulos}</p>
        </div>

        <div className="card alert-card" aria-labelledby="alerta-titulo">
          <h2 id="alerta-titulo">Alerta Proactiva - IA Predictiva</h2>
          <p className="risk-level">Riesgo de Desvinculación: {estudiante.riesgo_desvinculacion}%</p>
          {estudiante.riesgo_desvinculacion > 50 ? (
            <p className="suggestion" style={{color: '#dc2626', fontWeight: 'bold'}}>⚠️ Riesgo Alto: Te sugerimos agendar una tutoría urgente.</p>
          ) : (
            <p className="suggestion">Sugerencia IA: Tu ritmo es constante, sigue así.</p>
          )}
        </div>

        <div className="card gamification-card" aria-labelledby="logros-titulo">
          <h2 id="logros-titulo">Logros Adaptativos 🏆</h2>
          <ul className="badges-list" aria-label="Lista de logros obtenidos">
            {estudiante.logros.map((logro, index) => (
              <li key={index} className="badge">{logro}</li>
            ))}
          </ul>
        </div>

        <div className="card suggestions-card" aria-labelledby="sugerencias-titulo">
          <h2 id="sugerencias-titulo">Sugerencias Adaptadas 💡</h2>
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