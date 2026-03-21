# Archivo: backend/simulador_moodle.py

from database import db
from datetime import datetime
import time

print("==================================================")
print("🚨 INICIANDO SIMULADOR - ESCENARIO CRÍTICO PARA CARLOS")
print("==================================================")

print("Simulando que Carlos no se conecta hace semanas y bajó su rendimiento...")

# 1. Le desplomamos el progreso y los módulos a niveles críticos en la BD
db.estudiantes.update_one(
    {"email": "carlos.ruiz@eduvirt.com"},
    {"$set": {
        "progreso_general": 10.0,
        "modulos_completados": 1
    }}
)

# 2. Le borramos el historial de actividades buenas para que sus horas bajen
db.actividades.delete_many({"estudiante_email": "carlos.ruiz@eduvirt.com"})

# 3. Le inyectamos una única actividad con muy poco tiempo de interacción
db.actividades.insert_one({
    "estudiante_email": "carlos.ruiz@eduvirt.com",
    "tipo_actividad": "Intento de Examen (Abandonado)",
    "calificacion": 2.0,
    "tiempo_interaccion_horas": 0.5,
    "completado": False,
    "fecha": datetime.now()
})

print("✅ Base de datos alterada con éxito.")
print("⏳ Esperando 5 segundos para que el WebSocket detecte el cambio...")
time.sleep(5)

print("==================================================")
print("🔥 SIMULACIÓN TERMINADA.")
print("Mirá el Dashboard: la barra de riesgo de Carlos tiene que estar en ROJO ALTO (>90%).")
print("==================================================")