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

def verificar_token(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expirado")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token inválido")

class LoginRequest(BaseModel):
    email: str
    password: str

@app.post("/api/login")
def login_for_access_token(request: LoginRequest):
    usuario_db = db.usuarios.find_one({"email": request.email})
    if not usuario_db: raise HTTPException(status_code=404, detail="Usuario no registrado")
    if usuario_db.get("bloqueado"): raise HTTPException(status_code=403, detail="CUENTA BLOQUEADA por múltiples intentos fallidos. Contacte a soporte.")

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

# --- WEBHOOK MEJORADO PARA REFLEJAR CAMBIOS EN TIEMPO REAL ---
@app.post("/api/integracion/moodle")
def webhook_moodle(actividad: ActividadMoodle):
    # 1. Guardamos la actividad
    nueva_actividad = actividad.dict()
    nueva_actividad["completado"] = True
    nueva_actividad["fecha"] = datetime.now()
    db.actividades.insert_one(nueva_actividad)

    # 2. Actualizamos el progreso del estudiante en la BD para que React lo detecte en vivo (RF01)
    estudiante = db.estudiantes.find_one({"email": actividad.estudiante_email})
    if estudiante:
        # Incrementamos 10% de progreso y 1 módulo completado por cada examen
        nuevo_progreso = min(100.0, estudiante.get("progreso_general", 0) + 10.0)
        nuevos_modulos = min(estudiante.get("total_modulos", 18), estudiante.get("modulos_completados", 0) + 1)
        
        db.estudiantes.update_one(
            {"email": actividad.estudiante_email},
            {"$set": {
                "progreso_general": nuevo_progreso,
                "modulos_completados": nuevos_modulos
            }}
        )

    return {"mensaje": "Datos capturados desde Moodle y progreso del estudiante actualizado."}

def _get_estudiantes_procesados():
    estudiantes = list(db.estudiantes.find({}, {"_id": 0}))
    for estudiante in estudiantes:
        email = estudiante["email"]
        actividades = list(db.actividades.find({"estudiante_email": email}, {"_id": 0}))
        total_horas = sum([act.get("tiempo_interaccion_horas", 0) for act in actividades])
        
        # Recalculamos el riesgo con los nuevos datos actualizados
        estudiante["riesgo_desvinculacion"] = calcular_riesgo_desvinculacion(estudiante.get("progreso_general", 0), total_horas, estudiante.get("modulos_completados", 0))
        logros, sugerencias = evaluar_logros_y_sugerencias(estudiante.get("progreso_general", 0), estudiante.get("modulos_completados", 0), total_horas, estudiante.get("perfil_inclusivo", {}))
        
        estudiante["logros"] = logros
        estudiante["sugerencias_adaptadas"] = sugerencias
    return estudiantes

@app.get("/api/estudiantes")
def obtener_estudiantes(usuario: dict = Depends(verificar_token)): return _get_estudiantes_procesados()

@app.get("/api/estudiantes/{email}")
def obtener_estudiante(email: str, usuario: dict = Depends(verificar_token)):
    estudiante = db.estudiantes.find_one({"email": email}, {"_id": 0})
    if not estudiante: raise HTTPException(status_code=404, detail="No encontrado")
    actividades = list(db.actividades.find({"estudiante_email": email}, {"_id": 0}))
    total_horas = sum([act.get("tiempo_interaccion_horas", 0) for act in actividades])
    estudiante["riesgo_desvinculacion"] = calcular_riesgo_desvinculacion(estudiante.get("progreso_general", 0), total_horas, estudiante.get("modulos_completados", 0))
    logros, sugerencias = evaluar_logros_y_sugerencias(estudiante.get("progreso_general", 0), estudiante.get("modulos_completados", 0), total_horas, estudiante.get("perfil_inclusivo", {}))
    estudiante["logros"] = logros
    estudiante["sugerencias_adaptadas"] = sugerencias
    return estudiante

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