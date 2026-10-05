import math
import models
from sqlalchemy.orm import Session

from pricing_laminas import obtener_precio_cm2_lamina
from pricing_tubos import calcular_area_postes
from pricing_accesorios import calcular_costo_accesorios_bd
from pricing_complementos import calcular_costo_complementos_bd
from pricing_totems import calcular_precio_totem

def calcular_item_cotizacion(categoria: str, params: dict, nivel_precio: int, db: Session) -> dict:
    
    factor_margen = 1.55 if nivel_precio == 1 else 2.2

    costo_material = 0.0
    area_tubo_m2 = 0.0
    diametro_tubo_principal = 2.0

    lamina_id = params.get("laminaId") or params.get("laminaAnclajeId") or params.get("lamina_id")
    cat_lower = (categoria or "").lower().strip()
    cat_param = params.get("categoria") or params.get("categoriaSel") or params.get("tipo") or ""
    cat_limpia = f"{categoria or ''} {cat_param}".lower().strip()

    if cat_lower in ["totems", "totem"] or "totem" in cat_limpia:
        params_totem = {**params, "nivelPrecio": nivel_precio}
        return calcular_precio_totem(params_totem, db)

    es_brazo = "brazo" in cat_limpia or "brazos" in cat_limpia

    cubicaje_m3 = 0.0

    # PURGA DE CLAVES DE COMPLEMENTOS PARÁSITOS EN BRAZOS
    if es_brazo:
        params.pop("brazosMontados", None)
        params.pop("brazos_lista", None)
        params.pop("complementos", None)

    if cat_lower in ["postes", "brazos"] or es_brazo:
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
        
        area_tubo_m2 = 3 * ((ancho_m * alto_m) + (ancho_m * fondo_m) + (alto_m * fondo_m))
        area_gabinete_cm2 = area_tubo_m2 * 10000.0 * 2

        precio_cm2 = obtener_precio_cm2_lamina(lamina_id, db)
        costo_material = area_gabinete_cm2 * precio_cm2
        medidas_texto = f"{int(alto_cm)} x {int(ancho_cm)} x {int(fondo_cm)} cm"

    # -------------------------------------------------------------------------
    # 1. EXTRAER Y FILTRAR ACCESORIOS Y BUJES EXPLICITAMENTE
    # -------------------------------------------------------------------------
    valores_invalidos = ["", "none", "null", "sin_buje", "sin buje", "ninguno", "0", "undefined", None]
    
    # 1.1 Leer accesorios manuales
    raw_acc_ids = list(params.get("accesoriosSeleccionados") or params.get("accesorios_lista") or [])
    acc_ids_manuales = []
    for a in raw_acc_ids:
        a_id = a.get("id") if isinstance(a, dict) else a
        if a_id and str(a_id).strip().lower() not in valores_invalidos:
            if a_id not in acc_ids_manuales:
                acc_ids_manuales.append(a_id)

    # 1.1b Opciones directas de caperuza y videoportero en brazos
    if params.get("caperuzaBase") or params.get("cubreAnclaje") or params.get("caperuza"):
        if not any("caperuza" in str(a).lower() or "cubre" in str(a).lower() for a in acc_ids_manuales):
            acc_ids_manuales.append("Caperuza / Cubre-anclaje Embellecedora")

    if params.get("videoporteroPunta") or params.get("soporteVideoportero") or params.get("accesorioPunta") == "videoportero":
        if not any("videoportero" in str(a).lower() or "portero" in str(a).lower() for a in acc_ids_manuales):
            acc_ids_manuales.append("Soporte Caja Videoportero en Punta")

    # 1.2 Extraer bujes
    bujes_detectados = []
    claves_bujes = [
        "bujeInicialId", "bujeFinalId", "bujeBaseId", "bujePuntaId", 
        "bujeBase", "bujeFinal", "bujeInicial", "buje_inicial_id", "buje_final_id"
    ]

    for k in claves_bujes:
        val_b = params.get(k)
        if isinstance(val_b, dict):
            val_b = val_b.get("id") or val_b.get("nombre")
        if val_b and str(val_b).strip().lower() not in valores_invalidos:
            if val_b not in bujes_detectados:
                bujes_detectados.append(val_b)

    bujes_list_raw = params.get("bujesSeleccionados") or []
    for item_b in bujes_list_raw:
        item_id = item_b.get("id") if isinstance(item_b, dict) else item_b
        if item_id and str(item_id).strip().lower() not in valores_invalidos:
            if item_id not in bujes_detectados:
                bujes_detectados.append(item_id)

    cantidades_acc = dict(params.get("cantidadesAcc", {}))
    detalles_acc = dict(params.get("detallesAccesorios", {}))

    # A. Calcular Accesorios desde la tabla 'accesorios'
    lista_acc_base, area_acc_m2 = calcular_costo_accesorios_bd(
        acc_ids_manuales, cantidades_acc, detalles_acc, lamina_id, db, diametro_tubo_principal, params
    )

    # B. CONSULTA DIRECTA DE BUJES (Tabla 'bujes')
    lista_bujes_base = []
    if bujes_detectados:
        try:
            todos_bujes = db.query(models.Buje).all()
            bujes_db = []
            for b in todos_bujes:
                for b_det in bujes_detectados:
                    b_det_str = str(b_det).strip().lower()
                    if str(b.id) == b_det_str or b.nombre.strip().lower() == b_det_str:
                        if b not in bujes_db: bujes_db.append(b)
                        break
                    # Coincidencia por slug o palabras clave
                    slug = b.nombre.strip().lower().replace(" ", "_").replace("(", "").replace(")", "").replace("/", "_")
                    if b_det_str in slug or slug in b_det_str:
                        if b not in bujes_db: bujes_db.append(b)
                        break

            
            for b in bujes_db:
                # Lectura de precio segura contra errores de esquema
                precio_b = getattr(b, 'precio', getattr(b, 'precio_venta', getattr(b, 'costo', 15000.0)))
                lista_bujes_base.append({
                    "id": f"buje_{b.id}",
                    "nombre": f"Buje: {b.nombre}",
                    "cantidad": 1,
                    "costo_unitario": float(precio_b or 0.0),
                    "total_item": float(precio_b or 0.0),
                    "es_fijo": True
                })
        except Exception as err_bujes:
            print(f"[Advertencia] Error al consultar bujes en BD: {err_bujes}")

    # C. Complementos adicionales
    if es_brazo:
        lista_complementos_base, area_comp_m2 = [], 0.0
    else:
        lista_complementos_base, area_comp_m2 = calcular_costo_complementos_bd(params, db)

    # D. Unificar componentes (SOLO UNA VEZ)
    area_acc_m2 += area_comp_m2
    lista_todos_componentes = lista_acc_base + lista_bujes_base + lista_complementos_base

    accesorios_venta = []
    costo_accesorios_total_venta = 0.0

    for item in lista_todos_componentes:
        nom_lower = str(item.get("nombre", "")).lower()
        id_lower = str(item.get("id", "")).lower()
        
        # RESPETAR PRECIO FIJO EN BUJES, ROSITAS, BASES Y ACCESORIOS FIJOS
        es_fijo_o_buje = (
            item.get("es_fijo", False) or 
            "buje" in nom_lower or "buje" in id_lower or 
            "roseta" in nom_lower or "roseta" in id_lower or 
            "base" in nom_lower or "escualizable" in nom_lower or
            "cubo" in nom_lower or "soldadura" in nom_lower
        )

        if es_fijo_o_buje:
            p_unit = round(item.get("costo_unitario", 0))
            p_tot = round(item.get("total_item", 0))
        else:
            p_unit = round(item.get("costo_unitario", 0) * factor_margen)
            p_tot = round(item.get("total_item", 0) * factor_margen)

        costo_accesorios_total_venta += p_tot

        accesorios_venta.append({
            "id": item.get("id", "acc"),
            "nombre": item.get("nombre", "Accesorio"),
            "cantidad": item.get("cantidad", 1),
            "precioUnitario": p_unit,
            "precio": p_tot,
            "total": p_tot
        })

    # 3. Base / Platina de Anclaje
    area_base_m2 = 0.0
    obj_base = params.get("baseAnclaje") if isinstance(params.get("baseAnclaje"), dict) else params.get("platinaBase", {})

    if cat_lower in ["gabinetes", "totems", "brazos"] or es_brazo:
        incluye_base = bool(params.get("incluirBase") is True or params.get("incluirPlatina") is True or obj_base.get("incluir") is True)
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