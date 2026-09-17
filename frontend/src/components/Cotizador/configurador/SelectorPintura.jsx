import React, { useEffect } from 'react';
import { Check } from 'lucide-react';

export default function SelectorPintura({ params = {}, setParams, pinturas = [] }) {
  const listaPinturas = Array.isArray(pinturas) ? pinturas : [];

  useEffect(() => {
    // Si hay pinturas y aún no se ha definido un colorPintura en params
    if (listaPinturas.length > 0 && !params.colorPintura) {
      const primera = listaPinturas[0];
      setParams(prev => {
        // Validación guard para evitar sobreescribir si ya existe en prev
        if (prev.colorPintura) return prev;
        
        return {
          ...prev,
          colorPintura: primera.hex || '#000000',
          nombrePintura: primera.nombre || 'Sin nombre',
          costoPinturaM2: primera.precio_m2 || primera.precioM2 || 0,
          precioPinturaKg: primera.precio_kg || primera.precioKg || 0
        };
      });
    }
  }, [listaPinturas, setParams]);

  if (listaPinturas.length === 0) {
    return (
      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
        <span className="font-bold text-slate-600 text-[10px] uppercase block tracking-wider">
          Acabado / Pintura Electrostática
        </span>
        <p className="text-xs text-slate-400 italic mt-1">Cargando pinturas del Admin...</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
      <span className="font-bold text-slate-600 text-[10px] uppercase block tracking-wider">
        Acabado / Pintura Electrostática
      </span>
      
      <div className="flex flex-wrap gap-2">
        {listaPinturas.map((p, index) => {
          const hexColor = p.hex || '#000000';
          const esSeleccionado = (params.colorPintura || '').toLowerCase() === hexColor.toLowerCase();
          const esBlanco = hexColor.toLowerCase() === '#f8fafc' || hexColor.toLowerCase() === '#ffffff';
          const precioM2 = p.precio_m2 || p.precioM2 || 0;

          return (
            <button
              key={p.id || index}
              type="button"
              title={`${p.nombre} ${precioM2 > 0 ? `($${Number(precioM2).toLocaleString()}/m²)` : ''}`}
              onClick={() => setParams(prev => ({
                ...prev,
                colorPintura: hexColor,
                nombrePintura: p.nombre,
                costoPinturaM2: precioM2,
                precioPinturaKg: p.precio_kg || p.precioKg || 0
              }))}
              className={`w-8 h-8 rounded-lg border transition flex items-center justify-center relative cursor-pointer ${
                esBlanco ? 'border-slate-300' : 'border-transparent'
              } ${
                esSeleccionado 
                  ? 'ring-2 ring-blue-600 ring-offset-2 scale-105 shadow-sm' 
                  : 'hover:scale-95 opacity-90'
              }`}
              style={{ backgroundColor: hexColor }}
            >
              {esSeleccionado && (
                <Check size={14} className={esBlanco ? 'text-slate-900' : 'text-white'} />
              )}
            </button>
          );
        })}
      </div>

      <p className="text-[11px] text-blue-600 font-semibold pt-0.5">
        {params.nombrePintura || 'Selecciona un acabado'}
      </p>
    </div>
  );
}