# Archivo: backend/ml.py

import os
import joblib

# Ruta donde se guarda el modelo entrenado
MODELO_PATH = os.path.join(os.path.dirname(__file__), 'modelo_riesgo.pkl')

# Intentamos cargar el modelo de Machine Learning en memoria
try:
    modelo_ia = joblib.load(MODELO_PATH)
    print("🧠 Modelo de IA (Scikit-Learn) cargado correctamente.")
except FileNotFoundError:
    modelo_ia = None
    print("⚠️ No se encontró 'modelo_riesgo.pkl'. Se usará una fórmula fallback.")

def calcular_riesgo_desvinculacion(progreso, horas, modulos):
    """
    Utiliza el modelo entrenado de Scikit-Learn para predecir el riesgo.
    """
    if modelo_ia:
        # El modelo espera un array 2D para predecir
        prediccion = modelo_ia.predict([[progreso, horas, modulos]])
        return round(float(prediccion[0]), 2)
    else:
        # Fallback de emergencia si el archivo .pkl no existe
        riesgo = 100 - (progreso * 0.6 + (horas / 50) * 100 * 0.4)
        return round(max(0, min(100, riesgo)), 2)