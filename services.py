import math
import models
from sqlalchemy.orm import Session

from pricing_laminas import obtener_precio_cm2_lamina
from pricing_tubos import calcular_area_postes, calcular_desglose_brazo_parametrico
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
    desglose_brazo = None

    # PURGA DE CLAVES DE COMPLEMENTOS PARÁSITOS EN BRAZOS
    if es_brazo:
        params.pop("brazosMontados", None)
        params.pop("brazos_lista", None)
        params.pop("complementos", None)
        desglose_brazo = calcular_desglose_brazo_parametrico(params, db)

    if cat_lower in ["postes", "brazos"] or es_brazo:
        tramos = params.get("tramos", [])
        area_tubo_m2, costo_material, diametro_tubo_principal = calcular_area_postes(
            tramos, db, params if es_brazo else None
        )
        if es_brazo and desglose_brazo:
            area_tubo_m2 += desglose_brazo["area_varilla_m2"]
            t_brazo = desglose_brazo["tipo_brazo"]
            if t_brazo in ["T", "T_BILATERAL"]:
                med_total = int(desglose_brazo["longitud_saliente_cm"] + desglose_brazo["longitud_travesano_cm"])
                medidas_texto = (
                    f"Brazo T: Saliente {int(desglose_brazo['longitud_saliente_cm'])} cm + "
                    f"Travesaño {int(desglose_brazo['longitud_travesano_cm'])} cm ({med_total} cm)"
                )
            elif desglose_brazo["pie_amigo_activo"]:
                medidas_texto = (
                    f"{int(desglose_brazo['longitud_saliente_cm'])} cm + "
                    f"Pie de Amigo {desglose_brazo['longitud_varilla_cm']:.1f} cm"
                )
            else:
                medidas_texto = f"{int(params.get('alto', 150))} cm"
        else:
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
    
    # 1.1 Leer accesorios manuales (excluyendo caperuza/videoportero de brazo que se liquidan con tarifa fija)
    raw_acc_ids = list(params.get("accesoriosSeleccionados") or params.get("accesorios_lista") or [])
    acc_ids_manuales = []
    for a in raw_acc_ids:
        a_id = a.get("id") if isinstance(a, dict) else a
        if a_id and str(a_id).strip().lower() not in valores_invalidos:
            a_lower = str(a_id).strip().lower()
            if es_brazo and ("caperuza" in a_lower or "cubre-anclaje" in a_lower or "videoportero" in a_lower):
                continue
            if a_id not in acc_ids_manuales:
                acc_ids_manuales.append(a_id)

    tiene_caperuza_brazo = bool(
        params.get("tieneCaperuza") or
        params.get("caperuzaEmbellecedora") or
        params.get("caperuzaBase") or
        params.get("cubreAnclaje") or
        params.get("caperuza")
    )
    tiene_videoportero_brazo = bool(
        params.get("tieneVideoportero") or
        params.get("accesorioVideoportero") or
        params.get("videoporteroPunta") or
        params.get("soporteVideoportero") or
        params.get("accesorioPunta") == "videoportero"
    )

    # 1.2 Extraer bujes (separando buje base vs buje final/cámaras para multiplicar por cantidadCamaras)
    buje_inicial_raw = (
        params.get("bujeInicialId") or params.get("bujeBaseId") or 
        params.get("bujeInicial") or params.get("bujeBase") or params.get("buje_inicial_id")
    )
    if isinstance(buje_inicial_raw, dict):
        buje_inicial_raw = buje_inicial_raw.get("id") or buje_inicial_raw.get("nombre")
    if buje_inicial_raw and str(buje_inicial_raw).strip().lower() in valores_invalidos:
        buje_inicial_raw = None

    buje_final_raw = (
        params.get("bujeFinalId") or params.get("bujePuntaId") or 
        params.get("bujeFinal") or params.get("bujePunta") or params.get("buje_final_id")
    )
    if isinstance(buje_final_raw, dict):
        buje_final_raw = buje_final_raw.get("id") or buje_final_raw.get("nombre")
    if buje_final_raw and str(buje_final_raw).strip().lower() in valores_invalidos:
        buje_final_raw = None

    cantidad_camaras_brazo = desglose_brazo["cantidad_camaras"] if (es_brazo and desglose_brazo) else 1

    bujes_detectados = []
    cantidades_bujes = {}

    if buje_inicial_raw:
        key_ini = str(buje_inicial_raw).strip()
        bujes_detectados.append(key_ini)
        cantidades_bujes[key_ini.lower()] = 1

    if buje_final_raw:
        key_fin = str(buje_final_raw).strip()
        if key_fin.lower() in cantidades_bujes:
            cantidades_bujes[key_fin.lower()] += cantidad_camaras_brazo
        else:
            bujes_detectados.append(key_fin)
            cantidades_bujes[key_fin.lower()] = cantidad_camaras_brazo

    # Fallback para otros bujes en bujesSeleccionados que no estén ya contabilizados
    bujes_list_raw = params.get("bujesSeleccionados") or []
    for item_b in bujes_list_raw:
        item_id = item_b.get("id") if isinstance(item_b, dict) else item_b
        if item_id and str(item_id).strip().lower() not in valores_invalidos:
            k_str = str(item_id).strip()
            if k_str.lower() not in cantidades_bujes:
                bujes_detectados.append(k_str)
                cantidades_bujes[k_str.lower()] = 1

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
            for b_det in bujes_detectados:
                b_det_str = str(b_det).strip().lower()
                cant_b = cantidades_bujes.get(b_det_str, 1)
                buje_match = None
                for b in todos_bujes:
                    if str(b.id) == b_det_str or b.nombre.strip().lower() == b_det_str:
                        buje_match = b
                        break
                    slug = b.nombre.strip().lower().replace(" ", "_").replace("(", "").replace(")", "").replace("/", "_")
                    if b_det_str in slug or slug in b_det_str:
                        buje_match = b
                        break

                if buje_match:
                    precio_b = float(
                        getattr(buje_match, 'precio', getattr(buje_match, 'precio_venta', getattr(buje_match, 'costo', 15000.0))) or 0.0
                    )
                    lista_bujes_base.append({
                        "id": f"buje_{buje_match.id}",
                        "nombre": f"Buje: {buje_match.nombre}",
                        "cantidad": cant_b,
                        "costo_unitario": precio_b,
                        "total_item": precio_b * cant_b,
                        "es_fijo": True
                    })
                elif b_det_str in ["platina_redonda", "platina_cuadrada", "videoportero_punta"]:
                    precio_fb = 45000.0 if "videoportero" in b_det_str else 22000.0
                    nom_fb = "Soporte Videoportero en Punta" if "videoportero" in b_det_str else b_det.replace("_", " ").title()
                    lista_bujes_base.append({
                        "id": f"buje_{b_det_str}",
                        "nombre": f"Buje: {nom_fb}",
                        "cantidad": cant_b,
                        "costo_unitario": precio_fb,
                        "total_item": precio_fb * cant_b,
                        "es_fijo": True
                    })
        except Exception as err_bujes:
            print(f"[Advertencia] Error al consultar bujes en BD: {err_bujes}")

    # B.2 ÍTEMS PARAMÉTRICOS ADICIONALES DEL BRAZO (Pie de Amigo, Soldaduras, Platinas Intermedias)
    lista_extras_brazo = []
    if es_brazo and desglose_brazo:
        # 1. Varilla / Perfil de refuerzo diagonal ("Pie de amigo")
        if desglose_brazo["pie_amigo_activo"] and desglose_brazo["costo_varilla_base"] > 0:
            lista_extras_brazo.append({
                "id": "varilla_pie_amigo",
                "nombre": (
                    f"Tensor Pie de Amigo ({desglose_brazo['nombre_varilla']} - "
                    f"L={desglose_brazo['longitud_varilla_cm']:.1f} cm)"
                ),
                "cantidad": 1,
                "costo_unitario": desglose_brazo["costo_varilla_base"],
                "total_item": desglose_brazo["costo_varilla_base"],
                "es_fijo": False  # Aplica margen sobre el material del perfil/varilla
            })

        # 2. Soldadura adicional en unión T (1 unión adicional en inglete o boca de pescado)
        if desglose_brazo["uniones_t"] > 0:
            unit_t = desglose_brazo["costo_soldadura_t"] / desglose_brazo["uniones_t"]
            lista_extras_brazo.append({
                "id": "soldadura_union_t",
                "nombre": "Soldadura Unión en T (Boca de pescado / Inglete)",
                "cantidad": desglose_brazo["uniones_t"],
                "costo_unitario": unit_t,
                "total_item": desglose_brazo["costo_soldadura_t"],
                "es_fijo": True
            })

        # 3. Puntos de soldadura en Pie de Amigo (2 puntos: platina mural y tubo)
        if desglose_brazo["puntos_soldadura_pie"] > 0:
            unit_pie = desglose_brazo["costo_soldadura_pie"] / desglose_brazo["puntos_soldadura_pie"]
            lista_extras_brazo.append({
                "id": "soldadura_pie_amigo",
                "nombre": "Puntos de Soldadura Pie de Amigo (Platina y Tubo)",
                "cantidad": desglose_brazo["puntos_soldadura_pie"],
                "costo_unitario": unit_pie,
                "total_item": desglose_brazo["costo_soldadura_pie"],
                "es_fijo": True
            })

        # 4. Caperuza / Cubre-anclaje Embellecedora (+ $25.000)
        if tiene_caperuza_brazo:
            lista_extras_brazo.append({
                "id": "caperuza_embellecedora",
                "nombre": "Caperuza / Cubre-anclaje Embellecedora",
                "cantidad": 1,
                "costo_unitario": 25000.0,
                "total_item": 25000.0,
                "es_fijo": True
            })

        # 5. Accesorio Videoportero en Punta de Brazo (+ $45.000)
        if tiene_videoportero_brazo:
            lista_extras_brazo.append({
                "id": "accesorio_videoportero_punta",
                "nombre": "Accesorio Videoportero en Punta de Brazo",
                "cantidad": 1,
                "costo_unitario": 45000.0,
                "total_item": 45000.0,
                "es_fijo": True
            })

    # C. Complementos adicionales
    if es_brazo:
        lista_complementos_base, area_comp_m2 = [], 0.0
    else:
        lista_complementos_base, area_comp_m2 = calcular_costo_complementos_bd(params, db)

    # D. Unificar componentes (SOLO UNA VEZ)
    area_acc_m2 += area_comp_m2
    lista_todos_componentes = lista_acc_base + lista_bujes_base + lista_extras_brazo + lista_complementos_base

    accesorios_venta = []
    costo_accesorios_total_venta = 0.0

    for item in lista_todos_componentes:
        nom_lower = str(item.get("nombre", "")).lower()
        id_lower = str(item.get("id", "")).lower()
        
        # RESPETAR PRECIO FIJO EN BUJES, ROSETAS, BASES, SOLDADURAS Y ACCESORIOS FIJOS
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

    respuesta = {
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
    if desglose_brazo:
        respuesta["desglose_brazo"] = desglose_brazo

    return respuesta
