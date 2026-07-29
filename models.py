from sqlalchemy import Column, Integer, String, Numeric, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import JSONB
from database import Base
import datetime

# 1. Usuarios
class Usuario(Base):
    __tablename__ = "usuarios"
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    rol = Column(String(20), default="vendedor")
    activo = Column(Boolean, default=True)

# 2. Clientes
class Cliente(Base):
    __tablename__ = "clientes"
    id = Column(Integer, primary_key=True, index=True)
    nombre_empresa = Column(String(150), nullable=False)
    contacto = Column(String(100))
    telefono = Column(String(50))
    email = Column(String(100))

# 3. Catálogos y Materiales
class MargenPrecio(Base):
    __tablename__ = "margenes_precio"
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(50), nullable=False)
    factor_multiplicador = Column(Numeric(5, 2), nullable=False)

class Lamina(Base):
    __tablename__ = "laminas"
    id = Column(Integer, primary_key=True, index=True)
    tipo = Column(String(50), nullable=False)
    calibre = Column(String(20), nullable=False)
    precio_unitario = Column(Numeric(10, 2), nullable=False)

class Tubo(Base):
    __tablename__ = "tubos"
    id = Column(Integer, primary_key=True, index=True)
    forma = Column(String(50), nullable=False)
    tipo = Column(String(50), nullable=False)
    calibre = Column(String(20), nullable=False)
    material = Column(String(50), nullable=False)
    precio_metro = Column(Numeric(10, 2), nullable=False)

class Pintura(Base):
    __tablename__ = "pinturas"
    id = Column(Integer, primary_key=True, index=True)
    aplicacion = Column(String(50), nullable=False)
    nombre = Column(String(50), nullable=False)
    precio_unitario = Column(Numeric(10, 2), nullable=False)

class Accesorio(Base):
    __tablename__ = "accesorios"
    id = Column(Integer, primary_key=True, index=True)
    categoria = Column(String(50), nullable=False)
    descripcion = Column(String(100))
    tamano = Column(String(50))
    precio_base = Column(Numeric(10, 2), nullable=False)

# 4. Cotizaciones
class Cotizacion(Base):
    __tablename__ = "cotizaciones"
    id = Column(Integer, primary_key=True, index=True)
    consecutivo = Column(String(20), unique=True, nullable=False)
    cliente_id = Column(Integer, ForeignKey("clientes.id"))
    usuario_id = Column(Integer, ForeignKey("usuarios.id"))
    margen_id = Column(Integer, ForeignKey("margenes_precio.id"))
    subtotal = Column(Numeric(12, 2), nullable=False)
    total = Column(Numeric(12, 2), nullable=False)
    estado = Column(String(20), default="Borrador")
    creado_en = Column(DateTime, default=datetime.datetime.utcnow)

    detalles = relationship("CotizacionDetalle", back_populates="cotizacion")

class CotizacionDetalle(Base):
    __tablename__ = "cotizacion_detalles"
    id = Column(Integer, primary_key=True, index=True)
    cotizacion_id = Column(Integer, ForeignKey("cotizaciones.id", ondelete="CASCADE"))
    tipo_producto = Column(String(30), nullable=False)
    descripcion = Column(Text, nullable=False)
    cantidad = Column(Integer, nullable=False)
    precio_unitario = Column(Numeric(10, 2), nullable=False)
    precio_total = Column(Numeric(10, 2), nullable=False)
    especificaciones = Column(JSONB)

    cotizacion = relationship("Cotizacion", back_populates="detalles")