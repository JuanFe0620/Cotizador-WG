import React from 'react';
import { Plus, Trash2, Edit2 } from 'lucide-react';

export default function TabLaminas({ 
  laminas, 
  nuevaLamina, 
  setNuevaLamina, 
  editandoId, 
  handleAgregarLamina, 
  editarLamina, 
  eliminarItem, 
  categoriasDisponibles, 
  renderBadges 
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 text-xs text-gray-800">
      {/* FORMULARIO DE REGISTRO / EDICIÓN */}
      <form onSubmit={handleAgregarLamina} className="lg:col-span-4 bg-white border border-gray-200 p-4 rounded-xl space-y-3 shadow-sm">
        <h3 className="font-bold text-gray-900 uppercase border-b border-gray-200 pb-2 text-xs">
          {editandoId ? 'Editar Lámina' : 'Nueva Lámina'}
        </h3>
        
        {/* ¿Dónde aparece? */}
        <div className="bg-gray-50 border border-gray-200 p-2.5 rounded-lg">
          <label className="text-gray-600 block mb-2 font-semibold">¿Dónde aparece?</label>
          <div className="grid grid-cols-2 gap-1.5">
            {categoriasDisponibles.map(cat => (
              <label key={cat} className="flex items-center gap-1.5 cursor-pointer text-gray-700 hover:text-gray-900 font-medium">
                <input 
                  type="checkbox" 
                  className="accent-blue-600 rounded cursor-pointer" 
                  checked={(nuevaLamina.categorias || []).includes(cat)} 
                  onChange={() => { 
                    const acts = nuevaLamina.categorias || []; 
                    setNuevaLamina({ ...nuevaLamina, categorias: acts.includes(cat) ? acts.filter(c => c !== cat) : [...acts, cat] }); 
                  }} 
                />
                <span className="capitalize">{cat}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Campos de texto y precio */}
        <div>
          <label className="text-gray-600 block mb-1 font-medium">Material:</label>
          <input 
            type="text" 
            placeholder="Ej. Lámina CR, HR" 
            value={nuevaLamina.material} 
            onChange={e => setNuevaLamina({ ...nuevaLamina, material: e.target.value })} 
            className="w-full bg-white border border-gray-300 rounded-lg p-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" 
          />
        </div>

        <div>
          <label className="text-gray-600 block mb-1 font-medium">Calibre:</label>
          <input 
            type="text" 
            placeholder="Ej. Calibre 18" 
            value={nuevaLamina.calibre} 
            onChange={e => setNuevaLamina({ ...nuevaLamina, calibre: e.target.value })} 
            className="w-full bg-white border border-gray-300 rounded-lg p-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" 
          />
        </div>

        <div>
          <label className="text-gray-600 block mb-1 font-medium">Precio Plancha ($):</label>
          <input 
            type="number" 
            placeholder="Ej. 110000" 
            value={nuevaLamina.precio_entera} 
            onChange={e => setNuevaLamina({ ...nuevaLamina, precio_entera: e.target.value })} 
            className="w-full bg-white border border-gray-300 rounded-lg p-2 text-gray-900 font-mono placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" 
          />
        </div>

        <button 
          type="submit" 
          className={`w-full text-white font-bold py-2 rounded-lg flex items-center justify-center gap-1 transition-colors shadow-sm ${
            editandoId ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          <Plus size={14} /> {editandoId ? 'Guardar Cambios' : 'Registrar Lámina'}
        </button>
      </form>

      {/* LISTADO DE LÁMINAS CONFIGURADAS */}
      <div className="lg:col-span-8 bg-white border border-gray-200 p-4 rounded-xl space-y-3 shadow-sm">
        <h3 className="font-bold text-gray-900 uppercase border-b border-gray-200 pb-2 text-xs">
          Láminas Configuradas ({laminas.length})
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-[450px] overflow-y-auto pr-1">
          {laminas.map((l, i) => (
            <div 
              key={l.id || i} 
              className={`bg-gray-50 p-3.5 rounded-lg border flex justify-between items-start transition-colors ${
                editandoId === l.id ? 'border-emerald-500 bg-emerald-50/20' : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="space-y-1">
                <p className="font-bold text-gray-900 text-xs">
                  {l.material} <span className="text-gray-500 font-normal">({l.calibre})</span>
                </p>
                <p className="text-emerald-700 text-xs font-mono font-bold">
                  ${(l.precio_entera || 0).toLocaleString()}
                </p>
                {renderBadges(l.categorias)}
              </div>

              <div className="flex flex-col gap-1">
                <button onClick={() => editarLamina(l)} className="text-gray-400 hover:text-blue-600 p-1 transition-colors">
                  <Edit2 size={14} />
                </button>
                <button onClick={() => eliminarItem(l.id, 'laminas')} className="text-gray-400 hover:text-red-600 p-1 transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}