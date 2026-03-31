// Archivo: frontend/src/components/DocenteDashboard.jsx

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './DocenteDashboard.css';

const DocenteDashboard = () => {
  const [estudiantes, setEstudiantes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEvalModal, setShowEvalModal] = useState(false);
  const [estudianteSelect, setEstudianteSelect] = useState(null);
  const [evalData, setEvalData] = useState({ actividad: 'Tarea 3 - Análisis', calificacion: '', feedback: '', insignia: '' });
  const [showPerfilModal, setShowPerfilModal] = useState(false);
  const [actividadesAlumno, setActividadesAlumno] = useState([]);
  const navigate = useNavigate();

  const role = localStorage.getItem('eduvirt_role');

  useEffect(() => {
    if (role !== 'docente' && role !== 'admin') {
      const timer = setTimeout(() => {
        alert("⛔ Error 403 - Acceso Denegado: No tienes permisos para acceder a esta área.");
        navigate('/');
      }, 300);
      return () => clearTimeout(timer);
    }

    fetch('http://localhost:8000/api/estudiantes', { headers: { 'Authorization': `Bearer ${localStorage.getItem('eduvirt_token')}` } })
      .then(res => res.json()).then(data => { setEstudiantes(data); setLoading(false); }).catch(err => console.error(err));
      
    const ws = new WebSocket('ws://localhost:8000/api/ws/monitoreo');
    ws.onmessage = (event) => { const data = JSON.parse(event.data); if (data && data.length > 0) setEstudiantes(data); };
    return () => { if (ws.readyState === WebSocket.OPEN) ws.close(); };
  }, [navigate, role]);

  if (role !== 'docente' && role !== 'admin') return null;

  const abrirModalEvaluacion = (est) => { setEstudianteSelect(est); setEvalData({ actividad: 'Tarea 3 - Análisis', calificacion: '', feedback: '', insignia: '' }); setShowEvalModal(true); };

  const enviarEvaluacion = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:8000/api/evaluar', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('eduvirt_token')}` },
        body: JSON.stringify({ estudiante_email: estudianteSelect.email, ...evalData })
      });
      if (res.ok) { alert("¡Evaluación, XP y Medalla guardadas exitosamente!"); setShowEvalModal(false); }
    } catch (error) { console.error(error); }
  };

  const verPerfilReal = async (est) => {
    setEstudianteSelect(est);
    try {
      const res = await fetch(`http://localhost:8000/api/actividades/${est.email}`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('eduvirt_token')}` } });
      const data = await res.json();
      setActividadesAlumno(Array.isArray(data) ? data : []);
      setShowPerfilModal(true);
    } catch (error) { console.error(error); setActividadesAlumno([]); setShowPerfilModal(true); }
  };

  if (loading) return <div className="loading">Cargando planilla...</div>;

  return (
    <div className="docente-container">
      <nav className="docente-nav">
        <div className="nav-logo">EV</div>
        <ul className="nav-links">
          <li>Estudiantes</li>
          <li>Actividades</li>
          <li className="active">Planilla de Seguimiento</li>
          {role === 'admin' && <li onClick={() => navigate('/admin')} style={{color: '#8b5cf6', cursor: 'pointer', fontWeight: 'bold'}}>⬅ Volver a Reportes</li>}
        </ul>
        <div className="nav-user">
          <span style={{color: '#10b981', fontSize: '0.8rem', fontWeight: 'bold', marginRight: '10px'}}>🟢 En vivo</span>
          {role === 'docente' && <button style={{background: '#ef4444', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', marginRight: '15px'}} onClick={() => navigate('/monitoreo')}>🔴 Iniciar Sesión en Vivo</button>}
          
          <div className="user-avatar" style={{background: role === 'admin' ? '#f59e0b' : '#10b981'}}>{role === 'admin' ? 'AD' : 'PC'}</div>
          <span>{role === 'admin' ? 'Admin Principal' : 'Prof. Carolina'}</span>
          
          <button className="logout-btn-small" onClick={() => {localStorage.clear(); navigate('/');}}>Salir</button>
        </div>
      </nav>

      {/* Modal Evaluar */}
      {showEvalModal && estudianteSelect && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', padding: '30px', borderRadius: '10px', width: '500px', color: '#333' }}>
            <h2 style={{marginTop: 0, color: '#111827', borderBottom: '2px solid #3b82f6', paddingBottom: '10px'}}>Evaluar a {estudianteSelect.nombre}</h2>
            <form onSubmit={enviarEvaluacion}>
              <div style={{marginBottom: '15px'}}><label>Actividad</label><input type="text" value={evalData.actividad} onChange={(e) => setEvalData({...evalData, actividad: e.target.value})} style={{width: '100%', padding: '8px'}} required /></div>
              <div style={{marginBottom: '15px'}}><label>Calificación (1 a 10)</label><input type="number" step="0.1" min="1" max="10" value={evalData.calificacion} onChange={(e) => setEvalData({...evalData, calificacion: e.target.value})} style={{width: '100%', padding: '8px'}} required /></div>
              <div style={{marginBottom: '15px'}}><label>Feedback (Otorga 50 XP al alumno)</label><textarea rows="3" value={evalData.feedback} onChange={(e) => setEvalData({...evalData, feedback: e.target.value})} style={{width: '100%', padding: '8px'}}></textarea></div>
              <div style={{marginBottom: '20px'}}>
                <label>Medalla de Gamificación (Opcional)</label>
                <select value={evalData.insignia} onChange={(e) => setEvalData({...evalData, insignia: e.target.value})} style={{width: '100%', padding: '8px'}}>
                  <option value="">-- Ninguna --</option>
                  <option value="🌟 Trabajo Excelente">🌟 Trabajo Excelente</option>
                  <option value="🤝 Gran Colaborador">🤝 Gran Colaborador</option>
                  <option value="💡 Pensamiento Crítico">💡 Pensamiento Crítico</option>
                  <option value="🚀 Participación Destacada">🚀 Participación Destacada</option>
                </select>
              </div>
              <div style={{display: 'flex', justifyContent: 'flex-end', gap: '10px'}}><button type="button" onClick={() => setShowEvalModal(false)}>Cancelar</button><button type="submit" style={{background: '#3b82f6', color: 'white'}}>Guardar Evaluación</button></div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Legajo Académico */}
      {showPerfilModal && estudianteSelect && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', padding: '30px', borderRadius: '10px', width: '800px', color: '#333', maxHeight: '85vh', overflowY: 'auto' }}>
            <h2 style={{marginTop: 0, color: '#111827', borderBottom: '2px solid #10b981', paddingBottom: '10px'}}>Legajo Académico: {estudianteSelect.nombre}</h2>
            
            <div style={{marginBottom: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', background: '#f9fafb', padding: '15px', borderRadius: '8px', color: '#1f2937'}}>
              <div><strong>Email:</strong> {estudianteSelect.email}</div>
              <div><strong>Estilo de Aprendizaje:</strong> {estudianteSelect.perfil_inclusivo?.estilo_aprendizaje?.toUpperCase()}</div>
              <div><strong>Herramientas Inclusivas:</strong> {estudianteSelect.perfil_inclusivo?.requiere_alto_contraste ? '👁️ Alto Contraste ' : ''} {estudianteSelect.perfil_inclusivo?.requiere_lector_pantalla ? '🔊 Lector de Pantalla' : ''} {(!estudianteSelect.perfil_inclusivo?.requiere_alto_contraste && !estudianteSelect.perfil_inclusivo?.requiere_lector_pantalla) ? 'Ninguna' : ''}</div>
              <div><strong>Nivel/Puntos:</strong> Lvl {estudianteSelect.nivel} ({estudianteSelect.puntos} XP)</div>
              <div><strong>Progreso:</strong> {estudianteSelect.progreso_general}%</div>
              <div><strong>Asistencia:</strong> {estudianteSelect.asistencia || 100}%</div>
              <div><strong>Riesgo IA:</strong> <span style={{color: estudianteSelect.riesgo_desvinculacion > 50 ? 'red' : 'green', fontWeight: 'bold'}}>{estudianteSelect.riesgo_desvinculacion}%</span></div>
            </div>

            <h3 style={{fontSize: '1.1rem', color: '#111827'}}>Historial de Actividades</h3>
            <table style={{width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem'}}>
              <thead><tr style={{background: '#f3f4f6', textAlign: 'left', color: '#374151'}}><th>Actividad</th><th>Nota</th><th>Horas</th><th>Foros</th><th>¿A tiempo?</th><th>Fecha</th></tr></thead>
              <tbody>{actividadesAlumno.map((act, idx) => (<tr key={idx} style={{color: '#4b5563'}}><td>{act.tipo_actividad}</td><td>{act.calificacion}</td><td>{act.tiempo_interaccion_horas}h</td><td>{act.participacion_foros !== undefined ? act.participacion_foros : '-'}</td><td>{act.entregado_a_tiempo === false ? '❌' : act.entregado_a_tiempo === true ? '✅' : '-'}</td><td>{new Date(act.fecha).toLocaleDateString()}</td></tr>))}</tbody>
            </table>
            <div style={{display: 'flex', justifyContent: 'flex-end', marginTop: '20px'}}><button onClick={() => setShowPerfilModal(false)} style={{padding: '8px 16px', background: '#6b7280', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer'}}>Cerrar Legajo</button></div>
          </div>
        </div>
      )}

      <section className="table-section card" style={{marginTop: '20px'}}>
        <h2>Planilla de Seguimiento Docente</h2>
        <table className="evaluations-table">
          <thead>
            <tr>
              <th>Estudiante</th>
              <th>Asistencia</th>
              <th>Progreso</th>
              <th>Riesgo IA</th>
              <th>Perfil Inclusivo</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {estudiantes.map((est, index) => (
              <tr key={index}>
                <td><strong>{est.nombre}</strong><br/><small>{est.email}</small></td>
                <td>{est.asistencia || 100}%</td>
                <td>{est.progreso_general}%</td>
                <td>
                  {/* Flujo Alternativo 3a: Aviso de error en el modelo predictivo */}
                  {est.alerta_error_ia && <div style={{color: '#d97706', fontSize: '0.75rem', marginBottom: '4px'}}>⚠️ Fallo IA. Calculado con Fallback.</div>}
                  <span style={{backgroundColor: est.riesgo_desvinculacion >= 60 ? '#ef4444' : est.riesgo_desvinculacion >= 30 ? '#f59e0b' : '#10b981', color: 'white', padding: '5px 10px', borderRadius: '15px', fontWeight: 'bold', fontSize: '0.85rem'}}>
                    {est.riesgo_desvinculacion}% ({est.riesgo_desvinculacion >= 60 ? 'Alto' : 'Bajo'})
                  </span>
                </td>
                <td>
                  <small style={{color: '#4b5563'}}>
                    <strong>Estilo:</strong> {est.perfil_inclusivo?.estilo_aprendizaje}<br/>
                    {est.perfil_inclusivo?.requiere_alto_contraste && "👁️ Alto Contraste " }
                    {est.perfil_inclusivo?.requiere_lector_pantalla && "🔊 Lector Voz" }
                  </small>
                </td>
                <td>
                  {role === 'docente' && (
                    <button className="action-btn edit" onClick={() => abrirModalEvaluacion(est)}>Evaluar</button> 
                  )}
                  <button className="action-btn view" onClick={() => verPerfilReal(est)}>Ver Legajo</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
};

export default DocenteDashboard;