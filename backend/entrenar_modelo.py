# Archivo: backend/entrenar_modelo.py

import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor
import joblib
import os

def entrenar_ia():
    print("==================================================")
    print("🧠 INICIANDO ENTRENAMIENTO DE LA IA (SCIKIT-LEARN)")
    print("==================================================")
    
    # 1. Generamos un dataset histórico simulado de 1000 estudiantes
    np.random.seed(42)
    n_estudiantes = 1000
    
    progreso = np.random.uniform(0, 100, n_estudiantes)
    horas = np.random.uniform(0, 50, n_estudiantes)
    modulos = np.round((progreso / 100) * 18) # Máximo 18 módulos
    
    # Lógica del riesgo real: a menor progreso y menos horas, más riesgo de abandono.
    # Le agregamos ruido estadístico para que la IA aprenda patrones complejos.
    riesgo_real = 100 - (progreso * 0.6 + (horas / 50) * 100 * 0.4)
    riesgo_real = np.clip(riesgo_real + np.random.normal(0, 5, n_estudiantes), 0, 100)
    
    df = pd.DataFrame({
        'progreso_general': progreso,
        'tiempo_interaccion_horas': horas,
        'modulos_completados': modulos,
        'riesgo_abandono': riesgo_real
    })
    
    # 2. Separamos las características (X) y lo que queremos predecir (y)
    X = df[['progreso_general', 'tiempo_interaccion_horas', 'modulos_completados']]
    y = df['riesgo_abandono']
    
    print("Entrenando algoritmo RandomForestRegressor...")
    # 3. Entrenamos el modelo
    modelo = RandomForestRegressor(n_estimators=100, random_state=42)
    modelo.fit(X.values, y.values)
    
    # 4. Guardamos el modelo empaquetado (.pkl)
    ruta_modelo = os.path.join(os.path.dirname(__file__), 'modelo_riesgo.pkl')
    joblib.dump(modelo, ruta_modelo)
    
    print(f"✅ ¡Modelo entrenado exitosamente!")
    print(f"💾 Archivo guardado en: {ruta_modelo}")
    print("El backend de FastAPI ahora usará este cerebro para calcular el riesgo.")
    print("==================================================")

if __name__ == "__main__":
    entrenar_ia()