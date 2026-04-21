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

  // Estados para la nueva ventanita de "Olvidé mi contraseña"
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');

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

  // Función para abrir la ventanita de recuperación
  const handleAbrirRecuperar = (e) => {
    e.preventDefault();
    setForgotEmail(''); // Limpiamos el campo por si había algo escrito antes
    setShowForgotModal(true);
  };

  // Función que simula el envío del correo
  const handleEnviarRecuperacion = (e) => {
    e.preventDefault();
    alert("Revisa la casilla de correo y sigue las instrucciones");
    setShowForgotModal(false); // Cierra la ventanita después de darle a aceptar
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
        
        <a href="#" className="forgot-pass" onClick={handleAbrirRecuperar}>¿Olvidaste tu contraseña?</a>
      </div>

      {/* Pantallita Modal para Recuperar Contraseña */}
      {showForgotModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '15px', boxSizing: 'border-box' }}>
          <div style={{ background: '#fff', padding: '30px', borderRadius: '10px', width: '100%', maxWidth: '400px', textAlign: 'left', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            {/* Aca le agregamos el color: '#111827' para forzar que sea oscuro */}
            <h2 style={{marginTop: 0, color: '#111827', borderBottom: '2px solid #3b82f6', paddingBottom: '10px', fontSize: '1.3rem'}}>Recuperar Contraseña</h2>
            <p style={{fontSize: '0.9rem', color: '#555', marginBottom: '20px'}}>
              Ingresa tu correo electrónico y te enviaremos un enlace para restablecer el acceso a tu cuenta.
            </p>
            
            <form onSubmit={handleEnviarRecuperacion}>
              <div style={{marginBottom: '20px'}}>
                <label style={{display: 'block', color: '#333', marginBottom: '8px', fontWeight: 'bold', fontSize: '0.9rem'}}>Correo Electrónico</label>
                <input 
                  type="email" 
                  value={forgotEmail} 
                  onChange={(e) => setForgotEmail(e.target.value)} 
                  required 
                  placeholder="ejemplo@correo.com"
                  style={{width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ccc', boxSizing: 'border-box', fontSize: '0.95rem'}}
                />
              </div>
              <div style={{display: 'flex', justifyContent: 'flex-end', gap: '10px'}}>
                <button type="button" onClick={() => setShowForgotModal(false)} style={{padding: '10px 15px', borderRadius: '6px', border: 'none', background: '#e5e7eb', color: '#374151', cursor: 'pointer', fontWeight: 'bold'}}>Cancelar</button>
                <button type="submit" style={{padding: '10px 15px', borderRadius: '6px', border: 'none', background: '#3b82f6', color: 'white', cursor: 'pointer', fontWeight: 'bold'}}>Aceptar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;