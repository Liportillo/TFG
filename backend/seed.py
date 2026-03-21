# Archivo: backend/seed.py

from database import db
from datetime import datetime, timedelta
import hashlib

def hashear_password(password):
    # Cifrado SHA-256 para cumplir con la seguridad del TFG
    return hashlib.sha256(password.encode()).hexdigest()

def poblar_base_de_datos():
    print("Limpiando colecciones anteriores...")
    db.estudiantes.drop()
    db.actividades.drop()
    db.usuarios.drop() # Nueva colección de seguridad

    # --- 1. SEGURIDAD: USUARIOS, CONTRASEÑAS CIFRADAS Y BLOQUEOS ---
    # Contraseña que cumple con la política del TFG (8+ chars, Mayus, minus, num, simbolo)
    pass_segura = hashear_password("Eduvirt2026!")

    usuarios_mock = [
        {"email": "ana.torres@eduvirt.com", "password_hash": pass_segura, "role": "estudiante", "intentos_fallidos": 0, "bloqueado": False},
        {"email": "carlos.ruiz@eduvirt.com", "password_hash": pass_segura, "role": "estudiante", "intentos_fallidos": 0, "bloqueado": False},
        {"email": "profesora@eduvirt.com", "password_hash": pass_segura, "role": "docente", "intentos_fallidos": 0, "bloqueado": False},
        {"email": "admin@eduvirt.com", "password_hash": pass_segura, "role": "admin", "intentos_fallidos": 0, "bloqueado": False}
    ]
    db.usuarios.insert_many(usuarios_mock)
    print("Colección de usuarios seguros creada.")

    # --- 2. DATOS DE ESTUDIANTES ---
    print("Insertando estudiantes de prueba...")
    estudiantes_mock = [
        {
            "nombre": "Ana Torres",
            "email": "ana.torres@eduvirt.com",
            "perfil_inclusivo": {"requiere_alto_contraste": True, "requiere_lector_pantalla": False, "estilo_aprendizaje": "visual"},
            "progreso_general": 68.0,
            "modulos_completados": 12,
            "total_modulos": 18
        },
        {
            "nombre": "Carlos Ruiz",
            "email": "carlos.ruiz@eduvirt.com",
            "perfil_inclusivo": {"requiere_alto_contraste": False, "requiere_lector_pantalla": True, "estilo_aprendizaje": "auditivo"},
            "progreso_general": 45.0,
            "modulos_completados": 8,
            "total_modulos": 18
        }
    ]
    db.estudiantes.insert_many(estudiantes_mock)

    # --- 3. ACTIVIDADES ---
    print("Insertando actividades recientes...")
    actividades_mock = [
        {"estudiante_email": "ana.torres@eduvirt.com", "tipo_actividad": "tarea", "calificacion": 8.5, "tiempo_interaccion_horas": 2.5, "completado": True, "fecha": datetime.now() - timedelta(days=1)},
        {"estudiante_email": "carlos.ruiz@eduvirt.com", "tipo_actividad": "foro", "calificacion": None, "tiempo_interaccion_horas": 0.5, "completado": False, "fecha": datetime.now() - timedelta(days=3)}
    ]
    db.actividades.insert_many(actividades_mock)

    print("¡Base de datos poblada con éxito! (Incluye seguridad de contraseñas)")

if __name__ == "__main__":
    poblar_base_de_datos()