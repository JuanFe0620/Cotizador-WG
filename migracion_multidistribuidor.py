"""
Migración ligera e idempotente a multi-distribuidor (create_all no altera tablas existentes).
Se invoca en el startup de FastAPI, después de models.Base.metadata.create_all().
"""
from dotenv import load_dotenv
load_dotenv()
import os
import re

from sqlalchemy import inspect, text

import models
from auth import hash_password, ROL_SUPERADMIN


def _max_consecutivo_numerico(conn, base: int = 2000) -> int:
    maximo = base
    for (c,) in conn.execute(text("SELECT consecutivo FROM cotizaciones")):
        m = re.search(r"\d+", re.sub(r"^\D+", "", str(c or "")))
        if m:
            maximo = max(maximo, int(m.group()))
    return maximo


def _quitar_unicidad_global(conn, tabla: str, columna: str) -> None:
    """Elimina índices/constraints UNIQUE de una sola columna (la unicidad pasa a ser por distribuidor)."""
    insp = inspect(conn)
    for ix in insp.get_indexes(tabla):
        if ix.get("unique") and ix["column_names"] == [columna]:
            # Si respalda un constraint, se elimina el constraint más abajo.
            if ix["name"] not in {c["name"] for c in insp.get_unique_constraints(tabla)}:
                conn.execute(text(f'DROP INDEX IF EXISTS "{ix["name"]}"'))
    for uc in insp.get_unique_constraints(tabla):
        if uc["column_names"] == [columna]:
            conn.execute(text(f'ALTER TABLE {tabla} DROP CONSTRAINT "{uc["name"]}"'))
    if not any(ix["column_names"] == [columna] for ix in inspect(conn).get_indexes(tabla)):
        conn.execute(text(f'CREATE INDEX IF NOT EXISTS ix_{tabla}_{columna} ON {tabla} ({columna})'))


def _constraint_existe(conn, tabla: str, nombre: str) -> bool:
    return any(c["name"] == nombre for c in inspect(conn).get_unique_constraints(tabla))


def migrar_multidistribuidor(engine) -> None:
    with engine.begin() as conn:
        # 1. Columnas nuevas en tablas existentes
        conn.execute(text("ALTER TABLE cotizaciones ADD COLUMN IF NOT EXISTS distribuidor_id INTEGER REFERENCES distribuidores(id)"))
        conn.execute(text("ALTER TABLE clientes ADD COLUMN IF NOT EXISTS distribuidor_id INTEGER REFERENCES distribuidores(id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_cotizaciones_distribuidor_id ON cotizaciones (distribuidor_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_clientes_distribuidor_id ON clientes (distribuidor_id)"))

        # 2. Distribuidor de fábrica (dueño de los datos preexistentes y de las cotizaciones del SuperAdmin)
        fabrica_id = conn.execute(text("SELECT id FROM distribuidores WHERE es_fabrica IS TRUE ORDER BY id LIMIT 1")).scalar()
        if fabrica_id is None:
            fabrica_id = conn.execute(
                text(
                    "INSERT INTO distribuidores (nombre_comercial, prefijo_consecutivo, ultimo_numero_consecutivo, "
                    "margen_comercial_default, es_fabrica, activo) "
                    "VALUES ('Fábrica WG (Bogotá)', 'COT-', :ultimo, 0, TRUE, TRUE) RETURNING id"
                ),
                {"ultimo": _max_consecutivo_numerico(conn)},
            ).scalar()

        # 3. Backfill de datos históricos
        conn.execute(text("UPDATE cotizaciones SET distribuidor_id = :f WHERE distribuidor_id IS NULL"), {"f": fabrica_id})
        conn.execute(text("UPDATE clientes SET distribuidor_id = :f WHERE distribuidor_id IS NULL"), {"f": fabrica_id})

        # 4. Unicidad por distribuidor (reemplaza la unicidad global)
        _quitar_unicidad_global(conn, "cotizaciones", "consecutivo")
        _quitar_unicidad_global(conn, "clientes", "nit")
        if not _constraint_existe(conn, "cotizaciones", "uq_distribuidor_consecutivo"):
            conn.execute(text("ALTER TABLE cotizaciones ADD CONSTRAINT uq_distribuidor_consecutivo UNIQUE (distribuidor_id, consecutivo)"))
        if not _constraint_existe(conn, "clientes", "uq_cliente_distribuidor_nit"):
            conn.execute(text("ALTER TABLE clientes ADD CONSTRAINT uq_cliente_distribuidor_nit UNIQUE (distribuidor_id, nit)"))
        conn.execute(text("ALTER TABLE cotizaciones ALTER COLUMN distribuidor_id SET NOT NULL"))

    # 5. SuperAdmin inicial desde variables de entorno
    from sqlalchemy.orm import Session

    with Session(engine) as db:
        if db.query(models.Usuario).filter(models.Usuario.rol == ROL_SUPERADMIN).count() == 0:
            username = os.getenv("SUPERADMIN_USERNAME")
            password = os.getenv("SUPERADMIN_PASSWORD")
            if username and password:
                db.add(models.Usuario(username=username, password_hash=hash_password(password), rol=ROL_SUPERADMIN, distribuidor_id=None, activo=True))
                db.commit()
                print(f"[OK] SuperAdmin inicial '{username}' creado.")
            else:
                print("[AVISO] No existe ningún SUPERADMIN. Define SUPERADMIN_USERNAME y SUPERADMIN_PASSWORD y reinicia.")
