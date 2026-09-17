from sqlalchemy.orm import Session
import models

def calcular_costo_complementos_bd(params: dict, db: Session) -> tuple[list[dict], float]:
    """
    Busca dinámicamente cualquier complemento (Brazos en lista o individuales, 
    Bujes, Accesorios especiales) en la BD/Seed y marca los brazos como PRECIO FIJO.
    """
    complementos_calculados = []
    area_total_m2 = 0.0

    # 1. Extraer elementos tanto si vienen en listas (UI de brazos montados) como en variables simples
    items_brutos = []

    # Capturar listas de brazos/complementos pasadas desde el cliente
    listas_posibles = (
        params.get("brazosMontados") or 
        params.get("brazos") or 
        params.get("brazos_lista") or 
        params.get("complementos") or []
    )
    if isinstance(listas_posibles, list):
        items_brutos.extend(listas_posibles)

    # Capturar variables individuales
    objetos_individuales = [
        params.get("brazo"),
        params.get("brazoPTZ"),
        params.get("brazo_id"),
        params.get("bujeInicial"),
        params.get("bujeFinal"),
        params.get("buje")
    ]
    for obj in objetos_individuales:
        if obj and obj not in items_brutos:
            items_brutos.append(obj)

    # 2. Procesar cada elemento encontrado contra la BD / Seed
    for elemento in items_brutos:
        if not elemento:
            continue

        item_id = elemento.get("id") if isinstance(elemento, dict) else elemento
        if not item_id:
            continue

        costo_unitario = 0.0
        nombre_item = "Brazo / Complemento"
        area_m2 = 0.15
        
        # Marcado como FIJO por defecto para evitar la multiplicación del margen comercial
        es_fijo = True  

        # Intentar obtener datos directamente del objeto traído por el frontend
        if isinstance(elemento, dict):
            costo_unitario = float(
                elemento.get("precio") or 
                elemento.get("costo_total") or 
                elemento.get("costo") or 
                elemento.get("precioUnitario") or 0
            )
            nombre_item = elemento.get("nombre") or elemento.get("descripcion") or elemento.get("label") or nombre_item
            area_m2 = float(elemento.get("area_m2") or 0.15)
            if "es_fijo" in elemento:
                es_fijo = bool(elemento["es_fijo"])

        # Si no traía costo directo, consultar dinámicamente la BD/Seed por ID
        if costo_unitario == 0:
            registro_bd = None
            for modelo_name in ["Brazo", "Buje", "Accesorio", "Producto"]:
                modelo = getattr(models, modelo_name, None)
                if modelo is not None:
                    registro_bd = db.query(modelo).filter(modelo.id == item_id).first()
                    if registro_bd:
                        break

            if registro_bd:
                costo_unitario = float(
                    getattr(registro_bd, "precio", 0) or 
                    getattr(registro_bd, "costo", 0) or 
                    getattr(registro_bd, "costo_total", 0)
                )
                nombre_item = getattr(registro_bd, "nombre", None) or getattr(registro_bd, "descripcion", nombre_item)
                area_m2 = float(getattr(registro_bd, "area_m2", 0.15) or 0.15)
                if hasattr(registro_bd, "es_fijo") and getattr(registro_bd, "es_fijo") is not None:
                    es_fijo = bool(getattr(registro_bd, "es_fijo"))

        if costo_unitario > 0:
            cant = int(elemento.get("cantidad", 1)) if isinstance(elemento, dict) else 1
            area_total_m2 += (area_m2 * cant)

            complementos_calculados.append({
                "id": str(item_id),
                "nombre": nombre_item,
                "cantidad": cant,
                "costo_unitario": costo_unitario,
                "total_item": costo_unitario * cant,
                "es_fijo": es_fijo
            })

    return complementos_calculados, area_total_m2