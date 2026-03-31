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
    // Redirección silenciosa e inmediata
    if (role !== 'docente') {
      navigate('/');
      return;
    }

    fetch('http://localhost:8000/api/estudiantes', { headers: { 'Authorization': `Bearer ${localStorage.getItem('eduvirt_token')}` } })
      .then(res => res.json()).then(data => { setEstudiantes(data); setLoading(false); }).catch(err => console.error(err));
      
    const ws = new WebSocket('ws://localhost:8000/api/ws/monitoreo');
    ws.onmessage = (event) => { const data = JSON.parse(event.data); if (data && data.length > 0) setEstudiantes(data); };
    return () => { if (ws.readyState === WebSocket.OPEN) ws.close(); };
  }, [navigate, role]);

  // Si no es docente, no dibuja absolutamente nada
  if (role !== 'docente') return null;

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

  if (loading) return <div className="loading">Cargando panel docente...</div>;

  return (
    <div className="docente-container">
      <nav className="docente-nav">
        <div className="nav-logo">EV</div>
        <ul className="nav-links"><li>Estudiantes</li><li>Actividades</li><li className="active">Evaluaciones</li><li>Reportes</li></ul>
        <div className="nav-user">
          <span style={{color: '#10b981', fontSize: '0.8rem', fontWeight: 'bold', marginRight: '10px'}}>🟢 En vivo</span>
          <button style={{background: '#ef4444', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', marginRight: '15px'}} onClick={() => navigate('/monitoreo')}>🔴 Iniciar Sesión en Vivo</button>
          <span>Prof. Carolina</span>
          <button className="logout-btn-small" onClick={() => {localStorage.clear(); navigate('/');}}>Salir</button>
        </div>
      </nav>

      {/* Modal Evaluar */}
      {showEvalModal && estudianteSelect && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', padding: '30px', borderRadius: '10px', width: '500px', color: '#333' }}>
            <h2 style={{marginTop: 0, borderBottom: '2px solid #3b82f6', paddingBottom: '10px'}}>Evaluar a {estudianteSelect.nombre}</h2>
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

      {/* Modal Ficha Histórica */}
      {showPerfilModal && estudianteSelect && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', padding: '30px', borderRadius: '10px', width: '800px', color: '#333', maxHeight: '85vh', overflowY: 'auto' }}>
            <h2 style={{marginTop: 0, borderBottom: '2px solid #10b981', paddingBottom: '10px'}}>Ficha: {estudianteSelect.nombre}</h2>
            <div style={{marginBottom: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', background: '#f9fafb', padding: '15px', borderRadius: '8px'}}>
              <div><strong>Nivel/Puntos:</strong> Lvl {estudianteSelect.nivel} ({estudianteSelect.puntos} XP)</div>
              <div><strong>Progreso:</strong> {estudianteSelect.progreso_general}%</div>
              <div><strong>Asistencia:</strong> {estudianteSelect.asistencia || 100}%</div>
              <div><strong>Riesgo IA:</strong> <span style={{color: estudianteSelect.riesgo_desvinculacion > 50 ? 'red' : 'green'}}>{estudianteSelect.riesgo_desvinculacion}%</span></div>
            </div>
            <h3 style={{fontSize: '1.1rem'}}>Historial de Actividades</h3>
            <table style={{width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem'}}>
              <thead><tr style={{background: '#f3f4f6', textAlign: 'left'}}><th>Actividad</th><th>Nota</th><th>Horas</th><th>Foros</th><th>¿A tiempo?</th><th>Fecha</th></tr></thead>
              <tbody>{actividadesAlumno.map((act, idx) => (<tr key={idx}><td>{act.tipo_actividad}</td><td>{act.calificacion}</td><td>{act.tiempo_interaccion_horas}h</td><td>{act.participacion_foros !== undefined ? act.participacion_foros : '-'}</td><td>{act.entregado_a_tiempo === false ? '❌' : act.entregado_a_tiempo === true ? '✅' : '-'}</td><td>{new Date(act.fecha).toLocaleDateString()}</td></tr>))}</tbody>
            </table>
            <div style={{display: 'flex', justifyContent: 'flex-end', marginTop: '20px'}}><button onClick={() => setShowPerfilModal(false)}>Cerrar</button></div>
          </div>
        </div>
      )}

      <section className="table-section card" style={{marginTop: '20px'}}>
        <h2>Lista de Estudiantes</h2>
        <table className="evaluations-table">
          <thead><tr><th>Estudiante</th><th>Estado IA</th><th>Progreso</th><th>Nivel XP</th><th>Acciones</th></tr></thead>
          <tbody>
            {estudiantes.map((est, index) => (
              <tr key={index}>
                <td><strong>{est.nombre}</strong><br/><small>{est.email}</small></td>
                <td><span style={{backgroundColor: est.riesgo_desvinculacion >= 60 ? '#ef4444' : '#10b981', color: 'white', padding: '5px 10px', borderRadius: '15px'}}>{est.riesgo_desvinculacion >= 60 ? 'Alto Riesgo' : 'Buen Ritmo'}</span></td>
                <td>{est.progreso_general}%</td>
                <td><strong>Nivel {est.nivel}</strong><br/><small>{est.puntos} XP</small></td>
                <td><button className="action-btn edit" onClick={() => abrirModalEvaluacion(est)}>Evaluar</button> <button className="action-btn view" onClick={() => verPerfilReal(est)}>Ver Perfil</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
};

export default DocenteDashboard;