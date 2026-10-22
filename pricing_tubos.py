import math
from sqlalchemy.orm import Session
import models

PRECIO_METRO_VARILLA_PIE = 14500.0  # Varilla Lisa 1/2" SAE 1020
DIAMETRO_VARILLA_M = 0.0127         # 12.7 mm (1/2")
COSTO_SOLDADURA_UNION_T = 15000.0   # 1 unión adicional en T
COSTO_SOLDADURA_PUNTO_PIE = 9000.0  # Por punto de soldadura en pie de amigo (2 puntos = $18.000)


def _buscar_tubo_bd(tubo_id, db: Session):
    if not tubo_id:
        return None
    tubo = None
    if str(tubo_id).isdigit():
        tubo = db.query(models.Tubo).filter(models.Tubo.id == int(tubo_id)).first()
    if not tubo:
        tubo = db.query(models.Tubo).filter(models.Tubo.id == str(tubo_id)).first()
    return tubo


def _calcular_costo_y_area_segmento_cm(longitud_cm: float, tubo, tramo_dict: dict = None) -> tuple[float, float, float]:
    """
    Retorna (area_m2, costo_base, diametro_equiv_pulg) para un segmento tubular de longitud_cm.
    """
    if longitud_cm <= 0:
        return 0.0, 0.0, 2.0

    tramo_dict = tramo_dict or {}
    forma = str(
        getattr(tubo, "forma", None) or tramo_dict.get("forma") or "redondo"
    ).lower()

    precio_tira = float(
        getattr(tubo, "precio_tira_6m", 0) or getattr(tubo, "precio", 0) or 40000.0
    ) if tubo else 40000.0

    costo_segmento = (precio_tira / 600.0) * longitud_cm * 2.0
    longitud_m = longitud_cm / 100.0

    if "cuad" in forma or "rect" in forma:
        try:
            ancho_cm = float(getattr(tubo, "ancho_cm", None) or tramo_dict.get("ancho_cm") or 4.0)
        except (ValueError, TypeError):
            ancho_cm = 4.0
        try:
            alto_cm = float(getattr(tubo, "alto_cm", None) or tramo_dict.get("alto_cm") or ancho_cm)
        except (ValueError, TypeError):
            alto_cm = ancho_cm

        perimetro_m = 2.0 * ((ancho_cm + alto_cm) / 100.0)
        area_m2 = perimetro_m * longitud_m
        diam_equiv_pulg = max(ancho_cm, alto_cm) / 2.54
    else:
        try:
            diam_pulg = float(
                getattr(tubo, "diametro_pulg", None) or tramo_dict.get("diametro_pulg") or tramo_dict.get("diametro") or 2.0
            )
        except (ValueError, TypeError):
            diam_pulg = 2.0

        radio_m = (diam_pulg * 0.0254) / 2.0
        area_m2 = 2.0 * math.pi * radio_m * longitud_m
        diam_equiv_pulg = diam_pulg

    return area_m2, costo_segmento, diam_equiv_pulg


def calcular_area_postes(tramos: list, db: Session, params: dict = None) -> tuple[float, float, float]:
    area_total_m2 = 0.0
    costo_material_tubos = 0.0
    diametro_max_pulg = 2.0
    params = params or {}

    tipo_brazo = str(params.get("tipoBrazo") or "SIMPLE_L").upper()
    es_brazo_t = tipo_brazo in ["T", "T_BILATERAL"]
    tramos_lista = list(tramos or [])

    ultimo_tubo_obj = None
    ultimo_tramo_dict = tramos_lista[-1] if tramos_lista else {}

    for idx, tramo in enumerate(tramos_lista):
        tubo_id = tramo.get("tuboId") or tramo.get("tubo_id")
        try:
            alto_cm = float(tramo.get("alto") or tramo.get("longitud") or tramo.get("largo") or 0)
        except (ValueError, TypeError):
            alto_cm = 0.0

        tubo = _buscar_tubo_bd(tubo_id, db)
        ultimo_tubo_obj = tubo or ultimo_tubo_obj

        if tubo or alto_cm > 0:
            area_seg, costo_seg, diam_pulg = _calcular_costo_y_area_segmento_cm(alto_cm, tubo, tramo)
            area_total_m2 += area_seg
            costo_material_tubos += costo_seg
            if idx == 0 or diam_pulg > diametro_max_pulg:
                diametro_max_pulg = diam_pulg

    # Si es Brazo en T: sumar el travesaño transversal al material tubular y área pintable
    if es_brazo_t:
        try:
            lon_travesano_cm = float(
                params.get("longitudTravesanoT") or params.get("longitudTravesanoTCm") or 50.0
            )
        except (ValueError, TypeError):
            lon_travesano_cm = 50.0

        area_trav, costo_trav, _ = _calcular_costo_y_area_segmento_cm(
            lon_travesano_cm, ultimo_tubo_obj, ultimo_tramo_dict
        )
        area_total_m2 += area_trav
        costo_material_tubos += costo_trav

    return area_total_m2, round(costo_material_tubos, 2), diametro_max_pulg


def evaluar_pie_de_amigo_activo_py(params: dict) -> bool:
    """
    El Pie de Amigo (varilla diagonal de refuerzo) se activa ÚNICAMENTE
    cuando el switch/checkbox conPieDeAmigo es explícitamente True.
    """
    return bool(params.get("conPieDeAmigo") is True)


def calcular_desglose_brazo_parametrico(params: dict, db: Session) -> dict:
    """
    Calcula internamente:
    - Travesaño T (si tipoBrazo == 'T') + 1 soldadura en T + 2 bujes en los extremos.
    - Varilla diagonal de refuerzo ("Pie de amigo", solo si conPieDeAmigo == True) + 2 puntos de soldadura.
    """
    tipo_brazo_raw = str(params.get("tipoBrazo") or "SIMPLE_L").upper()
    es_brazo_t = tipo_brazo_raw in ["T", "T_BILATERAL"]
    tipo_brazo = "T" if es_brazo_t else "SIMPLE_L"

    tramos = params.get("tramos") or []
    lon_tramo_0 = 60.0
    if tramos and isinstance(tramos[0], dict):
        try:
            lon_tramo_0 = float(tramos[0].get("alto") or tramos[0].get("longitud") or 60.0)
        except (ValueError, TypeError):
            lon_tramo_0 = 60.0

    longitud_travesano_cm = 0.0
    if es_brazo_t:
        try:
            longitud_travesano_cm = float(
                params.get("longitudTravesanoT") or params.get("longitudTravesanoTCm") or 50.0
            )
        except (ValueError, TypeError):
            longitud_travesano_cm = 50.0

    # 1. Pie de Amigo (solo si conPieDeAmigo === True)
    pie_amigo_activo = evaluar_pie_de_amigo_activo_py(params)
    longitud_varilla_cm = 0.0
    longitud_varilla_m = 0.0
    costo_varilla_base = 0.0
    area_varilla_m2 = 0.0

    if pie_amigo_activo:
        cateto_horizontal_cm = max(15.0, round(lon_tramo_0 * 0.65, 1))
        cateto_vertical_cm = max(18.0, min(40.0, round(lon_tramo_0 * 0.45, 1)))
        longitud_varilla_cm = math.sqrt((cateto_horizontal_cm ** 2) + (cateto_vertical_cm ** 2))
        longitud_varilla_m = longitud_varilla_cm / 100.0
        costo_varilla_base = longitud_varilla_m * PRECIO_METRO_VARILLA_PIE
        area_varilla_m2 = math.pi * DIAMETRO_VARILLA_M * longitud_varilla_m

    # 2. Soldaduras adicionales
    uniones_t = 1 if es_brazo_t else 0
    puntos_soldadura_pie = 2 if pie_amigo_activo else 0
    costo_soldadura_t = uniones_t * COSTO_SOLDADURA_UNION_T
    costo_soldadura_pie = puntos_soldadura_pie * COSTO_SOLDADURA_PUNTO_PIE

    # 3. Cantidad de bujes en punta: 2 si es Brazo en T, 1 si es Simple / En L
    cantidad_camaras = 2 if es_brazo_t else 1

    return {
        "tipo_brazo": tipo_brazo,
        "longitud_saliente_cm": round(lon_tramo_0, 1),
        "longitud_travesano_cm": round(longitud_travesano_cm, 1),
        "pie_amigo_activo": pie_amigo_activo,
        "longitud_varilla_cm": round(longitud_varilla_cm, 2),
        "longitud_varilla_m": round(longitud_varilla_m, 3),
        "nombre_varilla": 'Varilla de Refuerzo 1/2"',
        "costo_varilla_base": round(costo_varilla_base, 2),
        "area_varilla_m2": round(area_varilla_m2, 3),
        "uniones_t": uniones_t,
        "costo_soldadura_t": round(costo_soldadura_t, 2),
        "puntos_soldadura_pie": puntos_soldadura_pie,
        "costo_soldadura_pie": round(costo_soldadura_pie, 2),
        "cantidad_camaras": cantidad_camaras,
        "platinas_intermedias": 0,
        "costo_platinas_intermedias": 0.0,
    }
