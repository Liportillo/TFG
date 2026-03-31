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
from apscheduler.schedulers.background import BackgroundScheduler

app = FastAPI(title="API de Monitoreo EduVirt", version="1.0.0")

app.add_middleware(
    CORSMiddleware, allow_origins=["http://localhost:5173"], allow_credentials=True,
    allow_methods=["*"], allow_headers=["*"],
)

SECRET_KEY = "eduvirt_secreto_tesis_2026"
ALGORITHM = "HS256"
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/login")

scheduler = BackgroundScheduler()
scheduler.start()

def tarea_reporte_automatico():
    estudiantes = _get_estudiantes_procesados()
    if estudiantes:
        df = pd.DataFrame([{"Nombre": e.get("nombre", ""), "Progreso (%)": e.get("progreso_general", 0), "Riesgo (%)": e.get("riesgo_desvinculacion", 0)} for e in estudiantes])
        if not os.path.exists("reportes_automaticos"): os.makedirs("reportes_automaticos")
        df.to_csv(f"reportes_automaticos/reporte_cron_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv", index=False)

def verificar_token(token: str = Depends(oauth2_scheme)):
    try: return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except: raise HTTPException(status_code=401, detail="Token inválido o expirado")

MODELO_PATH = os.path.join(os.path.dirname(__file__), 'modelo_riesgo.pkl')
try: modelo_ia = joblib.load(MODELO_PATH)
except: modelo_ia = None

def calcular_riesgo_con_ia(progreso, horas, modulos):
    if modelo_ia: return round(float(modelo_ia.predict([[progreso, horas, modulos]])[0]), 2)
    return round(max(0, min(100, 100 - (progreso * 0.6 + (horas / 50) * 100 * 0.4))), 2)

class LoginRequest(BaseModel): email: str; password: str

@app.post("/api/login")
def login_for_access_token(request: LoginRequest):
    usuario_db = db.usuarios.find_one({"email": request.email})
    if not usuario_db: raise HTTPException(status_code=404, detail="Usuario no registrado")
    if usuario_db.get("bloqueado"): raise HTTPException(status_code=403, detail="CUENTA BLOQUEADA")
    
    if hashlib.sha256(request.password.encode()).hexdigest() != usuario_db.get("password_hash"):
        intentos = usuario_db.get("intentos_fallidos", 0) + 1
        db.usuarios.update_one({"email": request.email}, {"$set": {"intentos_fallidos": intentos, "bloqueado": intentos >= 3}})
        raise HTTPException(status_code=401, detail=f"Contraseña incorrecta. Intento {intentos}/3")

    db.usuarios.update_one({"email": request.email}, {"$set": {"intentos_fallidos": 0}})
    token = jwt.encode({"sub": request.email, "role": usuario_db["role"], "exp": datetime.now(timezone.utc) + timedelta(hours=2)}, SECRET_KEY, algorithm=ALGORITHM)
    return {"access_token": token, "usuario": request.email, "rol": usuario_db["role"]}

class PerfilUpdate(BaseModel): requiere_alto_contraste: bool; requiere_lector_pantalla: bool; estilo_aprendizaje: str

@app.put("/api/estudiantes/{email}/perfil")
def actualizar_perfil(email: str, perfil: PerfilUpdate, usuario: dict = Depends(verificar_token)):
    db.estudiantes.update_one({"email": email}, {"$set": {"perfil_inclusivo.requiere_alto_contraste": perfil.requiere_alto_contraste, "perfil_inclusivo.requiere_lector_pantalla": perfil.requiere_lector_pantalla, "perfil_inclusivo.estilo_aprendizaje": perfil.estilo_aprendizaje}})
    return {"mensaje": "Preferencias actualizadas."}

class ActividadMoodle(BaseModel):
    estudiante_email: str; tipo_actividad: str; calificacion: float; tiempo_interaccion_horas: float
    tasa_asistencia: float = None; participacion_foros: int = 0; entregado_a_tiempo: bool = True

@app.post("/api/integracion/moodle")
def webhook_moodle(actividad: ActividadMoodle):
    nueva_actividad = actividad.dict()
    nueva_actividad.update({"completado": True, "fecha": datetime.now()})
    db.actividades.insert_one(nueva_actividad)

    estudiante = db.estudiantes.find_one({"email": actividad.estudiante_email})
    if estudiante:
        nuevo_progreso = min(100.0, estudiante.get("progreso_general", 0) + 10.0)
        nuevos_modulos = min(estudiante.get("total_modulos", 18), estudiante.get("modulos_completados", 0) + 1)
        
        # --- MATEMÁTICA DE GAMIFICACIÓN: Puntos y Niveles Automáticos ---
        puntos_ganados = int(actividad.calificacion * 10) + int(actividad.tiempo_interaccion_horas * 5)
        puntos_totales = estudiante.get("puntos", 0) + puntos_ganados
        nivel_calculado = (puntos_totales // 100) + 1 # Sube de nivel cada 100 puntos
        
        campos_a_actualizar = {
            "progreso_general": nuevo_progreso, "modulos_completados": nuevos_modulos,
            "puntos": puntos_totales, "nivel": nivel_calculado
        }
        if actividad.tasa_asistencia is not None: campos_a_actualizar["asistencia"] = actividad.tasa_asistencia

        db.estudiantes.update_one({"email": actividad.estudiante_email}, {"$set": campos_a_actualizar})
    return {"mensaje": "Datos capturados con éxito."}

class Evaluacion(BaseModel):
    estudiante_email: str; actividad: str; calificacion: float; feedback: str; insignia: str

@app.post("/api/evaluar")
def evaluar_estudiante(evaluacion: Evaluacion, usuario: dict = Depends(verificar_token)):
    db.actividades.insert_one({"estudiante_email": evaluacion.estudiante_email, "tipo_actividad": evaluacion.actividad, "calificacion": evaluacion.calificacion, "feedback": evaluacion.feedback, "tiempo_interaccion_horas": 1.0, "completado": True, "fecha": datetime.now()})
    
    # Otorgar Medalla Manual y 50 XP extra por feedback del docente
    estudiante = db.estudiantes.find_one({"email": evaluacion.estudiante_email})
    if estudiante:
        nuevos_puntos = estudiante.get("puntos", 0) + 50
        nuevo_nivel = (nuevos_puntos // 100) + 1
        db.estudiantes.update_one({"email": evaluacion.estudiante_email}, {"$set": {"puntos": nuevos_puntos, "nivel": nuevo_nivel}})
        
        if evaluacion.insignia:
            db.estudiantes.update_one({"email": evaluacion.estudiante_email}, {"$addToSet": {"logros_manuales": evaluacion.insignia}})
    return {"mensaje": "Evaluación e insignia guardadas."}

def _get_estudiantes_procesados():
    estudiantes = list(db.estudiantes.find({}, {"_id": 0}))
    for est in estudiantes:
        actividades = list(db.actividades.find({"estudiante_email": est["email"]}, {"_id": 0}))
        total_horas = sum([act.get("tiempo_interaccion_horas", 0) for act in actividades])
        
        est["riesgo_desvinculacion"] = calcular_riesgo_con_ia(est.get("progreso_general", 0), total_horas, est.get("modulos_completados", 0))
        logros_auto, sugerencias = evaluar_logros_y_sugerencias(est.get("progreso_general", 0), est.get("modulos_completados", 0), total_horas, est.get("perfil_inclusivo", {}))
        
        # Separamos los datos para el Frontend
        est["puntos"] = est.get("puntos", 0)
        est["nivel"] = est.get("nivel", 1)
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
    return {"total_estudiantes": len(df), "promedio_progreso": round(df["progreso_general"].mean(), 2), "estudiantes_inclusivos": sum(1 for p in df["perfil_inclusivo"] if p.get("requiere_alto_contraste"))}

@app.get("/api/exportar/estudiantes")
def exportar_estudiantes(usuario: dict = Depends(verificar_token)):
    datos = [{"Nombre": e.get("nombre", ""), "Progreso": e.get("progreso_general", 0), "Puntos": e.get("puntos", 0)} for e in _get_estudiantes_procesados()]
    stream = io.StringIO(); pd.DataFrame(datos).to_csv(stream, index=False)
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