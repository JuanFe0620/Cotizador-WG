"""Generación de consecutivos aislados por distribuidor."""
from sqlalchemy.orm import Session

import models


def _distribuidor_bloqueado(db: Session, distribuidor_id: int) -> models.Distribuidor:
    dist = (
        db.query(models.Distribuidor)
        .filter(models.Distribuidor.id == distribuidor_id)
        .with_for_update()  # SELECT ... FOR UPDATE: serializa reservas concurrentes del mismo distribuidor
        .one_or_none()
    )
    if dist is None:
        raise ValueError(f"Distribuidor {distribuidor_id} no existe")
    return dist


def obtener_siguiente_consecutivo(db: Session, distribuidor_id: int) -> str:
    """Vista previa (NO reserva ni incrementa): prefijo + (último + 1)."""
    dist = db.get(models.Distribuidor, distribuidor_id)
    if dist is None:
        raise ValueError(f"Distribuidor {distribuidor_id} no existe")
    return f"{dist.prefijo_consecutivo}{dist.ultimo_numero_consecutivo + 1}"


def reservar_consecutivo(db: Session, distribuidor_id: int) -> str:
    """Reserva e incrementa atómicamente el consecutivo del distribuidor.

    Debe llamarse dentro de la MISMA transacción que inserta la cotización: el lock de fila
    se mantiene hasta el commit y, si la inserción falla, el rollback revierte el contador
    (sin huecos ni duplicados).
    """
    dist = _distribuidor_bloqueado(db, distribuidor_id)
    while True:
        dist.ultimo_numero_consecutivo += 1
        consecutivo = f"{dist.prefijo_consecutivo}{dist.ultimo_numero_consecutivo}"
        # Salvaguarda ante datos históricos/manuales que ya usen ese consecutivo
        existe = (
            db.query(models.Cotizacion.id)
            .filter(models.Cotizacion.distribuidor_id == distribuidor_id, models.Cotizacion.consecutivo == consecutivo)
            .first()
        )
        if not existe:
            db.flush()
            return consecutivo

