// Archivo: frontend/src/components/DocenteDashboard.jsx

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './DocenteDashboard.css';

const DocenteDashboard = () => {
  const [estudiantes, setEstudiantes] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Traemos a todos los estudiantes de nuestra base de datos local
    fetch('http://localhost:8000/api/estudiantes')
      .then(res => res.json())
      .then(data => {
        setEstudiantes(data);
        setLoading(false);
      })
      .catch(err => console.error("Error cargando estudiantes:", err));
  }, []);

  const handleLogout = () => {
    navigate('/'); // Volver al login
  };

  if (loading) return <div className="loading">Cargando panel docente...</div>;

  return (
    <div className="docente-container">
      {/* Barra de Navegación Superior */}
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
          <div className="user-avatar">PC</div>
          <span>Prof. Carolina</span>
          <button className="logout-btn-small" onClick={handleLogout}>Salir</button>
        </div>
      </nav>

      {/* Módulo de Selección y Filtros */}
      <section className="filter-section card">
        <h2>Selección de Curso y Actividad</h2>
        <div className="filter-grid">
          <div className="input-group">
            <label>Curso</label>
            <select defaultValue="Introducción a Data Science">
              <option value="Introducción a Data Science">Introducción a Data Science</option>
              <option value="Desarrollo Web">Desarrollo Web</option>
            </select>
          </div>
          <div className="input-group">
            <label>Actividad</label>
            <select defaultValue="Tarea 3 - Análisis">
              <option value="Tarea 3 - Análisis">Tarea 3 - Análisis</option>
              <option value="Foro de Bienvenida">Foro de Bienvenida</option>
            </select>
          </div>
          <div className="input-group search-group">
            <label>Buscar estudiante</label>
            <input type="text" placeholder="Nombre o ID del estudiante" />
          </div>
        </div>
        <button className="export-btn">📥 Exportar</button>
      </section>

      {/* Módulo de Lista de Estudiantes */}
      <section className="table-section card">
        <h2>Lista de Estudiantes</h2>
        <div className="table-responsive">
          <table className="evaluations-table">
            <thead>
              <tr>
                <th>Estudiante</th>
                <th>Estado</th>
                <th>Progreso</th>
                <th>Calificación Est.</th>
                <th>Observaciones Inclusivas</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {estudiantes.map((est, index) => (
                <tr key={index}>
                  <td><strong>{est.nombre}</strong> <br/><small>{est.email}</small></td>
                  <td>
                    <span className={`status-badge ${est.progreso_general >= 50 ? 'completed' : 'pending'}`}>
                      {est.progreso_general >= 50 ? 'Avanzado' : 'En Riesgo'}
                    </span>
                  </td>
                  <td>{est.progreso_general}%</td>
                  <td>{est.progreso_general >= 60 ? '8.5' : 'Pendiente'}</td>
                  {/* Acá mostramos la necesidad de inclusión según la base de datos */}
                  <td className="observations">
                    {est.perfil_inclusivo.requiere_alto_contraste && "👁️ Requiere Alto Contraste. "}
                    {est.perfil_inclusivo.requiere_lector_pantalla && "🔊 Usa Lector de Pantalla. "}
                    Estilo: {est.perfil_inclusivo.estilo_aprendizaje}
                  </td>
                  <td>
                    <button className="action-btn edit">Evaluar</button>
                    <button className="action-btn view">Ver Perfil</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="table-footer">
          <span>Mostrando 1-{estudiantes.length} de {estudiantes.length} estudiantes</span>
          <button className="next-btn">Siguiente →</button>
        </div>
      </section>
    </div>
  );
};

export default DocenteDashboard;