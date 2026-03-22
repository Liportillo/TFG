// Archivo: frontend/src/components/Login.jsx

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Login.css';

const Login = () => {
  const [email, setEmail] = useState(''); 
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:8000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email, password: password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Error de autenticación');
      }

      localStorage.setItem('eduvirt_token', data.access_token);
      localStorage.setItem('eduvirt_role', data.rol);
      localStorage.setItem('eduvirt_email', data.usuario); 

      if (data.rol === 'estudiante') navigate('/estudiante');
      else if (data.rol === 'docente') navigate('/docente');
      else if (data.rol === 'admin') navigate('/admin');

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRecuperarPass = (e) => {
    e.preventDefault();
    if (!email) {
      alert("Por favor, ingresa tu email arriba y luego presiona este enlace.");
    } else {
      alert(`Simulación: Se ha enviado un enlace de recuperación de contraseña al correo externo ${email}.`);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-container-box">
        <div className="login-logo">EV</div>
        <h2>Iniciar Sesión</h2>
        <p className="login-subtitle">Accede a tu cuenta segura de EduVirt</p>
        
        {error && <div style={{ color: 'white', background: '#dc2626', padding: '10px', borderRadius: '5px', marginBottom: '15px', fontSize: '0.9rem', fontWeight: 'bold' }}>{error}</div>}

        <form onSubmit={handleLogin}>
          <div className="input-group">
            <label>Usuario o Email</label>
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
              placeholder="Ej: ana.torres@eduvirt.com"
            />
          </div>
          
          <div className="input-group">
            <label>Contraseña</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required
              placeholder="Ingresa tu contraseña"
            />
          </div>
          
          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? "Verificando Seguridad..." : "Iniciar Sesión"}
          </button>
        </form>
        
        <a href="#" className="forgot-pass" onClick={handleRecuperarPass}>¿Olvidaste tu contraseña?</a>
      </div>
    </div>
  );
};

export default Login;