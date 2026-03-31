# Archivo: backend/gamificacion.py

def evaluar_logros_y_sugerencias(progreso, modulos, horas, perfil_inclusivo):
    logros = []
    
    # --- 1. EVALUACIÓN DE LOGROS AUTOMÁTICOS ---
    if progreso >= 50: 
        logros.append("🏆 Mitad del Camino")
    if horas >= 5: 
        logros.append("🔥 Constancia Semanal")
    if progreso >= 80: 
        logros.append("⭐ Ritmo Perfecto")
    if perfil_inclusivo.get("requiere_alto_contraste") or perfil_inclusivo.get("requiere_lector_pantalla"):
        if progreso >= 20: 
            logros.append("🛡️ Superación Inclusiva")

    # --- 2. CU02: ALGORITMOS BÁSICOS PARA ENTENDER ---
    estilo = perfil_inclusivo.get("estilo_aprendizaje", "visual").lower()
    sugerencias = []

    # Si el alumno tiene poco progreso, le pasamos el algoritmo de destrabe
    if progreso < 50 or horas < 2:
        sugerencias.append("⚠️ Estás en una etapa inicial o crítica. Sigue este algoritmo básico para destrabarte:")
        
        if estilo == "visual":
            sugerencias.append("Paso 1: Dibuja un diagrama de flujo del tema principal.")
            sugerencias.append("Paso 2: Resalta los conceptos clave con diferentes colores.")
            sugerencias.append("Paso 3: Mira el video resumen del módulo antes de leer la teoría.")
        elif estilo == "auditivo":
            sugerencias.append("Paso 1: Lee el problema o la consigna en voz alta.")
            sugerencias.append("Paso 2: Explícale la teoría a un compañero o grábate con el celular.")
            sugerencias.append("Paso 3: Escucha el podcast de la unidad mientras repasas.")
        elif estilo == "kinestesico":
            sugerencias.append("Paso 1: Anota los conceptos en tarjetas de papel separadas.")
            sugerencias.append("Paso 2: Ordena físicamente las tarjetas en tu escritorio.")
            sugerencias.append("Paso 3: Aplica la teoría a un caso práctico de la vida real.")
        else:
            sugerencias.append("Paso 1: Divide el problema en tres partes más pequeñas.")
            sugerencias.append("Paso 2: Resuelve la parte más fácil primero.")
            sugerencias.append("Paso 3: Consulta el foro de dudas con la parte difícil.")
    else:
        # Si va bien, le pasamos un algoritmo de mantenimiento
        sugerencias.append("🟢 Tu ritmo es muy bueno. Algoritmo de consolidación:")
        sugerencias.append("Paso 1: Realiza un test de autoevaluación.")
        sugerencias.append("Paso 2: Ayuda a un compañero en el foro.")
        sugerencias.append("Paso 3: Comienza la lectura del siguiente módulo.")

    return logros, sugerencias