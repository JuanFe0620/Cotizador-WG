"""Endpoints de perfil del distribuidor y administración de distribuidores/usuarios."""
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

import models
import schemas
from auth import (
    ROL_DISTRIBUIDOR,
    ROL_SUPERADMIN,
    hash_password,
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


@router.get("/api/admin/usuarios", response_model=List[schemas.UsuarioOut])
def listar_usuarios(_: schemas.UsuarioActual = Depends(requiere_superadmin), db: Session = Depends(get_db)):
    return db.query(models.Usuario).order_by(models.Usuario.id).all()


@router.post("/api/admin/usuarios", response_model=schemas.UsuarioOut, status_code=201)
def crear_usuario(datos: schemas.UsuarioCreate, _: schemas.UsuarioActual = Depends(requiere_superadmin), db: Session = Depends(get_db)):
    if datos.rol == ROL_DISTRIBUIDOR:
        if datos.distribuidor_id is None or db.get(models.Distribuidor, datos.distribuidor_id) is None:
            raise HTTPException(400, "Un usuario DISTRIBUIDOR requiere un distribuidor_id válido")
    elif datos.distribuidor_id is not None:
        raise HTTPException(400, "Un SUPERADMIN no pertenece a un distribuidor")
    try:
        pwd_hash = hash_password(datos.password)
    except ValueError as e:
        raise HTTPException(400, str(e))
    usuario = models.Usuario(username=datos.username, password_hash=pwd_hash, rol=datos.rol, distribuidor_id=datos.distribuidor_id, activo=True)
    db.add(usuario)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "El username ya existe")
    db.refresh(usuario)
    return usuario


@router.patch("/api/admin/usuarios/{usuario_id}/activo", response_model=schemas.UsuarioOut)
def activar_usuario(usuario_id: int, datos: schemas.ActivoUpdate, actual: schemas.UsuarioActual = Depends(requiere_superadmin), db: Session = Depends(get_db)):
    usuario = db.get(models.Usuario, usuario_id)
    if usuario is None:
        raise HTTPException(404, "Usuario no encontrado")
    if usuario.id == actual.id and not datos.activo:
        raise HTTPException(400, "No puedes desactivarte a ti mismo")
    usuario.activo = datos.activo
    db.commit()
    return usuario

