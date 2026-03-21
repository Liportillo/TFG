// Archivo: frontend/src/components/Login.jsx

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Login.css';

const Login = () => {
  const [email, setEmail] = useState('ana.torres@eduvirt.com');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('estudiante');
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    // Lógica RBAC: Redirección según el rol seleccionado
    if (role === 'estudiante') {
      navigate('/estudiante');
    } else if (role === 'docente') {
      navigate('/docente'); // Aún no existe, la haremos en el próximo paso
    } else {
      alert('Rol Administrador en construcción');
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-container-box">
        <div className="login-logo">EV</div>
        <h2>Iniciar Sesión</h2>
        <p className="login-subtitle">Accede a tu cuenta de EduVirt</p>
        
        <form onSubmit={handleLogin}>
          <div className="input-group">
            <label>Usuario o Email</label>
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
            />
          </div>
          
          <div className="input-group">
            <label>Contraseña</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              placeholder="Ingresa tu contraseña"
            />
          </div>
          
          <div className="input-group">
            <label>Tipo de Usuario</label>
            <select value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="estudiante">Estudiante</option>
              <option value="docente">Docente</option>
              <option value="admin">Administrador</option>
            </select>
          </div>
          
          <button type="submit" className="login-btn">Iniciar Sesión</button>
        </form>
        
        <a href="#" className="forgot-pass">¿Olvidaste tu contraseña?</a>
      </div>
    </div>
  );
};

export default Login;