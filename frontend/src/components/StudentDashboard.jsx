// Archivo: frontend/src/components/StudentDashboard.jsx

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom';
import ProgressChart from './ProgressChart'
import '../App.css'

const StudentDashboard = () => {
  const [estudiante, setEstudiante] = useState(null)
  const [error, setError] = useState(null)
  const [showConfig, setShowConfig] = useState(false);
  const [formConfig, setFormConfig] = useState({ requiere_alto_contraste: false, requiere_lector_pantalla: false, estilo_aprendizaje: 'visual' });
  const navigate = useNavigate();
  
  const role = localStorage.getItem('eduvirt_role');

  useEffect(() => {
    if (role !== 'estudiante') {
      const timer = setTimeout(() => {
        alert("⛔ Error 403 - Acceso Denegado: No tienes permisos para acceder a esta área.");
        navigate('/');
      }, 300); 
      return () => clearTimeout(timer);
    }

    const token = localStorage.getItem('eduvirt_token');
    const email = localStorage.getItem('eduvirt_email');
    if (!email) return navigate('/');

    fetch(`http://localhost:8000/api/estudiantes/${email}`, { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => { if (!res.ok) throw new Error('Error API'); return res.json() })
      .then(data => { setEstudiante(data); setFormConfig(data.perfil_inclusivo); })
      .catch(err => setError(err.message));

    const ws = new WebSocket('ws://localhost:8000/api/ws/monitoreo');
    ws.onmessage = (event) => {
      const miData = JSON.parse(event.data).find(e => e.email === email);
      if (miData) { setEstudiante(miData); setFormConfig(miData.perfil_inclusivo); }
    };
    return () => { if (ws.readyState === WebSocket.OPEN) ws.close(); };
  }, [navigate, role]);

  if (role !== 'estudiante') {
    return (
      <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#1f2937', color: 'white', fontFamily: 'sans-serif' }}>
        <h2>🛡️ Bloqueando acceso no autorizado...</h2>
      </div>
    );
  }

  const handleGuardarConfig = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`http://localhost:8000/api/estudiantes/${localStorage.getItem('eduvirt_email')}/perfil`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('eduvirt_token')}` },
        body: JSON.stringify(formConfig)
      });
      if (res.ok) { 
        setShowConfig(false); 
        fetch(`http://localhost:8000/api/estudiantes/${localStorage.getItem('eduvirt_email')}`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('eduvirt_token')}` } })
          .then(r => r.json()).then(d => setEstudiante(d));
      }
    } catch (err) { console.error(err); }
  };

  if (error) return <div className="error">Error: {error}</div>
  if (!estudiante) return <div className="loading">Cargando dashboard...</div>

  return (
    <div className={`dashboard-container ${estudiante.perfil_inclusivo?.requiere_alto_contraste ? 'alto-contraste' : ''}`}>
      <header className="dashboard-header">
        <h1>EduVirt</h1>
        <div className="user-profile" style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
          <p>Bienvenido/a, <strong>{estudiante.nombre}</strong></p>
          <button onClick={() => setShowConfig(true)} style={{padding: '5px 10px', borderRadius: '5px', background: 'white', color: 'black', border: 'none'}}>⚙️ Preferencias</button>
          <button onClick={() => {localStorage.clear(); navigate('/');}} style={{padding: '5px 10px', borderRadius: '5px', background: 'transparent', color: 'inherit', border: '1px solid currentColor'}}>Salir</button>
        </div>
      </header>

      {showConfig && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', padding: '30px', borderRadius: '10px', width: '400px', color: '#333' }}>
            <h2 style={{marginTop: 0}}>Configuración Inclusiva</h2>
            <form onSubmit={handleGuardarConfig}>
              <div style={{marginBottom: '15px'}}><label><input type="checkbox" checked={formConfig.requiere_alto_contraste} onChange={(e) => setFormConfig({...formConfig, requiere_alto_contraste: e.target.checked})} /> Alto Contraste</label></div>
              <div style={{marginBottom: '15px'}}><label><input type="checkbox" checked={formConfig.requiere_lector_pantalla} onChange={(e) => setFormConfig({...formConfig, requiere_lector_pantalla: e.target.checked})} /> Lector Pantalla</label></div>
              <div style={{marginBottom: '20px'}}><label>Estilo de Aprendizaje</label><select style={{width: '100%', padding: '8px'}} value={formConfig.estilo_aprendizaje} onChange={(e) => setFormConfig({...formConfig, estilo_aprendizaje: e.target.value})}><option value="visual">Visual</option><option value="auditivo">Auditivo</option><option value="kinestesico">Kinestésico</option></select></div>
              <div style={{display: 'flex', justifyContent: 'flex-end', gap: '10px'}}><button type="button" onClick={() => setShowConfig(false)}>Cancelar</button><button type="submit" style={{background: '#3b82f6', color: 'white'}}>Guardar</button></div>
            </form>
          </div>
        </div>
      )}

      <main className="dashboard-grid">
        <div className="card progress-card">
          <h2>Progreso General (En Vivo)</h2>
          <div className="progress-circle"><ProgressChart percentage={estudiante.progreso_general} /></div>
          <p>Módulos completados: {estudiante.modulos_completados} de {estudiante.total_modulos}</p>
        </div>

        {/* --- TARJETA DE ALERTA ACTUALIZADA (CU02) --- */}
        <div className="card alert-card">
          <h2>Alerta Proactiva - IA Predictiva</h2>
          <p className="risk-level">Riesgo de Desvinculación: {estudiante.riesgo_desvinculacion}%</p>
          
          <div style={{marginTop: '15px', padding: '15px', background: '#f8fafc', borderRadius: '8px', borderLeft: '4px solid #3b82f6', textAlign: 'left'}}>
            <h3 style={{margin: '0 0 10px 0', fontSize: '1rem', color: '#1e293b'}}>🧠 Algoritmo de Estudio Sugerido:</h3>
            {estudiante.sugerencias_adaptadas && estudiante.sugerencias_adaptadas.map((sug, idx) => (
              <p key={idx} style={{margin: '5px 0', fontSize: '0.9rem', color: idx === 0 && estudiante.riesgo_desvinculacion > 50 ? '#dc2626' : '#334155', fontWeight: idx === 0 ? 'bold' : 'normal'}}>
                {sug}
              </p>
            ))}
          </div>
        </div>

        <div className="card gamification-card" style={{gridColumn: '1 / -1', display: 'flex', gap: '20px', alignItems: 'flex-start'}}>
          <div style={{flex: '1'}}>
            <h2 style={{borderBottom: '2px solid #eab308', paddingBottom: '10px'}}>🎮 Centro de Gamificación</h2>
            <div style={{display: 'flex', alignItems: 'center', gap: '20px', marginTop: '15px'}}>
              <div style={{background: '#1f2937', padding: '15px', borderRadius: '50%', width: '80px', height: '80px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '4px solid #eab308'}}>
                <span style={{fontSize: '0.8rem', color: '#9ca3af', textTransform: 'uppercase'}}>Nivel</span>
                <span style={{fontSize: '2rem', fontWeight: 'bold', color: 'white', lineHeight: '1'}}>{estudiante.nivel}</span>
              </div>
              <div>
                <h3 style={{margin: '0 0 5px 0', fontSize: '1.5rem', color: '#eab308'}}>{estudiante.puntos} XP</h3>
                <p style={{margin: 0, fontSize: '0.9rem'}}>Acumulá puntos completando tareas y exámenes para subir de nivel.</p>
              </div>
            </div>
          </div>
          
          <div style={{flex: '1', background: 'rgba(0,0,0,0.1)', padding: '15px', borderRadius: '10px'}}>
            <h3 style={{margin: '0 0 10px 0', fontSize: '1rem'}}>🏅 Medallas (Docente)</h3>
            <ul className="badges-list">
              {estudiante.medallas_docente.length > 0 ? estudiante.medallas_docente.map((m, i) => <li key={i} className="badge" style={{background: '#8b5cf6'}}>{m}</li>) : <li style={{listStyle: 'none', fontSize: '0.9rem'}}>Aún no tienes medallas manuales.</li>}
            </ul>
            
            <h3 style={{margin: '15px 0 10px 0', fontSize: '1rem'}}>🏆 Logros (Automáticos)</h3>
            <ul className="badges-list">
              {estudiante.logros_sistema.map((l, i) => <li key={i} className="badge" style={{background: '#3b82f6'}}>{l}</li>)}
            </ul>
          </div>
        </div>
      </main>
    </div>
  )
}

export default StudentDashboard;