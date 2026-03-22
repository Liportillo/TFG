@echo off
echo ===================================================
echo   INICIANDO SISTEMA EDUVIRT PARA DEFENSA DE TESIS
echo ===================================================
echo.
echo Levantando Base de Datos e Inteligencia Artificial (Backend)...
start cmd /k "cd backend && .\venv\Scripts\activate && uvicorn main:app --reload"

timeout /t 3 /nobreak > NUL

echo Levantando Interfaz de Usuario (Frontend React)...
start cmd /k "cd frontend && npm run dev"

timeout /t 3 /nobreak > NUL

echo Abriendo Google Chrome...
start chrome http://localhost:5173

echo.
echo ¡El sistema esta corriendo perfectamente! Mucho exito Lisandro.
exit