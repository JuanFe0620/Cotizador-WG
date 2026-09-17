from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, DateTime, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

class Cliente(Base):
    __tablename__ = "clientes"

    id = Column(Integer, primary_key=True, index=True)
    nit = Column(String, unique=True, index=True, nullable=False)
    nombre = Column(String, nullable=False)
    direccion = Column(String, nullable=True)
    telefono = Column(String, nullable=True)
    email = Column(String, nullable=True)


class Tubo(Base):
    __tablename__ = "tubos"

    id = Column(Integer, primary_key=True, index=True)
    forma = Column(String)  # 'redondo' o 'cuadrado'
    material = Column(String)  # 'CR', 'HR'
    calibre = Column(String)
    diametro_pulg = Column(String, nullable=True)  # Para redondos
    ancho_cm = Column(String, nullable=True)     # Para cuadrados
    alto_cm = Column(String, nullable=True)      # Para cuadrados
    precio_tira_6m = Column(Float)
    categorias = Column(String, default="")      # Guardado como string "postes,brazos"


class Lamina(Base):
    __tablename__ = "laminas"

    id = Column(Integer, primary_key=True, index=True)
    material = Column(String)  # 'Lámina CR', 'Lámina HR', 'Lámina GV'
    calibre = Column(String)
    precio_entera = Column(Float)
    alto_m = Column(Float, default=2.44)
    ancho_m = Column(Float, default=1.22)
    categorias = Column(String, default="")


class Pintura(Base):
    __tablename__ = "pinturas"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String)
    hex = Column(String)
    precio_kg = Column(Float)
    precio_m2 = Column(Float)
    categorias = Column(String, default="")


class Accesorio(Base):
    __tablename__ = "accesorios"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String, nullable=False)
    precio = Column(Float, nullable=False, default=0.0) # Precio fijo o base
    categorias = Column(String, default="")             # "postes,totems,brazos,gabinetes"
    
    # Campos para dinámicos/paramétricos
    requiere_lamina = Column(Boolean, default=False)
    permite_n_pies = Column(Boolean, default=False)
    grupo_exclusion = Column(String, nullable=True)    # "platina", "corona", o None


class Buje(Base):
    __tablename__ = "bujes"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String, nullable=False)
    precio = Column(Float, default=0.0)
    subtipo = Column(String, default="ambos") # 'base', 'punta' o 'ambos'
    categorias = Column(String, default="brazos")


class Brazo(Base):
    __tablename__ = "brazos"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String, nullable=False)
    codigo = Column(String, nullable=True)
    archivo_glb = Column(String, nullable=False)
    precio = Column(Float, default=0.0)
    categorias = Column(String, default="postes")


class BrazoGuardado(Base):
    """
    Fase 4: Almacena configuraciones de brazos articulados/doblados 
    para reutilizarlos como complementos en la Galería o Catálogo de Postes.
    """
    __tablename__ = "brazos_guardados"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String, nullable=False)            # Ej: "Brazo Doble Ángulo 90-45"
    tubo_id = Column(Integer, ForeignKey("tubos.id"), nullable=True)
    
    # Arreglo de tramos: [{ longitud: 15, angulo: 90 }, ...] guardado en JSON
    tramos_json = Column(Text, nullable=False)         
    
    buje_inicial_id = Column(Integer, nullable=True)  # Anclaje Base
    buje_final_id = Column(Integer, nullable=True)    # Carga Salida
    
    desarrollo_total_m = Column(Float, default=0.0)    # Longitud total lineal de tuberia
    cantidad_dobleces = Column(Integer, default=0)    # Cantidad de curvas
    costo_total = Column(Float, default=0.0)           # Precio calculated de fabricación
    
    fecha_creacion = Column(DateTime, default=datetime.utcnow)


class Cotizacion(Base):
    __tablename__ = "cotizaciones"

    id = Column(Integer, primary_key=True, index=True)
    consecutivo = Column(String, unique=True, index=True, nullable=False) # ej. COT-2001
    cliente_nombre = Column(String, default="Cliente General (Sin NIT)")
    cliente_nit = Column(String, nullable=True)
    fecha_creacion = Column(DateTime, default=datetime.utcnow)
    total = Column(Float, default=0.0)
    nivel_precio = Column(Integer, default=1)
    
    items = relationship("CotizacionItem", back_populates="cotizacion", cascade="all, delete-orphan")


class CotizacionItem(Base):
    __tablename__ = "cotizaciones_items"

    id = Column(Integer, primary_key=True, index=True)
    cotizacion_id = Column(Integer, ForeignKey("cotizaciones.id"))
    categoria = Column(String, nullable=False)
    descripcion = Column(String, nullable=False)
    lamina = Column(String, nullable=True)
    pintura = Column(String, nullable=True)
    costo_pintura = Column(Float, default=0.0)
    costo_tubos = Column(Float, default=0.0)
    area_pintable = Column(Float, default=0.0)
    alto = Column(Float, default=0.0)
    ancho = Column(Float, default=0.0)
    fondo = Column(Float, default=0.0)
    costo_base = Column(Float, default=0.0)
    total = Column(Float, default=0.0)
    accesorios_json = Column(Text, nullable=True) # Guardado estructurado como String/JSON

    cotizacion = relationship("Cotizacion", back_populates="items")