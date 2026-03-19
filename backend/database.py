from pymongo import MongoClient
from pymongo.errors import ConnectionFailure

# URI por defecto de MongoDB local
MONGO_URI = "mongodb://localhost:27017/"

try:
    # Inicializamos el cliente
    client = MongoClient(MONGO_URI)
    
    # Verificamos si el servidor responde
    client.admin.command('ping')
    print("¡Conexión exitosa a MongoDB Local!")
    
except ConnectionFailure:
    print("Error: No se pudo conectar a MongoDB. ¿Está el servicio corriendo?")

# Seleccionamos la base de datos del proyecto
db = client["eduvirt_db"]