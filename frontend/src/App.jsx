// Archivo: frontend/src/App.jsx

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './components/Login';
import StudentDashboard from './components/StudentDashboard';
import DocenteDashboard from './components/DocenteDashboard';
import AdminDashboard from './components/AdminDashboard';
import MonitoreoDashboard from './components/MonitoreoDashboard'; // <-- Importamos el Prototipo 4

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/estudiante" element={<StudentDashboard />} />
        <Route path="/docente" element={<DocenteDashboard />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/monitoreo" element={<MonitoreoDashboard />} /> {/* <-- Nueva Ruta en Vivo */}
      </Routes>
    </Router>
  );
}

export default App;