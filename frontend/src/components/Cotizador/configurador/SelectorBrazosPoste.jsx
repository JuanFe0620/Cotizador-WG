import React, { useState, useEffect } from 'react';
import { Plus, Trash2, RefreshCw } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function SelectorBrazosPoste({ params = {}, setParams, accesorios = [] }) {
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
      const res = await fetch(`${API_BASE_URL}/api/brazos`);
      if (!res.ok) throw new Error(`HTTP Error ${res.status}`);

      const data = await res.json();
      const lista = Array.isArray(data) ? data : (data.brazos || []);

      setBrazosDisponibles(lista);

      if (lista.length > 0 && !brazoSeleccionadoId) {
        setBrazoSeleccionadoId(String(lista[0].id ?? lista[0].codigo));
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

    return {
      id: objBrazo.id ?? objBrazo.codigo,
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

    let listaAcc = [...(params.accesoriosSeleccionados || [])];
    const catalogoAcc = accesorios.length > 0 ? accesorios : (params.accesorios || []);
    const cuboObj = catalogoAcc.find(a => String(a.nombre || '').toLowerCase().includes('cubo'));

    if (checked) {
      let listaBD = brazosDisponibles;
      if (listaBD.length === 0) {
        listaBD = await fetchBrazosDesdeBD();
      }

      let nuevaListaBrazos = [...brazosAgregados];
      if (nuevaListaBrazos.length === 0 && listaBD.length > 0) {
        nuevaListaBrazos.push(crearObjetoBrazo(listaBD[0], alturaAnclaje, rotacion));
      }

      if (cuboObj && !listaAcc.some(id => String(id) === String(cuboObj.id))) {
        listaAcc.push(cuboObj.id);
      }

      setParams((prev) => ({
        ...prev,
        incluirBrazoPoste: true,
        accesoriosSeleccionados: listaAcc,
        brazosAdicionales: nuevaListaBrazos,
        brazos: nuevaListaBrazos,
      }));
    } else {
      if (cuboObj) {
        listaAcc = listaAcc.filter(id => String(id) !== String(cuboObj.id));
      }

      setParams((prev) => ({
        ...prev,
        incluirBrazoPoste: false,
        accesoriosSeleccionados: listaAcc,
        brazosAdicionales: [],
        brazos: [],
      }));
    }
  };

  const handleAgregarBrazo = () => {
    if (brazosDisponibles.length === 0) return;

    const objBrazo = brazosDisponibles.find(
      (b) => String(b.id ?? b.codigo) === String(brazoSeleccionadoId)
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

  const handleEliminarBrazo = (index) => {
    const nuevaLista = brazosAgregados.filter((_, i) => i !== index);
    const sigueTeniendoBrazos = nuevaLista.length > 0;

    let listaAcc = [...(params.accesoriosSeleccionados || [])];

    if (!sigueTeniendoBrazos) {
      const catalogoAcc = accesorios.length > 0 ? accesorios : (params.accesorios || []);
      const cuboObj = catalogoAcc.find(a => String(a.nombre || '').toLowerCase().includes('cubo'));
      if (cuboObj) {
        listaAcc = listaAcc.filter(id => String(id) !== String(cuboObj.id));
      }
      setIncluir(false);
    }

    setParams((prev) => ({
      ...prev,
      incluirBrazoPoste: sigueTeniendoBrazos,
      accesoriosSeleccionados: listaAcc,
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
                <option value="">Cargando registros desde SQLite...</option>
              ) : errorBD ? (
                <option value="">Error al consultar /api/brazos</option>
              ) : brazosDisponibles.length > 0 ? (
                brazosDisponibles.map((b) => {
                  const val = String(b.id ?? b.codigo);
                  return (
                    <option key={val} value={val}>
                      {b.nombre} (${Number(b.precio).toLocaleString()})
                    </option>
                  );
                })
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
              <div className="space-y-1">
                {brazosAgregados.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between bg-white p-2 rounded-lg border border-slate-200 text-[11px]"
                  >
                    <div>
                      <span className="font-semibold text-slate-800">{item.nombre}</span>
                      <span className="text-slate-500 ml-2">
                        Alt: {item.alturaAnclajeCm ?? item.alturaAnclaje ?? item.altura}cm | Rot: {item.rotacionDeg ?? item.rotacion}°
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleEliminarBrazo(idx)}
                      className="text-red-500 hover:text-red-700 p-1 rounded transition"
                    >
                      <Trash2 size={14} />
                    </button>
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