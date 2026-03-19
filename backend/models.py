from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

# Sub-modelo para las necesidades inclusivas del estudiante
class PerfilInclusivo(BaseModel):
    requiere_alto_contraste: bool = False
    requiere_lector_pantalla: bool = False
    estilo_aprendizaje: str = "visual" # Puede ser visual, auditivo, kinestésico

# Modelo principal del Estudiante
class EstudianteSchema(BaseModel):
    nombre: str
    email: str
    perfil_inclusivo: PerfilInclusivo
    progreso_general: float = 0.0
    modulos_completados: int = 0
    total_modulos: int = 18
    riesgo_desvinculacion: float = 0.0 # Esto lo calculará la IA más adelante
    logros: List[str] = [] # Para la gamificación

# Modelo para registrar la interacción con la plataforma
class ActividadSchema(BaseModel):
    estudiante_email: str
    tipo_actividad: str # "foro", "tarea", "quiz", "video"
    calificacion: Optional[float] = None
    tiempo_interaccion_horas: float
    completado: bool = True
    fecha: datetime = Field(default_factory=datetime.now)