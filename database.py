from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Estructura: postgresql://usuario:contraseña@localhost:5270_o_5432/nombre_base_datos
# ⚠️ REEMPLAZA 'tu_contraseña_aqui' con la contraseña que le pusiste a PostgreSQL al instalarlo
DATABASE_URL = "postgresql://postgres:1234@localhost:5432/cotizador_wg"

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()