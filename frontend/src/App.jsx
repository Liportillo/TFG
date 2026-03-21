// Archivo: frontend/src/App.jsx

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './components/Login';
import StudentDashboard from './components/StudentDashboard';
import DocenteDashboard from './components/DocenteDashboard';

function App() {
  return (
    <Router>
      <Routes>
        {/* Ruta principal: Pantalla de Login (Prototipo 1) */}
        <Route path="/" element={<Login />} />
        
        {/* Ruta del estudiante: Dashboard Inclusivo (Prototipo 2) */}
        <Route path="/estudiante" element={<StudentDashboard />} />
        
        {/* Ruta del docente: Panel de Evaluación (Prototipo 3) */}
        <Route path="/docente" element={<DocenteDashboard />} />
      </Routes>
    </Router>
  );
}

export default App;