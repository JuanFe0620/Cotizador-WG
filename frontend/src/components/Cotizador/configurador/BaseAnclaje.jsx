// BaseAnclaje.jsx
import React, { useEffect } from 'react';

export default function BaseAnclaje({
  requiereAnclaje,
  params,
  setParams,
  platinaLargo,
  setPlatinaLargo,
  laminaAnclajeId,
  setLaminaAnclajeId,
  laminas = []
}) {
  // Sincronizar o limpiar params según si está activada la casilla
  useEffect(() => {
    if (typeof setParams === 'function') {
      if (requiereAnclaje) {
        setParams(prev => ({
          ...prev,
          formaBase: prev?.formaBase || 'Base Redonda',
          usarPieAmigo: prev?.usarPieAmigo ?? true,
          cantPieAmigo: prev?.cantPieAmigo || 4,
          altoPieAmigo: prev?.altoPieAmigo || 10,
          tipoPieAmigo: prev?.tipoPieAmigo || 'aleta'
        }));
      } else {
        // Si se desmarca la casilla, reseteamos la base para el visor 3D
        setParams(prev => ({
          ...prev,
          formaBase: 'Sin Base',
          usarPieAmigo: false
        }));
      }
    }
  }, [requiereAnclaje]);

  // Si no está marcada la casilla, no renderizamos el panel de opciones
  if (!requiereAnclaje) return null;

  const formaBase = params?.formaBase || 'Base Redonda';

  const handleMedidaBase = (val) => {
    const num = Number(val);
    if (typeof setPlatinaLargo === 'function') {
      setPlatinaLargo(num);
    }
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
      <div className="flex items-center gap-1.5 font-bold text-amber-800 text-xs border-b border-amber-200 pb-1.5">
        <span>🛡️ Base / Platina de Anclaje</span>
      </div>

      <div className="space-y-2">
        {/* Forma de la Base */}
        <div>
          <label className="text-slate-600 font-medium block mb-1 text-[10px]">
            Forma de la Base:
          </label>
          <select
            value={formaBase}
            onChange={e => setParams(prev => ({ ...prev, formaBase: e.target.value }))}
            className="w-full bg-white border border-slate-300 rounded-lg p-1.5 text-slate-800 outline-none text-xs focus:ring-2 focus:ring-blue-500"
          >
            <option value="Base Redonda">Base Redonda</option>
            <option value="Base Cuadrada">Base Cuadrada</option>
          </select>
        </div>

        {/* Diámetro / Lado de la Base */}
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

        {/* Material / Calibre de Lámina */}
        <div>
          <label className="text-slate-600 font-medium block mb-1 text-[10px]">
            Material / Calibre:
          </label>
          <select
            value={laminaAnclajeId || ''}
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

        {/* Configuración de Pies de Amigo (Cartelas) */}
        <div className="pt-2 border-t border-amber-200 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-blue-700 font-bold text-[11px]">Pies de Amigo (Cartelas)</span>
            <input
              type="checkbox"
              checked={params?.usarPieAmigo ?? true}
              onChange={e => setParams(prev => ({ ...prev, usarPieAmigo: e.target.checked }))}
              className="rounded text-blue-600 w-4 h-4 border-slate-300 cursor-pointer focus:ring-0"
            />
          </div>

          {(params?.usarPieAmigo ?? true) && (
            <div className="space-y-2 bg-amber-100/40 p-2 rounded-lg border border-amber-200/60">
              <div>
                <label className="text-slate-600 font-medium block mb-1 text-[10px]">
                  Tipo de Pie de Amigo:
                </label>
                <select
                  value={params?.tipoPieAmigo || 'aleta'}
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
                    value={params?.cantPieAmigo || 4}
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
                    value={params?.altoPieAmigo || 10}
                    onChange={e => setParams(prev => ({ ...prev, altoPieAmigo: Number(e.target.value) }))}
                    className="w-full bg-white border border-slate-300 rounded-lg p-1.5 text-slate-800 font-mono text-xs outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}