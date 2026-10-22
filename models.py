from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, DateTime, Text, UniqueConstraint, Index, CheckConstraint
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

class Distribuidor(Base):
    """Distribuidor (marca blanca). La fábrica es un distribuidor con es_fabrica=True."""
    __tablename__ = "distribuidores"

    id = Column(Integer, primary_key=True, index=True)
    nombre_comercial = Column(String, nullable=False)
    nit = Column(String, nullable=True)
    telefono = Column(String, nullable=True)
    direccion = Column(String, nullable=True)
    correo = Column(String, nullable=True)
    logo_url = Column(Text, nullable=True)  # URL, ruta local o data-URI base64
    margen_comercial_default = Column(Float, nullable=False, default=0.0)  # % sobre costo de maquila
    prefijo_consecutivo = Column(String, nullable=False, default="COT-")
    ultimo_numero_consecutivo = Column(Integer, nullable=False, default=1000)
    es_fabrica = Column(Boolean, nullable=False, default=False)
    activo = Column(Boolean, nullable=False, default=False)  # False hasta aprobación del SuperAdmin
    fecha_creacion = Column(DateTime, default=datetime.utcnow)

    usuarios = relationship("Usuario", back_populates="distribuidor")
    personal = relationship("PersonalDistribuidor", back_populates="distribuidor",
                            cascade="all, delete-orphan")


class Usuario(Base):
    __tablename__ = "usuarios"
    __table_args__ = (
        CheckConstraint("rol IN ('SUPERADMIN', 'DISTRIBUIDOR')", name="ck_usuarios_rol"),
        # Un usuario DISTRIBUIDOR siempre pertenece a un distribuidor.
        CheckConstraint("rol = 'SUPERADMIN' OR distribuidor_id IS NOT NULL", name="ck_usuarios_distribuidor"),
    )

    id = Column(Integer, primary_key=True, index=True)
    distribuidor_id = Column(Integer, ForeignKey("distribuidores.id"), nullable=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    rol = Column(String, nullable=False, default="DISTRIBUIDOR")  # SUPERADMIN | DISTRIBUIDOR
    activo = Column(Boolean, nullable=False, default=True)

    distribuidor = relationship("Distribuidor", back_populates="usuarios")


class PersonalDistribuidor(Base):
    """Asesores (vendedores) y diseñadores propios de cada distribuidor."""
    __tablename__ = "personal_distribuidor"
    __table_args__ = (
        CheckConstraint("tipo IN ('ASESOR', 'DISENADOR')", name="ck_personal_tipo"),
    )

    id = Column(Integer, primary_key=True, index=True)
    distribuidor_id = Column(Integer, ForeignKey("distribuidores.id"), nullable=False, index=True)
    tipo = Column(String, nullable=False)  # ASESOR | DISENADOR
    nombre = Column(String, nullable=False)

    distribuidor = relationship("Distribuidor", back_populates="personal")


class Cliente(Base):
    __tablename__ = "clientes"
    __table_args__ = (
        UniqueConstraint("distribuidor_id", "nit", name="uq_cliente_distribuidor_nit"),
    )

    id = Column(Integer, primary_key=True, index=True)
    distribuidor_id = Column(Integer, ForeignKey("distribuidores.id"), nullable=True, index=True)
    nit = Column(String, index=True, nullable=False)
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


class MecanizadoTotem(Base):
    __tablename__ = "mecanizados_totem"

    id = Column(Integer, primary_key=True, index=True)
    clave = Column(String, unique=True, index=True, nullable=False)
    nombre = Column(String, nullable=False)
    precio = Column(Float, default=35000.0)
    es_lpr = Column(Boolean, default=False)
    area_m2 = Column(Float, default=0.08)


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
    __table_args__ = (
        UniqueConstraint("distribuidor_id", "consecutivo", name="uq_distribuidor_consecutivo"),
    )

    id = Column(Integer, primary_key=True, index=True)
    distribuidor_id = Column(Integer, ForeignKey("distribuidores.id"), nullable=False, index=True)
    consecutivo = Column(String, index=True, nullable=False) # ej. COT-2001 (único por distribuidor)
    cliente_id = Column(Integer, nullable=True)
    cliente_nombre = Column(String, default="Consumidor Final / Mostrador")
    cliente_nit = Column(String, nullable=True)
    observaciones = Column(String, nullable=True)
    asesor_nombre = Column(String, nullable=True)
    disenador_nombre = Column(String, nullable=True)
    estado = Column(String, default="ACTIVA")
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
    configuracion_json = Column(Text, nullable=True) # Objeto completo de configuración/params

    cotizacion = relationship("Cotizacion", back_populates="items")