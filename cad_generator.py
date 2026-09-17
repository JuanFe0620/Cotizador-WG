import json
import os
import zipfile
from datetime import datetime
from io import BytesIO
from typing import Any, Dict, List, Optional


def find_by_id(items: List[Dict[str, Any]], item_id: Any) -> Optional[Dict[str, Any]]:
    for item in items:
        if str(item.get("id")) == str(item_id):
            return item
    return None


def build_plano_data(payload: Dict[str, Any]) -> Dict[str, Any]:
    categoria = payload.get("categoria", "")
    params = payload.get("params", {}) or {}
    laminas = payload.get("laminas", []) or []
    tubos = payload.get("tubos", []) or []
    accesorios = payload.get("accesorios", []) or []
    consecutivo = payload.get("consecutivo", "")

    plan = {
        "meta": {
            "categoria": categoria,
            "consecutivo": consecutivo,
            "generado_en": datetime.now().isoformat(),
            "itemsCotizacion": len(payload.get("itemsCotizacion", []) or []),
        },
        "params": params,
        "materiales": {},
        "accesorios": [],
        "geometry": {},
        "export": {
            "tipo_archivo": "json",
            "descripcion": "Archivo paramétrico para backend CAD / iLogic",
        },
    }

    if categoria in ["postes", "brazos"]:
        tramos = params.get("tramos", []) or []
        total_altura_cm = sum((float(tramo.get("alto", 0)) or 0) for tramo in tramos)
        total_altura_m = total_altura_cm / 100
        plan["geometry"]["altura_total_cm"] = total_altura_cm
        plan["geometry"]["altura_total_m"] = round(total_altura_m, 3)

        detailed_tramos = []
        tubo_total_m = 0.0
        for tramo in tramos:
            tubo = find_by_id(tubos, tramo.get("tuboId"))
            altura_cm = float(tramo.get("alto", 0)) or 0
            altura_m = altura_cm / 100
            diametro_pulg = tubo.get("diametro_pulg") if tubo else None
            ancho_cm = tubo.get("ancho_cm") if tubo else None
            alto_cm = tubo.get("alto_cm") if tubo else None
            forma = tramo.get("forma", "redondo")

            length_m = altura_m
            tubo_total_m += length_m
            detailed_tramos.append({
                "alto_cm": altura_cm,
                "alto_m": round(altura_m, 4),
                "forma": forma,
                "tubo": tubo or {},
                "diametro_pulg": diametro_pulg,
                "ancho_cm": ancho_cm,
                "alto_cm_cuadrado": alto_cm,
                "largo_consumido_m": round(length_m, 4),
            })

        plan["geometry"]["tubo_total_m"] = round(tubo_total_m, 4)
        plan["geometry"]["tramos"] = detailed_tramos

        accesorios_sel = params.get("accesoriosSeleccionados", []) or []
        for acc_id in accesorios_sel:
            acc = find_by_id(accesorios, acc_id)
            if not acc:
                continue
            detalles = (params.get("detallesAccesorios") or {}).get(str(acc_id), {})
            plan["accesorios"].append({
                "accesorio": acc,
                "detalles": detalles,
            })

        altura_total = round(total_altura_m, 4)
        if altura_total > 3.0:
            plan["geometry"]["recomendacion_platina"] = {
                "largo_cm": 60,
                "ancho_cm": 60,
                "espesor_mm": 12.7,
                "descripcion": "Base estructural industrial para alturas grandes",
            }
        elif altura_total > 0.6:
            plan["geometry"]["recomendacion_platina"] = {
                "largo_cm": 35,
                "ancho_cm": 35,
                "espesor_mm": 9.5,
                "descripcion": "Plantilla reforzada para mástil",
            }
        else:
            plan["geometry"]["recomendacion_platina"] = {
                "largo_cm": 20,
                "ancho_cm": 20,
                "espesor_mm": 4.5,
                "descripcion": "Platina estándar",
            }

    else:
        ancho_cm = float(params.get("ancho", 0)) or 0
        alto_cm = float(params.get("alto", 0)) or 0
        fondo_cm = float(params.get("fondo", 0)) or 0
        ancho_m = ancho_cm / 100
        alto_m = alto_cm / 100
        fondo_m = fondo_cm / 100
        plan["geometry"]["ancho_m"] = round(ancho_m, 4)
        plan["geometry"]["alto_m"] = round(alto_m, 4)
        plan["geometry"]["fondo_m"] = round(fondo_m, 4)
        plan["geometry"]["superficie_m2"] = round(2 * (ancho_m * alto_m + ancho_m * fondo_m + alto_m * fondo_m), 4)

        lamina = find_by_id(laminas, params.get("laminaId"))
        plan["materiales"]["lamina"] = lamina or {}
        plan["materiales"]["pintura"] = {
            "nombre": params.get("nombrePintura"),
            "color_hex": params.get("colorPintura"),
            "precio_m2": params.get("costoPinturaM2"),
        }

        accesorios_sel = params.get("accesoriosSeleccionados", []) or []
        for acc_id in accesorios_sel:
            acc = find_by_id(accesorios, acc_id)
            if not acc:
                continue
            detalles = (params.get("detallesAccesorios") or {}).get(str(acc_id), {})
            plan["accesorios"].append({
                "accesorio": acc,
                "detalles": detalles,
            })

    return plan


def build_summary_text(plan: Dict[str, Any]) -> str:
    lines = [
        f"PLANO PARAMÉTRICO GENERADO",
        f"Fecha: {plan['meta']['generado_en']}",
        f"Categoría: {plan['meta']['categoria']}",
        f"Consecutivo: {plan['meta']['consecutivo']}",
        f"Ítems de cotización: {plan['meta']['itemsCotizacion']}",
        "",
        "--- Parámetros ---",
    ]

    params = plan.get("params", {})
    for key, value in params.items():
        if key == "tramos":
            continue
        if isinstance(value, list):
            continue
        lines.append(f"{key}: {value}")

    if params.get("tramos"):
        lines.append("")
        lines.append("Tramos:")
        for tramo in params["tramos"]:
            lines.append(f"  - Alto cm: {tramo.get('alto')} | Forma: {tramo.get('forma')} | Tubo: {tramo.get('tuboId')}")

    if plan.get("geometry"):
        lines.append("")
        lines.append("--- Geometría Derivada ---")
        for key, value in plan["geometry"].items():
            lines.append(f"{key}: {value}")

    if plan.get("accesorios"):
        lines.append("")
        lines.append("--- Accesorios seleccionados ---")
        for item in plan["accesorios"]:
            acc = item.get("accesorio", {})
            lines.append(f"  - {acc.get('nombre', 'desconocido')} | {acc.get('categoria', '')} | Precio: {acc.get('precio', acc.get('precio_unitario', 0))}")
            if item.get("detalles"):
                lines.append(f"    Detalles: {item.get('detalles')}")

    return "\n".join(lines)


def crear_paquete_plano(payload: Dict[str, Any]) -> Dict[str, Any]:
    out_dir = "generated_plans"
    os.makedirs(out_dir, exist_ok=True)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    safe_consecutivo = "".join(ch for ch in str(payload.get("consecutivo", "")) if ch.isalnum() or ch in "-_")
    base_name = f"plano_{safe_consecutivo}_{timestamp}"
    json_filename = f"{base_name}.json"
    txt_filename = f"{base_name}.txt"
    zip_filename = f"{base_name}.zip"

    plan = build_plano_data(payload)
    summary = build_summary_text(plan)

    json_bytes = json.dumps(plan, indent=2, ensure_ascii=False).encode("utf-8")
    txt_bytes = summary.encode("utf-8")

    zip_path = os.path.join(out_dir, zip_filename)
    with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED) as zipf:
        zipf.writestr(json_filename, json_bytes)
        zipf.writestr(txt_filename, txt_bytes)

    return {
        "archivo": zip_filename,
        "ruta": zip_path,
        "json_file": json_filename,
        "txt_file": txt_filename,
        "readme_file": f"{base_name}_README.txt",
        "manifest_file": f"{base_name}_manifest.json",
        "plan": plan,
    }
