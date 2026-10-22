"""
Autenticación y autorización (JWT + bcrypt) para el Cotizador WG multi-distribuidor.

Variables de entorno:
  JWT_SECRET_KEY            Clave de firma HS256 (OBLIGATORIA en producción, >= 32 chars).
                            Si falta se genera una efímera (los tokens mueren al reiniciar).
  JWT_EXPIRE_MINUTES        Vigencia del token (default 480 = 8 h).
  SUPERADMIN_USERNAME / SUPERADMIN_PASSWORD
                            Si no existe ningún SUPERADMIN, se crea con estas credenciales al arrancar.
"""
from dotenv import load_dotenv
load_dotenv()
import os
import secrets
import warnings
from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
import jwt
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

import models
import schemas
from database import get_db

# --------------------------------------------------------------------- Config
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", "480"))

JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
if not JWT_SECRET_KEY:
    JWT_SECRET_KEY = secrets.token_urlsafe(48)
    warnings.warn(
        "JWT_SECRET_KEY no está definida: se usa una clave efímera. "
        "Defínela en el entorno para que las sesiones sobrevivan reinicios.",
        stacklevel=1,
    )

ROL_SUPERADMIN = "SUPERADMIN"
ROL_DISTRIBUIDOR = "DISTRIBUIDOR"

bearer_scheme = HTTPBearer(auto_error=False)


# -------------------------------------------------------------------- Hashing
def hash_password(password: str) -> str:
    data = password.encode("utf-8")
    if len(data) > 72:  # límite de bcrypt: evitar truncado silencioso
        raise ValueError("La contraseña no puede exceder 72 bytes")
    return bcrypt.hashpw(data, bcrypt.gensalt(rounds=12)).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    data = password.encode("utf-8")
    if len(data) > 72:
        return False
    try:
        return bcrypt.checkpw(data, password_hash.encode("utf-8"))
    except ValueError:
        return False


# Hash señuelo: iguala el tiempo de respuesta cuando el usuario no existe (anti user-enumeration)
_DUMMY_HASH = hash_password(secrets.token_urlsafe(16))


# ------------------------------------------------------------------------ JWT
def crear_access_token(usuario: models.Usuario) -> tuple[str, int]:
    expira = timedelta(minutes=JWT_EXPIRE_MINUTES)
    ahora = datetime.now(timezone.utc)
    payload = {
        "sub": str(usuario.id),
        "user_id": usuario.id,
        "distribuidor_id": usuario.distribuidor_id,
        "rol": usuario.rol,
        "username": usuario.username,
        "iat": ahora,
        "exp": ahora + expira,
    }
    token = jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
    return token, int(expira.total_seconds())


def _credenciales_invalidas(detalle: str = "Credenciales inválidas o sesión expirada") -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=detalle,
        headers={"WWW-Authenticate": "Bearer"},
    )


# --------------------------------------------------------------- Dependencies
def obtener_usuario_actual(
    request: Request,
    creds: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> schemas.UsuarioActual:
    """Valida el Bearer token y re-valida usuario/distribuidor contra la BD.

    El rol y el distribuidor_id efectivos se toman de la BD (no del token), de modo que
    desactivar un usuario o cambiarle el rol surte efecto inmediato.
    """
    cacheado = getattr(request.state, "usuario_actual", None)
    if cacheado is not None:  # ya resuelto por la dependencia global en este mismo request
        return cacheado
    if creds is None or creds.scheme.lower() != "bearer":
        raise _credenciales_invalidas("Token no suministrado")
    try:
        payload = jwt.decode(
            creds.credentials,
            JWT_SECRET_KEY,
            algorithms=[JWT_ALGORITHM],
            options={"require": ["exp", "sub"]},
        )
        user_id = int(payload["sub"])
    except (jwt.PyJWTError, ValueError, KeyError):
        raise _credenciales_invalidas()

    usuario = db.get(models.Usuario, user_id)
    if usuario is None or not usuario.activo:
        raise _credenciales_invalidas("Usuario inexistente o inactivo")

    if usuario.rol != ROL_SUPERADMIN:
        dist = db.get(models.Distribuidor, usuario.distribuidor_id) if usuario.distribuidor_id else None
        if dist is None or not dist.activo:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Distribuidor inactivo o pendiente de aprobación")

    actual = schemas.UsuarioActual(
        id=usuario.id,
        username=usuario.username,
        rol=usuario.rol,
        distribuidor_id=usuario.distribuidor_id,
    )
    request.state.usuario_actual = actual
    return actual


def requiere_superadmin(usuario: schemas.UsuarioActual = Depends(obtener_usuario_actual)) -> schemas.UsuarioActual:
    if usuario.rol != ROL_SUPERADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Se requiere rol SUPERADMIN")
    return usuario


# Rutas públicas (sin token)
RUTAS_PUBLICAS = {"/api/auth/login", "/docs", "/redoc", "/openapi.json", "/docs/oauth2-redirect"}

# Catálogos de costos de fábrica: lectura para cualquier usuario autenticado,
# escritura (POST/PUT/PATCH/DELETE) solo SUPERADMIN.
CATALOGOS_COSTOS = {"bujes", "mecanizados-totem", "brazos", "accesorios", "tubos", "laminas", "pinturas"}


def politica_de_acceso(request: Request, usuario: schemas.UsuarioActual) -> None:
    """Dependencia GLOBAL (FastAPI(dependencies=[...])): centraliza la política de acceso por ruta,
    incluidas las rutas legacy sin prefijo /api (p. ej. /tubos)."""
    path = request.url.path.rstrip("/") or "/"
    partes = [p for p in path.split("/") if p]
    if partes and partes[0] == "api":
        partes = partes[1:]
    if not partes:
        return
    if partes[0] == "admin":
        if usuario.rol != ROL_SUPERADMIN:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Se requiere rol SUPERADMIN")
    elif partes[0] in CATALOGOS_COSTOS and request.method not in ("GET", "HEAD", "OPTIONS"):
        if usuario.rol != ROL_SUPERADMIN:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Solo la fábrica puede modificar costos base")


def acceso_global(request: Request, db: Session = Depends(get_db)) -> None:
    """Punto de entrada de la dependencia global: omite rutas públicas y preflight CORS."""
    if request.method == "OPTIONS" or request.url.path.rstrip("/") in RUTAS_PUBLICAS:
        return
    # Resolvemos manualmente (las dependencias globales no pueden condicionar sub-dependencias).
    auth_header = request.headers.get("authorization", "")
    scheme, _, token = auth_header.partition(" ")
    creds = HTTPAuthorizationCredentials(scheme=scheme, credentials=token) if token else None
    usuario = obtener_usuario_actual(request, creds, db)
    politica_de_acceso(request, usuario)


# ------------------------------------------------------------ Helpers de datos
def obtener_fabrica(db: Session) -> models.Distribuidor:
    fabrica = db.query(models.Distribuidor).filter(models.Distribuidor.es_fabrica.is_(True)).first()
    if fabrica is None:
        raise HTTPException(status_code=500, detail="No existe el distribuidor de fábrica")
    return fabrica


def resolver_distribuidor_id(usuario: schemas.UsuarioActual, db: Session, solicitado: Optional[int] = None) -> int:
    """Distribuidor sobre el que opera el usuario.
    DISTRIBUIDOR: siempre el suyo (se ignora `solicitado`). SUPERADMIN: `solicitado` o la fábrica."""
    if usuario.rol == ROL_DISTRIBUIDOR:
        return usuario.distribuidor_id
    return solicitado or obtener_fabrica(db).id


# --------------------------------------------------------------------- Router
router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=schemas.TokenResponse)
def login(datos: schemas.LoginRequest, db: Session = Depends(get_db)):
    usuario = db.query(models.Usuario).filter(models.Usuario.username == datos.username.strip()).first()
    hash_a_verificar = usuario.password_hash if usuario else _DUMMY_HASH
    password_ok = verify_password(datos.password, hash_a_verificar)

    if usuario is None or not password_ok:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuario o contraseña incorrectos")
    if not usuario.activo:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Usuario inactivo")
    if usuario.rol != ROL_SUPERADMIN:
        dist = db.get(models.Distribuidor, usuario.distribuidor_id) if usuario.distribuidor_id else None
        if dist is None or not dist.activo:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Distribuidor inactivo o pendiente de aprobación")

    token, expira_en = crear_access_token(usuario)
    return schemas.TokenResponse(
        access_token=token,
        expires_in=expira_en,
        user_id=usuario.id,
        username=usuario.username,
        rol=usuario.rol,
        distribuidor_id=usuario.distribuidor_id,
    )


@router.get("/me", response_model=schemas.UsuarioActual)
def me(usuario: schemas.UsuarioActual = Depends(obtener_usuario_actual)):
    return usuario
