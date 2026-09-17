import React from 'react';
import { Anchor, CircleDot } from 'lucide-react';

export default function SelectorBujes({ 
  params = {}, 
  setParams, 
  bujes = [] 
}) {
  const listaBujes = Array.isArray(bujes) ? bujes : [];

  const esDeTipo = (b, tipoBuscado) => {
    if (!b) return false;
    
    const tipo = String(b.subtipo || b.tipo || b.categoria || '').toLowerCase();
    const nombre = String(b.nombre || b.descripcion || b.titulo || '').toLowerCase();

    if (tipoBuscado === 'base') {
      return (
        tipo.includes('base') || 
        tipo.includes('inicial') || 
        tipo.includes('ambos') || 
        nombre.includes('base') || 
        nombre.includes('inicial')
      );
    }

    if (tipoBuscado === 'carga') {
      return (
        tipo.includes('punta') || 
        tipo.includes('carga') || 
        tipo.includes('final') || 
        tipo.includes('ambos') || 
        nombre.includes('punta') || 
        nombre.includes('carga') || 
        nombre.includes('final')
      );
    }

    return false;
  };

  let bujesBase = listaBujes.filter(b => esDeTipo(b, 'base'));
  let bujesFinal = listaBujes.filter(b => esDeTipo(b, 'carga'));

  if (bujesBase.length === 0) {
    bujesBase = listaBujes;
  }
  if (bujesFinal.length === 0) {
    bujesFinal = listaBujes;
  }

  return (
    <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/80 space-y-3">
      <div className="flex items-center justify-between">
        <span className="font-bold text-slate-700 text-[11px] uppercase tracking-wider block">
          Bujes y Acoples de Extremo
        </span>
        <span className="text-[10px] text-slate-400 font-mono">
          {listaBujes.length} disponible(s)
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* 1. Buje Inicial / Anclaje Base */}
        <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-sm space-y-1.5">
          <label className="text-[11px] font-semibold text-slate-700 flex items-center gap-1.5">
            <Anchor size={13} className="text-blue-600" /> 
            Buje Inicial (Base):
          </label>
          <select
            value={params?.buje_inicial_id || ''}
            onChange={e => setParams(prev => ({ ...prev, buje_inicial_id: e.target.value }))}
            className="w-full bg-slate-50 border border-slate-300 rounded-lg p-1.5 text-slate-800 text-xs outline-none focus:ring-2 focus:ring-blue-500 font-medium cursor-pointer"
          >
            <option value="">-- Sin Buje Base --</option>
            {bujesBase.map(b => {
              const id = b.id ?? b._id;
              const nombre = b.nombre || b.descripcion || b.titulo || `Buje ${id}`;
              const precio = Number(b.precio || b.precio_unitario || 0);
              const precioTxt = precio > 0 ? ` (+$${precio.toLocaleString('es-CO')})` : '';

              return (
                <option key={id} value={String(id)}>
                  {nombre}{precioTxt}
                </option>
              );
            })}
          </select>
        </div>

        {/* 2. Buje Final / Punta Carga */}
        <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-sm space-y-1.5">
          <label className="text-[11px] font-semibold text-slate-700 flex items-center gap-1.5">
            <CircleDot size={13} className="text-emerald-600" /> 
            Buje Final (Carga):
          </label>
          <select
            value={params?.buje_final_id || ''}
            onChange={e => setParams(prev => ({ ...prev, buje_final_id: e.target.value }))}
            className="w-full bg-slate-50 border border-slate-300 rounded-lg p-1.5 text-slate-800 text-xs outline-none focus:ring-2 focus:ring-emerald-500 font-medium cursor-pointer"
          >
            <option value="">-- Sin Buje Carga --</option>
            {bujesFinal.map(b => {
              const id = b.id ?? b._id;
              const nombre = b.nombre || b.descripcion || b.titulo || `Buje ${id}`;
              const precio = Number(b.precio || b.precio_unitario || 0);
              const precioTxt = precio > 0 ? ` (+$${precio.toLocaleString('es-CO')})` : '';

              return (
                <option key={id} value={String(id)}>
                  {nombre}{precioTxt}
                </option>
              );
            })}
          </select>
        </div>
      </div>
    </div>
  );
}