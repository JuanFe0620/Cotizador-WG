import math
from sqlalchemy.orm import Session

from pricing_laminas import obtener_precio_cm2_lamina
from pricing_tubos import calcular_area_postes
from pricing_accesorios import calcular_costo_accesorios_bd
from pricing_complementos import calcular_costo_complementos_bd

def calcular_item_cotizacion(categoria: str, params: dict, nivel_precio: int, db: Session) -> dict:
    
    factor_margen = 1.55 if nivel_precio == 1 else 1.70

    costo_material = 0.0
    area_tubo_m2 = 0.0
    diametro_tubo_principal = 2.0

    lamina_id = params.get("laminaId") or params.get("laminaAnclajeId") or params.get("lamina_id")
    cat_lower = (categoria or "").lower()

    cubicaje_m3 = 0.0

    if cat_lower in ["postes", "brazos"]:
        tramos = params.get("tramos", [])
        area_tubo_m2, costo_material, diametro_tubo_principal = calcular_area_postes(tramos, db)
        medidas_texto = f"{int(params.get('alto', 150))} cm"
    else:
        alto_cm = float(params.get("alto") or params.get("alto_cm") or 100)
        ancho_cm = float(params.get("ancho") or params.get("ancho_cm") or 50)
        fondo_cm = float(params.get("fondo") or params.get("fondo_cm") or 30)
        
        alto_m = alto_cm / 100.0
        ancho_m = ancho_cm / 100.0
        fondo_m = fondo_cm / 100.0
        
        cubicaje_m3 = alto_m * ancho_m * fondo_m
        
        area_tubo_m2 = 2.0 * ((ancho_m * alto_m) + (ancho_m * fondo_m) + (alto_m * fondo_m))
        area_gabinete_cm2 = area_tubo_m2 * 10000.0 * 2

        precio_cm2 = obtener_precio_cm2_lamina(lamina_id, db)
        costo_material = area_gabinete_cm2 * precio_cm2
        medidas_texto = f"{int(alto_cm)} x {int(ancho_cm)} x {int(fondo_cm)} cm"

    # 1. Obtener accesorios convencionales seleccionados
    acc_ids = params.get("accesoriosSeleccionados") or params.get("accesorios_lista") or []
    cantidades_acc = params.get("cantidadesAcc", {})
    detalles_acc = params.get("detallesAccesorios", {})
    
    lista_acc_base, area_acc_m2 = calcular_costo_accesorios_bd(
        acc_ids, cantidades_acc, detalles_acc, lamina_id, db, diametro_tubo_principal, params
    )

    # 2. Obtener complementos (Brazos PTZ/Rectos, Bujes, etc.)
    lista_complementos_base, area_comp_m2 = calcular_costo_complementos_bd(params, db)

    # Sumar las áreas para el cálculo de pintura electrostática
    area_acc_m2 += area_comp_m2

    # Unificar la lista para aplicar márgenes comerciales
    lista_todos_componentes = lista_acc_base + lista_complementos_base

    accesorios_venta = []
    costo_accesorios_total_venta = 0.0

    for item in lista_todos_componentes:
        if item.get("es_fijo", False):
            p_unit = round(item["costo_unitario"])
            p_tot = round(item["total_item"])
        else:
            p_unit = round(item["costo_unitario"] * factor_margen)
            p_tot = round(item["total_item"] * factor_margen)

        costo_accesorios_total_venta += p_tot

        accesorios_venta.append({
            "id": item["id"],
            "nombre": item["nombre"],
            "cantidad": item.get("cantidad", 1),
            "precioUnitario": p_unit,
            "precio": p_tot,
            "total": p_tot
        })

    # 3. Base / Platina de Anclaje
    area_base_m2 = 0.0
    obj_base = params.get("baseAnclaje") if isinstance(params.get("baseAnclaje"), dict) else params.get("platinaBase", {})

    if cat_lower in ["gabinetes", "totems"]:
        incluye_base = False
    else:
        incluye_base = bool(params.get("incluirBase") or params.get("incluirPlatina") or obj_base.get("incluir", False))

    if incluye_base:
        lado_raw = (
            params.get("diametroBase") or params.get("diametro") or params.get("ladoBase") or
            params.get("dimensionBase") or params.get("dimension") or params.get("lado") or
            params.get("platinaLargo") or obj_base.get("diametroBase") or obj_base.get("diametro") or
            obj_base.get("ladoBase") or obj_base.get("dimensionBase") or obj_base.get("lado") or obj_base.get("dimension")
        )
        try:
            dimension_base_cm = float(lado_raw) if lado_raw is not None else 20.0
        except (ValueError, TypeError):
            dimension_base_cm = 20.0

        forma_base = str(params.get("formaBase") or obj_base.get("formaBase") or obj_base.get("forma") or "Base Redonda").lower()

        lamina_base_id = (
            params.get("laminaAnclajeId") or params.get("laminaBaseId") or
            params.get("lamina_anclaje_id") or obj_base.get("laminaAnclajeId") or
            obj_base.get("laminaId") or lamina_id
        )
        precio_cm2_base = obtener_precio_cm2_lamina(lamina_base_id, db)

        precio_base_anclaje = 26000.0
        dim_m = dimension_base_cm / 100.0

        if "redonda" in forma_base or "circulo" in forma_base:
            area_placa_cm2 = math.pi * ((dimension_base_cm / 2.0) ** 2)
            area_placa_una_cara_m2 = math.pi * ((dim_m / 2.0) ** 2)
            texto_medida = f"⌀ {int(dimension_base_cm)} cm"
        else:
            area_placa_cm2 = dimension_base_cm * dimension_base_cm
            area_placa_una_cara_m2 = dim_m * dim_m
            texto_medida = f"{int(dimension_base_cm)}x{int(dimension_base_cm)} cm"

        incluye_pies = (
            params.get("incluirPiesAmigo") if params.get("incluirPiesAmigo") is not None else
            params.get("incluirPies") if params.get("incluirPies") is not None else
            obj_base.get("incluirPiesAmigo") if obj_base.get("incluirPiesAmigo") is not None else
            obj_base.get("incluirPies", True)
        )

        area_cartelas_cm2 = 0.0
        area_cartelas_una_cara_m2 = 0.0

        if incluye_pies:
            cant_pies = int(params.get("cantidadPies") or obj_base.get("cantidadPies") or obj_base.get("cantidad") or 4)
            alto_cartela_cm = float(params.get("altoCartela") or obj_base.get("altoCartela") or obj_base.get("alto") or 12.0)
            ancho_cartela_cm = dimension_base_cm / 3.0

            area_cartelas_cm2 = cant_pies * ((alto_cartela_cm * ancho_cartela_cm) / 2.0)
            alto_cartela_m = alto_cartela_cm / 100.0
            ancho_cartela_m = dim_m / 3.0
            area_cartelas_una_cara_m2 = cant_pies * ((alto_cartela_m * ancho_cartela_m) / 2.0)

        area_total_lamina_cm2 = area_placa_cm2 + area_cartelas_cm2
        costo_lamina_base = area_total_lamina_cm2 * precio_cm2_base
        area_base_m2 = (area_placa_una_cara_m2 + area_cartelas_una_cara_m2) * 2.0

        costo_base_bruto = (precio_base_anclaje + costo_lamina_base) * 1.6
        p_platina = round(costo_base_bruto * factor_margen)

        costo_accesorios_total_venta += p_platina
        accesorios_venta.append({
            "id": "platina_base",
            "nombre": f"Base / Platina Anclaje ({texto_medida})",
            "cantidad": 1,
            "precioUnitario": p_platina,
            "precio": p_platina,
            "total": p_platina
        })

    # Recálculo de platina guía al 10%
    precio_base_encontrada = 0.0
    for acc in accesorios_venta:
        if str(acc.get("id", "")).lower() == "platina_base":
            precio_base_encontrada = acc.get("total", 0.0)
            break

    if precio_base_encontrada > 0:
        for acc in accesorios_venta:
            nom_lower = str(acc.get("nombre", "")).lower()
            id_lower = str(acc.get("id", "")).lower()

            if "guia" in nom_lower or "guía" in nom_lower or "guia" in id_lower or "platina_guia" in id_lower:
                costo_accesorios_total_venta -= acc["total"]
                precio_10_porciento = round(precio_base_encontrada * 0.10)

                acc["precioUnitario"] = precio_10_porciento
                acc["precio"] = precio_10_porciento * acc.get("cantidad", 1)
                acc["total"] = precio_10_porciento * acc.get("cantidad", 1)

                costo_accesorios_total_venta += acc["total"]

    # 4. Cálculo final de Pintura y Totales
    area_pintable_real = area_tubo_m2 + area_base_m2 + area_acc_m2

    precio_pintura_kg = float(params.get("precioPinturaKg", 24000) or 24000)
    rendimiento = float(params.get("rendimientoPinturaKgM2", 6.0) or 6.0)
    costo_pintura_m2 = precio_pintura_kg / rendimiento if rendimiento > 0 else 0

    cat_param = params.get("categoria") or params.get("categoriaSel") or params.get("tipo") or ""
    cat_limpia = f"{categoria or ''} {cat_param}".lower().strip()

    es_brazo = "brazo" in cat_limpia or "brazos" in cat_limpia
    es_gabinete = "gabinete" in cat_limpia or "gabinetes" in cat_limpia
    es_poste = (
        any(k in cat_limpia for k in ["poste", "postes"]) or
        (bool(params.get("tramos")) and not es_brazo) or 
        (bool(params.get("alto")) and not bool(params.get("ancho")) and not es_gabinete)
    )

    if es_gabinete:
        recargo_fijo_pintura = 30000.0
    elif es_poste:
        recargo_fijo_pintura = 50000.0
    elif es_brazo:
        recargo_fijo_pintura = 5000.0
    else:
        recargo_fijo_pintura = 0.0

    costo_pintura_base = (area_pintable_real * costo_pintura_m2) + recargo_fijo_pintura

    costo_material_venta = round(costo_material * factor_margen)
    costo_pintura_venta = round(costo_pintura_base * factor_margen)

    # Si es gabinete y no supera el umbral de cubicaje, se resta el recargo fijo directamente en el valor de venta
    if es_gabinete:
        UMBRAL_CUBICAJE_M3 = 0.08
        if cubicaje_m3 < UMBRAL_CUBICAJE_M3:
            costo_pintura_venta = max(0, costo_pintura_venta - 30000)

    costo_accesorios_venta = round(costo_accesorios_total_venta)

    precio_venta_final = costo_material_venta + costo_pintura_venta + costo_accesorios_venta

    return {
        "costo_base": round(costo_material + costo_pintura_base, 2),
        "costoEstructura": costo_material_venta,
        "costo_lamina_venta": costo_material_venta,
        "costo_tubos_venta": costo_material_venta,
        "costoPintura": costo_pintura_venta,
        "costo_pintura_venta": costo_pintura_venta,
        "costoAccesorios": costo_accesorios_venta,
        "costo_accesorios_venta": costo_accesorios_venta,
        "precio_venta": precio_venta_final,
        "total": precio_venta_final,
        "area_m2": round(area_pintable_real, 2),
        "medidas_texto": medidas_texto,
        "accesorios_lista": accesorios_venta
    }