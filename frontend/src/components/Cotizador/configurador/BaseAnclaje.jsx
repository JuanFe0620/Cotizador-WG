import React from 'react';

export default function BaseAnclaje({
  requiereAnclaje,
  usarPersonalizada,
  setUsarPersonalizada,
  params,
  setParams,
  recPlatina,
  platinaLargo,
  setPlatinaLargo,
  laminaAnclajeId,
  setLaminaAnclajeId,
  laminas
}) {
  if (!requiereAnclaje) return null;

  const formaBase = params?.formaBase || 'Base Redonda';

  const handleMedidaBase = (val) => {
    const num = Number(val);
    setPlatinaLargo(num);
    if (typeof setParams === 'function') {
      setParams(prev => ({ 
        ...prev, 
        ladoBase: num, 
        dimensionBase: num, 
        dimension: num,
        platinaLargo: num,
        platinaAncho: num,
        anchoBase: num
      }));
    }
  };

  return (
    <div className="bg-amber-50/60 border border-amber-300 rounded-xl p-3 space-y-2.5 shadow-sm">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-1.5 font-bold text-amber-800 text-xs">
          <span>🛡️ Base / Platina Anclaje</span>
        </div>
        <button
          type="button"
          onClick={() => setUsarPersonalizada(!usarPersonalizada)}
          className="px-2.5 py-1 text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-300 rounded-lg transition"
        >
          {usarPersonalizada ? 'Sugerida' : 'Personalizar'}
        </button>
      </div>

      {/* Forma de la Base */}
      <div>
        <label className="text-slate-600 font-medium block mb-1 text-[10px]">Forma de la Base:</label>
        <select
          value={formaBase}
          onChange={e => setParams(prev => ({ ...prev, formaBase: e.target.value }))}
          className="w-full bg-white border border-slate-300 rounded-lg p-1.5 text-slate-800 outline-none text-xs focus:ring-2 focus:ring-blue-500"
        >
          <option value="Base Redonda">Base Redonda</option>
          <option value="Base Cuadrada">Base Cuadrada</option>
          <option value="Sin Base">Sin Base (Incrustado)</option>
        </select>
      </div>

      {!usarPersonalizada ? (
        <div className="bg-white/80 p-2 rounded-lg border border-amber-200 text-[11px] text-slate-700">
          <span className="text-amber-700 font-semibold">Sugerencia: </span>
          {recPlatina.desc} ({recPlatina.espesor})
        </div>
      ) : (
        <div className="space-y-2 pt-1 border-t border-amber-200">
          <div>
            <label className="text-slate-600 font-medium block mb-1 text-[10px]">
              {formaBase === 'Base Redonda' ? 'Diámetro Base (cm)' : 'Lado Base (cm)'}
            </label>
            <input
              type="number"
              value={platinaLargo || 20}
              onChange={e => handleMedidaBase(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg p-1.5 text-slate-800 font-mono text-xs outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="text-slate-600 font-medium block mb-1 text-[10px]">Material / Calibre:</label>
            <select
              value={laminaAnclajeId}
              onChange={e => setLaminaAnclajeId(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg p-1.5 text-slate-800 outline-none text-xs focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Seleccionar Lámina --</option>
              {laminas.map(l => (
                <option key={l.id} value={l.id}>
                  {l.material} ({l.calibre})
                </option>
              ))}
            </select>
          </div>

          {/* Configuración Pies de Amigo */}
          <div className="pt-2 border-t border-amber-200 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-blue-700 font-bold text-[11px]">Pies de Amigo (Cartelas)</span>
              <input
                type="checkbox"
                checked={params.usarPieAmigo ?? true}
                onChange={e => setParams(prev => ({ ...prev, usarPieAmigo: e.target.checked }))}
                className="rounded text-blue-600 w-4 h-4 border-slate-300 cursor-pointer focus:ring-0"
              />
            </div>

            {(params.usarPieAmigo ?? true) && (
              <div className="space-y-2">
                <div>
                  <label className="text-slate-600 font-medium block mb-1 text-[10px]">Tipo de Pie de Amigo:</label>
                  <select
                    value={params.tipoPieAmigo || 'aleta'}
                    onChange={e => setParams(prev => ({ ...prev, tipoPieAmigo: e.target.value }))}
                    className="w-full bg-white border border-slate-300 rounded-lg p-1.5 text-slate-800 outline-none text-xs focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="aleta">Pie Aleta (Curvo)</option>
                    <option value="triangular">Pie Triangular</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-slate-600 font-medium block mb-1 text-[10px]">Cantidad</label>
                    <select
                      value={params.cantPieAmigo || 4}
                      onChange={e => setParams(prev => ({ ...prev, cantPieAmigo: Number(e.target.value) }))}
                      className="w-full bg-white border border-slate-300 rounded-lg p-1.5 text-slate-800 outline-none font-mono text-xs focus:ring-2 focus:ring-blue-500"
                    >
                      <option value={2}>2 Pies</option>
                      <option value={4}>4 Pies</option>
                      <option value={6}>6 Pies</option>
                      <option value={8}>8 Pies</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-slate-600 font-medium block mb-1 text-[10px]">Alto Cartela (cm)</label>
                    <input
                      type="number"
                      value={params.altoPieAmigo || 10}
                      onChange={e => setParams(prev => ({ ...prev, altoPieAmigo: Number(e.target.value) }))}
                      className="w-full bg-white border border-slate-300 rounded-lg p-1.5 text-slate-800 font-mono text-xs outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}