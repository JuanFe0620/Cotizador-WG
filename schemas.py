from pydantic import BaseModel
from typing import List, Optional

# --- ESQUEMAS PARA CÁLCULO DE TUBERÍA ---
class ItemTubo(BaseModel):
    forma: str          # Redondo, Cuadrado, etc.
    tipo: str           # Estructural, etc.
    calibre: str        # 18, 20, etc.
    material: str       # Galvanizado, etc.
    metros: float       # Metros requeridos
    precio_metro: float # Precio base por metro

class CotizarTuberíaRequest(BaseModel):
    factor_margen: float = 1.55  # Multiplicador predeterminado (ej. 1.55 o 1.70)
    tubos: List[ItemTubo]

# --- ESQUEMAS PARA CÁLCULO DE GABINETES ---
class CotizarGabineteRequest(BaseModel):
    alto: float          # en mm o cm según estándar
    ancho: float
    fondo: float
    precio_lamina: float # Precio por unidad de superficie
    precio_pintura: float
    factor_margen: float = 1.35
    incluye_chapa: bool = False
    precio_chapa: float = 0.0