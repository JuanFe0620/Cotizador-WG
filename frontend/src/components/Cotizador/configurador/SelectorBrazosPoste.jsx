import React, { useState, useEffect } from 'react';
import { Plus, Trash2, RefreshCw } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function SelectorBrazosPoste({ params = {}, setParams, accesorios = [], modoCliente = false }) {
  const [incluir, setIncluir] = useState(Boolean(params.incluirBrazoPoste));
  const [brazosDisponibles, setBrazosDisponibles] = useState([]);
  const [brazoSeleccionadoId, setBrazoSeleccionadoId] = useState('');
  
  // Leemos directamente del params la última altura escrita o tomamos 150 por defecto
  const [alturaAnclaje, setAlturaAnclaje] = useState(params.alturaBrazoTemp || 150);
  const [rotacion, setRotacion] = useState(params.rotacionBrazoTemp || 0);
  
  const [cargando, setCargando] = useState(false);
  const [errorBD, setErrorBD] = useState(false);

  useEffect(() => {
    if (params.incluirBrazoPoste !== undefined) {
      setIncluir(Boolean(params.incluirBrazoPoste));
    }
  }, [params.incluirBrazoPoste]);

  const fetchBrazosDesdeBD = async () => {
    setCargando(true);
    setErrorBD(false);

    try {
      const [resEstandar, resGuardados] = await Promise.allSettled([
        fetch(`${API_BASE_URL}/api/brazos`),
        fetch(`${API_BASE_URL}/api/brazos-guardados`)
      ]);

      let listaEstandar = [];
      if (resEstandar.status === 'fulfilled' && resEstandar.value.ok) {
        const data = await resEstandar.value.json();
        const raw = Array.isArray(data) ? data : (data.brazos || []);
        listaEstandar = raw.map((b) => ({
          ...b,
          uid: String(b.id ?? b.codigo),
          esPersonalizado: false
        }));
      }

      let listaPersonalizados = [];
      if (resGuardados.status === 'fulfilled' && resGuardados.value.ok) {
        const dataG = await resGuardados.value.json();
        const rawG = Array.isArray(dataG) ? dataG : [];
        listaPersonalizados = rawG.map((bg) => ({
          ...bg,
          uid: bg.uid || `guardado_${bg.id}`,
          esPersonalizado: true,
          precio: parseFloat(bg.costo_total ?? bg.precio ?? 0) || 0
        }));
      }

      if (resEstandar.status !== 'fulfilled' && resGuardados.status !== 'fulfilled') {
        throw new Error('No se pudo consultar /api/brazos');
      }

      const lista = [...listaEstandar, ...listaPersonalizados];
      setBrazosDisponibles(lista);

      if (lista.length > 0 && !brazoSeleccionadoId) {
        setBrazoSeleccionadoId(String(lista[0].uid));
      }
      return lista;
    } catch (err) {
      console.error("Error consultando la BD de brazos:", err);
      setErrorBD(true);
      setBrazosDisponibles([]);
      return [];
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    fetchBrazosDesdeBD();
  }, []);

  const brazosAgregados = params.brazosAdicionales || params.brazos || [];

  const crearObjetoBrazo = (objBrazo, alt, rot) => {
    let rutaGlb = objBrazo.archivo_glb || objBrazo.archivoGlb || objBrazo.glb || '';
    if (rutaGlb.startsWith('/models/')) {
      rutaGlb = rutaGlb.replace('/models/', '');
    }

    const altNum = parseFloat(alt) || 0;
    const rotNum = parseFloat(rot) || 0;
    const cfg = objBrazo.configuracion || {};

    if (objBrazo.esPersonalizado || (Array.isArray(objBrazo.tramos) && objBrazo.tramos.length > 0)) {
      return {
        ...cfg,
        id: objBrazo.uid || `guardado_${objBrazo.id}`,
        brazoGuardadoId: objBrazo.id,
        esPersonalizado: true,
        nombre: objBrazo.nombre || 'Brazo Personalizado',
        tuboId: objBrazo.tubo_id ?? objBrazo.tuboId ?? null,
        tramos: objBrazo.tramos || [],
        bujeInicialId: objBrazo.buje_inicial_id ?? cfg.bujeInicialId ?? '',
        bujeInicial: cfg.bujeInicial || null,
        bujeFinalId: objBrazo.buje_final_id ?? cfg.bujeFinalId ?? '',
        bujeFinal: cfg.bujeFinal || null,
        configuracion: cfg,
        alturaAnclajeCm: altNum,
        alturaAnclaje: altNum,
        altura: altNum,
        rotacionDeg: rotNum,
        rotacion: rotNum,
        precio: parseFloat(objBrazo.costo_total ?? objBrazo.precio) || 0
      };
    }

    return {
      id: objBrazo.id ?? objBrazo.codigo,
      esPersonalizado: false,
      nombre: objBrazo.nombre || 'Brazo Salida',
      archivo_glb: rutaGlb,
      archivoGlb: rutaGlb,
      alturaAnclajeCm: altNum,
      alturaAnclaje: altNum,
      altura: altNum, // Clave fallback de respaldo
      rotacionDeg: rotNum,
      rotacion: rotNum,
      precio: parseFloat(objBrazo.precio) || 0
    };
  };

  const handleToggleIncluir = async (e) => {
    const checked = e.target.checked;
    setIncluir(checked);

    if (checked) {
      let listaBD = brazosDisponibles;
      if (listaBD.length === 0) {
        listaBD = await fetchBrazosDesdeBD();
      }

      let nuevaListaBrazos = [...brazosAgregados];
      if (nuevaListaBrazos.length === 0 && listaBD.length > 0) {
        nuevaListaBrazos.push(crearObjetoBrazo(listaBD[0], alturaAnclaje, rotacion));
      }

      setParams((prev) => ({
        ...prev,
        incluirBrazoPoste: true,
        brazosAdicionales: nuevaListaBrazos,
        brazos: nuevaListaBrazos,
      }));
    } else {
      setParams((prev) => ({
        ...prev,
        incluirBrazoPoste: false,
        brazosAdicionales: [],
        brazos: [],
      }));
    }
  };

  const handleAgregarBrazo = () => {
    if (brazosDisponibles.length === 0) return;

    const objBrazo = brazosDisponibles.find(
      (b) => String(b.uid ?? b.id ?? b.codigo) === String(brazoSeleccionadoId)
    ) || brazosDisponibles[0];

    if (!objBrazo) return;

    // Se construye tomando el valor actual de los inputs
    const nuevoBrazo = crearObjetoBrazo(objBrazo, alturaAnclaje, rotacion);
    const nuevaLista = [...brazosAgregados, nuevoBrazo];

    setParams((prev) => ({
      ...prev,
      incluirBrazoPoste: true,
      brazosAdicionales: nuevaLista,
      brazos: nuevaLista,
    }));
  };

  const handleActualizarBrazo = (index, campo, valor) => {
    const numVal = valor === '' ? 0 : (parseFloat(valor) || 0);
    const nuevaLista = brazosAgregados.map((item, idx) => {
      if (idx !== index) return item;
      if (campo === 'altura') {
        return { ...item, alturaAnclajeCm: numVal, alturaAnclaje: numVal, altura: numVal };
      }
      if (campo === 'rotacion') {
        return { ...item, rotacionDeg: numVal, rotacion: numVal };
      }
      return item;
    });

    setParams((prev) => ({
      ...prev,
      brazosAdicionales: nuevaLista,
      brazos: nuevaLista,
    }));
  };

  const handleEliminarBrazo = (index) => {
    const nuevaLista = brazosAgregados.filter((_, i) => i !== index);
    const sigueTeniendoBrazos = nuevaLista.length > 0;

    if (!sigueTeniendoBrazos) {
      setIncluir(false);
    }

    setParams((prev) => ({
      ...prev,
      incluirBrazoPoste: sigueTeniendoBrazos,
      brazosAdicionales: nuevaLista,
      brazos: nuevaLista,
    }));
  };

  return (
    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-3">
      <label className="flex items-center gap-2 cursor-pointer text-slate-800 font-semibold select-none">
        <input
          type="checkbox"
          checked={incluir}
          onChange={handleToggleIncluir}
          className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-0"
        />
        <span>Incluir Brazo / Salida en Poste</span>
      </label>

      {incluir && (
        <div className="space-y-3 pt-2">
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-[11px] font-medium text-slate-600">
                Tipo de Brazo (desde BD):
              </label>
              <button
                type="button"
                onClick={fetchBrazosDesdeBD}
                className="text-blue-600 hover:text-blue-800 text-[10px] flex items-center gap-1 font-medium"
              >
                <RefreshCw size={10} /> Recargar BD
              </button>
            </div>

            <select
              value={brazoSeleccionadoId}
              onChange={(e) => setBrazoSeleccionadoId(e.target.value)}
              disabled={cargando || brazosDisponibles.length === 0}
              className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 font-medium text-xs disabled:bg-slate-100"
            >
              {cargando ? (
                <option value="">Cargando registros desde BD...</option>
              ) : errorBD ? (
                <option value="">Error al consultar /api/brazos</option>
              ) : brazosDisponibles.length > 0 ? (
                <>
                  {brazosDisponibles.some((b) => !b.esPersonalizado) && (
                    <optgroup label="Brazos Estándar">
                      {brazosDisponibles
                        .filter((b) => !b.esPersonalizado)
                        .map((b) => {
                          const val = String(b.uid ?? b.id ?? b.codigo);
                          return (
                            <option key={val} value={val}>
                              {b.nombre}{!modoCliente && b.precio ? ` ($${Number(b.precio).toLocaleString()})` : ''}
                            </option>
                          );
                        })}
                    </optgroup>
                  )}
                  {brazosDisponibles.some((b) => b.esPersonalizado) && (
                    <optgroup label="Mis Brazos Personalizados">
                      {brazosDisponibles
                        .filter((b) => b.esPersonalizado)
                        .map((b) => {
                          const val = String(b.uid ?? `guardado_${b.id}`);
                          return (
                            <option key={val} value={val}>
                              ★ {b.nombre}{!modoCliente && b.precio ? ` ($${Number(b.precio).toLocaleString()})` : ''}
                            </option>
                          );
                        })}
                    </optgroup>
                  )}
                </>
              ) : (
                <option value="">La tabla 'brazos' está vacía en la BD</option>
              )}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] font-medium text-slate-600 block mb-1">
                Altura Anclaje (cm)
              </label>
              <input
                type="number"
                value={alturaAnclaje}
                onChange={(e) => {
                  const val = e.target.value;
                  setAlturaAnclaje(val);
                  setParams(prev => ({ ...prev, alturaBrazoTemp: val }));
                }}
                className="w-full bg-white border border-slate-300 rounded-lg p-2 text-center text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 font-mono text-xs"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-slate-600 block mb-1">
                Rotación (°)
              </label>
              <input
                type="number"
                value={rotacion}
                onChange={(e) => {
                  const val = e.target.value;
                  setRotacion(val);
                  setParams(prev => ({ ...prev, rotacionBrazoTemp: val }));
                }}
                className="w-full bg-white border border-slate-300 rounded-lg p-2 text-center text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 font-mono text-xs"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleAgregarBrazo}
            disabled={brazosDisponibles.length === 0}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-semibold py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition shadow-sm text-xs"
          >
            <Plus size={16} />
            Añadir Brazo al Poste
          </button>

          {brazosAgregados.length > 0 && (
            <div className="space-y-1.5 pt-2 border-t border-slate-200">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Brazos Montados en Poste ({brazosAgregados.length}):
              </span>
              <div className="space-y-1.5">
                {brazosAgregados.map((item, idx) => (
                  <div
                    key={idx}
                    className="bg-white p-2 rounded-lg border border-slate-200 text-[11px] space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-slate-800 truncate">
                        {item.esPersonalizado ? `★ ${item.nombre}` : item.nombre}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleEliminarBrazo(idx)}
                        className="text-red-500 hover:text-red-700 p-1 rounded transition shrink-0"
                        title="Quitar brazo del poste"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <label className="flex items-center justify-between gap-1 bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-[10px] text-slate-600">
                        <span>Alt (cm):</span>
                        <input
                          type="number"
                          value={item.alturaAnclajeCm ?? item.alturaAnclaje ?? item.altura ?? 0}
                          onChange={(e) => handleActualizarBrazo(idx, 'altura', e.target.value)}
                          className="w-14 bg-white border border-slate-300 rounded px-1 py-0.5 text-center font-mono text-[10px] text-slate-800 outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </label>
                      <label className="flex items-center justify-between gap-1 bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-[10px] text-slate-600">
                        <span>Rot (°):</span>
                        <input
                          type="number"
                          value={item.rotacionDeg ?? item.rotacion ?? 0}
                          onChange={(e) => handleActualizarBrazo(idx, 'rotacion', e.target.value)}
                          className="w-14 bg-white border border-slate-300 rounded px-1 py-0.5 text-center font-mono text-[10px] text-slate-800 outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}