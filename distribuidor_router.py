"""Endpoints de perfil del distribuidor y administración de distribuidores/usuarios."""
import json
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

import models
import schemas
from auth import (
    ROL_DISTRIBUIDOR,
    ROL_SUPERADMIN,
    ROL_VENDEDOR_WG,
    hash_password,
    obtener_fabrica,
    obtener_usuario_actual,
    requiere_superadmin,
    resolver_distribuidor_id,
)
from consecutivos import obtener_siguiente_consecutivo
from database import get_db

router = APIRouter(tags=["distribuidores"])


def _serializar_distribuidor(db: Session, dist: models.Distribuidor) -> schemas.DistribuidorOut:
    return schemas.DistribuidorOut(
        id=dist.id,
        nombre_comercial=dist.nombre_comercial,
        nit=dist.nit,
        telefono=dist.telefono,
        direccion=dist.direccion,
        correo=dist.correo,
        logo_url=dist.logo_url,
        margen_comercial_default=dist.margen_comercial_default or 0.0,
        prefijo_consecutivo=dist.prefijo_consecutivo,
        ultimo_numero_consecutivo=dist.ultimo_numero_consecutivo,
        siguiente_consecutivo=obtener_siguiente_consecutivo(db, dist.id),
        activo=dist.activo,
        es_fabrica=dist.es_fabrica,
        personal=[schemas.PersonalOut.model_validate(p) for p in dist.personal],
    )


# ----------------------------------------------------------------- Mi perfil
@router.get("/api/distribuidor/mi-perfil", response_model=schemas.DistribuidorOut)
def obtener_mi_perfil(
    distribuidor_id: Optional[int] = Query(None, description="Solo SUPERADMIN: perfil de otro distribuidor"),
    usuario: schemas.UsuarioActual = Depends(obtener_usuario_actual),
    db: Session = Depends(get_db),
):
    dist = db.get(models.Distribuidor, resolver_distribuidor_id(usuario, db, distribuidor_id))
    if dist is None:
        raise HTTPException(404, "Distribuidor no encontrado")
    return _serializar_distribuidor(db, dist)


@router.put("/api/distribuidor/mi-perfil", response_model=schemas.DistribuidorOut)
def actualizar_mi_perfil(
    datos: schemas.PerfilUpdate,
    distribuidor_id: Optional[int] = Query(None, description="Solo SUPERADMIN: editar otro distribuidor"),
    usuario: schemas.UsuarioActual = Depends(obtener_usuario_actual),
    db: Session = Depends(get_db),
):
    if usuario.rol == ROL_VENDEDOR_WG:
        raise HTTPException(403, "Los usuarios internos WG no pueden modificar el perfil de la fábrica")
    dist = db.get(models.Distribuidor, resolver_distribuidor_id(usuario, db, distribuidor_id))
    if dist is None:
        raise HTTPException(404, "Distribuidor no encontrado")

    cambios = datos.model_dump(exclude_unset=True, exclude={"personal"})
    for campo, valor in cambios.items():
        if valor is None and campo in ("nombre_comercial", "prefijo_consecutivo", "margen_comercial_default"):
            continue  # columnas NOT NULL: ignorar nulls explícitos
        setattr(dist, campo, valor)

    # Personal: sincronización completa por id (crear / actualizar / eliminar los ausentes)
    if datos.personal is not None:
        actuales = {p.id: p for p in dist.personal}
        conservar = set()
        for item in datos.personal:
            if item.id is not None:
                existente = actuales.get(item.id)
                if existente is None:  # id de otro distribuidor o inexistente
                    raise HTTPException(404, f"Personal {item.id} no pertenece a este distribuidor")
                existente.tipo, existente.nombre = item.tipo, item.nombre.strip()
                conservar.add(item.id)
            else:
                dist.personal.append(models.PersonalDistribuidor(tipo=item.tipo, nombre=item.nombre.strip()))
        for pid, p in actuales.items():
            if pid not in conservar:
                dist.personal.remove(p)  # delete-orphan

    db.commit()
    db.refresh(dist)
    return _serializar_distribuidor(db, dist)


# ------------------------------------------------------- Administración (SUPERADMIN)
@router.get("/api/admin/distribuidores", response_model=List[schemas.DistribuidorOut])
def listar_distribuidores(_: schemas.UsuarioActual = Depends(requiere_superadmin), db: Session = Depends(get_db)):
    return [_serializar_distribuidor(db, d) for d in db.query(models.Distribuidor).order_by(models.Distribuidor.id).all()]


@router.post("/api/admin/distribuidores", response_model=schemas.DistribuidorOut, status_code=201)
def crear_distribuidor(datos: schemas.DistribuidorCreate, _: schemas.UsuarioActual = Depends(requiere_superadmin), db: Session = Depends(get_db)):
    dist = models.Distribuidor(**datos.model_dump(), es_fabrica=False)
    db.add(dist)
    db.commit()
    db.refresh(dist)
    return _serializar_distribuidor(db, dist)


@router.patch("/api/admin/distribuidores/{distribuidor_id}/activo", response_model=schemas.DistribuidorOut)
def aprobar_o_desactivar_distribuidor(distribuidor_id: int, datos: schemas.ActivoUpdate, _: schemas.UsuarioActual = Depends(requiere_superadmin), db: Session = Depends(get_db)):
    dist = db.get(models.Distribuidor, distribuidor_id)
    if dist is None:
        raise HTTPException(404, "Distribuidor no encontrado")
    if dist.es_fabrica and not datos.activo:
        raise HTTPException(400, "No se puede desactivar la fábrica")
    dist.activo = datos.activo
    db.commit()
    return _serializar_distribuidor(db, dist)


def _serializar_usuario(db: Session, u: models.Usuario) -> schemas.UsuarioOut:
    personal_nombre = None
    if u.personal_id:
        p = db.get(models.PersonalDistribuidor, u.personal_id)
        personal_nombre = p.nombre if p else None
    return schemas.UsuarioOut(
        id=u.id,
        username=u.username,
        rol=u.rol,
        distribuidor_id=u.distribuidor_id,
        personal_id=u.personal_id,
        personal_nombre=personal_nombre,
        permisos_modulos=schemas.normalizar_permisos_modulos(u.permisos_modulos, u.rol),
        activo=u.activo,
    )


def _validar_personal_en_distribuidor(db: Session, personal_id: Optional[int], distribuidor_id: Optional[int]) -> None:
    if personal_id is None:
        return
    p = db.get(models.PersonalDistribuidor, personal_id)
    if p is None or p.distribuidor_id != distribuidor_id:
        raise HTTPException(400, "El asesor/personal seleccionado no pertenece a esta empresa")


@router.get("/api/admin/usuarios", response_model=List[schemas.UsuarioOut])
def listar_usuarios(
    rol: Optional[str] = Query(None, description="Filtrar por rol (ej. VENDEDOR_WG)"),
    _: schemas.UsuarioActual = Depends(requiere_superadmin),
    db: Session = Depends(get_db),
):
    query = db.query(models.Usuario)
    if rol:
        query = query.filter(models.Usuario.rol == rol)
    return [_serializar_usuario(db, u) for u in query.order_by(models.Usuario.id).all()]


@router.post("/api/admin/usuarios", response_model=schemas.UsuarioOut, status_code=201)
def crear_usuario(datos: schemas.UsuarioCreate, _: schemas.UsuarioActual = Depends(requiere_superadmin), db: Session = Depends(get_db)):
    distribuidor_id = datos.distribuidor_id
    personal_id = datos.personal_id
    permisos_json = None

    if datos.rol == ROL_DISTRIBUIDOR:
        if distribuidor_id is None or db.get(models.Distribuidor, distribuidor_id) is None:
            raise HTTPException(400, "Un usuario DISTRIBUIDOR requiere un distribuidor_id válido")
    elif datos.rol == ROL_VENDEDOR_WG:
        fabrica = obtener_fabrica(db)
        if distribuidor_id is not None and distribuidor_id != fabrica.id:
            raise HTTPException(400, "Un usuario VENDEDOR_WG debe pertenecer a la fábrica WG")
        distribuidor_id = fabrica.id
        _validar_personal_en_distribuidor(db, personal_id, distribuidor_id)
        permisos_norm = schemas.normalizar_permisos_modulos(datos.permisos_modulos, ROL_VENDEDOR_WG)
        permisos_json = json.dumps(permisos_norm, ensure_ascii=False)
    elif distribuidor_id is not None:
        raise HTTPException(400, "Un SUPERADMIN no pertenece a un distribuidor")

    try:
        pwd_hash = hash_password(datos.password)
    except ValueError as e:
        raise HTTPException(400, str(e))

    usuario = models.Usuario(
        username=datos.username.strip(),
        password_hash=pwd_hash,
        rol=datos.rol,
        distribuidor_id=distribuidor_id,
        personal_id=personal_id if datos.rol == ROL_VENDEDOR_WG else None,
        permisos_modulos=permisos_json,
        activo=True,
    )
    db.add(usuario)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "El username ya existe")
    db.refresh(usuario)
    return _serializar_usuario(db, usuario)


@router.put("/api/admin/usuarios/{usuario_id}", response_model=schemas.UsuarioOut)
def actualizar_usuario(
    usuario_id: int,
    datos: schemas.UsuarioUpdate,
    actual: schemas.UsuarioActual = Depends(requiere_superadmin),
    db: Session = Depends(get_db),
):
    usuario = db.get(models.Usuario, usuario_id)
    if usuario is None:
        raise HTTPException(404, "Usuario no encontrado")

    campos = datos.model_dump(exclude_unset=True)
    if "personal_id" in campos:
        _validar_personal_en_distribuidor(db, datos.personal_id, usuario.distribuidor_id)
        usuario.personal_id = datos.personal_id
    if "permisos_modulos" in campos and datos.permisos_modulos is not None:
        permisos_norm = schemas.normalizar_permisos_modulos(datos.permisos_modulos, usuario.rol)
        usuario.permisos_modulos = json.dumps(permisos_norm, ensure_ascii=False)
    if "activo" in campos and datos.activo is not None:
        if usuario.id == actual.id and not datos.activo:
            raise HTTPException(400, "No puedes desactivarte a ti mismo")
        usuario.activo = datos.activo
    if "password" in campos and datos.password:
        try:
            usuario.password_hash = hash_password(datos.password)
        except ValueError as e:
            raise HTTPException(400, str(e))

    db.commit()
    db.refresh(usuario)
    return _serializar_usuario(db, usuario)


@router.patch("/api/admin/usuarios/{usuario_id}/activo", response_model=schemas.UsuarioOut)
def activar_usuario(usuario_id: int, datos: schemas.ActivoUpdate, actual: schemas.UsuarioActual = Depends(requiere_superadmin), db: Session = Depends(get_db)):
    usuario = db.get(models.Usuario, usuario_id)
    if usuario is None:
        raise HTTPException(404, "Usuario no encontrado")
    if usuario.id == actual.id and not datos.activo:
        raise HTTPException(400, "No puedes desactivarte a ti mismo")
    usuario.activo = datos.activo
    db.commit()
    return _serializar_usuario(db, usuario)

