import pandas as pd
from sklearn.linear_model import LogisticRegression

# 1. Función para entrenar nuestro modelo predictivo
def train_risk_model():
    # Creamos un dataset sintético para entrenar a la IA.
    # Columnas: progreso_general, horas_interaccion, modulos_completados
    # Etiqueta (riesgo): 1 (Alto Riesgo de abandono), 0 (Bajo Riesgo)
    data = {
        'progreso': [10, 20, 80, 90, 45, 30, 85, 95, 15, 60],
        'horas': [1, 2, 25, 30, 10, 5, 20, 40, 2, 15],
        'modulos': [1, 2, 15, 18, 8, 4, 16, 18, 2, 10],
        'riesgo': [1, 1, 0, 0, 1, 1, 0, 0, 1, 0]
    }
    df = pd.DataFrame(data)
    
    # Separamos las características (X) y el objetivo a predecir (y)
    X = df[['progreso', 'horas', 'modulos']]
    y = df['riesgo']

    # Inicializamos y entrenamos el modelo de Regresión Logística
    model = LogisticRegression()
    model.fit(X, y)
    
    return model

# Entrenamos el modelo en memoria al arrancar el servidor
risk_model = train_risk_model()

# 2. Función que usará FastAPI para predecir el riesgo de un estudiante real
def calcular_riesgo_desvinculacion(progreso: float, horas: float, modulos: int) -> float:
    # Preparamos los datos del estudiante en el formato que espera el modelo
    X_new = pd.DataFrame({
        'progreso': [progreso],
        'horas': [horas],
        'modulos': [modulos]
    })
    
    # predict_proba devuelve la probabilidad de cada clase [[prob_clase_0, prob_clase_1]]
    # Nos interesa la prob_clase_1 (probabilidad de abandono)
    probabilidad = risk_model.predict_proba(X_new)[0][1]
    
    # Devolvemos un porcentaje redondeado
    return round(probabilidad * 100, 2)