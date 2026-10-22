"""Margen comercial del distribuidor sobre el precio de maquila de fábrica."""
from typing import Any, Dict

# Campos de salida de calcular_item_cotizacion / calcular_precio_totem que son precios de maquila
_CAMPOS_ESTRUCTURA = ("costoEstructura", "costo_lamina_venta", "costo_tubos_venta")
_CAMPOS_PINTURA = ("costoPintura", "costo_pintura_venta")
_CAMPOS_ACCESORIOS = ("costoAccesorios", "costo_accesorios_venta")
# Datos internos de fábrica que un distribuidor nunca debe recibir
_CAMPOS_CONFIDENCIALES = ("desglose_brazo",)


def _escalar(valor: Any, factor: float) -> int:
    return int(round(float(valor or 0) * factor))


def aplicar_margen_distribuidor(resultado: Dict[str, Any], margen_pct: float) -> Dict[str, Any]:
    """Devuelve el resultado con `precio_final = precio_maquila * (1 + margen/100)` y SIN costos internos.

    - Cada componente (estructura, pintura, cada accesorio) se escala y redondea por separado y los
      totales se recalculan como suma, para que el desglose siempre cuadre con el total.
    - `costo_base` (costo bruto de fábrica) se reemplaza por el precio de venta del distribuidor.
    - Se elimina `desglose_brazo` (costos de materiales de fábrica).
    """
    factor = 1.0 + (float(margen_pct or 0.0) / 100.0)
    salida = {k: v for k, v in resultado.items() if k not in _CAMPOS_CONFIDENCIALES}

    estructura = _escalar(resultado.get("costoEstructura"), factor)
    pintura = _escalar(resultado.get("costoPintura"), factor)

    lista = []
    for acc in resultado.get("accesorios_lista") or []:
        cant = acc.get("cantidad", 1) or 1
        unit_orig = float(acc.get("precioUnitario") or 0)
        total_orig = float(acc.get("total") or acc.get("precio") or 0)
        unit = _escalar(unit_orig, factor)
        # Si el total original era unitario × cantidad, se conserva esa relación exacta
        total = int(unit * cant) if abs(unit_orig * cant - total_orig) < 1 else _escalar(total_orig, factor)
        lista.append({**acc, "precioUnitario": unit, "precio": total, "total": total})

    if resultado.get("accesorios_lista") is not None:
        accesorios = sum(a["total"] for a in lista)
        salida["accesorios_lista"] = lista
    else:
        accesorios = _escalar(resultado.get("costoAccesorios"), factor)

    total = estructura + pintura + accesorios

    for campo in _CAMPOS_ESTRUCTURA:
        salida[campo] = estructura
    for campo in _CAMPOS_PINTURA:
        salida[campo] = pintura
    for campo in _CAMPOS_ACCESORIOS:
        salida[campo] = accesorios
    salida["precio_venta"] = total
    salida["total"] = total
    salida["costo_base"] = estructura + pintura  # = precio de venta del distribuidor, no costo de fábrica
    salida["margen_comercial_pct"] = float(margen_pct or 0.0)
    return salida

