from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from database import db
from ml import calcular_riesgo_desvinculacion # <-- Importamos la IA

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

@app.get("/")
def read_root():
    return {"mensaje": "¡Bienvenido a la API de EduVirt! El servidor está corriendo joya."}

@app.get("/api/estudiantes")
def obtener_estudiantes():
    estudiantes = list(db.estudiantes.find({}, {"_id": 0}))
    return estudiantes

@app.get("/api/estudiantes/{email}")
def obtener_estudiante(email: str):
    estudiante = db.estudiantes.find_one({"email": email}, {"_id": 0})
    if not estudiante:
        raise HTTPException(status_code=404, detail="Estudiante no encontrado")
    
    # Buscamos las actividades del estudiante para sumar sus horas de interacción
    actividades = list(db.actividades.find({"estudiante_email": email}, {"_id": 0}))
    total_horas = sum([act.get("tiempo_interaccion_horas", 0) for act in actividades])
    
    # ¡Magia de la IA! Calculamos el riesgo en tiempo real
    riesgo_calculado = calcular_riesgo_desvinculacion(
        progreso=estudiante.get("progreso_general", 0),
        horas=total_horas,
        modulos=estudiante.get("modulos_completados", 0)
    )
    
    # Sobrescribimos el riesgo estático de la base de datos con la predicción de la IA
    estudiante["riesgo_desvinculacion"] = riesgo_calculado
    
    return estudiante

@app.get("/api/actividades/{email}")
def obtener_actividades(email: str):
    actividades = list(db.actividades.find({"estudiante_email": email}, {"_id": 0}))
    return actividades