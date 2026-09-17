import math
from sqlalchemy.orm import Session
import models
from pricing_laminas import obtener_precio_cm2_lamina
from pricing_anclajes import calcular_costo_platina_guia

def calcular_costo_accesorios_bd(
    accesorios_ids: list, 
    cantidades: dict, 
    detalles: dict, 
    lamina_general_id, 
    db: Session, 
    diametro_tubo_base: float = 2.0,
    params_globales: dict = None
) -> tuple[list, float]:
    
    lista_detallada = []
    area_adicional_pintura_m2 = 0.0
    params_globales = params_globales or {}

    obj_base_g = params_globales.get("baseAnclaje") if isinstance(params_globales.get("baseAnclaje"), dict) else {}
    if not obj_base_g and isinstance(params_globales.get("platinaBase"), dict):
        obj_base_g = params_globales.get("platinaBase")

    medida_base_raw = (
        params_globales.get("diametroBase") or 
        params_globales.get("diametro") or 
        params_globales.get("ladoBase") or 
        params_globales.get("dimensionBase") or 
        params_globales.get("dimension") or 
        params_globales.get("lado") or 
        obj_base_g.get("diametroBase") or 
        obj_base_g.get("diametro") or 
        obj_base_g.get("ladoBase") or 
        obj_base_g.get("dimensionBase") or 
        obj_base_g.get("lado") or 
        obj_base_g.get("dimension")
    )
    
    medida_base_real = float(medida_base_raw) if medida_base_raw is not None else 0.0
    forma_base_real = str(
        params_globales.get("formaBase") or obj_base_g.get("formaBase") or obj_base_g.get("forma") or "cuadrada"
    ).lower()

    for item_acc in (accesorios_ids or []):
        if isinstance(item_acc, dict):
            acc_id = item_acc.get("id") or item_acc.get("codigo")
            cant_item = item_acc.get("cantidad") or 1
            det_item = item_acc.get("detalles") or item_acc
        else:
            acc_id = item_acc
            cant_item = None
            det_item = {}

        if not acc_id:
            continue

        id_str = str(acc_id).lower()

        if id_str in ["platina_base", "platina_anclaje"]:
            continue

        cant = 1
        try:
            if cant_item is not None:
                cant = int(cant_item)
            else:
                cant = int(cantidades.get(str(acc_id)) or cantidades.get(acc_id) or 1)
        except (ValueError, TypeError):
            cant = 1

        det = detalles.get(str(acc_id)) or detalles.get(acc_id) or det_item or {}

        acc_db = None
        if hasattr(models, 'Accesorio'):
            if id_str.isdigit():
                acc_db = db.query(models.Accesorio).filter(models.Accesorio.id == int(acc_id)).first()
            if not acc_db:
                acc_db = db.query(models.Accesorio).filter(models.Accesorio.id == str(acc_id)).first()

        nombre_acc = getattr(acc_db, 'nombre', '') if acc_db else ''
        if not nombre_acc:
            if isinstance(item_acc, dict) and item_acc.get("nombre"):
                nombre_acc = item_acc.get("nombre")
            else:
                nombre_acc = str(acc_id).replace("acc_", "").replace("_", " ").title()

        precio_bd = float(getattr(acc_db, 'precio', 0) or getattr(acc_db, 'precio_unitario', 0) or 0)
        categoria_bd = str(getattr(acc_db, 'categoria', '') or '').lower()

        # ---------------------------------------------------------------------
        # ACCESORIO: BUJES (BASE Y PUNTA/CÁMARA)
        # ---------------------------------------------------------------------
        if "buje" in id_str or "buje" in nombre_acc.lower() or categoria_bd in ["buje", "bujes"]:
            es_fijo = True
            
            # Detectar subtipo o especificación (diámetro/posicion)
            subtipo = str(det.get("subtipo") or det.get("tipo") or "").lower()
            diametro_buje = float(det.get("diametro") or det.get("diametroBuje") or diametro_tubo_base)

            if "base" in subtipo or "base" in id_str or "base" in nombre_acc.lower():
                texto_med = f"Base - {diametro_buje}\""
                # Si no hay precio en BD, calcula según el tamaño de la base
                costo_unitario = precio_bd if precio_bd > 0 else (35000.0 if diametro_buje <= 2.0 else 48000.0)
            elif "punta" in subtipo or "camera" in subtipo or "ptz" in subtipo or "punta" in id_str or "ptz" in nombre_acc.lower():
                texto_med = f"Punta PTZ - {diametro_buje}\""
                costo_unitario = precio_bd if precio_bd > 0 else (28000.0 if diametro_buje <= 2.0 else 38000.0)
            else:
                texto_med = f"{diametro_buje}\""
                costo_unitario = precio_bd if precio_bd > 0 else 30000.0

        # ---------------------------------------------------------------------
        # ACCESORIO: PUERTA DE VIDRIO (CÁLCULO POR M2)
        # ---------------------------------------------------------------------
        elif any(k in id_str for k in ["puerta_vidrio", "vidrio"]) or "vidrio" in nombre_acc.lower():
            es_fijo = False
            
            # Captura dimensiones del gabinete desde params_globales
            alto_cm = float(params_globales.get("alto") or params_globales.get("alto_cm") or 100)
            ancho_cm = float(params_globales.get("ancho") or params_globales.get("ancho_cm") or 60)
            
            # Cálculo del área de la puerta en m²
            area_puerta_m2 = (alto_cm / 100.0) * (ancho_cm / 100.0)
            
            # Precio base por m² (traído de BD o valor por defecto)
            precio_m2_vidrio = precio_bd if precio_bd > 0 else 150000
            
            costo_unitario = area_puerta_m2 * precio_m2_vidrio
            texto_med = f"{area_puerta_m2:.2f} m²"

        # ---------------------------------------------------------------------
        # ACCESORIO: PARALES TRASEROS DE RACK (CÁLCULO POR METRO LINEAL)
        # ---------------------------------------------------------------------
        elif "paral" in id_str or "paral" in nombre_acc.lower() or "rack" in id_str:
            es_fijo = True
            
            alto_cm = float(params_globales.get("alto") or params_globales.get("alto_cm") or 100)
            alto_m = alto_cm / 100.0
            
            precio_metro = precio_bd if precio_bd > 0 else 25000.0
            costo_unitario = precio_metro * alto_m * 2.0
            texto_med = f"Par x {alto_m:.2f}m"

        # ---------------------------------------------------------------------
        # ACCESORIO: CORONA O EMPALME
        # ---------------------------------------------------------------------
        elif "corona" in id_str or "corona" in nombre_acc.lower() or "empalme" in id_str:
            es_fijo = False
            cant_perf = int(det.get("cantPerforaciones") or 4)

            lamina_acc_id = det.get("laminaId") or det.get("lamina_id") or lamina_general_id
            precio_cm2 = obtener_precio_cm2_lamina(lamina_acc_id, db)

            medida_cm = medida_base_real if medida_base_real > 0 else 20.0

            if "redonda" in forma_base_real or "circulo" in forma_base_real:
                area_corona_cm2 = math.pi * ((medida_cm / 2.0) ** 2)
                texto_med = f"⌀ {int(medida_cm)} cm - {cant_perf} perforaciones"
            else:
                area_corona_cm2 = medida_cm * medida_cm
                texto_med = f"{int(medida_cm)}x{int(medida_cm)} cm - {cant_perf} perforaciones"

            costo_material_corona = area_corona_cm2 * precio_cm2

            if cant_perf == 4:
                costo_fabricacion = 5000
            elif cant_perf == 6:
                costo_fabricacion = 9000
            elif cant_perf == 8:
                costo_fabricacion = 13000
            else:
                costo_fabricacion = 5000 + (cant_perf - 4) * 3000.0 

            costo_unitario = costo_fabricacion + costo_material_corona

            medida_m = medida_cm / 100.0
            if "redonda" in forma_base_real or "circulo" in forma_base_real:
                area_una_cara_m2 = math.pi * ((medida_m / 2.0) ** 2)
            else:
                area_una_cara_m2 = medida_m * medida_m

            area_adicional_pintura_m2 += (2.0 * area_una_cara_m2) * cant

        # ---------------------------------------------------------------------
        # ACCESORIO: PLATINA GUÍA
        # ---------------------------------------------------------------------
        elif "guia" in id_str or "guia" in nombre_acc.lower() or "guía" in nombre_acc.lower():
            es_fijo = False
            
            lamina_acc_id = (
                det.get("laminaId") or 
                det.get("lamina_id") or 
                params_globales.get("laminaAnclajeId") or 
                lamina_general_id
            )

            det_guia = {
                **det,
                "laminaId": lamina_acc_id,
                "diametroBase": medida_base_real,
                "formaBase": forma_base_real
            }

            costo_unitario = calcular_costo_platina_guia(det_guia, lamina_acc_id, db)
            
            medida_m = medida_base_real / 100.0
            if "redonda" in forma_base_real or "circulo" in forma_base_real:
                area_cara_m2 = math.pi * ((medida_m / 2.0) ** 2)
                texto_med = f"⌀ {int(medida_base_real)} cm"
            else:
                area_cara_m2 = medida_m * medida_m
                texto_med = f"{int(medida_base_real)}x{int(medida_base_real)} cm"

            area_adicional_pintura_m2 += (2.0 * area_cara_m2) * cant

        # ---------------------------------------------------------------------
        # ACCESORIO: CUBO / CONECTOR
        # ---------------------------------------------------------------------
        elif "cubo" in id_str or "cubo" in nombre_acc.lower() or "conector" in id_str:
            es_fijo = True
            costo_unitario = 25000.0 if diametro_tubo_base <= 1.0 else (45000.0 if diametro_tubo_base <= 2.0 else 60000.0)
            texto_med = ""

        # ---------------------------------------------------------------------
        # ACCESORIO: PERNOS Y SOLDADURA
        # ---------------------------------------------------------------------
        elif "kit pernos" in nombre_acc.lower() or "soldadura" in nombre_acc.lower():
            es_fijo = True
            costo_unitario = precio_bd if precio_bd > 0 else (18000.0 if "perno" in nombre_acc.lower() else 12000.0)
            texto_med = ""

        # ---------------------------------------------------------------------
        # ACCESORIO: RUEDAS
        # ---------------------------------------------------------------------
        elif "rueda" in id_str or "rueda" in nombre_acc.lower():
            es_fijo = True
            diametro = float(det.get("diametroRueda") or 2.5)

            if diametro == 1.5:
                precio_rueda_unitario = 10000.0
            elif diametro == 2:
                precio_rueda_unitario = 15000.0
            else:
                precio_rueda_unitario = 18000.0

            costo_unitario = precio_rueda_unitario
            texto_med = f"⌀ {int(diametro)}\""

        # ---------------------------------------------------------------------
        # ACCESORIOS GENERALES
        # ---------------------------------------------------------------------
        else:
            es_fijo = True if precio_bd > 0 else False
            costo_unitario = precio_bd if precio_bd > 0 else 15000.0
            texto_med = ""

        total_item = costo_unitario * cant

        lista_detallada.append({
            "id": acc_id,
            "nombre": f"{nombre_acc} ({texto_med})" if texto_med else nombre_acc,
            "cantidad": cant,
            "es_fijo": es_fijo,
            "costo_unitario": round(costo_unitario, 2),
            "total_item": round(total_item, 2)
        })

    return lista_detallada, area_adicional_pintura_m2