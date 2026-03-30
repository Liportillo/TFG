# Archivo: backend/simulador_moodle.py

import requests
import time
from database import db
from datetime import datetime

URL_WEBHOOK = "http://localhost:8000/api/integracion/moodle"

def ayudar_ana():
    print("\n🟢 Simulando actividad excelente para Ana Torres...")
    actividad = {
        "estudiante_email": "ana.torres@eduvirt.com",
        "tipo_actividad": "Examen Final Perfecto",
        "calificacion": 10.0,
        "tiempo_interaccion_horas": 4.0,
        "tasa_asistencia": 98.0,
        "participacion_foros": 15, # Muchos mensajes en el foro
        "entregado_a_tiempo": True # Entregó a tiempo
    }
    requests.post(URL_WEBHOOK, json=actividad)
    print("✅ Datos enviados. Mirá la Ficha de Ana en el Panel Docente.")

def perjudicar_carlos():
    print("\n🔴 Simulando abandono crítico para Carlos Ruiz...")
    db.estudiantes.update_one(
        {"email": "carlos.ruiz@eduvirt.com"},
        {"$set": {"progreso_general": 5.0, "modulos_completados": 0, "asistencia": 30.0}}
    )
    db.actividades.delete_many({"estudiante_email": "carlos.ruiz@eduvirt.com"})
    db.actividades.insert_one({
        "estudiante_email": "carlos.ruiz@eduvirt.com",
        "tipo_actividad": "Intento Fallido (Retrasado)",
        "calificacion": 2.0,
        "tiempo_interaccion_horas": 0.5,
        "participacion_foros": 0, # No participa en foros
        "entregado_a_tiempo": False, # Entregó fuera de término
        "completado": False,
        "fecha": datetime.now()
    })
    print("✅ Base de datos alterada. Carlos ahora tiene 100% de riesgo.")

def movimiento_masivo_admin():
    print("\n📊 Simulando actividad en toda la plataforma (Ideal para Admin)...")
    requests.post(URL_WEBHOOK, json={
        "estudiante_email": "ana.torres@eduvirt.com",
        "tipo_actividad": "Entrega TP", "calificacion": 9.0, "tiempo_interaccion_horas": 2.0,
        "tasa_asistencia": 100.0, "participacion_foros": 5, "entregado_a_tiempo": True
    })
    db.estudiantes.update_one(
        {"email": "carlos.ruiz@eduvirt.com"},
        {"$inc": {"progreso_general": 15.0}, "$set": {"asistencia": 45.0}}
    )
    print("✅ Actividad masiva inyectada. Mirá el Dashboard del Admin.")

def reiniciar_demo():
    print("\n🧹 Restaurando valores de fábrica para la presentación...")
    db.estudiantes.update_one({"email": "ana.torres@eduvirt.com"}, {"$set": {"progreso_general": 68.0, "modulos_completados": 12, "asistencia": 85.0}})
    db.estudiantes.update_one({"email": "carlos.ruiz@eduvirt.com"}, {"$set": {"progreso_general": 45.0, "modulos_completados": 8, "asistencia": 60.0}})
    print("✅ Base de datos limpia. Lista para empezar la demostración desde cero.")

def menu():
    while True:
        print("\n==================================================")
        print("🎓 SIMULADOR INTERACTIVO EDUVIRT - DEFENSA TFG")
        print("==================================================")
        print("1. 🟢 Ayudar a Ana Torres (Prueba Vista Alumno / Docente)")
        print("2. 🔴 Perjudicar a Carlos Ruiz (Prueba Alerta de Riesgo)")
        print("3. 📊 Movimiento Masivo (Prueba Vista Administrador)")
        print("4. 🧹 Limpiar Base de Datos (Reiniciar todo)")
        print("0. Salir")
        
        opcion = input("\nElige una opción (0-4): ")
        
        if opcion == '1': ayudar_ana()
        elif opcion == '2': perjudicar_carlos()
        elif opcion == '3': movimiento_masivo_admin()
        elif opcion == '4': reiniciar_demo()
        elif opcion == '0':
            print("Saliendo del simulador...")
            break
        else:
            print("Opción no válida.")
        
        time.sleep(2)

if __name__ == "__main__":
    menu()