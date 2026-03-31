// Archivo: frontend/src/components/AdminDashboard.jsx

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [reporteResult, setReporteResult] = useState(null);
  const [loading, setLoading] = useState(false);
  
  const role = localStorage.getItem('eduvirt_role');

  useEffect(() => {
    // Redirección silenciosa e inmediata
    if (role !== 'admin') {
      navigate('/');
      return;
    }

    const ws = new WebSocket('ws://localhost:8000/api/ws/monitoreo');
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setReporteResult(prevReporte => {
        if (!prevReporte) return prevReporte; 
        const total = data.length;
        const sumProgreso = data.reduce((acc, curr) => acc + curr.progreso_general, 0);
        const promedio = total > 0 ? (sumProgreso / total).toFixed(2) : 0;
        const inclusivos = data.filter(e => e.perfil_inclusivo.requiere_alto_contraste || e.perfil_inclusivo.requiere_lector_pantalla).length;
        return { ...prevReporte, total_estudiantes: total, promedio_progreso: parseFloat(promedio), estudiantes_inclusivos: inclusivos, mensaje_procesamiento: "Análisis actualizado en Tiempo Real vía WebSockets." };
      });
    };
    return () => { if (ws.readyState === WebSocket.OPEN) ws.close(); };
  }, [navigate, role]);

  if (role !== 'admin') return null;

  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
  };

  const generarReporte = async () => {
    setLoading(true);
    const token = localStorage.getItem('eduvirt_token');
    try {
      // Flujo Principal 2: El sistema agrega métricas
      const resStats = await fetch('http://localhost:8000/api/reportes', { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await resStats.json();

      // Flujo Alternativo 1a: Si datos insuficientes, se indica incompleto
      if (data.total_estudiantes === 0) {
        alert("Información incompleta: No hay datos suficientes en la plataforma para generar un reporte agregado.");
        setReporteResult(null);
        setLoading(false);
        return;
      }

      // Flujo Principal 3: Se produce el reporte en formato visual
      setReporteResult(data);

      // Flujo Alternativo 3a: Exportación falla genera retry (Reintento automático)
      let retries = 3;
      let success = false;
      
      while (retries > 0 && !success) {
        try {
          const resCsv = await fetch('http://localhost:8000/api/exportar/estudiantes', { headers: { 'Authorization': `Bearer ${token}` } });
          if (!resCsv.ok) throw new Error('Fallo en la conexión del servidor');
          
          const blob = await resCsv.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `Reporte_Institucional_Eduvirt_${new Date().toISOString().split('T')[0]}.csv`;
          document.body.appendChild(a);
          a.click();
          a.remove();
          success = true; // Si llega acá, funcionó y corta el bucle
        } catch (err) {
          retries--;
          console.warn(`Intento de exportación fallido. Reintentando... Quedan ${retries} intentos.`);
          if (retries === 0) {
            alert("Error crítico: La exportación del archivo CSV ha fallado tras múltiples intentos. Revise su conexión.");
          }
        }
      }

    } catch (error) { 
      console.error("Error al generar el reporte:", error); 
    } finally { 
      setLoading(false); 
    }
  };

  const activarCompartir = async () => {
    const token = localStorage.getItem('eduvirt_token');
    try {
      const res = await fetch('http://localhost:8000/api/admin/compartir-reporte', { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      alert(data.mensaje);
    } catch (error) { console.error(error); }
  };

  const activarCron = async () => {
    const token = localStorage.getItem('eduvirt_token');
    try {
      const res = await fetch('http://localhost:8000/api/admin/programar-reporte', { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      alert(data.mensaje);
    } catch (error) { console.error(error); }
  };

  return (
    <div className="admin-container">
      <nav className="admin-nav">
        <div className="nav-logo">EV</div>
        <ul className="nav-links">
          <li>Dashboard General</li>
          <li className="active">Reportes Estadísticos</li>
          <li>Gestión de Usuarios</li>
          <li>Configuración del Sistema</li>
        </ul>
        <div className="nav-user">
          <span style={{color: '#10b981', fontSize: '0.8rem', fontWeight: 'bold', marginRight: '10px'}}>🟢 Conectado</span>
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
              </select>
            </div>
            <div className="input-group">
              <label>Periodo</label>
              <select defaultValue="Último trimestre">
                <option value="Último trimestre">Último trimestre</option>
              </select>
            </div>
          </div>

          <label className="section-label">Métricas a incluir</label>
          <div className="metrics-grid">
            <label className="checkbox-label"><input type="checkbox" defaultChecked /> Completitud de módulos</label>
            <label className="checkbox-label"><input type="checkbox" defaultChecked /> Promedio de calificaciones</label>
            <label className="checkbox-label"><input type="checkbox" /> Tiempo de Interacción</label>
            <label className="checkbox-label"><input type="checkbox" defaultChecked /> Estudiantes con necesidades inclusivas</label>
          </div>

          <button className="generate-btn" onClick={generarReporte} disabled={loading}>
            {loading ? "Procesando..." : "📊 Generar Reporte"}
          </button>

          {reporteResult && (
            <div className="report-result">
              <h3>Resultados Agregados (Procesado con Pandas)</h3>
              <p style={{fontSize: '0.8rem', color: '#666', marginTop: '-10px'}}>{reporteResult.mensaje_procesamiento}</p>
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
          </section>

          <section className="actions-section card">
            <h2>Acciones Rápidas</h2>
            <button className="action-button secondary" onClick={activarCompartir}>✉️ Compartir con docentes</button>
            <button className="action-button primary" onClick={activarCron}>⚙️ Programar reporte recurrente</button>
          </section>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;