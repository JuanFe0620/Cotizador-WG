import math
from sqlalchemy.orm import Session
import models

def calcular_area_postes(tramos: list, db: Session) -> tuple[float, float, float]:
    area_total_m2 = 0.0
    costo_material_tubos = 0.0
    diametro_max_pulg = 2.0

    for idx, tramo in enumerate(tramos or []):
        tubo_id = tramo.get("tuboId") or tramo.get("tubo_id")
        try:
            alto_cm = float(tramo.get("alto") or tramo.get("largo") or 0)
        except (ValueError, TypeError):
            alto_cm = 0.0

        if tubo_id:
            tubo = None
            if str(tubo_id).isdigit():
                tubo = db.query(models.Tubo).filter(models.Tubo.id == int(tubo_id)).first()
            if not tubo:
                tubo = db.query(models.Tubo).filter(models.Tubo.id == str(tubo_id)).first()

            if tubo:
                try:
                    diam_pulg = float(getattr(tubo, 'diametro_pulg', 2.0) or 2.0)
                except (ValueError, TypeError):
                    diam_pulg = 2.0

                if idx == 0 or diam_pulg > diametro_max_pulg:
                    diametro_max_pulg = diam_pulg

                precio_tira = float(getattr(tubo, 'precio_tira_6m', 0) or getattr(tubo, 'precio', 0) or 0)
                costo_material_tubos += (precio_tira / 600.0) * alto_cm * 2

                radio_m = (diam_pulg * 0.0254) / 2.0
                alto_m = alto_cm / 100.0
                area_total_m2 += (2.0 * math.pi * radio_m * alto_m)

    return area_total_m2, round(costo_material_tubos, 2), diametro_max_pulg