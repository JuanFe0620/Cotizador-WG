import React from 'react';

export default function ListaAccesorios({
  accesorios = [],
  categoriaSel,
  params = {},
  setParams,
  cantidadesAcc = {},
  setCantidadesAcc,
  laminas = [],
  tubos = []
}) {
  const limpiarTexto = (txt = '') =>
    String(txt)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();

  const catSelNorm = limpiarTexto(categoriaSel || params?.categoria || '');
  const esGabinete = catSelNorm.includes('gabinete') || catSelNorm.includes('gabinetes');
  const esBaseCuadrada = limpiarTexto(params?.formaBase || '').includes('cuad');

  const accesoriosFiltrados = accesorios.filter(a => {
    let cats = [];
    if (Array.isArray(a.categorias)) {
      cats = a.categorias.map(c => limpiarTexto(c));
    } else if (typeof a.categorias === 'string') {
      cats = a.categorias.split(',').map(c => limpiarTexto(c.trim()));
    } else if (a.categoria) {
      cats = [limpiarTexto(a.categoria)];
    }

    const perteneceCategoria = cats.length === 0 || cats.some(c => c.includes(catSelNorm) || catSelNorm.includes(c));
    const nombreNormalizado = limpiarTexto(a.nombre);
    const idNormalizado = limpiarTexto(a.id);
    const esBase = nombreNormalizado.includes('base_principal') || idNormalizado.includes('base_principal');

    if (esBaseCuadrada && nombreNormalizado.includes('platina redonda')) return false;
    if (!esBaseCuadrada && nombreNormalizado.includes('platina cuadrada')) return false;
    
    return perteneceCategoria && !esBase;
  });

  const toggleAccesorio = (accId) => {
    setParams(prev => {
      const seleccionados = prev.accesoriosSeleccionados || [];
      const accObj = accesorios.find(a => String(a.id) === String(accId));
      const nombreNorm = limpiarTexto(accObj?.nombre);
      const idNorm = limpiarTexto(accObj?.id);

      const esGuia = nombreNorm.includes('guia') || idNorm.includes('guia');

      const estaSeleccionado = seleccionados.some(item => {
        const itemStr = limpiarTexto(typeof item === 'object' ? item.id : item);
        return itemStr === limpiarTexto(accId) || 
               (esGuia && (itemStr.includes('guia') || itemStr.includes('platina_guia')));
      });

      const detallesActuales = prev.detallesAccesorios || {};

      if (estaSeleccionado) {
        const nuevosDetalles = { ...detallesActuales };
        delete nuevosDetalles[accId];

        const listaFiltrada = seleccionados.filter(item => {
          const itemStr = limpiarTexto(typeof item === 'object' ? item.id : item);
          return itemStr !== limpiarTexto(accId);
        });

        return {
          ...prev,
          accesoriosSeleccionados: listaFiltrada,
          detallesAccesorios: nuevosDetalles,
        };
      }

      const requiereLamina = (accObj?.requiereLamina || accObj?.requiere_lamina) && !esGuia;
      const permiteNPies = accObj?.permiteNPies || accObj?.permite_n_pies;
      const esCorona = nombreNorm.includes('corona') || nombreNorm.includes('empalme');
      const esRueda = nombreNorm.includes('rueda');

      const primeraLaminaId = laminas[0]?.id ? String(laminas[0].id) : undefined;

      const detallesIniciales = {
        ...(detallesActuales[accId] || {}),
        laminaId: requiereLamina ? String(prev.laminaAnclajeId || prev.laminaId || primeraLaminaId || '') : undefined,
        N_Pies: permiteNPies ? (detallesActuales[accId]?.N_Pies || 4) : undefined,
        cantPerforaciones: esCorona ? (detallesActuales[accId]?.cantPerforaciones || 4) : undefined,
        diametroRueda: esRueda ? (detallesActuales[accId]?.diametroRueda || 2.5) : undefined
      };

      return {
        ...prev,
        accesoriosSeleccionados: [...seleccionados, accId],
        detallesAccesorios: {
          ...detallesActuales,
          [accId]: detallesIniciales,
        },
      };
    });
  };

  const cambiarCantidad = (accId, delta) => {
    const actual = cantidadesAcc[accId] || 1;
    const nueva = Math.max(1, actual + delta);
    setCantidadesAcc(prev => ({ ...prev, [accId]: nueva }));
  };

  const cambiarParametroAcc = (accId, clave, valor) => {
    setParams(prev => ({
      ...prev,
      detallesAccesorios: {
        ...(prev.detallesAccesorios || {}),
        [accId]: {
          ...(prev.detallesAccesorios?.[accId] || {}),
          [clave]: valor
        }
      }
    }));
  };

  return (
    <div className="space-y-3">
      {esGabinete && (
        <div className="p-3 bg-blue-50 border border-blue-300 rounded-xl space-y-2 mb-3 shadow-sm">
          <span className="font-bold text-blue-900 uppercase block text-[10px] tracking-wider">
            CONFIGURACIÓN DE PUERTA
          </span>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-semibold text-slate-700 block mb-0.5">Tipo de Puerta:</label>
              <select
                value={params?.tipoPuerta || 'vidrio'}
                onChange={(e) => setParams(prev => ({ ...prev, tipoPuerta: e.target.value }))}
                className="w-full bg-white border border-slate-300 rounded-lg p-1.5 text-[10px] text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              >
                <option value="vidrio">Vidrio</option>
                <option value="normal">Normal</option>
                <option value="doble">Doble</option>
              </select>
            </div>

            {(params?.tipoPuerta || 'vidrio') === 'vidrio' && (
              <div>
                <label className="text-[10px] font-semibold text-slate-700 block mb-0.5">Acabado:</label>
                <select
                  value={params?.acabadoPuerta || 'romo'}
                  onChange={(e) => setParams(prev => ({ ...prev, acabadoPuerta: e.target.value }))}
                  className="w-full bg-white border border-slate-300 rounded-lg p-1.5 text-[10px] text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                >
                  <option value="romo">Romo</option>
                  <option value="punta">Punta</option>
                </select>
              </div>
            )}
          </div>
        </div>
      )}

      <div>
        <span className="font-bold text-slate-500 uppercase block border-b border-slate-100 pb-1 text-[10px] tracking-wider mb-2">
          ACCESORIOS Y RACKS INTERNOS
        </span>

        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
          {accesoriosFiltrados.map(acc => {
            const nombreNorm = limpiarTexto(acc.nombre);
            const idNorm = limpiarTexto(acc.id);
            
            const esGuia = nombreNorm.includes('guia') || idNorm.includes('guia');
            const esRueda = nombreNorm.includes('rueda');

            const check = (params.accesoriosSeleccionados || []).some(item => {
              const itemStr = limpiarTexto(typeof item === 'object' ? item.id : item);
              return itemStr === idNorm || (esGuia && (itemStr.includes('guia') || itemStr.includes('platina_guia')));
            });

            const cant = cantidadesAcc[acc.id] || 1;
            const esCorona = nombreNorm.includes('corona') || nombreNorm.includes('empalme');
            const detalles = params.detallesAccesorios?.[acc.id] || {};

            const requiereLamina = (acc.requiereLamina || acc.requiere_lamina) && !esGuia;
            const permiteNPies = acc.permiteNPies || acc.permite_n_pies;

            const laminaSeleccionadaId = detalles.laminaId !== undefined && detalles.laminaId !== null
              ? String(detalles.laminaId)
              : (params.laminaAnclajeId || (laminas[0]?.id ? String(laminas[0].id) : ''));

            const tieneControlesExtra = requiereLamina || permiteNPies || esCorona || esRueda;

            return (
              <div 
                key={acc.id} 
                className={`p-2.5 rounded-xl border transition space-y-2 ${
                  check ? 'bg-blue-50/60 border-blue-500 shadow-sm' : 'bg-slate-50 border-slate-200 hover:bg-slate-100/80'
                }`}
              >
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-800 font-medium text-[11px] select-none">
                    <input 
                      type="checkbox" 
                      checked={check} 
                      onChange={() => toggleAccesorio(acc.id)}
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-0" 
                    />
                    <span>{acc.nombre}</span>
                  </label>

                  {check && !esRueda && (
                    <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-lg px-1 py-0.5 shadow-sm">
                      <button 
                        type="button"
                        onClick={() => cambiarCantidad(acc.id, -1)}
                        className="text-slate-500 hover:text-slate-800 px-1.5 text-xs font-bold"
                      >
                        -
                      </button>
                      <span className="text-slate-900 font-mono text-[11px] font-semibold px-0.5">{cant}</span>
                      <button 
                        type="button"
                        onClick={() => cambiarCantidad(acc.id, 1)}
                        className="text-slate-500 hover:text-slate-800 px-1.5 text-xs font-bold"
                      >
                        +
                      </button>
                    </div>
                  )}
                </div>

                {check && tieneControlesExtra && (
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/80">
                    {requiereLamina && (
                      <div className={permiteNPies || esCorona ? 'col-span-1' : 'col-span-2'}>
                        <label className="text-[10px] font-medium text-slate-600 block mb-0.5">Lámina / Calibre:</label>
                        <select
                          value={laminaSeleccionadaId}
                          onChange={(e) => cambiarParametroAcc(acc.id, 'laminaId', e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded-lg p-1.5 text-[10px] text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">-- Seleccionar --</option>
                          {laminas.map(l => (
                            <option key={l.id} value={String(l.id)}>
                              {l.material} ({l.calibre})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {esRueda && (
                      <div className="col-span-2">
                        <label className="text-[10px] font-medium text-slate-600 block mb-0.5">Diámetro de Rueda:</label>
                        <select
                          value={detalles.diametroRueda || 2.5}
                          onChange={(e) => cambiarParametroAcc(acc.id, 'diametroRueda', parseFloat(e.target.value))}
                          className="w-full bg-white border border-slate-300 rounded-lg p-1.5 text-[10px] text-slate-800 outline-none font-semibold focus:ring-2 focus:ring-blue-500"
                        >
                          <option value={1.5}>1.5" (Prensa pequeña)</option>
                          <option value={2}>2" (Estándar)</option>
                          <option value={2.5}>2.5" (Industrial / Pesado)</option>
                        </select>
                      </div>
                    )}

                    {permiteNPies && (
                      <div className="col-span-1">
                        <label className="text-[10px] font-medium text-slate-600 block mb-0.5">Pies de Amigo (N_Pies):</label>
                        <select
                          value={detalles.N_Pies || 4}
                          onChange={(e) => cambiarParametroAcc(acc.id, 'N_Pies', parseInt(e.target.value, 10))}
                          className="w-full bg-white border border-slate-300 rounded-lg p-1.5 text-[10px] text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value={2}>2 Pies</option>
                          <option value={3}>3 Pies</option>
                          <option value={4}>4 Pies</option>
                          <option value={6}>6 Pies</option>
                        </select>
                      </div>
                    )}

                    {esCorona && (
                      <div className="col-span-1">
                        <label className="text-[10px] font-medium text-slate-600 block mb-0.5">Perforaciones:</label>
                        <select
                          value={detalles.cantPerforaciones || 4}
                          onChange={(e) => cambiarParametroAcc(acc.id, 'cantPerforaciones', parseInt(e.target.value, 10))}
                          className="w-full bg-white border border-slate-300 rounded-lg p-1.5 text-[10px] text-slate-800 outline-none font-semibold focus:ring-2 focus:ring-blue-500"
                        >
                          <option value={4}>4 Huecos (Estándar)</option>
                          <option value={6}>6 Huecos</option>
                          <option value={8}>8 Huecos</option>
                        </select>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}