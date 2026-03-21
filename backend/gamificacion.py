# Archivo: backend/gamificacion.py

def evaluar_logros_y_sugerencias(progreso: float, modulos_completados: int, horas: float, perfil: dict):
    logros = []
    sugerencias = []
    estilo = perfil.get("estilo_aprendizaje", "visual")

    # --- LÓGICA DE GAMIFICACIÓN ADAPTATIVA (CU08) ---
    if progreso >= 50:
        logros.append("🏆 Mitad del Camino")
    if horas >= 2:
        logros.append("🔥 Constancia Semanal")
    if modulos_completados >= 10:
        logros.append("⭐ Ritmo Perfecto")
    
    # Gamificación inclusiva: premio por usar herramientas de accesibilidad
    if perfil.get("requiere_alto_contraste") or perfil.get("requiere_lector_pantalla"):
        logros.append("🛡️ Superación Inclusiva")

    if not logros:
        logros.append("🌱 Primeros Pasos")

    # --- LÓGICA DE SUGERENCIAS ADAPTADAS ---
    if estilo == "visual":
        sugerencias.append("Revisar infografías y mapas mentales del Módulo actual.")
    elif estilo == "auditivo":
        sugerencias.append("Escuchar los podcasts de resumen del Módulo.")
    elif estilo == "kinestesico":
        sugerencias.append("Realizar los ejercicios interactivos de arrastrar y soltar.")
    
    if progreso < 40:
        sugerencias.append("Te recomendamos agendar una tutoría de apoyo.")
    else:
        sugerencias.append("¡Venís excelente! Participá en el foro para sumar puntos extra.")

    return logros, sugerencias