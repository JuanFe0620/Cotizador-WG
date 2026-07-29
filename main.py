from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from database import get_db
from schemas import CotizarTuberíaRequest, CotizarGabineteRequest
from services import CalculadoraService

app = FastAPI(title="API Cotizador WG")

@app.get("/")
def read_root():
    return {"mensaje": "¡Servidor de Cotizaciones funcionando correctamente!"}

@app.get("/test-db")
def test_db_connection(db: Session = Depends(get_db)):
    try:
        result = db.execute(text("SELECT 1")).fetchone()
        return {"status": "Éxito", "database": "Conectado a PostgreSQL correctamente"}
    except Exception as e:
        return {"status": "Error", "detalle": str(e)}

# --- ENDPOINTS DE CÁLCULO ---

@app.post("/cotizar/tuberia", summary="Calcular costo de lote de tuberías")
def cotizar_tuberia(req: CotizarTuberíaRequest):
    return CalculadoraService.calcular_tuberias(req)

@app.post("/cotizar/gabinete", summary="Calcular costo de gabinete según medidas")
def cotizar_gabinete(req: CotizarGabineteRequest):
    return CalculadoraService.calcular_gabinete(req)