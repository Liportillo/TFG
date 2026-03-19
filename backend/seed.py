from database import db
from datetime import datetime, timedelta

def poblar_base_de_datos():
    print("Limpiando colecciones anteriores...")
    db.estudiantes.drop()
    db.actividades.drop()

    print("Insertando estudiantes de prueba...")
    estudiantes_mock = [
        {
            "nombre": "Ana Torres",
            "email": "ana.torres@eduvirt.com",
            "perfil_inclusivo": {
                "requiere_alto_contraste": True,
                "requiere_lector_pantalla": False,
                "estilo_aprendizaje": "visual"
            },
            "progreso_general": 68.0,
            "modulos_completados": 12,
            "total_modulos": 18,
            "riesgo_desvinculacion": 30.0,
            "logros": ["Constancia Semanal", "Ritmo Perfecto"]
        },
        {
            "nombre": "Carlos Ruiz",
            "email": "carlos.ruiz@eduvirt.com",
            "perfil_inclusivo": {
                "requiere_alto_contraste": False,
                "requiere_lector_pantalla": True,
                "estilo_aprendizaje": "auditivo"
            },
            "progreso_general": 45.0,
            "modulos_completados": 8,
            "total_modulos": 18,
            "riesgo_desvinculacion": 85.0, # Alto riesgo, ideal para probar la IA predictiva
            "logros": ["Superación Inclusiva"]
        }
    ]
    
    db.estudiantes.insert_many(estudiantes_mock)

    print("Insertando actividades recientes...")
    actividades_mock = [
        {
            "estudiante_email": "ana.torres@eduvirt.com",
            "tipo_actividad": "tarea",
            "calificacion": 8.5,
            "tiempo_interaccion_horas": 2.5,
            "completado": True,
            "fecha": datetime.now() - timedelta(days=1)
        },
        {
            "estudiante_email": "carlos.ruiz@eduvirt.com",
            "tipo_actividad": "foro",
            "calificacion": None,
            "tiempo_interaccion_horas": 0.5,
            "completado": False,
            "fecha": datetime.now() - timedelta(days=3)
        }
    ]

    db.actividades.insert_many(actividades_mock)
    print("¡Base de datos poblada con éxito! Ya tenemos datos para trabajar.")

if __name__ == "__main__":
    poblar_base_de_datos()