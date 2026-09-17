import math
from sqlalchemy.orm import Session
from pricing_laminas import obtener_precio_cm2_lamina

def calcular_costo_platina_guia(detalles_guia: dict, lamina_general_id, db: Session) -> float:
    medida_cm = float(
        detalles_guia.get('diametroBase') or 
        detalles_guia.get('ladoBase') or 
        detalles_guia.get('dimensionBase') or 
        detalles_guia.get('platinaLargo') or 20.0
    )

    tipo_forma = str(detalles_guia.get('formaBase') or '').lower()
    
    lamina_base_id = (
        detalles_guia.get("laminaId") or 
        detalles_guia.get("lamina_id") or 
        lamina_general_id
    )
    precio_cm2_base = obtener_precio_cm2_lamina(lamina_base_id, db)

    if 'circulo' in tipo_forma or 'redonda' in tipo_forma:
        area_placa_cm2 = math.pi * ((medida_cm / 2.0) ** 2)
    else:
        area_placa_cm2 = medida_cm * medida_cm

    incluye_pies = detalles_guia.get("incluirPiesAmigo", True)
    area_cartelas_cm2 = 0.0
    if incluye_pies:
        cant_pies = int(detalles_guia.get("cantidadPies") or 4)
        alto_cartela_cm = float(detalles_guia.get("altoCartela") or 12.0)
        ancho_cartela_cm = medida_cm / 3.0
        area_cartelas_cm2 = cant_pies * ((alto_cartela_cm * ancho_cartela_cm) / 2.0)

    base_corte_fabricacion = 26000.0
    costo_lamina_base = (area_placa_cm2 + area_cartelas_cm2) * precio_cm2_base
    costo_total_base = base_corte_fabricacion + costo_lamina_base

    return costo_total_base * 0.10