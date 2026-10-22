from pydantic import BaseModel
from typing import List, Optional, Dict, Any

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

# --- ESQUEMAS PARA COTIZACIONES ---
class ItemCotizacionSchema(BaseModel):
    categoria: str
    descripcion: str
    lamina: Optional[str] = None
    pintura: Optional[str] = None
    costoPintura: Optional[float] = 0.0
    costoTubos: Optional[float] = 0.0
    areaPintable: Optional[float] = 0.0
    alto: Optional[float] = 0.0
    ancho: Optional[float] = 0.0
    fondo: Optional[float] = 0.0
    costoBase: Optional[float] = 0.0
    total: Optional[float] = 0.0
    accesoriosLista: Optional[List[Dict[str, Any]]] = []
    configuracion: Optional[Dict[str, Any]] = None
    params: Optional[Dict[str, Any]] = None

class GuardarCotizacionReq(BaseModel):
    consecutivo: Optional[str] = None
    cliente_id: Optional[int] = None
    clienteId: Optional[int] = None
    clienteNombre: Optional[str] = "Consumidor Final / Mostrador"
    cliente_nombre: Optional[str] = None
    clienteNit: Optional[str] = None
    cliente_nit: Optional[str] = None
    vendedor: Optional[str] = None
    asesor_nombre: Optional[str] = None
    disenador: Optional[str] = None
    disenador_nombre: Optional[str] = None
    observaciones: Optional[str] = None
    notas: Optional[str] = None
    nivelPrecio: Optional[int] = 1
    total: Optional[float] = 0.0
    items: List[ItemCotizacionSchema]

# =====================================================================
# MULTI-DISTRIBUIDOR: AUTENTICACIÓN, USUARIOS Y PERFIL DEL DISTRIBUIDOR
# =====================================================================
from pydantic import Field, field_validator
from typing import Literal

Rol = Literal["SUPERADMIN", "DISTRIBUIDOR"]
TipoPersonal = Literal["ASESOR", "DISENADOR"]


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int  # segundos
    user_id: int
    username: str
    rol: Rol
    distribuidor_id: Optional[int] = None


class UsuarioActual(BaseModel):
    """Identidad extraída del JWT y validada contra la BD en cada request."""
    id: int
    username: str
    rol: Rol
    distribuidor_id: Optional[int] = None

    @property
    def es_superadmin(self) -> bool:
        return self.rol == "SUPERADMIN"


class PersonalBase(BaseModel):
    tipo: TipoPersonal
    nombre: str = Field(min_length=1, max_length=120)


class PersonalIn(PersonalBase):
    id: Optional[int] = None  # si viene, se actualiza; si no, se crea


class PersonalOut(PersonalBase):
    id: int
    model_config = {"from_attributes": True}


class DistribuidorBase(BaseModel):
    nombre_comercial: str = Field(min_length=1, max_length=200)
    nit: Optional[str] = None
    telefono: Optional[str] = None
    direccion: Optional[str] = None
    correo: Optional[str] = None
    logo_url: Optional[str] = None  # URL o data-URI base64
    margen_comercial_default: float = Field(default=0.0, ge=0, le=1000)
    prefijo_consecutivo: str = Field(default="COT-", min_length=1, max_length=10, pattern=r"^[A-Za-z0-9_\-]+$")


# Límite del logo (≈ 1 MB de texto): evita filas gigantes en la BD
LOGO_MAX_CHARS = 1_400_000


def _validar_logo(v: Optional[str]) -> Optional[str]:
    if v is None or v == "":
        return v
    if len(v) > LOGO_MAX_CHARS:
        raise ValueError("El logo excede el tamaño máximo permitido (~1 MB)")
    if not (v.startswith("data:image/") or v.startswith("http://") or v.startswith("https://") or v.startswith("/")):
        raise ValueError("logo_url debe ser una URL, una ruta local o un data-URI de imagen")
    return v


class DistribuidorOut(DistribuidorBase):
    id: int
    ultimo_numero_consecutivo: int
    siguiente_consecutivo: str
    activo: bool
    es_fabrica: bool
    personal: List[PersonalOut] = []
    model_config = {"from_attributes": True}


class PerfilUpdate(BaseModel):
    """PUT /api/distribuidor/mi-perfil. Todos los campos son opcionales (actualización parcial).
    `personal`, si se envía, REEMPLAZA la lista completa (sincronización por id)."""
    nombre_comercial: Optional[str] = Field(default=None, min_length=1, max_length=200)
    nit: Optional[str] = None
    telefono: Optional[str] = None
    direccion: Optional[str] = None
    correo: Optional[str] = None
    logo_url: Optional[str] = None
    margen_comercial_default: Optional[float] = Field(default=None, ge=0, le=1000)
    prefijo_consecutivo: Optional[str] = Field(default=None, min_length=1, max_length=10, pattern=r"^[A-Za-z0-9_\-]+$")
    personal: Optional[List[PersonalIn]] = None

    @field_validator("logo_url")
    @classmethod
    def _logo(cls, v):
        return _validar_logo(v)


# --- Administración (SUPERADMIN) ---
class DistribuidorCreate(DistribuidorBase):
    activo: bool = True  # creado por el admin => activo por defecto
    ultimo_numero_consecutivo: int = Field(default=1000, ge=0)

    @field_validator("logo_url")
    @classmethod
    def _logo(cls, v):
        return _validar_logo(v)


class UsuarioCreate(BaseModel):
    username: str = Field(min_length=3, max_length=60, pattern=r"^[A-Za-z0-9_.\-@]+$")
    password: str = Field(min_length=8, max_length=128)
    rol: Rol = "DISTRIBUIDOR"
    distribuidor_id: Optional[int] = None


class UsuarioOut(BaseModel):
    id: int
    username: str
    rol: Rol
    distribuidor_id: Optional[int] = None
    activo: bool
    model_config = {"from_attributes": True}


class ActivoUpdate(BaseModel):
    activo: bool
