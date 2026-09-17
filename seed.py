import csv
import os
from database import SessionLocal, engine, Base
import models


def sembrar_datos(db=None):
    """
    Función para sembrar la base de datos.
    Actualiza datos existentes y crea los faltantes.
    """
    hacer_close = False
    if db is None:
        db = SessionLocal()
        hacer_close = True

    try:
        # -------------------------------------------------------------
        # 1. SIEMBRA DE TUBOS
        # -------------------------------------------------------------
        if not db.query(models.Tubo).first():
            tubos = [
                models.Tubo(forma="redondo", material="CR", calibre="Calibre 22", diametro_pulg=0.875, precio_tira_6m=12000, categorias="postes,brazos"),
                models.Tubo(forma="redondo", material="CR", calibre="Calibre 20", diametro_pulg=0.875, precio_tira_6m=15000, categorias="postes,brazos"),
                models.Tubo(forma="redondo", material="CR", calibre="Calibre 18", diametro_pulg=0.875, precio_tira_6m=19500, categorias="postes,brazos"),
                
                models.Tubo(forma="redondo", material="CR", calibre="Calibre 22", diametro_pulg=1.0, precio_tira_6m=14200, categorias="postes,brazos"),
                models.Tubo(forma="redondo", material="CR", calibre="Calibre 20", diametro_pulg=1.0, precio_tira_6m=15700, categorias="postes,brazos"),
                models.Tubo(forma="redondo", material="CR", calibre="Calibre 18", diametro_pulg=1.0, precio_tira_6m=19500, categorias="postes,brazos"),
                
                models.Tubo(forma="redondo", material="CR", calibre="Calibre 22", diametro_pulg=1.25, precio_tira_6m=18000, categorias="postes,brazos"),
                models.Tubo(forma="redondo", material="CR", calibre="Calibre 20", diametro_pulg=1.25, precio_tira_6m=19000, categorias="postes,brazos"),
                models.Tubo(forma="redondo", material="CR", calibre="Calibre 18", diametro_pulg=1.25, precio_tira_6m=26000, categorias="postes,brazos"),
                
                models.Tubo(forma="redondo", material="CR", calibre="Calibre 22", diametro_pulg=0.5, precio_tira_6m=7100, categorias="postes,brazos"),
                models.Tubo(forma="redondo", material="CR", calibre="Calibre 18", diametro_pulg=1.5, precio_tira_6m=32500, categorias="postes,brazos"),
                
                models.Tubo(forma="redondo", material="CR", calibre="Calibre 18", diametro_pulg=2.0, precio_tira_6m=40000, categorias="postes,brazos"),
                models.Tubo(forma="redondo", material="CR", calibre="Calibre 16", diametro_pulg=2.0, precio_tira_6m=64000, categorias="postes,brazos"),
                models.Tubo(forma="redondo", material="CR", calibre="Calibre 14", diametro_pulg=2.0, precio_tira_6m=80000, categorias="postes,brazos"),
                
                models.Tubo(forma="redondo", material="CR", calibre="Calibre 16", diametro_pulg=2.5, precio_tira_6m=80200, categorias="postes,brazos"),
                models.Tubo(forma="redondo", material="CR", calibre="Calibre 14", diametro_pulg=2.5, precio_tira_6m=99000, categorias="postes,brazos"),
                
                models.Tubo(forma="redondo", material="CR", calibre="Calibre 14", diametro_pulg=3.0, precio_tira_6m=122100, categorias="postes,brazos"),
                models.Tubo(forma="redondo", material="CR", calibre="Calibre 14", diametro_pulg=4.0, precio_tira_6m=156000, categorias="postes,brazos"),
                
                # Cuadrados CR
                models.Tubo(forma="cuadrado", material="CR", calibre="Calibre 18", ancho_cm=2.5, alto_cm=2.5, precio_tira_6m=23500, categorias="postes,brazos"),
                models.Tubo(forma="cuadrado", material="CR", calibre="Calibre 16", ancho_cm=2.5, alto_cm=2.5, precio_tira_6m=32500, categorias="postes,brazos"),
                models.Tubo(forma="cuadrado", material="CR", calibre="Calibre 14", ancho_cm=2.5, alto_cm=2.5, precio_tira_6m=46000, categorias="postes,brazos"),
                models.Tubo(forma="cuadrado", material="CR", calibre="Calibre 18", ancho_cm=3.8, alto_cm=3.8, precio_tira_6m=36500, categorias="postes,brazos"),
                models.Tubo(forma="cuadrado", material="CR", calibre="Calibre 16", ancho_cm=3.8, alto_cm=3.8, precio_tira_6m=47000, categorias="postes,brazos"),
                
                # Cuadrados HR
                models.Tubo(forma="cuadrado", material="HR", calibre="Calibre 16", ancho_cm=10.0, alto_cm=10.0, precio_tira_6m=141000, categorias="postes,brazos"),
                models.Tubo(forma="cuadrado", material="HR", calibre="Calibre 14", ancho_cm=10.0, alto_cm=10.0, precio_tira_6m=171000, categorias="postes,brazos"),
                models.Tubo(forma="cuadrado", material="HR", calibre="Calibre 12", ancho_cm=10.0, alto_cm=10.0, precio_tira_6m=236000, categorias="postes,brazos")
            ]
            db.add_all(tubos)

        # -------------------------------------------------------------
        # 2. SIEMBRA DE LÁMINAS
        # -------------------------------------------------------------
        if not db.query(models.Lamina).first():
            laminas = [
                models.Lamina(material="Lámina CR", calibre="Calibre 14", precio_entera=186000, alto_m=2.44, ancho_m=1.22, categorias="gabinetes,totems"),
                models.Lamina(material="Lámina CR", calibre="Calibre 16", precio_entera=145000, alto_m=2.44, ancho_m=1.22, categorias="gabinetes,totems"),
                models.Lamina(material="Lámina CR", calibre="Calibre 18", precio_entera=110000, alto_m=2.44, ancho_m=1.22, categorias="gabinetes,totems"),
                models.Lamina(material="Lámina CR", calibre="Calibre 20", precio_entera=85000, alto_m=2.44, ancho_m=1.22, categorias="gabinetes,totems"),
                models.Lamina(material="Lámina CR", calibre="Calibre 22", precio_entera=70000, alto_m=2.44, ancho_m=1.22, categorias="gabinetes,totems"),
                models.Lamina(material="Lámina CR", calibre="Calibre 24", precio_entera=56000, alto_m=2.44, ancho_m=1.22, categorias="gabinetes,totems"),
                models.Lamina(material="Lámina CR", calibre="Calibre 26", precio_entera=41000, alto_m=2.44, ancho_m=1.22, categorias="gabinetes,totems"),
                
                models.Lamina(material="Lámina HR", calibre="2 mm", precio_entera=202000, alto_m=2.44, ancho_m=1.22, categorias="gabinetes,totems"),
                models.Lamina(material="Lámina HR", calibre="2.5 mm", precio_entera=250000, alto_m=2.44, ancho_m=1.22, categorias="gabinetes,totems"),
                models.Lamina(material="Lámina HR", calibre="3 mm", precio_entera=292000, alto_m=2.44, ancho_m=1.22, categorias="gabinetes,totems"),
                models.Lamina(material="Lámina HR", calibre="3.5 mm", precio_entera=339000, alto_m=2.44, ancho_m=1.22, categorias="gabinetes,totems"),
                models.Lamina(material="Lámina HR", calibre="4 mm", precio_entera=388000, alto_m=2.44, ancho_m=1.22, categorias="gabinetes,totems"),
                models.Lamina(material="Lámina HR", calibre="4.5 mm", precio_entera=437000, alto_m=2.44, ancho_m=1.22, categorias="gabinetes,totems"),
                models.Lamina(material="Lámina HR", calibre="6 mm", precio_entera=583000, alto_m=2.44, ancho_m=1.22, categorias="gabinetes,totems"),
                models.Lamina(material="Lámina HR", calibre="8 mm", precio_entera=780000, alto_m=2.44, ancho_m=1.22, categorias="gabinetes,totems"),
                models.Lamina(material="Lámina HR", calibre="9 mm", precio_entera=875000, alto_m=2.44, ancho_m=1.22, categorias="gabinetes,totems"),
                models.Lamina(material="Lámina HR", calibre="12 mm", precio_entera=1166000, alto_m=2.44, ancho_m=1.22, categorias="gabinetes,totems"),
                
                models.Lamina(material="Lámina GV", calibre="Calibre 16", precio_entera=186000, alto_m=2.44, ancho_m=1.22, categorias="gabinetes,totems"),
                models.Lamina(material="Lámina GV", calibre="Calibre 18", precio_entera=148000, alto_m=2.44, ancho_m=1.22, categorias="gabinetes,totems"),
                models.Lamina(material="Lámina GV", calibre="Calibre 20", precio_entera=110000, alto_m=2.44, ancho_m=1.22, categorias="gabinetes,totems"),
                models.Lamina(material="Lámina GV", calibre="Calibre 22", precio_entera=90000, alto_m=2.44, ancho_m=1.22, categorias="gabinetes,totems"),
                models.Lamina(material="Lámina GV", calibre="Calibre 24", precio_entera=71000, alto_m=2.44, ancho_m=1.22, categorias="gabinetes,totems"),
                models.Lamina(material="Lámina GV", calibre="Calibre 26", precio_entera=52000, alto_m=2.44, ancho_m=1.22, categorias="gabinetes,totems")
            ]
            db.add_all(laminas)

        # -------------------------------------------------------------
        # 3. SIEMBRA DE PINTURAS
        # -------------------------------------------------------------
        if not db.query(models.Pintura).first():
            pinturas = [
                models.Pintura(nombre="Azul Poliéster Electrostática", hex="#2563eb", precio_kg=24000, precio_m2=(24000/8)*5),
                models.Pintura(nombre="Negro Mate Electroestático", hex="#1e293b", precio_kg=24000, precio_m2=(24000/8)*5),
                models.Pintura(nombre="Gris Poliéster", hex="#64748b", precio_kg=22000, precio_m2=(22000/8)*5),
                models.Pintura(nombre="Blanco Brillante", hex="#f8fafc", precio_kg=26000, precio_m2=(26000/8)*5),
                models.Pintura(nombre="Amarillo Tráfico", hex="#eab308", precio_kg=25000, precio_m2=(25000/8)*5),
                models.Pintura(nombre="Verde Seguridad", hex="#22c55e", precio_kg=25000, precio_m2=(25000/8)*5)
            ]
            db.add_all(pinturas)

        # -------------------------------------------------------------
        # 4. SIEMBRA DE ACCESORIOS (Actualización dinámica)
        # -------------------------------------------------------------
        if hasattr(models, 'Accesorio'):
            accesorios_deseados = [
                {"nombre": "Cubo de Ensamble / Conector", "precio": 0, "categorias": "postes,brazos", "requiere_lamina": False, "permite_n_pies": False, "grupo_exclusion": None},
                {"nombre": "Kit Pernos Anclaje (4 unds)", "precio": 18000, "categorias": "totems,postes", "requiere_lamina": False, "permite_n_pies": False, "grupo_exclusion": None},
                {"nombre": "Soldadura Adicional / Refuerzo", "precio": 12000, "categorias": "totems,postes,brazos,gabinetes", "requiere_lamina": False, "permite_n_pies": False, "grupo_exclusion": None},
                {"nombre": "Platina Guía", "precio": 12000, "categorias": "postes,totems", "requiere_lamina": True, "permite_n_pies": False, "grupo_exclusion": "platina"},
                {"nombre": "Corona de Empalme", "precio": 0, "categorias": "postes", "requiere_lamina": True, "permite_n_pies": False, "grupo_exclusion": "corona"},
                {"nombre": "Refuerzos Horizontales (Piso)", "precio": 18000, "categorias": "gabinetes,totems", "requiere_lamina": True, "grupo_exclusion": None},
                {"nombre": "Ruedas Industriales (Juego x4)", "precio": 15000, "categorias": "gabinetes", "requiere_lamina": False, "permite_n_pies": False, "grupo_exclusion": None},
                {"nombre": "Parales Traseros de Rack", "precio": 25000, "categorias": "gabinetes", "requiere_lamina": False, "permite_n_pies": False, "grupo_exclusion": None}
            ]

            for acc in accesorios_deseados:
                existe = db.query(models.Accesorio).filter(models.Accesorio.nombre == acc["nombre"]).first()
                if existe:
                    for key, value in acc.items():
                        setattr(existe, key, value)
                else:
                    db.add(models.Accesorio(**acc))

        # -------------------------------------------------------------
        # 5. SIEMBRA DE BUJES (Actualización dinámica)
        # -------------------------------------------------------------
        if hasattr(models, 'Buje'):
            bujes_deseados = [
                {"nombre": "Base universal plana escualizable", "precio": 45500, "subtipo": "base", "categorias": "brazos"},
                {"nombre": "Buje Cónico Estándar", "precio": 15000, "subtipo": "ambos", "categorias": "brazos"},
                {"nombre": "Buje Reforzado de Carga", "precio": 30000, "subtipo": "punta", "categorias": "brazos"}
            ]

            for buje in bujes_deseados:
                existe = db.query(models.Buje).filter(models.Buje.nombre == buje["nombre"]).first()
                if existe:
                    for key, value in buje.items():
                        setattr(existe, key, value)
                else:
                    db.add(models.Buje(**buje))

        # -------------------------------------------------------------
        # 6. SIEMBRA DE BRAZOS MONTAJE (Actualización dinámica)
        # -------------------------------------------------------------
        if hasattr(models, 'Brazo'):
            brazos_deseados = [
                {
                    "nombre": "Cuello de Ganso PTZ (PTZganzoC18.glb)",
                    "codigo": "ptz_ganso",
                    "archivo_glb": "/models/PTZganzoC18.glb",
                    "precio": 100000,
                    "categorias": "postes"
                },
                {
                    "nombre": "Brazo Recto Estándar (BrazoRecto.glb)",
                    "codigo": "brazo_recto",
                    "archivo_glb": "/models/BrazoRecto.glb",
                    "precio": 65000,
                    "categorias": "postes"
                }
            ]

            for brazo in brazos_deseados:
                existe = db.query(models.Brazo).filter(models.Brazo.codigo == brazo["codigo"]).first()
                if existe:
                    for key, value in brazo.items():
                        setattr(existe, key, value)
                else:
                    db.add(models.Brazo(**brazo))

        db.commit()
        print("✅ Tubos, Láminas, Pinturas, Accesorios, Bujes y Brazos actualizados con éxito.")

    except Exception as e:
        db.rollback()
        print(f"❌ Error al poblar la base de datos: {e}")
    finally:
        if hacer_close:
            db.close()

if __name__ == "__main__":
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    sembrar_datos()