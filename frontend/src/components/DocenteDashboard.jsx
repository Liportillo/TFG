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

  const fetchEstudiantes = () => {
    const token = localStorage.getItem('eduvirt_token');
    fetch('http://localhost:8000/api/estudiantes', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        setEstudiantes(data);
        setLoading(false);
      })
      .catch(err => console.error("Error cargando estudiantes:", err));
  };

  useEffect(() => {
    fetchEstudiantes();

    const ws = new WebSocket('ws://localhost:8000/api/ws/monitoreo');
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data && data.length > 0) {
        setEstudiantes(data);
      }
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) ws.close();
    };
  }, []);

  const handleExport = async () => {
    const token = localStorage.getItem('eduvirt_token');
    try {
      const response = await fetch('http://localhost:8000/api/exportar/estudiantes', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Error al exportar');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'reporte_inclusivo_eduvirt.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (error) {
      console.error(error);
      alert("Error al exportar el archivo.");
    }
  };

  const abrirModalEvaluacion = (est) => {
    setEstudianteSelect(est);
    setEvalData({ actividad: 'Tarea 3 - Análisis', calificacion: '', feedback: '', insignia: '' });
    setShowEvalModal(true);
  };

  const enviarEvaluacion = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('eduvirt_token');
    try {
      const payload = {
        estudiante_email: estudianteSelect.email,
        actividad: evalData.actividad,
        calificacion: parseFloat(evalData.calificacion),
        feedback: evalData.feedback,
        insignia: evalData.insignia
      };

      const res = await fetch('http://localhost:8000/api/evaluar', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        alert("¡Evaluación y Feedback enviados correctamente!");
        setShowEvalModal(false);
      } else {
        alert("Error al guardar la evaluación.");
      }
    } catch (error) {
      console.error(error);
    }
  };

  const verPerfilReal = async (est) => {
    setEstudianteSelect(est);
    const token = localStorage.getItem('eduvirt_token');
    
    try {
      const res = await fetch(`http://localhost:8000/api/actividades/${est.email}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      
      if (Array.isArray(data)) {
        setActividadesAlumno(data);
      } else {
        setActividadesAlumno([]);
      }
      setShowPerfilModal(true);
    } catch (error) {
      console.error("Error al obtener actividades:", error);
      setActividadesAlumno([]);
      setShowPerfilModal(true);
    }
  };

  if (loading) return <div className="loading">Cargando panel docente...</div>;

  return (
    <div className="docente-container">
      <nav className="docente-nav">
        <div className="nav-logo">EV</div>
        <ul className="nav-links">
          <li>Estudiantes</li>
          <li>Actividades</li>
          <li className="active">Evaluaciones</li>
          <li>Reportes</li>
          <li>Configuración</li>
        </ul>
        <div className="nav-user">
          <span style={{color: '#10b981', fontSize: '0.8rem', fontWeight: 'bold', marginRight: '10px'}}>🟢 Datos en vivo</span>
          <button 
            style={{background: '#ef4444', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', marginRight: '15px'}}
            onClick={() => navigate('/monitoreo')}
          >
            🔴 Iniciar Sesión en Vivo
          </button>
          <div className="user-avatar">PC</div>
          <span>Prof. Carolina</span>
          <button className="logout-btn-small" onClick={() => navigate('/')}>Salir</button>
        </div>
      </nav>

      {/* Modal de Retroalimentación */}
      {showEvalModal && estudianteSelect && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', padding: '30px', borderRadius: '10px', width: '500px', color: '#333' }}>
            <h2 style={{marginTop: 0, borderBottom: '2px solid #3b82f6', paddingBottom: '10px'}}>Evaluar a {estudianteSelect.nombre}</h2>
            
            <form onSubmit={enviarEvaluacion}>
              <div style={{marginBottom: '15px'}}>
                <label style={{display: 'block', fontWeight: 'bold', marginBottom: '5px'}}>Actividad</label>
                <input type="text" value={evalData.actividad} onChange={(e) => setEvalData({...evalData, actividad: e.target.value})} style={{width: '100%', padding: '8px', boxSizing: 'border-box'}} required />
              </div>
              
              <div style={{marginBottom: '15px'}}>
                <label style={{display: 'block', fontWeight: 'bold', marginBottom: '5px'}}>Calificación (1 a 10)</label>
                <input type="number" step="0.1" min="1" max="10" value={evalData.calificacion} onChange={(e) => setEvalData({...evalData, calificacion: e.target.value})} style={{width: '100%', padding: '8px', boxSizing: 'border-box'}} required />
              </div>
              
              <div style={{marginBottom: '15px'}}>
                <label style={{display: 'block', fontWeight: 'bold', marginBottom: '5px'}}>Feedback / Retroalimentación</label>
                <textarea rows="3" value={evalData.feedback} onChange={(e) => setEvalData({...evalData, feedback: e.target.value})} style={{width: '100%', padding: '8px', boxSizing: 'border-box'}} placeholder="Escribe un comentario constructivo..."></textarea>
              </div>

              <div style={{marginBottom: '20px'}}>
                <label style={{display: 'block', fontWeight: 'bold', marginBottom: '5px'}}>Insignia de Gamificación (Opcional)</label>
                <select value={evalData.insignia} onChange={(e) => setEvalData({...evalData, insignia: e.target.value})} style={{width: '100%', padding: '8px', boxSizing: 'border-box'}}>
                  <option value="">-- Ninguna --</option>
                  <option value="🌟 Trabajo Excelente">🌟 Trabajo Excelente</option>
                  <option value="🤝 Gran Colaborador">🤝 Gran Colaborador</option>
                  <option value="💡 Pensamiento Crítico">💡 Pensamiento Crítico</option>
                </select>
              </div>

              <div style={{display: 'flex', justifyContent: 'flex-end', gap: '10px'}}>
                <button type="button" onClick={() => setShowEvalModal(false)} style={{padding: '10px 15px', border: '1px solid #ccc', background: 'transparent', cursor: 'pointer', borderRadius: '5px'}}>Cancelar</button>
                <button type="submit" style={{padding: '10px 15px', border: 'none', background: '#3b82f6', color: 'white', fontWeight: 'bold', cursor: 'pointer', borderRadius: '5px'}}>Guardar Evaluación</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Ficha Histórica (Muestra TODO el detalle de Moodle) */}
      {showPerfilModal && estudianteSelect && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', padding: '30px', borderRadius: '10px', width: '800px', color: '#333', maxHeight: '85vh', overflowY: 'auto' }}>
            <h2 style={{marginTop: 0, borderBottom: '2px solid #10b981', paddingBottom: '10px'}}>Ficha Histórica: {estudianteSelect.nombre}</h2>
            
            <div style={{marginBottom: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', background: '#f9fafb', padding: '15px', borderRadius: '8px'}}>
              <div><strong>Email:</strong> {estudianteSelect.email}</div>
              <div><strong>Progreso:</strong> {estudianteSelect.progreso_general}%</div>
              <div><strong>Asistencia:</strong> {estudianteSelect.asistencia || 100}%</div>
              <div><strong>Riesgo IA:</strong> <span style={{color: estudianteSelect.riesgo_desvinculacion > 50 ? 'red' : 'green'}}>{estudianteSelect.riesgo_desvinculacion}%</span></div>
            </div>

            <h3 style={{fontSize: '1.1rem', marginBottom: '10px'}}>Historial Detallado de Actividades (Desde Moodle/Canvas)</h3>
            {actividadesAlumno.length === 0 ? (
              <p>No hay actividades registradas.</p>
            ) : (
              <table style={{width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem'}}>
                <thead>
                  <tr style={{background: '#f3f4f6', textAlign: 'left'}}>
                    <th style={{padding: '8px', borderBottom: '1px solid #ddd'}}>Actividad</th>
                    <th style={{padding: '8px', borderBottom: '1px solid #ddd'}}>Nota</th>
                    <th style={{padding: '8px', borderBottom: '1px solid #ddd'}}>Horas</th>
                    <th style={{padding: '8px', borderBottom: '1px solid #ddd'}}>Foros (Msj)</th>
                    <th style={{padding: '8px', borderBottom: '1px solid #ddd'}}>¿A tiempo?</th>
                    <th style={{padding: '8px', borderBottom: '1px solid #ddd'}}>Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {actividadesAlumno.map((act, idx) => (
                    <tr key={idx}>
                      <td style={{padding: '8px', borderBottom: '1px solid #eee'}}>{act.tipo_actividad}</td>
                      <td style={{padding: '8px', borderBottom: '1px solid #eee'}}>{act.calificacion || '-'}</td>
                      <td style={{padding: '8px', borderBottom: '1px solid #eee'}}>{act.tiempo_interaccion_horas}h</td>
                      <td style={{padding: '8px', borderBottom: '1px solid #eee'}}>{act.participacion_foros !== undefined ? act.participacion_foros : '-'}</td>
                      <td style={{padding: '8px', borderBottom: '1px solid #eee'}}>
                        {act.entregado_a_tiempo === false ? '❌ Retraso' : act.entregado_a_tiempo === true ? '✅ Sí' : '-'}
                      </td>
                      <td style={{padding: '8px', borderBottom: '1px solid #eee'}}>{new Date(act.fecha).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            <div style={{display: 'flex', justifyContent: 'flex-end', marginTop: '20px'}}>
              <button onClick={() => setShowPerfilModal(false)} style={{padding: '10px 20px', border: 'none', background: '#4b5563', color: 'white', fontWeight: 'bold', cursor: 'pointer', borderRadius: '5px'}}>Cerrar Ficha</button>
            </div>
          </div>
        </div>
      )}

      <section className="filter-section card">
        <h2>Selección de Curso y Actividad</h2>
        <div className="filter-grid">
          <div className="input-group">
            <label>Curso</label>
            <select defaultValue="Introducción a Data Science">
              <option value="Introducción a Data Science">Introducción a Data Science</option>
            </select>
          </div>
          <div className="input-group">
            <label>Actividad</label>
            <select defaultValue="Tarea 3 - Análisis">
              <option value="Tarea 3 - Análisis">Tarea 3 - Análisis</option>
            </select>
          </div>
          <div className="input-group search-group">
            <label>Buscar estudiante</label>
            <input type="text" placeholder="Nombre o ID del estudiante" />
          </div>
        </div>
        <button className="export-btn" onClick={handleExport}>📥 Exportar a CSV</button>
      </section>

      <section className="table-section card">
        <h2>Lista de Estudiantes</h2>
        <div className="table-responsive">
          <table className="evaluations-table">
            <thead>
              <tr>
                <th>Estudiante</th>
                <th>Estado IA</th>
                <th>Progreso y Asistencia</th>
                <th>Riesgo IA</th>
                <th>Observaciones Inclusivas</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {estudiantes.map((est, index) => (
                <tr key={index}>
                  <td><strong>{est.nombre}</strong> <br/><small>{est.email}</small></td>
                  <td>
                    <span style={{
                      backgroundColor: est.riesgo_desvinculacion >= 60 ? '#ef4444' : est.riesgo_desvinculacion >= 30 ? '#f59e0b' : '#10b981',
                      color: 'white',
                      padding: '5px 10px',
                      borderRadius: '15px',
                      fontSize: '0.85rem',
                      fontWeight: 'bold'
                    }}>
                      {est.riesgo_desvinculacion >= 60 ? 'Alto Riesgo' : est.riesgo_desvinculacion >= 30 ? 'Riesgo Moderado' : 'Buen Ritmo'}
                    </span>
                  </td>
                  <td>
                    <div style={{fontWeight: 'bold'}}>{est.progreso_general}% Progreso</div>
                    <div style={{fontSize: '0.85rem', color: '#6b7280'}}>{est.asistencia || 100}% Asistencia</div>
                  </td>
                  <td style={{ fontWeight: 'bold', color: est.riesgo_desvinculacion >= 60 ? '#ef4444' : 'inherit' }}>
                    {est.riesgo_desvinculacion}%
                  </td>
                  <td className="observations">
                    {est.perfil_inclusivo.requiere_alto_contraste && "👁️ Alto Contraste. "}
                    {est.perfil_inclusivo.requiere_lector_pantalla && "🔊 Lector Voz. "}
                    Estilo: {est.perfil_inclusivo.estilo_aprendizaje}
                  </td>
                  <td>
                    <button className="action-btn edit" onClick={() => abrirModalEvaluacion(est)}>Evaluar</button>
                    <button className="action-btn view" onClick={() => verPerfilReal(est)}>Ver Perfil</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default DocenteDashboard;