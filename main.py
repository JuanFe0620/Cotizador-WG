import os
import csv
import re
import json
import mimetypes
import traceback
from typing import Optional, Any, Dict, List

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

import models
from database import engine, get_db, SessionLocal
from cad_generator import crear_paquete_plano
from services import calcular_item_cotizacion

# Intentamos importar la función de carga desde seed.py
try:
    from seed import sembrar_datos
except ImportError:
    try:
        from seed import cargar_seed as sembrar_datos
    except ImportError:
        sembrar_datos = None

# 1. Crear tablas en la Base de Datos
models.Base.metadata.create_all(bind=engine)

# 2. Inicializar FastAPI
app = FastAPI(title="Cotizador Pro WG")

# 3. Middleware CORS configurado
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["*"],
)


# --- FUNCIÓN PARA POBLAR BRAZOS Y BUJES POR DEFECTO SI ESTÁN VACÍOS ---
def sembrar_brazos_y_bujes_defecto(db: Session):
    try:
        if hasattr(models, 'Brazo'):
            conteo = db.query(models.Brazo).count()
            if conteo == 0:
                print("🌱 La tabla brazos está vacía. Insertando brazos por defecto...")
                brazos_defecto = [
                    {"nombre": "Brazo PTZ Ganzo C18", "codigo": "BRAZO-PTZ-C18", "archivo_glb": "PTZganzoC18.glb", "precio": 120000.0, "categorias": "postes"},
                    {"nombre": "Brazo Recto Extensión", "codigo": "BRAZO-RECTO-01", "archivo_glb": "brazoRecto.glb", "precio": 85000.0, "categorias": "postes"},
                    {"nombre": "Brazo Doble Tipo Y", "codigo": "BRAZO-DOBLE-Y", "archivo_glb": "brazoDobleY.glb", "precio": 180000.0, "categorias": "postes"}
                ]
                for b_data in brazos_defecto:
                    nuevo_brazo = models.Brazo(**b_data)
                    db.add(nuevo_brazo)
                db.commit()
                print("✅ Brazos por defecto cargados en BD.")

        if hasattr(models, 'Buje'):
            conteo_bujes = db.query(models.Buje).count()
            if conteo_bujes == 0:
                print("🌱 La tabla bujes está vacía. Insertando bujes por defecto...")
                bujes_defecto = [
                    {"nombre": "Buje de Presión 2 Pulgadas", "precio": 15000.0, "subtipo": "ambos", "categorias": "brazos"},
                    {"nombre": "Buje Reducción 3 a 2 Pulgadas", "precio": 22000.0, "subtipo": "ambos", "categorias": "brazos"}
                ]
                for buje_data in bujes_defecto:
                    nuevo_buje = models.Buje(**buje_data)
                    db.add(nuevo_buje)
                db.commit()
                print("✅ Bujes por defecto cargados en BD.")
    except Exception as e:
        db.rollback()
        print(f"⚠️ Error al sembrar brazos/bujes por defecto: {e}")


# --- FUNCIÓN DE AUTO-CARGA DE CLIENTES DESDE CSV ---
def sincronizar_clientes_csv(db: Session):
    archivo_csv = "catalogoclienteshorizontal.csv"
    if not os.path.exists(archivo_csv):
        print(f"⚠️ El archivo {archivo_csv} no existe en la raíz.")
        return

    try:
        with open(archivo_csv, mode='r', encoding='utf-8', errors='ignore') as f:
            reader = csv.reader(f)
            insertados = 0
            nits_procesados = set()

            for row in reader:
                if len(row) >= 16:
                    raw_nit = row[13].strip()
                    nombre = row[15].strip()
                    direccion = row[16].strip() if len(row) > 16 else ""
                    telefono = row[17].strip() if len(row) > 17 else ""
                    email = row[19].strip() if len(row) > 19 else ""

                    if raw_nit and nombre and raw_nit.lower() != "nit":
                        nit_limpio = re.sub(r'[\s.,-]', '', raw_nit)

                        if nit_limpio in nits_procesados:
                            continue

                        existente = db.query(models.Cliente).filter(models.Cliente.nit == nit_limpio).first()
                        if not existente:
                            nuevo = models.Cliente(
                                nit=nit_limpio,
                                nombre=nombre,
                                direccion=direccion,
                                telefono=telefono,
                                email=email
                            )
                            db.add(nuevo)
                            nits_procesados.add(nit_limpio)
                            insertados += 1

            db.commit()
            print(f"✅ ¡Éxito! Se cargaron {insertados} clientes únicos desde el CSV.")

    except Exception as e:
        db.rollback()
        print(f"❌ Error al procesar CSV: {e}")


from sqlalchemy import text

@app.on_event("startup")
def startup_db_client():
    # Forzamos la eliminación en cascada de todo el esquema de la BD
    with engine.connect() as connection:
        connection.execute(text("DROP SCHEMA public CASCADE;"))
        connection.execute(text("CREATE SCHEMA public;"))
        connection.commit()
        
    models.Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        if sembrar_datos:
            print("🌱 Cargando precios y materiales desde seed.py...")
            sembrar_datos(db)
        else:
            print("⚠️ No se pudo importar la función de carga desde seed.py")

        sembrar_brazos_y_bujes_defecto(db)
        sincronizar_clientes_csv(db)
    except Exception as e:
        print(f"❌ Error durante la inicialización en startup: {e}")
    finally:
        db.close()
    try:
        if sembrar_datos:
            print("🌱 Cargando precios y materiales desde seed.py...")
            sembrar_datos(db)
        else:
            print("⚠️ No se pudo importar la función de carga desde seed.py")

        sembrar_brazos_y_bujes_defecto(db)
        sincronizar_clientes_csv(db)
    except Exception as e:
        print(f"❌ Error durante la inicialización en startup: {e}")
    finally:
        db.close()


# --- ESQUEMAS PYDANTIC ---
class ClienteSchema(BaseModel):
    nit: Optional[str] = None
    nit_cedula: Optional[str] = None
    nombre: str
    direccion: Optional[str] = None
    email: Optional[str] = None
    telefono: Optional[str] = None


class CotizarItemReq(BaseModel):
    categoria: str
    nivelPrecio: int = 1
    params: Dict[str, Any]


class GenerarPlanoReq(BaseModel):
    categoria: str
    params: Dict[str, Any]
    laminas: List[Dict[str, Any]]
    tubos: List[Dict[str, Any]]
    accesorios: List[Dict[str, Any]] = []
    itemsCotizacion: List[Dict[str, Any]]
    consecutivo: str


class ItemCotizacionSchema(BaseModel):
    categoria: str
    descripcion: str
    lamina: Optional[str] = None
    pintura: Optional[str] = None
    costoPintura: float = 0.0
    costoTubos: float = 0.0
    areaPintable: float = 0.0
    alto: float = 0.0
    ancho: float = 0.0
    fondo: float = 0.0
    costoBase: float = 0.0
    total: float = 0.0
    accesoriosLista: Optional[List[Dict[str, Any]]] = []


class GuardarCotizacionReq(BaseModel):
    consecutivo: Optional[str] = None
    clienteNombre: str = "Cliente General (Sin NIT)"
    clienteNit: Optional[str] = None
    nivelPrecio: int = 1
    total: float = 0.0
    items: List[ItemCotizacionSchema]


class TuboSchema(BaseModel):
    forma: str
    material: str
    calibre: Optional[str] = None
    diametro_pulg: Optional[Any] = None
    ancho_cm: Optional[Any] = None
    alto_cm: Optional[Any] = None
    precio_tira_6m: float
    categorias: Optional[str] = ""


class LaminaSchema(BaseModel):
    material: str
    calibre: str
    precio_entera: float
    alto_m: float = 2.44
    ancho_m: float = 1.22
    categorias: Optional[str] = ""


class PinturaSchema(BaseModel):
    nombre: str
    hex: str
    precio_kg: float
    precio_m2: Optional[float] = 0.0


class AccesorioSchema(BaseModel):
    nombre: str
    precio: float
    categorias: Optional[str] = ""
    requiere_lamina: Optional[bool] = False
    permite_n_pies: Optional[bool] = False
    grupo_exclusion: Optional[str] = None


class BujeSchema(BaseModel):
    nombre: str
    precio: float
    subtipo: Optional[str] = "ambos"
    categorias: Optional[str] = "brazos"


class BrazoSchema(BaseModel):
    nombre: str
    codigo: str
    archivo_glb: str
    precio: float
    categorias: Optional[str] = "postes"


# --- HELPER SERIALIZACIÓN ---
def get_dict(item: BaseModel) -> Dict[str, Any]:
    return item.model_dump() if hasattr(item, "model_dump") else item.dict()


# --- HELPERS SERIALIZACIÓN DTOS ---
def serializar_cliente(c: models.Cliente) -> Dict[str, Any]:
    nit_val = getattr(c, "nit", None) or getattr(c, "nit_cedula", "")
    return {
        "id": c.id,
        "nit": nit_val,
        "nit_cedula": nit_val,
        "nombre": c.nombre,
        "direccion": getattr(c, "direccion", ""),
        "telefono": c.telefono or "",
        "email": c.email or ""
    }


def serializar_tubo(t: models.Tubo) -> Dict[str, Any]:
    return {
        "id": t.id,
        "forma": t.forma,
        "material": t.material,
        "calibre": t.calibre,
        "diametro_pulg": t.diametro_pulg,
        "diametroPulg": t.diametro_pulg,
        "ancho_cm": t.ancho_cm,
        "alto_cm": t.alto_cm,
        "precio_tira_6m": t.precio_tira_6m,
        "precioTira6m": t.precio_tira_6m,
        "categorias": getattr(t, "categorias", "") or ""
    }


def serializar_accesorio(a: Any) -> Dict[str, Any]:
    return {
        "id": a.id,
        "nombre": a.nombre,
        "precio": a.precio,
        "categorias": getattr(a, "categorias", "") or "",
        "requiere_lamina": getattr(a, "requiere_lamina", False),
        "requiereLamina": getattr(a, "requiere_lamina", False),
        "permite_n_pies": getattr(a, "permite_n_pies", False),
        "permiteNPies": getattr(a, "permite_n_pies", False),
        "grupo_exclusion": getattr(a, "grupo_exclusion", None),
        "grupoExclusion": getattr(a, "grupo_exclusion", None),
    }


def serializar_buje(b: Any) -> Dict[str, Any]:
    return {
        "id": b.id,
        "nombre": b.nombre,
        "precio": b.precio,
        "subtipo": getattr(b, "subtipo", "ambos"),
        "categorias": getattr(b, "categorias", "brazos")
    }


def serializar_brazo(br: Any) -> Dict[str, Any]:
    return {
        "id": br.id,
        "nombre": br.nombre,
        "codigo": br.codigo,
        "archivo_glb": getattr(br, "archivo_glb", ""),
        "archivoGlb": getattr(br, "archivo_glb", ""),
        "precio": br.precio,
        "categorias": getattr(br, "categorias", "postes")
    }


def obtener_siguiente_consecutivo_db(db: Session) -> str:
    ultima = db.query(models.Cotizacion).order_by(models.Cotizacion.id.desc()).first()
    if not ultima or not ultima.consecutivo:
        return "COT-2001"
    
    num_str = re.sub(r'\D', '', ultima.consecutivo)
    if num_str.isdigit():
        nuevo_num = int(num_str) + 1
        return f"COT-{nuevo_num}"
    
    return f"COT-{2000 + ultima.id + 1}"


# --- ENDPOINTS BUJES Y BRAZOS ---
@app.get("/api/bujes")
@app.get("/bujes")
def obtener_bujes(db: Session = Depends(get_db)):
    if hasattr(models, 'Buje'):
        bujes = db.query(models.Buje).all()
        return [serializar_buje(b) for b in bujes]
    return []


@app.get("/api/brazos")
@app.get("/brazos")
def obtener_brazos(db: Session = Depends(get_db)):
    if hasattr(models, 'Brazo'):
        brazos = db.query(models.Brazo).all()
        return [serializar_brazo(br) for br in brazos]
    return []


# --- ENDPOINTS CONSECUTIVO Y HISTORIAL DE COTIZACIONES ---
@app.get("/api/cotizaciones/siguiente-consecutivo")
def get_siguiente_consecutivo(db: Session = Depends(get_db)):
    return {"consecutivo": obtener_siguiente_consecutivo_db(db)}


@app.get("/api/cotizaciones")
def listar_cotizaciones(q: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(models.Cotizacion)
    if q:
        query = query.filter(
            (models.Cotizacion.consecutivo.ilike(f"%{q}%")) |
            (models.Cotizacion.cliente_nombre.ilike(f"%{q}%")) |
            (models.Cotizacion.cliente_nit.ilike(f"%{q}%"))
        )
    cotizaciones = query.order_by(models.Cotizacion.id.desc()).all()
    
    resultado = []
    for c in cotizaciones:
        resultado.append({
            "id": c.id,
            "consecutivo": c.consecutivo,
            "cliente_nombre": c.cliente_nombre,
            "cliente_nit": c.cliente_nit,
            "estado": getattr(c, "estado", "ACTIVA"),
            "fecha": c.fecha_creacion.strftime("%Y-%m-%d %H:%M") if getattr(c, "fecha_creacion", None) else "",
            "total": c.total,
            "num_items": len(c.items) if hasattr(c, "items") and c.items else 0
        })
    return resultado


@app.get("/api/cotizaciones/{cotizacion_id}")
def obtener_cotizacion_detalle(cotizacion_id: int, db: Session = Depends(get_db)):
    cot = db.query(models.Cotizacion).filter(models.Cotizacion.id == cotizacion_id).first()
    if not cot:
        raise HTTPException(status_code=404, detail="Cotización no encontrada")

    items_formateados = []
    if hasattr(cot, "items") and cot.items:
        for item in cot.items:
            acc_lista = []
            if getattr(item, "accesorios_json", None):
                try:
                    acc_lista = json.loads(item.accesorios_json)
                except Exception:
                    acc_lista = []

            items_formateados.append({
                "id": item.id,
                "categoria": item.categoria,
                "descripcion": item.descripcion,
                "lamina": item.lamina,
                "pintura": item.pintura,
                "costoPintura": item.costo_pintura,
                "costoTubos": item.costo_tubos,
                "areaPintable": item.area_pintable,
                "alto": item.alto,
                "ancho": item.ancho,
                "fondo": item.fondo,
                "costoBase": item.costo_base,
                "total": item.total,
                "accesoriosLista": acc_lista
            })

    return {
        "id": cot.id,
        "consecutivo": cot.consecutivo,
        "cliente_nombre": cot.cliente_nombre,
        "cliente_nit": cot.cliente_nit,
        "nivel_precio": cot.nivel_precio,
        "estado": getattr(cot, "estado", "ACTIVA"),
        "total": cot.total,
        "fecha": cot.fecha_creacion.strftime("%Y-%m-%d %H:%M") if getattr(cot, "fecha_creacion", None) else "",
        "items": items_formateados
    }


@app.post("/api/cotizaciones/guardar")
def guardar_cotizacion(req: GuardarCotizacionReq, db: Session = Depends(get_db)):
    try:
        consecutivo_final = req.consecutivo
        if not consecutivo_final or consecutivo_final == "COT-2001":
            existente = db.query(models.Cotizacion).filter(models.Cotizacion.consecutivo == "COT-2001").first()
            if existente:
                consecutivo_final = obtener_siguiente_consecutivo_db(db)
            else:
                consecutivo_final = req.consecutivo or "COT-2001"

        nueva_cot = models.Cotizacion(
            consecutivo=consecutivo_final,
            cliente_nombre=req.clienteNombre,
            cliente_nit=req.clienteNit,
            nivel_precio=req.nivelPrecio,
            total=req.total,
            estado="ACTIVA" if hasattr(models.Cotizacion, "estado") else None
        )
        db.add(nueva_cot)
        db.commit()
        db.refresh(nueva_cot)

        for item_data in req.items:
            acc_json_str = json.dumps(item_data.accesoriosLista or [])
            item_db = models.CotizacionItem(
                cotizacion_id=nueva_cot.id,
                categoria=item_data.categoria,
                descripcion=item_data.descripcion,
                lamina=item_data.lamina,
                pintura=item_data.pintura,
                costo_pintura=item_data.costoPintura,
                costo_tubos=item_data.costoTubos,
                area_pintable=item_data.areaPintable,
                alto=item_data.alto,
                ancho=item_data.ancho,
                fondo=item_data.fondo,
                costo_base=item_data.costoBase,
                total=item_data.total,
                accesorios_json=acc_json_str
            )
            db.add(item_db)

        db.commit()
        db.refresh(nueva_cot)

        siguiente_consecutivo = obtener_siguiente_consecutivo_db(db)

        return {
            "ok": True,
            "id": nueva_cot.id,
            "consecutivo_guardado": nueva_cot.consecutivo,
            "siguiente_consecutivo": siguiente_consecutivo,
            "mensaje": f"Cotización {nueva_cot.consecutivo} guardada exitosamente."
        }
    except Exception as e:
        db.rollback()
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error al guardar la cotización: {str(e)}")


# --- GESTIÓN DE ESTADO (ANULAR Y ELIMINAR) ---
@app.patch("/api/cotizaciones/{cotizacion_id}/anular")
def anular_cotizacion(cotizacion_id: int, db: Session = Depends(get_db)):
    """Cambia el estado de una cotización a 'ANULADA'."""
    cotizacion = db.query(models.Cotizacion).filter(models.Cotizacion.id == cotizacion_id).first()
    
    if not cotizacion:
        raise HTTPException(status_code=404, detail="Cotización no encontrada")
    
    if getattr(cotizacion, "estado", None) == "ANULADA":
        raise HTTPException(status_code=400, detail="La cotización ya está anulada")

    setattr(cotizacion, "estado", "ANULADA")
    db.commit()
    db.refresh(cotizacion)
    
    return {
        "ok": True,
        "message": "Cotización anulada con éxito",
        "id": cotizacion.id,
        "consecutivo": cotizacion.consecutivo,
        "estado": getattr(cotizacion, "estado", "ANULADA")
    }


@app.delete("/api/cotizaciones/{cotizacion_id}")
def eliminar_cotizacion(cotizacion_id: int, db: Session = Depends(get_db)):
    """Eliminación física de la cotización y sus ítems."""
    cotizacion = db.query(models.Cotizacion).filter(models.Cotizacion.id == cotizacion_id).first()
    
    if not cotizacion:
        raise HTTPException(status_code=404, detail="Cotización no encontrada")

    if hasattr(models, 'CotizacionItem'):
        db.query(models.CotizacionItem).filter(models.CotizacionItem.cotizacion_id == cotizacion_id).delete()
    
    db.delete(cotizacion)
    db.commit()
    
    return {
        "ok": True,
        "message": f"Cotización {cotizacion_id} eliminada permanentemente",
        "id": cotizacion_id
    }


# --- ENDPOINTS CLIENTES ---
@app.get("/api/clientes")
@app.get("/clientes")
def obtener_clientes(q: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(models.Cliente)
    if q:
        q_limpio = re.sub(r'[\s.,-]', '', q)
        query = query.filter(
            (models.Cliente.nombre.ilike(f"%{q}%")) | 
            (models.Cliente.nit.ilike(f"%{q}%")) |
            (models.Cliente.nit.ilike(f"%{q_limpio}%"))
        )
    clientes = query.all()
    return [serializar_cliente(c) for c in clientes]


@app.post("/api/clientes")
@app.post("/clientes")
def crear_cliente(cliente: ClienteSchema, db: Session = Depends(get_db)):
    raw_nit = cliente.nit or cliente.nit_cedula or ""
    nit_valor = re.sub(r'[\s.,-]', '', raw_nit) if raw_nit else ""
    
    if nit_valor:
        existente = db.query(models.Cliente).filter(models.Cliente.nit == nit_valor).first()
        if existente:
            return serializar_cliente(existente)
        
    db_item = models.Cliente(
        nit=nit_valor,
        nombre=cliente.nombre,
        direccion=cliente.direccion,
        telefono=cliente.telefono,
        email=cliente.email
    )
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return serializar_cliente(db_item)


@app.put("/api/clientes/{cliente_id}")
@app.put("/clientes/{cliente_id}")
def actualizar_cliente(cliente_id: int, cliente: ClienteSchema, db: Session = Depends(get_db)):
    db_item = db.query(models.Cliente).filter(models.Cliente.id == cliente_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    
    data = get_dict(cliente)
    if "nit_cedula" in data and not data.get("nit"):
        data["nit"] = data.pop("nit_cedula")
    
    if data.get("nit"):
        data["nit"] = re.sub(r'[\s.,-]', '', data["nit"])

    for key, value in data.items():
        if hasattr(db_item, key) and value is not None:
            setattr(db_item, key, value)
            
    db.commit()
    db.refresh(db_item)
    return serializar_cliente(db_item)


@app.delete("/api/clientes/{cliente_id}")
@app.delete("/clientes/{cliente_id}")
def eliminar_cliente(cliente_id: int, db: Session = Depends(get_db)):
    db_item = db.query(models.Cliente).filter(models.Cliente.id == cliente_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    db.delete(db_item)
    db.commit()
    return {"ok": True}


# --- ENDPOINTS CORE ---
@app.post("/api/cotizar/item")
def cotizar_item(req: CotizarItemReq, db: Session = Depends(get_db)):
    try:
        params_limpios = dict(req.params)
        
        if req.categoria.lower() == "gabinetes":
            params_limpios["incluirBase"] = False
            params_limpios["incluirPlatina"] = False
            params_limpios["incluirPiesAmigo"] = False

        resultado = calcular_item_cotizacion(
            categoria=req.categoria,
            params=params_limpios,
            nivel_precio=req.nivelPrecio,
            db=db
        )
        return resultado
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error en motor de cálculo: {str(e)}")


@app.get("/api/admin/materiales")
def obtener_materiales(db: Session = Depends(get_db)):
    try:
        tubos = [serializar_tubo(t) for t in db.query(models.Tubo).all()] if hasattr(models, 'Tubo') else []
        accesorios = [serializar_accesorio(a) for a in db.query(models.Accesorio).all()] if hasattr(models, 'Accesorio') else []
        bujes = [serializar_buje(b) for b in db.query(models.Buje).all()] if hasattr(models, 'Buje') else []
        brazos = [serializar_brazo(br) for br in db.query(models.Brazo).all()] if hasattr(models, 'Brazo') else []
        laminas = db.query(models.Lamina).all() if hasattr(models, 'Lamina') else []
        pinturas = db.query(models.Pintura).all() if hasattr(models, 'Pintura') else []
        
        return {
            "laminas": laminas,
            "tubos": tubos,
            "pinturas": pinturas,
            "accesorios": accesorios,
            "bujes": bujes,
            "brazos": brazos
        }
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error al consultar base de datos: {str(e)}")


# --- ENDPOINTS CRUD: ACCESORIOS ---
@app.get("/api/accesorios")
@app.get("/accesorios")
def obtener_accesorios(db: Session = Depends(get_db)):
    if hasattr(models, 'Accesorio'):
        accesorios = db.query(models.Accesorio).all()
        return [serializar_accesorio(a) for a in accesorios]
    return []


@app.post("/api/accesorios")
@app.post("/accesorios")
def crear_accesorio(item: AccesorioSchema, db: Session = Depends(get_db)):
    if hasattr(models, 'Accesorio'):
        db_item = models.Accesorio(**get_dict(item))
        db.add(db_item)
        db.commit()
        db.refresh(db_item)
        return serializar_accesorio(db_item)
    return {"error": "Modelo Accesorio no definido"}


@app.put("/api/accesorios/{item_id}")
@app.put("/accesorios/{item_id}")
def actualizar_accesorio(item_id: int, item: AccesorioSchema, db: Session = Depends(get_db)):
    if hasattr(models, 'Accesorio'):
        db_item = db.query(models.Accesorio).filter(models.Accesorio.id == item_id).first()
        if not db_item:
            raise HTTPException(status_code=404, detail="Accesorio no encontrado")
        for key, value in get_dict(item).items():
            setattr(db_item, key, value)
        db.commit()
        db.refresh(db_item)
        return serializar_accesorio(db_item)
    return {"error": "Modelo Accesorio no definido"}


@app.delete("/api/accesorios/{item_id}")
@app.delete("/accesorios/{item_id}")
def eliminar_accesorio(item_id: int, db: Session = Depends(get_db)):
    if hasattr(models, 'Accesorio'):
        db_item = db.query(models.Accesorio).filter(models.Accesorio.id == item_id).first()
        if not db_item:
            raise HTTPException(status_code=404, detail="Accesorio no encontrado")
        db.delete(db_item)
        db.commit()
        return {"ok": True}
    return {"error": "Modelo Accesorio no definido"}


# --- ENDPOINTS CRUD: TUBOS ---
@app.get("/api/tubos")
@app.get("/tubos")
def obtener_tubos(db: Session = Depends(get_db)):
    if hasattr(models, 'Tubo'):
        tubos = db.query(models.Tubo).all()
        return [serializar_tubo(t) for t in tubos]
    return []


@app.post("/api/tubos")
@app.post("/tubos")
def crear_tubo(item: TuboSchema, db: Session = Depends(get_db)):
    if not hasattr(models, 'Tubo'):
        raise HTTPException(status_code=500, detail="Modelo Tubo no definido")
    data = get_dict(item)
    data['diametro_pulg'] = str(data['diametro_pulg']) if data.get('diametro_pulg') is not None else None
    data['ancho_cm'] = str(data['ancho_cm']) if data.get('ancho_cm') is not None else None
    data['alto_cm'] = str(data['alto_cm']) if data.get('alto_cm') is not None else None
    
    db_item = models.Tubo(**data)
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return serializar_tubo(db_item)


@app.put("/api/tubos/{item_id}")
@app.put("/tubos/{item_id}")
def actualizar_tubo(item_id: int, item: TuboSchema, db: Session = Depends(get_db)):
    if not hasattr(models, 'Tubo'):
        raise HTTPException(status_code=500, detail="Modelo Tubo no definido")
    db_item = db.query(models.Tubo).filter(models.Tubo.id == item_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Tubo no encontrado")
    
    data = get_dict(item)
    data['diametro_pulg'] = str(data['diametro_pulg']) if data.get('diametro_pulg') is not None else None
    data['ancho_cm'] = str(data['ancho_cm']) if data.get('ancho_cm') is not None else None
    data['alto_cm'] = str(data['alto_cm']) if data.get('alto_cm') is not None else None

    for key, value in data.items():
        setattr(db_item, key, value)
    db.commit()
    db.refresh(db_item)
    return serializar_tubo(db_item)


@app.delete("/api/tubos/{item_id}")
@app.delete("/tubos/{item_id}")
def eliminar_tubo(item_id: int, db: Session = Depends(get_db)):
    if not hasattr(models, 'Tubo'):
        raise HTTPException(status_code=500, detail="Modelo Tubo no definido")
    db_item = db.query(models.Tubo).filter(models.Tubo.id == item_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Tubo no encontrado")
    db.delete(db_item)
    db.commit()
    return {"ok": True}


# --- ENDPOINTS CRUD: LÁMINAS ---
@app.get("/api/laminas")
@app.get("/laminas")
def obtener_laminas(db: Session = Depends(get_db)):
    if hasattr(models, 'Lamina'):
        return db.query(models.Lamina).all()
    return []


@app.post("/api/laminas")
@app.post("/laminas")
def crear_lamina(item: LaminaSchema, db: Session = Depends(get_db)):
    if not hasattr(models, 'Lamina'):
        raise HTTPException(status_code=500, detail="Modelo Lamina no definido")
    db_item = models.Lamina(**get_dict(item))
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item


@app.put("/api/laminas/{item_id}")
@app.put("/laminas/{item_id}")
def actualizar_lamina(item_id: int, item: LaminaSchema, db: Session = Depends(get_db)):
    if not hasattr(models, 'Lamina'):
        raise HTTPException(status_code=500, detail="Modelo Lamina no definido")
    db_item = db.query(models.Lamina).filter(models.Lamina.id == item_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Lámina no encontrada")
    for key, value in get_dict(item).items():
        setattr(db_item, key, value)
    db.commit()
    db.refresh(db_item)
    return db_item


@app.delete("/api/laminas/{item_id}")
@app.delete("/laminas/{item_id}")
def eliminar_lamina(item_id: int, db: Session = Depends(get_db)):
    if not hasattr(models, 'Lamina'):
        raise HTTPException(status_code=500, detail="Modelo Lamina no definido")
    db_item = db.query(models.Lamina).filter(models.Lamina.id == item_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Lámina no encontrada")
    db.delete(db_item)
    db.commit()
    return {"ok": True}


# --- ENDPOINTS CRUD: PINTURAS ---
@app.get("/api/pinturas")
@app.get("/pinturas")
def obtener_pinturas(db: Session = Depends(get_db)):
    if hasattr(models, 'Pintura'):
        return db.query(models.Pintura).all()
    return []


@app.post("/api/pinturas")
@app.post("/pinturas")
def crear_pintura(item: PinturaSchema, db: Session = Depends(get_db)):
    if not hasattr(models, 'Pintura'):
        raise HTTPException(status_code=500, detail="Modelo Pintura no definido")
    db_item = models.Pintura(**get_dict(item))
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item


@app.put("/api/pinturas/{item_id}")
@app.put("/pinturas/{item_id}")
def actualizar_pintura(item_id: int, item: PinturaSchema, db: Session = Depends(get_db)):
    if not hasattr(models, 'Pintura'):
        raise HTTPException(status_code=500, detail="Modelo Pintura no definido")
    db_item = db.query(models.Pintura).filter(models.Pintura.id == item_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Pintura no encontrada")
    for key, value in get_dict(item).items():
        setattr(db_item, key, value)
    db.commit()
    db.refresh(db_item)
    return db_item


@app.delete("/api/pinturas/{item_id}")
@app.delete("/pinturas/{item_id}")
def eliminar_pintura(item_id: int, db: Session = Depends(get_db)):
    if not hasattr(models, 'Pintura'):
        raise HTTPException(status_code=500, detail="Modelo Pintura no definido")
    db_item = db.query(models.Pintura).filter(models.Pintura.id == item_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Pintura no encontrada")
    db.delete(db_item)
    db.commit()
    return {"ok": True}


# --- ENDPOINTS PLANOS ---
@app.post("/api/planos/generar")
def generar_plano(req: GenerarPlanoReq):
    try:
        datos = get_dict(req)
        paquete = crear_paquete_plano(datos)
        zip_name = paquete["archivo"]
        return {
            "archivo": zip_name,
            "url": f"http://127.0.0.1:8000/api/planos/descargar/{zip_name}"
        }
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error al generar plano CAD: {str(e)}")


@app.get("/api/planos/descargar/{filename}")
def descargar_plano(filename: str):
    filepath = os.path.join("generated_plans", filename)
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="Archivo plano no encontrado")

    mimetype, _ = mimetypes.guess_type(filepath)
    return FileResponse(
        filepath,
        media_type=mimetype or "application/octet-stream",
        filename=filename
    )