# Archivo: backend/main.py

from fastapi import FastAPI, HTTPException, Depends, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel
from typing import List, Optional
from database import db
from ml import calcular_riesgo_desvinculacion
from gamificacion import evaluar_logros_y_sugerencias
import pandas as pd
import jwt
import io
import hashlib
import asyncio
import logging
from datetime import datetime, timedelta, timezone
import joblib
import os
from apscheduler.schedulers.background import BackgroundScheduler

# --- CONFIGURACIÓN DE LOGS PARA SOPORTE IT ---
logging.basicConfig(
    filename='eduvirt_system.log',
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)

app = FastAPI(title="API de Monitoreo EduVirt", version="1.0.0")

app.add_middleware(
    CORSMiddleware, allow_origins=["http://localhost:5173"], allow_credentials=True,
    allow_methods=["*"], allow_headers=["*"],
)

SECRET_KEY = "eduvirt_secreto_tesis_2026"
ALGORITHM = "HS256"
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/login")

# =====================================================================
# MODELOS DEL DOMINIO (Mapeo estricto del Diagrama de Clases UML del PDF)
# =====================================================================

class UsuarioBase(BaseModel):
    nombreUsuario: str
    correo: str
    rol: str

class Modulo(BaseModel):
    idModulo: int
    nombreModulo: str
    orden: int
    tipoContenido: str
    completado: bool = False

class Curso(BaseModel):
    idCurso: int
    nombreCurso: str
    descripcion: str
    creditos: int
    modulos: List[Modulo] = []

class Registro(BaseModel):
    idRegistro: int
    accion: str
    marcaTiempo: datetime
    detalles: str

class PerfilUpdate(BaseModel): 
    requiere_alto_contraste: bool 
    requiere_lector_pantalla: bool 
    estilo_aprendizaje: str

class ActividadMoodle(BaseModel):
    estudiante_email: str
    tipo_actividad: str
    calificacion: float
    tiempo_interaccion_horas: float
    tasa_asistencia: Optional[float] = None
    participacion_foros: int = 0
    entregado_a_tiempo: bool = True

class Evaluacion(BaseModel):
    estudiante_email: str
    actividad: str
    calificacion: float
    feedback: str
    insignia: str

class LoginRequest(BaseModel): 
    email: str
    password: str

# =====================================================================
# LÓGICA DE NEGOCIO Y ENDPOINTS
# =====================================================================

scheduler = BackgroundScheduler()
scheduler.start()

def tarea_reporte_automatico():
    logging.info("CRON: Ejecutando generación automática de reportes.")
    estudiantes = _get_estudiantes_procesados()
    if estudiantes:
        df = pd.DataFrame([{"Nombre": e.get("nombre", ""), "Progreso (%)": e.get("progreso_general", 0), "Riesgo (%)": e.get("riesgo_desvinculacion", 0)} for e in estudiantes])
        if not os.path.exists("reportes_automaticos"): os.makedirs("reportes_automaticos")
        df.to_csv(f"reportes_automaticos/reporte_cron_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv", index=False)

def verificar_token(token: str = Depends(oauth2_scheme)):
    try: return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except: raise HTTPException(status_code=401, detail="Token inválido o expirado")

MODELO_PATH = os.path.join(os.path.dirname(__file__), 'modelo_riesgo.pkl')
try: 
    modelo_ia = joblib.load(MODELO_PATH)
    logging.info("Sistema IA: Modelo Predictivo cargado correctamente en memoria.")
except Exception as e: 
    modelo_ia = None
    logging.critical(f"Sistema IA: Error crítico al cargar el modelo .pkl - {e}")

def calcular_riesgo_con_ia(progreso, horas, modulos):
    if modelo_ia: return round(float(modelo_ia.predict([[progreso, horas, modulos]])[0]), 2)
    raise Exception("Modelo ML no disponible")

@app.post("/api/login")
def login_for_access_token(request: LoginRequest):
    usuario_db = db.usuarios.find_one({"email": request.email})
    if not usuario_db: 
        logging.warning(f"Seguridad: Intento de login con usuario inexistente ({request.email})")
        raise HTTPException(status_code=404, detail="Usuario no registrado")
    
    if usuario_db.get("bloqueado"): 
        logging.warning(f"Seguridad: Intento de acceso a cuenta bloqueada ({request.email})")
        raise HTTPException(status_code=403, detail="CUENTA BLOQUEADA")
    
    if hashlib.sha256(request.password.encode()).hexdigest() != usuario_db.get("password_hash"):
        intentos = usuario_db.get("intentos_fallidos", 0) + 1
        db.usuarios.update_one({"email": request.email}, {"$set": {"intentos_fallidos": intentos, "bloqueado": intentos >= 3}})
        logging.warning(f"Seguridad: Contraseña incorrecta para {request.email}. Intento {intentos}/3")
        raise HTTPException(status_code=401, detail=f"Contraseña incorrecta. Intento {intentos}/3")

    db.usuarios.update_one({"email": request.email}, {"$set": {"intentos_fallidos": 0}})
    token = jwt.encode({"sub": request.email, "role": usuario_db["role"], "exp": datetime.now(timezone.utc) + timedelta(hours=2)}, SECRET_KEY, algorithm=ALGORITHM)
    
    logging.info(f"Acceso concedido: Usuario {request.email} (Rol: {usuario_db['role']}) ha iniciado sesión.")
    return {"access_token": token, "usuario": request.email, "rol": usuario_db["role"]}

@app.put("/api/estudiantes/{email}/perfil")
def actualizar_perfil(email: str, perfil: PerfilUpdate, usuario: dict = Depends(verificar_token)):
    db.estudiantes.update_one({"email": email}, {"$set": {"perfil_inclusivo.requiere_alto_contraste": perfil.requiere_alto_contraste, "perfil_inclusivo.requiere_lector_pantalla": perfil.requiere_lector_pantalla, "perfil_inclusivo.estilo_aprendizaje": perfil.estilo_aprendizaje}})
    logging.info(f"Auditoría: El usuario {email} actualizó sus preferencias inclusivas.")
    return {"mensaje": "Preferencias actualizadas."}

@app.post("/api/integracion/moodle")
def webhook_moodle(actividad: ActividadMoodle):
    logging.info(f"Webhook Integración: Datos recibidos desde LMS Moodle para {actividad.estudiante_email}")
    nueva_actividad = actividad.dict()
    nueva_actividad.update({"completado": True, "fecha": datetime.now()})
    db.actividades.insert_one(nueva_actividad)

    estudiante = db.estudiantes.find_one({"email": actividad.estudiante_email})
    if estudiante:
        nuevo_progreso = min(100.0, estudiante.get("progreso_general", 0) + 10.0)
        nuevos_modulos = min(estudiante.get("total_modulos", 18), estudiante.get("modulos_completados", 0) + 1)
        puntos_totales = estudiante.get("puntos", 0) + int(actividad.calificacion * 10) + int(actividad.tiempo_interaccion_horas * 5)
        
        actividades_db = list(db.actividades.find({"estudiante_email": actividad.estudiante_email}, {"_id": 0}))
        total_horas = sum([act.get("tiempo_interaccion_horas", 0) for act in actividades_db])
        
        try:
            riesgo_calculado = calcular_riesgo_con_ia(nuevo_progreso, total_horas, nuevos_modulos)
            alerta_ia = False
        except Exception as e:
            riesgo_calculado = round(max(0, min(100, 100 - (nuevo_progreso * 0.6 + (total_horas / 50) * 100 * 0.4))), 2)
            alerta_ia = True
            logging.error(f"Sistema IA: Error en predicción para {actividad.estudiante_email} - Fallback aplicado. Razón: {e}")

        campos_a_actualizar = {
            "progreso_general": nuevo_progreso, "modulos_completados": nuevos_modulos,
            "puntos": puntos_totales, "nivel": (puntos_totales // 100) + 1,
            "riesgo_desvinculacion": riesgo_calculado, 
            "alerta_error_ia": alerta_ia 
        }
        if actividad.tasa_asistencia is not None: campos_a_actualizar["asistencia"] = actividad.tasa_asistencia

        db.estudiantes.update_one({"email": actividad.estudiante_email}, {"$set": campos_a_actualizar})
    return {"mensaje": "Datos y predicción IA capturados con éxito."}

@app.post("/api/evaluar")
def evaluar_estudiante(evaluacion: Evaluacion, usuario: dict = Depends(verificar_token)):
    db.actividades.insert_one({"estudiante_email": evaluacion.estudiante_email, "tipo_actividad": evaluacion.actividad, "calificacion": evaluacion.calificacion, "feedback": evaluacion.feedback, "tiempo_interaccion_horas": 1.0, "completado": True, "fecha": datetime.now()})
    estudiante = db.estudiantes.find_one({"email": evaluacion.estudiante_email})
    if estudiante:
        db.estudiantes.update_one({"email": evaluacion.estudiante_email}, {"$set": {"puntos": estudiante.get("puntos", 0) + 50, "nivel": ((estudiante.get("puntos", 0) + 50) // 100) + 1}})
        if evaluacion.insignia: db.estudiantes.update_one({"email": evaluacion.estudiante_email}, {"$addToSet": {"logros_manuales": evaluacion.insignia}})
    logging.info(f"Auditoría: El Docente {usuario['sub']} evaluó al alumno {evaluacion.estudiante_email} en la actividad '{evaluacion.actividad}'")
    return {"mensaje": "Evaluación guardada."}

def _get_estudiantes_procesados():
    estudiantes = list(db.estudiantes.find({}, {"_id": 0}))
    for est in estudiantes:
        actividades = list(db.actividades.find({"estudiante_email": est["email"]}, {"_id": 0}))
        total_horas = sum([act.get("tiempo_interaccion_horas", 0) for act in actividades])
        
        riesgo = est.get("riesgo_desvinculacion", 0)
        
        logros_auto, sugerencias = evaluar_logros_y_sugerencias(est.get("progreso_general", 0), est.get("modulos_completados", 0), total_horas, est.get("perfil_inclusivo", {}))
        
        est["puntos"] = est.get("puntos", 0)
        est["nivel"] = est.get("nivel", 1)
        est["riesgo_desvinculacion"] = riesgo
        est["logros_sistema"] = logros_auto
        est["medallas_docente"] = est.get("logros_manuales", [])
        est["sugerencias_adaptadas"] = sugerencias
    return estudiantes

@app.get("/api/estudiantes")
def obtener_estudiantes(usuario: dict = Depends(verificar_token)): return _get_estudiantes_procesados()

@app.get("/api/estudiantes/{email}")
def obtener_estudiante(email: str, usuario: dict = Depends(verificar_token)):
    for est in _get_estudiantes_procesados():
        if est["email"] == email: return est
    raise HTTPException(status_code=404)

@app.get("/api/actividades/{email}")
def obtener_actividades(email: str, usuario: dict = Depends(verificar_token)): return list(db.actividades.find({"estudiante_email": email}, {"_id": 0}))

@app.get("/api/reportes")
def generar_reporte_agregado(usuario: dict = Depends(verificar_token)):
    df = pd.DataFrame(_get_estudiantes_procesados())
    logging.info(f"Reportes: El usuario {usuario['sub']} generó un reporte agregado visual.")
    return {"total_estudiantes": len(df), "promedio_progreso": round(df["progreso_general"].mean(), 2) if len(df)>0 else 0, "estudiantes_inclusivos": sum(1 for p in df["perfil_inclusivo"] if p.get("requiere_alto_contraste")) if len(df)>0 else 0}

@app.get("/api/exportar/estudiantes")
def exportar_estudiantes(usuario: dict = Depends(verificar_token)):
    datos = [{"Nombre": e.get("nombre", ""), "Progreso": e.get("progreso_general", 0), "Puntos": e.get("puntos", 0)} for e in _get_estudiantes_procesados()]
    stream = io.StringIO(); pd.DataFrame(datos).to_csv(stream, index=False)
    logging.info(f"Reportes: El usuario {usuario['sub']} descargó el archivo CSV de métricas.")
    return StreamingResponse(iter([stream.getvalue()]), media_type="text/csv", headers={"Content-Disposition": "attachment; filename=reporte.csv"})

@app.post("/api/admin/programar-reporte")
def programar_reporte(u: dict = Depends(verificar_token)): return {"mensaje": "CRON programado."}
@app.post("/api/admin/compartir-reporte")
def compartir_reporte(u: dict = Depends(verificar_token)): return {"mensaje": "Enviado."}

@app.websocket("/api/ws/monitoreo")
async def websocket_monitoreo(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            await websocket.send_json(_get_estudiantes_procesados())
            await asyncio.sleep(5)
    except: pass