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
      .then(data => { setEstudiante(data); })
      .catch(err => setError(err.message));

    const ws = new WebSocket('ws://localhost:8000/api/ws/monitoreo');
    ws.onmessage = (event) => {
      const miData = JSON.parse(event.data).find(e => e.email === email);
      if (miData) { 
        setEstudiante(miData); 
      }
    };
    return () => { if (ws.readyState === WebSocket.OPEN) ws.close(); window.speechSynthesis.cancel(); };
  }, [navigate, role]);

  if (role !== 'estudiante') {
    return (
      <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#1f2937', color: 'white', fontFamily: 'sans-serif' }}>
        <h2>🛡️ Bloqueando acceso no autorizado...</h2>
      </div>
    );
  }

  const abrirPreferencias = () => {
    setFormConfig({
      requiere_alto_contraste: estudiante.perfil_inclusivo?.requiere_alto_contraste || false,
      requiere_lector_pantalla: estudiante.perfil_inclusivo?.requiere_lector_pantalla || false,
      estilo_aprendizaje: estudiante.perfil_inclusivo?.estilo_aprendizaje || 'visual'
    });
    setShowConfig(true);
  };

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

  const leerPantalla = () => {
    if (!estudiante) return;
    window.speechSynthesis.cancel(); 
    
    const texto = `
      EduVirt, Panel de control estudiantil. 
      Bienvenido, ${estudiante.nombre}. 
      Tu progreso general es del ${estudiante.progreso_general} por ciento, con ${estudiante.modulos_completados} de ${estudiante.total_modulos} módulos completados.
      Alerta Proactiva de Inteligencia Artificial: Tu riesgo de desvinculación es del ${estudiante.riesgo_desvinculacion} por ciento.
      Algoritmo de Estudio Sugerido: ${estudiante.sugerencias_adaptadas ? estudiante.sugerencias_adaptadas.join('. ') : 'Sin sugerencias'}.
      Centro de Gamificación: Eres nivel ${estudiante.nivel} con ${estudiante.puntos} puntos de experiencia.
      Cuentas con ${estudiante.medallas_docente.length} medallas del docente y ${estudiante.logros_sistema.length} logros automáticos.
    `;

    const locucion = new SpeechSynthesisUtterance(texto);
    locucion.lang = 'es-ES';
    locucion.rate = 0.95;
    window.speechSynthesis.speak(locucion);
  };

  if (error) return <div className="error">Error: {error}</div>
  if (!estudiante) return <div className="loading">Cargando dashboard...</div>

  const isAltoContraste = estudiante.perfil_inclusivo?.requiere_alto_contraste;

  return (
    <div className={`dashboard-container ${isAltoContraste ? 'alto-contraste' : ''}`}>
      <header className="dashboard-header">
        <h1>EduVirt</h1>
        <div className="user-profile">
          <p>Bienvenido/a, <strong>{estudiante.nombre}</strong></p>
          
          {/* Botón dinámico de Lector de Pantalla */}
          {estudiante.perfil_inclusivo?.requiere_lector_pantalla && (
            <button 
              onClick={leerPantalla} 
              style={{ background: '#8b5cf6', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', marginRight: '10px' }}
            >
              🔊 Leer Pantalla
            </button>
          )}

          <button className="btn-prefs" onClick={abrirPreferencias}>⚙️ Preferencias</button>
          <button className="btn-logout" onClick={() => { window.speechSynthesis.cancel(); localStorage.clear(); navigate('/');}}>Salir</button>
        </div>
      </header>

      {showConfig && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 style={{marginTop: 0, borderBottom: '2px solid #3b82f6', paddingBottom: '10px', color: isAltoContraste ? '#ffff00' : '#111827'}}>Configuración Inclusiva</h2>
            <form onSubmit={handleGuardarConfig}>
              <div style={{marginBottom: '15px'}}>
                <label style={{color: isAltoContraste ? '#ffffff' : '#111827', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer'}}>
                  <input type="checkbox" checked={formConfig.requiere_alto_contraste} onChange={(e) => setFormConfig({...formConfig, requiere_alto_contraste: e.target.checked})} style={{width: '18px', height: '18px'}} /> 
                  Alto Contraste
                </label>
              </div>
              <div style={{marginBottom: '15px'}}>
                <label style={{color: isAltoContraste ? '#ffffff' : '#111827', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer'}}>
                  <input type="checkbox" checked={formConfig.requiere_lector_pantalla} onChange={(e) => setFormConfig({...formConfig, requiere_lector_pantalla: e.target.checked})} style={{width: '18px', height: '18px'}} /> 
                  Habilitar Botón Lector de Pantalla
                </label>
              </div>
              <div style={{marginBottom: '20px'}}>
                <label style={{display: 'block', marginBottom: '5px', fontWeight: 'bold', color: isAltoContraste ? '#ffffff' : '#111827'}}>Estilo de Aprendizaje (Cifrado en DB)</label>
                <select style={{width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ccc', backgroundColor: isAltoContraste ? '#333' : '#fff', color: isAltoContraste ? '#fff' : '#111827', fontSize: '1rem'}} value={formConfig.estilo_aprendizaje} onChange={(e) => setFormConfig({...formConfig, estilo_aprendizaje: e.target.value})}>
                  <option value="visual">Visual</option>
                  <option value="auditivo">Auditivo</option>
                  <option value="kinestesico">Kinestésico</option>
                </select>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowConfig(false)}>Cancelar</button>
                <button type="submit" className="btn-save">Guardar Cambios</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <main className="dashboard-grid">
        <div className="card progress-card">
          <h2>Progreso General (En Vivo)</h2>
          <div className="progress-circle">
            <ProgressChart percentage={estudiante.progreso_general} isAltoContraste={isAltoContraste} />
          </div>
          <p>Módulos completados: {estudiante.modulos_completados} de {estudiante.total_modulos}</p>
        </div>

        <div className="card alert-card">
          <h2>Alerta Proactiva - IA Predictiva</h2>
          <p className="risk-level" style={{color: isAltoContraste ? '#ff5555' : '#dc2626'}}>Riesgo de Desvinculación: {estudiante.riesgo_desvinculacion}%</p>
          
          <div className="suggestion-item" style={{marginTop: '15px', width: '100%'}}>
            <h3 style={{margin: '0 0 10px 0', fontSize: '1rem', color: isAltoContraste ? '#ffff00' : '#1e293b'}}>🧠 Algoritmo de Estudio Sugerido:</h3>
            {estudiante.sugerencias_adaptadas && estudiante.sugerencias_adaptadas.map((sug, idx) => (
              <p key={idx} style={{margin: '5px 0', fontSize: '0.9rem', color: isAltoContraste ? '#ffffff' : (idx === 0 && estudiante.riesgo_desvinculacion > 50 ? '#dc2626' : '#334155'), fontWeight: idx === 0 ? 'bold' : 'normal'}}>
                {sug}
              </p>
            ))}
          </div>
        </div>

        <div className="card gamification-card-container">
          <div className="gamification-layout">
            <div className="gamification-left">
              <h2 style={{borderBottom: `2px solid ${isAltoContraste ? '#ffff00' : '#eab308'}`, paddingBottom: '10px', margin: 0}}>🎮 Centro de Gamificación</h2>
              <div style={{display: 'flex', alignItems: 'center', gap: '20px', marginTop: '20px'}}>
                <div style={{background: isAltoContraste ? '#000' : '#1f2937', padding: '15px', borderRadius: '50%', width: '80px', height: '80px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: `4px solid ${isAltoContraste ? '#ffff00' : '#eab308'}`, flexShrink: 0}}>
                  <span style={{fontSize: '0.8rem', color: isAltoContraste ? '#fff' : '#9ca3af', textTransform: 'uppercase'}}>Nivel</span>
                  <span style={{fontSize: '2rem', fontWeight: 'bold', color: isAltoContraste ? '#ffff00' : 'white', lineHeight: '1'}}>{estudiante.nivel}</span>
                </div>
                <div>
                  <h3 style={{margin: '0 0 5px 0', fontSize: '1.5rem', color: isAltoContraste ? '#ffff00' : '#eab308'}}>{estudiante.puntos} XP</h3>
                  <p style={{margin: 0, fontSize: '0.9rem'}}>Acumulá puntos completando tareas y exámenes para subir de nivel.</p>
                </div>
              </div>
            </div>
            
            <div className="gamification-right" style={{background: isAltoContraste ? '#111' : 'rgba(0,0,0,0.05)'}}>
              <h3 style={{margin: '0 0 10px 0', fontSize: '1rem'}}>🏅 Medallas (Docente)</h3>
              <ul className="badges-list">
                {estudiante.medallas_docente.length > 0 ? estudiante.medallas_docente.map((m, i) => <li key={i} className="badge" style={{background: isAltoContraste ? '#000' : '#8b5cf6', color: isAltoContraste ? '#ffff00' : 'white', border: isAltoContraste ? '1px solid #ffff00' : 'none'}}>{m}</li>) : <li style={{listStyle: 'none', fontSize: '0.9rem'}}>Aún no tienes medallas manuales.</li>}
              </ul>
              
              <h3 style={{margin: '15px 0 10px 0', fontSize: '1rem'}}>🏆 Logros (Automáticos)</h3>
              <ul className="badges-list">
                {estudiante.logros_sistema.map((l, i) => <li key={i} className="badge" style={{background: isAltoContraste ? '#000' : '#3b82f6', color: isAltoContraste ? '#ffff00' : 'white', border: isAltoContraste ? '1px solid #ffff00' : 'none'}}>{l}</li>)}
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default StudentDashboard;