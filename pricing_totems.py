from sqlalchemy.orm import Session
import models
from pricing_laminas import obtener_precio_cm2_lamina
from pricing_accesorios import calcular_costo_accesorios_bd

CATALOGO_MECANIZADOS_TOTEM = {
    "videoportero": {
        "nombre": "Mecanizado Calado Videoportero / Control de Acceso (Láser + Bisel + Acrílico)",
        "es_lpr": False,
        "area_m2": 0.08,
    },
    "biometrico": {
        "nombre": "Mecanizado Lector Biométrico / Teclado (Corte Láser + Bisel Sobresaliente)",
        "es_lpr": False,
        "area_m2": 0.09,
    },
    "control_acceso": {
        "nombre": "Mecanizado Lector Biométrico / Control de Acceso",
        "es_lpr": False,
        "area_m2": 0.09,
    },
    "lpr": {
        "nombre": "Mecanizado Ventana LPR con Visera y Acrílico Polarizado",
        "es_lpr": True,
        "area_m2": 0.14,
    },
    "tapa_registro": {
        "nombre": "Tapa de Inspección / Registro Posterior con Chapa",
        "es_lpr": False,
        "area_m2": 0.12,
    },
}


def _normalizar_clave_mecanizado(valor: str, por_defecto: str = "videoportero") -> str:
    txt = str(valor or "").strip().lower()
    if not txt:
        return por_defecto
    if "lpr" in txt or "ventana" in txt or "camara" in txt or "pantalla" in txt:
        return "lpr"
    if "bio" in txt or "teclado" in txt or "lector" in txt or txt == "control_acceso":
        return "biometrico"
    if "tapa" in txt or "registro" in txt or "inspeccion" in txt or "chapa" in txt:
        return "tapa_registro"
    if "video" in txt or "portero" in txt or "calado" in txt:
        return "videoportero"
    return por_defecto


def _extraer_mecanizados_totem(params: dict) -> tuple[list[str], list[str]]:
    """Extrae las listas de mecanizados frontales (+Z) y traseros (-Z)."""
    # 1. Cara Frontal
    if isinstance(params.get("mecanizadosFrente"), list):
        cant_f = (
            int(params.get("cantidadMecanizadosFrente"))
            if params.get("cantidadMecanizadosFrente") is not None
            else len(params["mecanizadosFrente"])
        )
        frente = [
            _normalizar_clave_mecanizado(m, "videoportero")
            for m in params["mecanizadosFrente"][: max(0, cant_f)]
        ]
    elif params.get("cantidadMecanizadosFrente") == 0:
        frente = []
    elif isinstance(params.get("modulos"), list) and len(params["modulos"]) > 0:
        frente = [
            _normalizar_clave_mecanizado(m, "videoportero")
            for m in params["modulos"][:2]
        ]
    elif params.get("tipoFrente"):
        tf = str(params["tipoFrente"]).strip().lower()
        if tf == "mixto":
            frente = ["videoportero", "biometrico"]
        else:
            frente = [_normalizar_clave_mecanizado(tf, "videoportero")]
    else:
        frente = ["videoportero"]

    # 2. Cara Trasera
    if isinstance(params.get("mecanizadosTraseros"), list):
        cant_t = (
            int(params.get("cantidadMecanizadosTraseros"))
            if params.get("cantidadMecanizadosTraseros") is not None
            else len(params["mecanizadosTraseros"])
        )
        trasera = [
            _normalizar_clave_mecanizado(m, "tapa_registro")
            for m in params["mecanizadosTraseros"][: max(0, cant_t)]
        ]
    elif params.get("cantidadMecanizadosTraseros") == 0 or params.get("tapaRegistro") is False:
        trasera = []
    else:
        trasera = ["tapa_registro"]

    return frente, trasera


def calcular_precio_totem(params: dict, db: Session, nivel_precio: int | None = None) -> dict:
    """
    Calcula el costo y precio de venta de un Tótem arquitectónico:
      1. Material lámina del cuerpo y visera superior según calibre.
      2. Costo fijo base de fabricación / doblez CNC.
      3. Base de anclaje paramétrica (anchoPlatina x fondoPlatina) + cartelas laterales perforadas.
      4. Mecanizados en Cara Frontal (+Z) y Cara Trasera (-Z) ($35,000 COP estándar, $50,000 COP LPR).
      5. Pintura electrostática y horneado.
    """
    if nivel_precio is None:
        nivel_precio = int(params.get("nivelPrecio") or params.get("nivel_precio") or 1)
    factor_margen = 1.55 if nivel_precio == 1 else 1.70

    # 1. Dimensiones del cuerpo del tótem (en cm)
    alto_cm = float(params.get("alto") or params.get("alto_cm") or 150.0)
    ancho_cm = float(params.get("ancho") or params.get("ancho_cm") or 25.0)
    fondo_cm = float(params.get("fondo") or params.get("fondo_cm") or 15.0)

    alto_m = alto_cm / 100.0
    ancho_m = ancho_cm / 100.0
    fondo_m = fondo_cm / 100.0

    medidas_texto = f"{int(alto_cm)} x {int(ancho_cm)} x {int(fondo_cm)} cm"

    # Área desarrollada del prisma + visera superior si está activa
    incluye_visera = params.get("viseraSuperior") is not False
    area_superficial_m2 = 2.0 * ((ancho_m * alto_m) + (ancho_m * fondo_m) + (alto_m * fondo_m))
    if incluye_visera:
        area_superficial_m2 += ancho_m * 0.12

    factor_desarrollo = float(params.get("factorDesarrolloLamina", 1.25) or 1.25)
    area_desarrollada_cm2 = (area_superficial_m2 * 10000.0) * factor_desarrollo

    lamina_id = params.get("laminaId") or params.get("lamina_id") or params.get("calibre")
    precio_cm2_cuerpo = obtener_precio_cm2_lamina(lamina_id, db)
    costo_lamina_cuerpo = area_desarrollada_cm2 * precio_cm2_cuerpo

    # Costo fijo base de fabricación / corte láser / doblez estructural
    costo_fabricacion_fijo = float(
        params.get("costoFabricacionFijo")
        if params.get("costoFabricacionFijo") is not None
        else params.get("costo_fabricacion_fijo", 80000.0)
    )

    # Factor multiplicador de estructura (x2) para reflejar costos reales de fabricación
    costo_estructura_base = (costo_lamina_cuerpo + costo_fabricacion_fijo) * 2.0

    # 2. Base rectangular paramétrica (anchoPlatina x fondoPlatina) y cartelas laterales en X
    obj_base = params.get("baseAnclaje") if isinstance(params.get("baseAnclaje"), dict) else params.get("platinaBase", {})
    incluye_base = params.get("incluirBase")
    if incluye_base is None:
        incluye_base = params.get("incluirPlatina")
    if incluye_base is None and isinstance(obj_base, dict):
        incluye_base = obj_base.get("incluir")
    if incluye_base is None:
        incluye_base = True

    accesorios_venta = []
    costo_accesorios_total_venta = 0.0
    area_base_m2 = 0.0

    if bool(incluye_base):
        ancho_platina_cm = float(
            params.get("anchoPlatina")
            or params.get("anchoBase")
            or params.get("ladoBase")
            or obj_base.get("anchoPlatina")
            or (ancho_cm + 16.0)
        )
        fondo_platina_cm = float(
            params.get("fondoPlatina")
            or params.get("fondoBase")
            or obj_base.get("fondoPlatina")
            or (fondo_cm + 10.0)
        )

        pares_cartelas = int(params.get("paresCartelas") or obj_base.get("paresCartelas") or 2)
        cant_cartelas = pares_cartelas * 2
        alto_cartela_cm = float(params.get("altoCartela") or obj_base.get("altoCartela") or 18.0)
        ala_cartela_cm = max((fondo_platina_cm - fondo_cm) / 2.0, 6.0)

        lamina_base_id = (
            params.get("laminaAnclajeId")
            or params.get("laminaBaseId")
            or obj_base.get("laminaAnclajeId")
            or lamina_id
        )
        precio_cm2_base = obtener_precio_cm2_lamina(lamina_base_id, db)

        area_platina_cm2 = ancho_platina_cm * fondo_platina_cm
        area_cartelas_cm2 = cant_cartelas * (alto_cartela_cm * ala_cartela_cm)
        area_total_base_cm2 = area_platina_cm2 + area_cartelas_cm2

        area_base_m2 = (area_total_base_cm2 / 10000.0) * 2.0
        costo_maquinado_base = float(params.get("costoMaquinadoBase", 32000.0) or 32000.0)
        costo_base_bruto = (costo_maquinado_base + (area_total_base_cm2 * precio_cm2_base)) * 1.45
        p_base_venta = round(costo_base_bruto * factor_margen)

        costo_accesorios_total_venta += p_base_venta
        accesorios_venta.append({
            "id": "platina_base_totem",
            "nombre": f"Base Anclaje ({int(ancho_platina_cm)}x{int(fondo_platina_cm)} cm) + {pares_cartelas} Pares Cartelas Frontal/Trasera",
            "cantidad": 1,
            "precioUnitario": p_base_venta,
            "precio": p_base_venta,
            "total": p_base_venta,
        })

    # 3. Costo por cada hueco / mecanizado seleccionado (Frente y Posterior) con sincronización dinámica de BD
    costo_hueco_estandar = float(params.get("costoHuecoEstandar", 35000.0) or 35000.0)
    costo_modulo_lpr = float(params.get("costoModuloLpr", 50000.0) or 50000.0)

    catalogo_mecanizados = dict(CATALOGO_MECANIZADOS_TOTEM)
    try:
        if hasattr(models, 'MecanizadoTotem'):
            mecanizados_bd = db.query(models.MecanizadoTotem).all()
            for m in mecanizados_bd:
                catalogo_mecanizados[m.clave] = {
                    "nombre": m.nombre,
                    "es_lpr": m.es_lpr,
                    "area_m2": m.area_m2,
                    "precio": m.precio
                }
    except Exception as e:
        print(f"⚠️ Error cargando MecanizadoTotem desde BD: {e}")

    mecanizados_frente, mecanizados_traseros = _extraer_mecanizados_totem(params)
    area_mecanizados_m2 = 0.0

    for idx, clave_mec in enumerate(mecanizados_frente):
        info = catalogo_mecanizados.get(clave_mec, catalogo_mecanizados.get("videoportero", CATALOGO_MECANIZADOS_TOTEM["videoportero"]))
        costo_unit_base = float(info.get("precio", costo_modulo_lpr if info["es_lpr"] else costo_hueco_estandar))
        area_mecanizados_m2 += float(info.get("area_m2", 0.08))
        p_venta_mec = round(costo_unit_base * factor_margen)

        costo_accesorios_total_venta += p_venta_mec
        accesorios_venta.append({
            "id": f"mecanizado_frente_{idx + 1}_{clave_mec}",
            "nombre": f"Frente #{idx + 1}: {info['nombre']}",
            "cantidad": 1,
            "precioUnitario": p_venta_mec,
            "precio": p_venta_mec,
            "total": p_venta_mec,
        })

    for idx, clave_mec in enumerate(mecanizados_traseros):
        info = catalogo_mecanizados.get(clave_mec, catalogo_mecanizados.get("tapa_registro", CATALOGO_MECANIZADOS_TOTEM["tapa_registro"]))
        costo_unit_base = float(info.get("precio", costo_modulo_lpr if info["es_lpr"] else costo_hueco_estandar))
        area_mecanizados_m2 += float(info.get("area_m2", 0.12))
        p_venta_mec = round(costo_unit_base * factor_margen)

        costo_accesorios_total_venta += p_venta_mec
        accesorios_venta.append({
            "id": f"mecanizado_trasero_{idx + 1}_{clave_mec}",
            "nombre": f"Posterior #{idx + 1}: {info['nombre']}",
            "cantidad": 1,
            "precioUnitario": p_venta_mec,
            "precio": p_venta_mec,
            "total": p_venta_mec,
        })

    # 3.1 Cámaras LPR Laterales (Izquierda / Derecha / Ambas)
    camara_lpr_lateral = str(
        params.get("camaraLPRLateral") or 
        params.get("camara_lpr_lateral") or 
        params.get("lprLateral") or 
        ""
    ).strip().lower()

    if camara_lpr_lateral in ["izquierda", "derecha", "ambas"]:
        cant_camaras = 2 if camara_lpr_lateral == "ambas" else 1
        info_cam = catalogo_mecanizados.get("camara_lpr_lateral", {
            "nombre": "Soporte y Mecanizado Cámara LPR Lateral",
            "precio": 65000.0,
            "area_m2": 0.05
        })
        costo_unit_cam = float(info_cam.get("precio", 65000.0))
        area_mecanizados_m2 += float(info_cam.get("area_m2", 0.05)) * cant_camaras
        p_unit_cam_venta = round(costo_unit_cam * factor_margen)
        total_cam_venta = p_unit_cam_venta * cant_camaras

        desc_lado = "Ambos Lados (Izq + Der)" if camara_lpr_lateral == "ambas" else ("Lado Izquierdo" if camara_lpr_lateral == "izquierda" else "Lado Derecho")

        costo_accesorios_total_venta += total_cam_venta
        accesorios_venta.append({
            "id": f"camara_lpr_lateral_{camara_lpr_lateral}",
            "nombre": f"Soporte y Mecanizado Cámara LPR Lateral ({desc_lado})",
            "cantidad": cant_camaras,
            "precioUnitario": p_unit_cam_venta,
            "precio": total_cam_venta,
            "total": total_cam_venta,
        })

    # 4. Accesorios adicionales de BD (si el usuario seleccionó alguno extra)
    valores_invalidos = {"", "none", "null", "ninguno", "0", "undefined", None}
    raw_acc_ids = list(params.get("accesoriosSeleccionados") or params.get("accesorios_lista") or [])
    acc_ids_manuales = []
    for a in raw_acc_ids:
        a_id = a.get("id") if isinstance(a, dict) else a
        if a_id and str(a_id).strip().lower() not in valores_invalidos:
            str_id = str(a_id).strip()
            if not str_id.startswith("mecanizado_") and not str_id.startswith("modulo_") and str_id != "platina_base_totem":
                if a_id not in acc_ids_manuales:
                    acc_ids_manuales.append(a_id)

    area_acc_bd_m2 = 0.0
    if acc_ids_manuales:
        cantidades_acc = dict(params.get("cantidadesAcc", {}))
        detalles_acc = dict(params.get("detallesAccesorios", {}))
        lista_acc_bd, area_acc_bd_m2 = calcular_costo_accesorios_bd(
            acc_ids_manuales, cantidades_acc, detalles_acc, lamina_id, db, 2.0, params
        )
        for item in lista_acc_bd:
            es_fijo = bool(item.get("es_fijo", False))
            p_unit = round(item.get("costo_unitario", 0) if es_fijo else item.get("costo_unitario", 0) * factor_margen)
            p_tot = round(item.get("total_item", 0) if es_fijo else item.get("total_item", 0) * factor_margen)
            costo_accesorios_total_venta += p_tot
            accesorios_venta.append({
                "id": item.get("id", "acc"),
                "nombre": item.get("nombre", "Accesorio"),
                "cantidad": item.get("cantidad", 1),
                "precioUnitario": p_unit,
                "precio": p_tot,
                "total": p_tot,
            })

    # 5. Pintura electrostática y horneado
    area_pintable_m2 = (area_superficial_m2 * 2.0) + area_base_m2 + area_mecanizados_m2 + area_acc_bd_m2
    precio_pintura_kg = float(params.get("precioPinturaKg", 24000.0) or 24000.0)
    rendimiento_m2_kg = float(params.get("rendimientoPinturaKgM2", 6.0) or 6.0)
    costo_pintura_m2 = precio_pintura_kg / rendimiento_m2_kg if rendimiento_m2_kg > 0 else 0.0

    recargo_horneado = float(params.get("recargoPinturaTotem", 35000.0) or 35000.0)
    costo_pintura_base = (area_pintable_m2 * costo_pintura_m2) + recargo_horneado

    # 6. Totales de venta
    costo_estructura_venta = round(costo_estructura_base * factor_margen)
    costo_pintura_venta = round(costo_pintura_base * factor_margen)
    costo_accesorios_venta = round(costo_accesorios_total_venta)

    precio_venta_final = costo_estructura_venta + costo_pintura_venta + costo_accesorios_venta

    return {
        "costo_base": round(costo_estructura_base + costo_pintura_base, 2),
        "costoEstructura": costo_estructura_venta,
        "costo_lamina_venta": costo_estructura_venta,
        "costo_tubos_venta": costo_estructura_venta,
        "costoPintura": costo_pintura_venta,
        "costo_pintura_venta": costo_pintura_venta,
        "costoAccesorios": costo_accesorios_venta,
        "costo_accesorios_venta": costo_accesorios_venta,
        "precio_venta": precio_venta_final,
        "total": precio_venta_final,
        "area_m2": round(area_pintable_m2, 2),
        "medidas_texto": medidas_texto,
        "accesorios_lista": accesorios_venta,
    }
