// Archivo: frontend/src/components/AdminDashboard.jsx

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [reporteResult, setReporteResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleLogout = () => navigate('/');

  const generarReporte = async () => {
    setLoading(true);
    const token = localStorage.getItem('eduvirt_token');
    try {
      const res = await fetch('http://localhost:8000/api/reportes', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setReporteResult(data);
    } catch (error) {
      console.error("Error al generar el reporte:", error);
    } finally {
      setLoading(false);
    }
  };

  // NUEVO: Funciones conectadas al Backend Real
  const activarCompartir = async () => {
    const token = localStorage.getItem('eduvirt_token');
    try {
      const res = await fetch('http://localhost:8000/api/admin/compartir-reporte', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      alert(data.mensaje);
    } catch (error) {
      console.error(error);
    }
  };

  const activarCron = async () => {
    const token = localStorage.getItem('eduvirt_token');
    try {
      const res = await fetch('http://localhost:8000/api/admin/programar-reporte', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      alert(data.mensaje);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="admin-container">
      <nav className="admin-nav">
        <div className="nav-logo">EV</div>
        <ul className="nav-links">
          <li>Dashboard General</li>
          <li className="active">Reportes</li>
          <li>Gestión de Usuarios</li>
          <li>Configuración del Sistema</li>
        </ul>
        <div className="nav-user">
          <div className="user-avatar admin-avatar">AD</div>
          <span>Admin Principal</span>
          <button className="logout-btn-small" onClick={handleLogout}>Salir</button>
        </div>
      </nav>

      <div className="admin-grid">
        <section className="config-section card">
          <h2>Configuración de Reporte</h2>
          <div className="form-row">
            <div className="input-group">
              <label>Cursos a incluir</label>
              <select className="multi-select" size="5" defaultValue={["Introducción a Data Science"]}>
                <option value="Introducción a Data Science">Introducción a Data Science</option>
                <option value="Python Avanzado">Python Avanzado</option>
                <option value="Machine Learning">Machine Learning</option>
                <option value="Desarrollo Web">Desarrollo Web</option>
                <option value="Bases de Datos">Bases de Datos</option>
              </select>
            </div>
            <div className="input-group">
              <label>Periodo</label>
              <select defaultValue="Último trimestre">
                <option value="Último trimestre">Último trimestre</option>
                <option value="Último mes">Último mes</option>
                <option value="Semestre actual">Semestre actual</option>
              </select>
            </div>
          </div>

          <label className="section-label">Métricas a incluir</label>
          <div className="metrics-grid">
            <label className="checkbox-label"><input type="checkbox" defaultChecked /> Completitud de módulos</label>
            <label className="checkbox-label"><input type="checkbox" defaultChecked /> Promedio de calificaciones</label>
            <label className="checkbox-label"><input type="checkbox" /> Tiempo de Interacción</label>
            <label className="checkbox-label"><input type="checkbox" /> Participación en foros</label>
            <label className="checkbox-label"><input type="checkbox" defaultChecked /> Estudiantes con necesidades inclusivas</label>
          </div>

          <div className="input-group">
            <label>Tipo de agregación</label>
            <select defaultValue="Por curso">
              <option value="Por curso">Por curso</option>
              <option value="Por estudiante">Por estudiante</option>
            </select>
          </div>

          <button className="generate-btn" onClick={generarReporte} disabled={loading}>
            {loading ? "Procesando..." : "📊 Generar Reporte"}
          </button>

          {reporteResult && (
            <div className="report-result">
              <h3>Resultados Agregados (Procesado con Pandas)</h3>
              <div className="result-stats">
                <div className="stat-box">
                  <span className="stat-value">{reporteResult.total_estudiantes}</span>
                  <span className="stat-label">Alumnos Evaluados</span>
                </div>
                <div className="stat-box">
                  <span className="stat-value">{reporteResult.promedio_progreso}%</span>
                  <span className="stat-label">Progreso Promedio</span>
                </div>
                <div className="stat-box">
                  <span className="stat-value">{reporteResult.estudiantes_inclusivos}</span>
                  <span className="stat-label">Requieren Accesibilidad</span>
                </div>
              </div>
            </div>
          )}
        </section>

        <div className="side-panels">
          <section className="history-section card">
            <h2>Historial de Reportes</h2>
            <div className="history-item">
              <span className="date">2 de octubre 2025</span>
              <p>Reporte Trimestral Q3</p>
            </div>
            <div className="history-item">
              <span className="date">15 de septiembre 2025</span>
              <p>Reporte Mensual - Sep</p>
            </div>
          </section>

          <section className="actions-section card">
            <h2>Acciones Rápidas</h2>
            {/* Botones ahora conectados a la API */}
            <button className="action-button secondary" onClick={activarCompartir}>✉️ Compartir con docentes</button>
            <button className="action-button primary" onClick={activarCron}>⚙️ Programar reporte recurrente</button>
          </section>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;