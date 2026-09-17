import React from 'react';
import { Plus, Trash2, RotateCw, ArrowUpRight, ArrowRight, ArrowDownRight, ArrowUp, ArrowDown } from 'lucide-react';

const formatearPulgadas = (val) => {
  const num = parseFloat(val);
  if (isNaN(num)) return '';

  const equivalencias = {
    0.5: '1/2"',
    0.875: '7/8"',
    1.0: '1"',
    1.25: '1 1/4"',
    1.5: '1 1/2"',
    2.0: '2"',
    2.5: '2 1/2"',
    3.0: '3"',
    4.0: '4"'
  };

  return equivalencias[num] || `${num}"`;
};

export default function SelectorTramos({ 
  params = {}, 
  setParams, 
  tubos = [], 
  categoriaSel = 'postes' 
}) {
  const tramos = params.tramos || [];
  const esBrazo = categoriaSel === 'brazos' || params.categoria === 'brazos';

  const actualizarTramo = (id, campo, valor) => {
    setParams(prev => {
      const nuevosTramos = (prev.tramos || []).map(t => {
        if (t.id === id) {
          const tramoActualizado = { ...t, [campo]: valor };
          
          if (campo === 'alto' || campo === 'longitud') {
            const numVal = valor === '' ? '' : Number(valor);
            tramoActualizado.alto = numVal;
            tramoActualizado.longitud = numVal;
          }
          
          if (campo === 'angulo') {
            tramoActualizado.angulo = valor === '' ? 0 : Number(valor);
          }

          return tramoActualizado;
        }
        return t;
      });
      return { ...prev, tramos: nuevosTramos };
    });
  };

  const seleccionarTubo = (idTramo, tuboId) => {
    const tuboObj = tubos.find(t => String(t.id) === String(tuboId));

    setParams(prev => {
      const nuevosTramos = (prev.tramos || []).map(t => {
        if (t.id === idTramo) {
          if (!tuboObj) {
            return { ...t, tuboId: '' };
          }

          const diametroPulg = parseFloat(tuboObj.diametro_pulg || tuboObj.diametro || 2.0);
          const anchoCm = parseFloat(tuboObj.ancho_cm || 4.0);
          const altoCm = parseFloat(tuboObj.alto_cm || 4.0);

          return {
            ...t,
            tuboId: tuboObj.id,
            diametro: diametroPulg,
            diametro_pulg: diametroPulg,
            ancho_cm: anchoCm,
            alto_cm: altoCm,
            tipo: tuboObj.forma || t.forma || 'redondo'
          };
        }
        return t;
      });
      return { ...prev, tramos: nuevosTramos };
    });
  };

  const agregarTramo = () => {
    const nuevo = {
      id: Date.now(),
      alto: 40,
      longitud: 40,
      angulo: 0,
      tuboId: tramos[0]?.tuboId || '',
      forma: 'redondo',
      diametro_pulg: 2.0
    };
    setParams(prev => ({ ...prev, tramos: [...(prev.tramos || []), nuevo] }));
  };

  const eliminarTramo = (id) => {
    if (tramos.length <= 1) return;
    setParams(prev => ({
      ...prev,
      tramos: (prev.tramos || []).filter(t => t.id !== id)
    }));
  };

  const obtenerTubosFiltrados = (formaTramo) => {
    const formaBuscada = (formaTramo || 'redondo').toLowerCase();

    return tubos.filter(t => {
      const formaTubo = (t.forma || '').toLowerCase();
      const coincideForma = formaTubo === formaBuscada;
      const perteneceCategoria = !categoriaSel || (t.categorias && t.categorias.includes(categoriaSel));

      return coincideForma && perteneceCategoria;
    });
  };

  return (
    <div className="space-y-4">
      {/* UBICACIÓN DEL BRAZO */}
      {esBrazo && (
        <div className="bg-slate-100 p-3 rounded-xl border border-slate-200 space-y-2">
          <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
            Ubicación del Brazo
          </label>
          <div className="grid grid-cols-2 gap-2 text-xs font-medium">
            <button
              type="button"
              onClick={() => setParams(prev => ({ ...prev, orientacion: 'suspendido' }))}
              className={`p-2 rounded-lg border text-center transition ${
                params.orientacion !== 'suelo'
                  ? 'bg-blue-600 text-white border-blue-600 font-semibold shadow-sm'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
            >
              Suspendido (Pared/Poste)
            </button>
            <button
              type="button"
              onClick={() => setParams(prev => ({ ...prev, orientacion: 'suelo' }))}
              className={`p-2 rounded-lg border text-center transition ${
                params.orientacion === 'suelo'
                  ? 'bg-blue-600 text-white border-blue-600 font-semibold shadow-sm'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
            >
              Sobre el Suelo
            </button>
          </div>
        </div>
      )}

      {/* LISTA DE TRAMOS */}
      <div className="space-y-3">
        {tramos.map((tramo, idx) => {
          const tubosOpciones = obtenerTubosFiltrados(tramo.forma);
          const anguloVal = Number(tramo.angulo ?? 0);

          return (
            <div 
              key={tramo.id} 
              className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-3 relative shadow-sm"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-blue-600 text-[11px] uppercase tracking-wider">
                  {esBrazo ? `Tramo Vectorial ${idx + 1}` : `Tramo ${idx + 1}`}
                </span>

                <div className="flex items-center gap-2">
                  <select
                    value={tramo.forma || 'redondo'}
                    onChange={e => actualizarTramo(tramo.id, 'forma', e.target.value)}
                    className="bg-white text-slate-700 text-[10px] rounded-lg px-2 py-1 border border-slate-300 outline-none font-medium cursor-pointer focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="redondo">Tubo Redondo</option>
                    <option value="cuadrado">Tubo Cuadrado</option>
                  </select>

                  {tramos.length > 1 && (
                    <button
                      type="button"
                      onClick={() => eliminarTramo(tramo.id)}
                      className="text-red-500 hover:text-red-700 p-1 rounded-lg hover:bg-red-50 transition"
                      title="Eliminar tramo"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* Selector de Tubo */}
              <div>
                <select
                  value={tramo.tuboId || ''}
                  onChange={e => seleccionarTubo(tramo.id, e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-800 text-xs outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">
                    -- Selecciona Tubo {tramo.forma === 'cuadrado' ? 'cuadrado' : 'redondo'} --
                  </option>
                  {tubosOpciones.map(t => {
                    const precio = Number(t.precio_tira_6m || t.precio || 0);
                    const precioFormat = precio.toLocaleString('es-CO');

                    let medidaTxt = t.forma === 'cuadrado' 
                      ? `${t.ancho_cm || 4}x${t.alto_cm || 4} cm` 
                      : `Ø ${formatearPulgadas(t.diametro_pulg)}`;

                    return (
                      <option key={t.id} value={t.id}>
                        {t.material ? `${t.material} - ` : ''}{t.calibre ? `${t.calibre} - ` : ''}{medidaTxt} - (${precioFormat}/tira)
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Longitud */}
              <div className="pt-1 border-t border-slate-200/60 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-semibold text-slate-600">
                    Longitud del Tramo (cm):
                  </label>
                  <input
                    type="number"
                    value={tramo.alto ?? tramo.longitud ?? ''}
                    onChange={e => actualizarTramo(tramo.id, 'alto', e.target.value)}
                    className="w-20 text-right bg-white border border-slate-300 rounded-lg px-2 py-1 text-slate-800 font-mono text-xs outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                  />
                </div>
                <input
                  type="range"
                  min="10"
                  max="250"
                  step="5"
                  value={tramo.alto ?? tramo.longitud ?? 40}
                  onChange={e => actualizarTramo(tramo.id, 'alto', e.target.value)}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>

              {/* Ángulo */}
              {esBrazo && (
                <div className="pt-2 border-t border-slate-200/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-semibold text-slate-600 flex items-center gap-1">
                      <RotateCw size={11} className="text-amber-500" /> Dirección / Ángulo (°):
                    </label>
                    <input
                      type="number"
                      value={tramo.angulo ?? 0}
                      onChange={e => actualizarTramo(tramo.id, 'angulo', e.target.value)}
                      className="w-20 text-right bg-white border border-slate-300 rounded-lg px-2 py-1 text-slate-800 font-mono text-xs outline-none focus:ring-2 focus:ring-amber-500 font-bold"
                    />
                  </div>

                  <div className="grid grid-cols-5 gap-1">
                    <button
                      type="button"
                      onClick={() => actualizarTramo(tramo.id, 'angulo', 90)}
                      className={`p-1.5 rounded text-[10px] flex flex-col items-center justify-center gap-0.5 border transition ${
                        anguloVal === 90 ? 'bg-amber-500 text-white border-amber-600 font-bold' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <ArrowUp size={12} />
                      <span>90° Arriba</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => actualizarTramo(tramo.id, 'angulo', 45)}
                      className={`p-1.5 rounded text-[10px] flex flex-col items-center justify-center gap-0.5 border transition ${
                        anguloVal === 45 ? 'bg-amber-500 text-white border-amber-600 font-bold' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <ArrowUpRight size={12} />
                      <span>45°</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => actualizarTramo(tramo.id, 'angulo', 0)}
                      className={`p-1.5 rounded text-[10px] flex flex-col items-center justify-center gap-0.5 border transition ${
                        anguloVal === 0 ? 'bg-amber-500 text-white border-amber-600 font-bold' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <ArrowRight size={12} />
                      <span>0° Recto</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => actualizarTramo(tramo.id, 'angulo', -45)}
                      className={`p-1.5 rounded text-[10px] flex flex-col items-center justify-center gap-0.5 border transition ${
                        anguloVal === -45 ? 'bg-amber-500 text-white border-amber-600 font-bold' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <ArrowDownRight size={12} />
                      <span>-45°</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => actualizarTramo(tramo.id, 'angulo', -90)}
                      className={`p-1.5 rounded text-[10px] flex flex-col items-center justify-center gap-0.5 border transition ${
                        anguloVal === -90 ? 'bg-amber-500 text-white border-amber-600 font-bold' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <ArrowDown size={12} />
                      <span>-90° Abajo</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={agregarTramo}
        className="w-full py-2 border-2 border-dashed border-slate-300 hover:border-blue-500 hover:text-blue-600 text-slate-500 font-medium rounded-xl flex items-center justify-center gap-1.5 transition text-[11px] bg-white hover:bg-blue-50/50"
      >
        <Plus size={14} />
        {esBrazo ? 'Agregar siguiente tramo articulado' : 'Agregar otro tramo independiente'}
      </button>
    </div>
  );
}