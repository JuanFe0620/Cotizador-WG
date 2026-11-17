from sqlalchemy.orm import Session
import models

def obtener_precio_cm2_lamina(lamina_id, db: Session) -> float:
    if lamina_id is not None and str(lamina_id).strip() != "":
        lamina = None
        id_str = str(lamina_id).strip()
        
        if id_str.isdigit():
            lamina = db.query(models.Lamina).filter(models.Lamina.id == int(id_str)).first()
        if not lamina:
            lamina = db.query(models.Lamina).filter(models.Lamina.id == id_str).first()
        if not lamina:
            lamina = db.query(models.Lamina).filter(
                (models.Lamina.material.ilike(f"%{id_str}%")) | 
                (models.Lamina.calibre.ilike(f"%{id_str}%"))
            ).first()

        if lamina:
            precio = float(getattr(lamina, 'precio_entera', 0) or getattr(lamina, 'precio', 0) or 0)
            alto_cm = float(getattr(lamina, 'alto_m', 2.44) or 2.44) * 100.0
            ancho_cm = float(getattr(lamina, 'ancho_m', 1.22) or 1.22) * 100.0
            area_cm2 = alto_cm * ancho_cm

            if area_cm2 > 0 and precio > 0:
                return precio / area_cm2

    precio_lamina_defecto = 126400.0 
    return precio_lamina_defecto / (244.0 * 122.0)


def obtener_desglose_area_cofre_m2(alto_cm: float, ancho_cm: float, fondo_cm: float) -> dict:
    """Calcula el área adicional de lámina (m²) para un Cofre de Exteriores (Intemperie):
    - Techo / visera voladiza superior con doblez perimetral
    - Pestaña vierteaguas perimetral en el marco frontal
    - Bandeja / fondo falso interno desmontable
    """
    alto_m = max(0.0, float(alto_cm)) / 100.0
    ancho_m = max(0.0, float(ancho_cm)) / 100.0
    fondo_m = max(0.0, float(fondo_cm)) / 100.0

    # 1. Techo / visera voladiza (+4 cm ancho total, +4.5 cm fondo, doblez perimetral de 1.8 cm)
    ancho_visera_m = ancho_m + 0.04
    fondo_visera_m = fondo_m + 0.045
    area_visera_m2 = (ancho_visera_m * fondo_visera_m) + 0.018 * (ancho_visera_m + 2.0 * fondo_visera_m)

    # 2. Pestaña vierteaguas perimetral (canaleta frontal de ~4.5 cm de desarrollo)
    area_vierteaguas_m2 = 2.0 * (ancho_m + alto_m) * 0.045

    # 3. Bandeja / fondo falso interno desmontable (6 cm menos que alto/ancho + dobleces laterales de 1.5 cm)
    ancho_bandeja_m = max(0.0, ancho_m - 0.06)
    alto_bandeja_m = max(0.0, alto_m - 0.06)
    area_bandeja_m2 = (ancho_bandeja_m * alto_bandeja_m) + (2.0 * alto_bandeja_m * 0.015)

    total_adicional_m2 = area_visera_m2 + area_vierteaguas_m2 + area_bandeja_m2
    return {
        "area_visera_m2": round(area_visera_m2, 4),
        "area_vierteaguas_m2": round(area_vierteaguas_m2, 4),
        "area_bandeja_m2": round(area_bandeja_m2, 4),
        "total_adicional_m2": round(total_adicional_m2, 4),
    }


def calcular_area_gabinete_m2(
    alto_cm: float,
    ancho_cm: float,
    fondo_cm: float,
    tipo_gabinete: str = "estandar",
) -> float:
    """Devuelve el área equivalente de lámina en m² para un gabinete estándar o cofre de exteriores."""
    alto_m = max(0.0, float(alto_cm)) / 100.0
    ancho_m = max(0.0, float(ancho_cm)) / 100.0
    fondo_m = max(0.0, float(fondo_cm)) / 100.0

    area_base_m2 = 3.0 * ((ancho_m * alto_m) + (ancho_m * fondo_m) + (alto_m * fondo_m))
    if str(tipo_gabinete or "").strip().lower() == "cofre_exteriores":
        adicional = obtener_desglose_area_cofre_m2(alto_cm, ancho_cm, fondo_cm)
        return area_base_m2 + adicional["total_adicional_m2"]
    return area_base_m2