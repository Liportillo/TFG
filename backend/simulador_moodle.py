# Archivo: backend/simulador_moodle.py

import requests
from database import db
from datetime import datetime, timedelta

URL_WEBHOOK = "http://localhost:8000/api/integracion/moodle"

def subir_progreso_ana():
    print("\nEnviando actividad para Ana Torres...")
    actividad = {
        "estudiante_email": "ana.torres@eduvirt.com",
        "tipo_actividad": "Examen Final",
        "calificacion": 10.0,
        "tiempo_interaccion_horas": 2.0,
        "tasa_asistencia": 100.0,
        "participacion_foros": 5,
        "entregado_a_tiempo": True
    }
    try:
        res = requests.post(URL_WEBHOOK, json=actividad)
        if res.status_code == 200:
            print("Datos enviados correctamente.")
        else:
            print("Error en el servidor al enviar datos.")
    except Exception as e:
        print(f"Error de conexión: {e}")

def bajar_progreso_carlos():
    print("\nReduciendo el progreso de Carlos Ruiz y aumentando su riesgo...")
    estudiante = db.estudiantes.find_one({"email": "carlos.ruiz@eduvirt.com"})
    if estudiante:
        nuevo_progreso = max(0.0, estudiante.get("progreso_general", 0) - 15.0)
        nuevo_riesgo = min(100.0, estudiante.get("riesgo_desvinculacion", 0) + 23.0) 
        
        db.estudiantes.update_one(
            {"email": "carlos.ruiz@eduvirt.com"},
            {"$set": {
                "progreso_general": nuevo_progreso,
                "riesgo_desvinculacion": nuevo_riesgo
            }}
        )
        print("Progreso y Riesgo actualizados exitosamente.")
    else:
        print("No se encontró al estudiante en la base de datos.")

def reiniciar_demo():
    print("\nRestaurando valores por defecto y rellenando legajos...")
    
    # 1. Restaurar perfiles base
    db.estudiantes.update_one({"email": "ana.torres@eduvirt.com"}, {"$set": {"progreso_general": 68.0, "modulos_completados": 12, "asistencia": 85.0, "puntos": 250, "nivel": 3, "riesgo_desvinculacion": 15.0}})
    db.estudiantes.update_one({"email": "carlos.ruiz@eduvirt.com"}, {"$set": {"progreso_general": 45.0, "modulos_completados": 8, "asistencia": 60.0, "puntos": 120, "nivel": 2, "riesgo_desvinculacion": 42.0}})
    
    # 2. Limpiar actividades viejas
    db.actividades.delete_many({})
    
    # 3. Inyectar historial coherente para el Legajo
    hoy = datetime.now()
    historial_inicial = [
        {"estudiante_email": "ana.torres@eduvirt.com", "tipo_actividad": "Foro de Presentación", "calificacion": 10.0, "tiempo_interaccion_horas": 1.5, "participacion_foros": 2, "entregado_a_tiempo": True, "fecha": hoy - timedelta(days=15)},
        {"estudiante_email": "ana.torres@eduvirt.com", "tipo_actividad": "Trabajo Práctico 1", "calificacion": 9.0, "tiempo_interaccion_horas": 4.0, "participacion_foros": 1, "entregado_a_tiempo": True, "fecha": hoy - timedelta(days=7)},
        {"estudiante_email": "carlos.ruiz@eduvirt.com", "tipo_actividad": "Foro de Presentación", "calificacion": 7.0, "tiempo_interaccion_horas": 0.5, "participacion_foros": 1, "entregado_a_tiempo": True, "fecha": hoy - timedelta(days=15)},
        {"estudiante_email": "carlos.ruiz@eduvirt.com", "tipo_actividad": "Trabajo Práctico 1", "calificacion": 4.0, "tiempo_interaccion_horas": 1.0, "participacion_foros": 0, "entregado_a_tiempo": False, "fecha": hoy - timedelta(days=2)},
    ]
    db.actividades.insert_many(historial_inicial)
    
    print("Base de datos restaurada. Los legajos ahora contienen datos históricos.")

def menu():
    while True:
        print("\n==================================================")
        print("SIMULADOR DE DATOS EDUVIRT")
        print("==================================================")
        print("1. Subir progreso de Ana")
        print("2. Bajar progreso de Carlos")
        print("3. Reiniciar valores (Rellenar Legajos)")
        print("0. Salir")
        
        opc = input("\nSeleccione una acción: ")

        if opc == "1":
            subir_progreso_ana()
        elif opc == "2":
            bajar_progreso_carlos()
        elif opc == "3":
            reiniciar_demo()
        elif opc == "0":
            break
        else:
            print("Opción no válida.")

if __name__ == "__main__":
    menu()