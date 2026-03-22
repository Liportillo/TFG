# Archivo: backend/main.py

from fastapi import FastAPI, HTTPException, Depends, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel
from database import db
from ml import calcular_riesgo_desvinculacion
from gamificacion import evaluar_logros_y_sugerencias
import pandas as pd
import jwt
import io
import hashlib
import asyncio
from datetime import datetime, timedelta, timezone
import joblib
import os
from apscheduler.schedulers.background import BackgroundScheduler # NUEVO: Motor de CRON

app = FastAPI(
    title="API de Monitoreo EduVirt",
    description="Backend para el dashboard inclusivo del TFG",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SECRET_KEY = "eduvirt_secreto_tesis_2026"
ALGORITHM = "HS256"
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/login")

# --- INICIALIZAR EL MOTOR DE TAREAS EN SEGUNDO PLANO (CRON) ---
scheduler = BackgroundScheduler()
scheduler.start()

def tarea_reporte_automatico():
    """Esta función la ejecutará el servidor solo, sin interacción humana"""
    print("\n[CRON JOB EJECUTADO] Generando reporte consolidado automático...")
    estudiantes = _get_estudiantes_procesados()
    if estudiantes:
        df = pd.DataFrame([{"Nombre": e.get("nombre", ""), "Progreso (%)": e.get("progreso_general", 0), "Riesgo (%)": e.get("riesgo_desvinculacion", 0)} for e in estudiantes])
        
        carpeta = "reportes_automaticos"
        if not os.path.exists(carpeta):
            os.makedirs(carpeta)
            
        nombre_archivo = f"{carpeta}/reporte_cron_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        df.to_csv(nombre_archivo, index=False)
        print(f"✅ [CRON JOB] Reporte guardado con éxito en: {nombre_archivo}\n")

def verificar_token(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expirado")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token inválido")

MODELO_PATH = os.path.join(os.path.dirname(__file__), 'modelo_riesgo.pkl')
try:
    modelo_ia = joblib.load(MODELO_PATH)
    print("🧠 Modelo de IA (Scikit-Learn) cargado correctamente.")
except FileNotFoundError:
    modelo_ia = None
    print("⚠️ No se encontró 'modelo_riesgo.pkl'. Se usará una fórmula fallback.")

def calcular_riesgo_con_ia(progreso, horas, modulos):
    if modelo_ia:
        prediccion = modelo_ia.predict([[progreso, horas, modulos]])
        return round(float(prediccion[0]), 2)
    else:
        riesgo = 100 - (progreso * 0.6 + (horas / 50) * 100 * 0.4)
        return round(max(0, min(100, riesgo)), 2)

class LoginRequest(BaseModel):
    email: str
    password: str

@app.post("/api/login")
def login_for_access_token(request: LoginRequest):
    usuario_db = db.usuarios.find_one({"email": request.email})
    if not usuario_db: raise HTTPException(status_code=404, detail="Usuario no registrado")
    if usuario_db.get("bloqueado"): raise HTTPException(status_code=403, detail="CUENTA BLOQUEADA por múltiples intentos fallidos.")

    pass_hasheada = hashlib.sha256(request.password.encode()).hexdigest()
    if pass_hasheada != usuario_db.get("password_hash"):
        intentos = usuario_db.get("intentos_fallidos", 0) + 1
        if intentos >= 3:
            db.usuarios.update_one({"email": request.email}, {"$set": {"intentos_fallidos": intentos, "bloqueado": True}})
            raise HTTPException(status_code=403, detail="CUENTA BLOQUEADA tras 3 intentos fallidos.")
        else:
            db.usuarios.update_one({"email": request.email}, {"$set": {"intentos_fallidos": intentos}})
            raise HTTPException(status_code=401, detail=f"Contraseña incorrecta. Intento {intentos} de 3.")

    db.usuarios.update_one({"email": request.email}, {"$set": {"intentos_fallidos": 0}})
    payload = {"sub": request.email, "role": usuario_db["role"], "exp": datetime.now(timezone.utc) + timedelta(hours=2)}
    token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
    return {"access_token": token, "token_type": "bearer", "usuario": request.email, "rol": usuario_db["role"]}

class PerfilUpdate(BaseModel):
    requiere_alto_contraste: bool
    requiere_lector_pantalla: bool
    estilo_aprendizaje: str

@app.put("/api/estudiantes/{email}/perfil")
def actualizar_perfil(email: str, perfil: PerfilUpdate, usuario: dict = Depends(verificar_token)):
    db.estudiantes.update_one(
        {"email": email},
        {"$set": {
            "perfil_inclusivo.requiere_alto_contraste": perfil.requiere_alto_contraste,
            "perfil_inclusivo.requiere_lector_pantalla": perfil.requiere_lector_pantalla,
            "perfil_inclusivo.estilo_aprendizaje": perfil.estilo_aprendizaje
        }}
    )
    return {"mensaje": "Preferencias actualizadas."}

class ActividadMoodle(BaseModel):
    estudiante_email: str
    tipo_actividad: str
    calificacion: float
    tiempo_interaccion_horas: float

@app.post("/api/integracion/moodle")
def webhook_moodle(actividad: ActividadMoodle):
    nueva_actividad = actividad.dict()
    nueva_actividad["completado"] = True
    nueva_actividad["fecha"] = datetime.now()
    db.actividades.insert_one(nueva_actividad)

    estudiante = db.estudiantes.find_one({"email": actividad.estudiante_email})
    if estudiante:
        nuevo_progreso = min(100.0, estudiante.get("progreso_general", 0) + 10.0)
        nuevos_modulos = min(estudiante.get("total_modulos", 18), estudiante.get("modulos_completados", 0) + 1)
        db.estudiantes.update_one(
            {"email": actividad.estudiante_email},
            {"$set": {"progreso_general": nuevo_progreso, "modulos_completados": nuevos_modulos}}
        )
    return {"mensaje": "Datos capturados."}

class Evaluacion(BaseModel):
    estudiante_email: str
    actividad: str
    calificacion: float
    feedback: str
    insignia: str

@app.post("/api/evaluar")
def evaluar_estudiante(evaluacion: Evaluacion, usuario: dict = Depends(verificar_token)):
    db.actividades.insert_one({
        "estudiante_email": evaluacion.estudiante_email,
        "tipo_actividad": evaluacion.actividad,
        "calificacion": evaluacion.calificacion,
        "feedback": evaluacion.feedback,
        "tiempo_interaccion_horas": 1.0,
        "completado": True,
        "fecha": datetime.now()
    })
    
    if evaluacion.insignia:
        db.estudiantes.update_one(
            {"email": evaluacion.estudiante_email},
            {"$addToSet": {"logros_manuales": evaluacion.insignia}}
        )
    return {"mensaje": "Evaluación e insignia guardadas exitosamente."}

def _get_estudiantes_procesados():
    estudiantes = list(db.estudiantes.find({}, {"_id": 0}))
    for estudiante in estudiantes:
        email = estudiante["email"]
        actividades = list(db.actividades.find({"estudiante_email": email}, {"_id": 0}))
        total_horas = sum([act.get("tiempo_interaccion_horas", 0) for act in actividades])
        
        estudiante["riesgo_desvinculacion"] = calcular_riesgo_con_ia(estudiante.get("progreso_general", 0), total_horas, estudiante.get("modulos_completados", 0))
        logros_auto, sugerencias = evaluar_logros_y_sugerencias(estudiante.get("progreso_general", 0), estudiante.get("modulos_completados", 0), total_horas, estudiante.get("perfil_inclusivo", {}))
        
        logros_manuales = estudiante.get("logros_manuales", [])
        estudiante["logros"] = list(set(logros_auto + logros_manuales))
        estudiante["sugerencias_adaptadas"] = sugerencias
    return estudiantes

@app.get("/api/estudiantes")
def obtener_estudiantes(usuario: dict = Depends(verificar_token)): return _get_estudiantes_procesados()

@app.get("/api/estudiantes/{email}")
def obtener_estudiante(email: str, usuario: dict = Depends(verificar_token)):
    estudiantes = _get_estudiantes_procesados()
    for est in estudiantes:
        if est["email"] == email:
            return est
    raise HTTPException(status_code=404, detail="No encontrado")

@app.get("/api/actividades/{email}")
def obtener_actividades(email: str, usuario: dict = Depends(verificar_token)):
    actividades = list(db.actividades.find({"estudiante_email": email}, {"_id": 0}))
    return actividades

@app.get("/api/reportes")
def generar_reporte_agregado(usuario: dict = Depends(verificar_token)):
    df = pd.DataFrame(_get_estudiantes_procesados())
    return {
        "total_estudiantes": len(df), "promedio_progreso": round(df["progreso_general"].mean(), 2),
        "estudiantes_inclusivos": sum(1 for p in df["perfil_inclusivo"] if p.get("requiere_alto_contraste") or p.get("requiere_lector_pantalla"))
    }

@app.get("/api/exportar/estudiantes")
def exportar_estudiantes(usuario: dict = Depends(verificar_token)):
    datos = [{"Nombre": e.get("nombre", ""), "Progreso (%)": e.get("progreso_general", 0), "Riesgo Abandono (%)": e.get("riesgo_desvinculacion", 0)} for e in _get_estudiantes_procesados()]
    df = pd.DataFrame(datos)
    stream = io.StringIO()
    df.to_csv(stream, index=False)
    response = StreamingResponse(iter([stream.getvalue()]), media_type="text/csv")
    response.headers["Content-Disposition"] = "attachment; filename=reporte.csv"
    return response

# --- NUEVOS ENDPOINTS DEL ADMINISTRADOR (CRON Y EMAILS) ---
@app.post("/api/admin/programar-reporte")
def programar_reporte(usuario: dict = Depends(verificar_token)):
    if usuario.get("role") != "admin": raise HTTPException(status_code=403, detail="Acceso denegado. Solo Admin.")
    
    # Programamos la tarea para que corra cada 1 minuto (Ideal para demostración en vivo)
    scheduler.add_job(tarea_reporte_automatico, 'interval', minutes=1, id='reporte_mensual', replace_existing=True)
    return {"mensaje": "✅ Tarea CRON programada en el servidor. Generará un reporte automáticamente cada 1 minuto."}

@app.post("/api/admin/compartir-reporte")
def compartir_reporte(usuario: dict = Depends(verificar_token)):
    if usuario.get("role") != "admin": raise HTTPException(status_code=403, detail="Acceso denegado. Solo Admin.")
    
    # Acá iría la conexión real con el servidor SMTP (Gmail/Outlook)
    print("\n✉️ [SERVIDIOR DE CORREOS] Enviando reporte consolidado a todo el cuerpo docente...")
    return {"mensaje": "Reporte enviado exitosamente a los correos del cuerpo docente."}

@app.websocket("/api/ws/monitoreo")
async def websocket_monitoreo(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            datos = _get_estudiantes_procesados()
            await websocket.send_json(datos)
            await asyncio.sleep(5)
    except WebSocketDisconnect:
        print("Docente desconectado del monitoreo en vivo")