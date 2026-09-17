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