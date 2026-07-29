from schemas import CotizarTuberíaRequest, CotizarGabineteRequest

class CalculadoraService:

    @staticmethod
    def calcular_tuberias(datos: CotizarTuberíaRequest):
        detalles = []
        subtotal = 0.0

        for item in datos.tubos:
            # Cálculo base: metros * precio por metro
            costo_base = item.metros * item.precio_metro
            # Aplicación del multiplicador de margen
            precio_final_item = costo_base * datos.factor_margen
            
            subtotal += precio_final_item
            
            detalles.append({
                "descripcion": f"Tubo {item.forma} {item.tipo} Cal. {item.calibre} - {item.material} ({item.metros}m)",
                "cantidad": 1,
                "precio_unitario": round(precio_final_item, 2),
                "precio_total": round(precio_final_item, 2)
            })

        return {
            "items": detalles,
            "subtotal": round(subtotal, 2),
            "total": round(subtotal, 2) # Más adelante podemos añadir impuestos/IVA si aplica
        }

    @staticmethod
    def calcular_gabinete(datos: CotizarGabineteRequest):
        # Área aproximada de la estructura en m²: 2*(alto*ancho + alto*fondo + ancho*fondo) / 1000000
        area_m2 = 2 * ((datos.alto * datos.ancho) + (datos.alto * datos.fondo) + (datos.ancho * datos.fondo)) / 1000000.0
        
        costo_lamina = area_m2 * datos.precio_lamina
        costo_pintura = area_m2 * datos.precio_pintura
        costo_accesorios = datos.precio_chapa if datos.incluye_chapa else 0.0
        
        costo_base = costo_lamina + costo_pintura + costo_accesorios
        precio_final = costo_base * datos.factor_margen

        return {
            "area_m2": round(area_m2, 4),
            "costo_base": round(costo_base, 2),
            "precio_unitario": round(precio_final, 2),
            "precio_total": round(precio_final, 2)
        }