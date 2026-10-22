"""Cálculo de ítems 100% en el servidor: única fuente de verdad para /cotizar/item y /cotizaciones/guardar."""
from typing import Any, Dict, Optional, Tuple

from sqlalchemy.orm import Session

from margen import aplicar_margen_distribuidor
from seguridad_precios import nivel_precio_valido, sanear_params_cotizacion
from services import calcular_item_cotizacion


def _es_cubo_o_perno(acc: Dict[str, Any]) -> bool:
    texto = f"{acc.get('nombre', '')} {acc.get('id', '')}".lower()
    return "cubo" in texto or "perno" in texto


def _excluir_cubo_perno(resultado: Dict[str, Any]) -> Dict[str, Any]:
    """Regla comercial heredada del cotizador: en BRAZOS no se cobran cubos ni pernos (ver Resumen.jsx)."""
    lista = resultado.get("accesorios_lista")
    if not lista:
        return resultado
    filtrada = [a for a in lista if not _es_cubo_o_perno(a)]
    if len(filtrada) == len(lista):
        return resultado
    accesorios = sum(int(round(a.get("total") or 0)) for a in filtrada)
    estructura = int(round(resultado.get("costoEstructura") or 0))
    pintura = int(round(resultado.get("costoPintura") or 0))
    salida = dict(resultado)
    salida.update({
        "accesorios_lista": filtrada,
        "costoAccesorios": accesorios,
        "costo_accesorios_venta": accesorios,
        "precio_venta": estructura + pintura + accesorios,
        "total": estructura + pintura + accesorios,
    })
    return salida


def calcular_item_seguro(
    db: Session,
    categoria: str,
    params: Dict[str, Any],
    nivel_precio: Any,
    margen_pct: Optional[float] = None,
) -> Tuple[Dict[str, Any], float]:
    """Calcula un ítem ignorando cualquier precio del cliente.

    Devuelve (resultado_final, total_maquila_unitario):
      - resultado_final: con margen del distribuidor y sin costos internos si `margen_pct` no es None
        (usuario DISTRIBUIDOR); precio de fábrica tal cual si es None (SUPERADMIN).
      - total_maquila_unitario: precio de fábrica por unidad (piso para precios personalizados).
    """
    categoria = str(categoria or params.get("categoria") or "").strip().lower()
    limpios = sanear_params_cotizacion(params, db)
    if categoria == "gabinetes":
        limpios["incluirBase"] = False
        limpios["incluirPlatina"] = False
        limpios["incluirPiesAmigo"] = False

    resultado = calcular_item_cotizacion(
        categoria=categoria,
        params=limpios,
        nivel_precio=nivel_precio_valido(nivel_precio),
        db=db,
    )
    if "brazo" in categoria:
        resultado = _excluir_cubo_perno(resultado)
    maquila = float(resultado.get("total") or 0)
    if margen_pct is not None:
        resultado = aplicar_margen_distribuidor(resultado, margen_pct)
    return resultado, maquila
