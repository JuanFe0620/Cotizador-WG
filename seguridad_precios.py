"""Blindaje de precios: el motor de cálculo nunca debe usar valores monetarios enviados por el cliente.

`sanear_params_cotizacion` elimina (a cualquier profundidad) toda clave de precio/costo/total del payload y
re-inyecta únicamente los valores vigentes leídos de la base de datos. Cada módulo de pricing ya cae a la
BD (o a constantes internas del servidor) cuando una clave no viene en `params`.
"""
import copy
import re
from typing import Any, Dict, Optional

from sqlalchemy.orm import Session

import models

# Claves (normalizadas: minúsculas, sin '_' ni '-') que son totales/flags de precio que el cliente no puede dictar
_CLAVES_EXACTAS = {"total", "subtotal", "totalitem", "valor", "valorunitario", "esfijo", "preciopersonalizado"}
_PREFIJOS_MONETARIOS = ("precio", "costo")  # precio*, costo* (preciokg, costoUnitario, costoFabricacionFijo, ...)

# Rendimiento de pintura (kg/m²): parámetro técnico, no un precio. Se acota a un rango físico razonable.
_RENDIMIENTO_MIN, _RENDIMIENTO_MAX = 3.0, 15.0


def _norm(clave: Any) -> str:
    return re.sub(r"[_\-\s]", "", str(clave)).lower()


def _es_clave_monetaria(clave: Any) -> bool:
    n = _norm(clave)
    return n in _CLAVES_EXACTAS or n.startswith(_PREFIJOS_MONETARIOS)


def _purgar(valor: Any) -> Any:
    if isinstance(valor, dict):
        return {k: _purgar(v) for k, v in valor.items() if not _es_clave_monetaria(k)}
    if isinstance(valor, list):
        return [_purgar(v) for v in valor]
    return valor


def _buscar_pintura(params: Dict[str, Any], db: Session) -> Optional[models.Pintura]:
    """Identifica la pintura elegida por id, nombre o color y devuelve el registro vigente de la BD."""
    pinturas = db.query(models.Pintura).all()
    pid = params.get("pinturaId") or params.get("pintura_id")
    nombre = str(params.get("nombrePintura") or params.get("pintura") or "").strip().lower()
    color = str(params.get("colorPintura") or "").strip().lower()

    if pid is not None:
        for p in pinturas:
            if str(p.id) == str(pid):
                return p
    if nombre:
        for p in pinturas:
            if (p.nombre or "").strip().lower() == nombre:
                return p
    if color:
        for p in pinturas:
            if (p.hex or "").strip().lower() == color:
                return p
    return None


def sanear_params_cotizacion(params: Dict[str, Any], db: Session) -> Dict[str, Any]:
    """Devuelve una copia de `params` sin ningún valor monetario del cliente y con la pintura de la BD."""
    limpios: Dict[str, Any] = _purgar(copy.deepcopy(dict(params)))

    pintura = _buscar_pintura(limpios, db)
    if pintura is not None and (pintura.precio_kg or 0) > 0:
        limpios["precioPinturaKg"] = float(pintura.precio_kg)
    # Si no se identifica la pintura, los módulos usan su constante interna del servidor (nunca el valor del cliente)

    if "rendimientoPinturaKgM2" in limpios:
        try:
            r = float(limpios["rendimientoPinturaKgM2"])
            limpios["rendimientoPinturaKgM2"] = min(max(r, _RENDIMIENTO_MIN), _RENDIMIENTO_MAX)
        except (TypeError, ValueError):
            limpios.pop("rendimientoPinturaKgM2")

    return limpios


def nivel_precio_valido(nivel: Any) -> int:
    try:
        n = int(nivel)
    except (TypeError, ValueError):
        return 1
    return n if n in (1, 2) else 1

