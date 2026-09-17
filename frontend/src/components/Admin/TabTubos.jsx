import React from 'react';
import { Plus, Trash2, Edit2 } from 'lucide-react';

export default function TabTubos({ 
  tubos, 
  nuevoTubo, 
  setNuevoTubo, 
  editandoId, 
  handleAgregarTubo, 
  editarTubo, 
  eliminarItem, 
  categoriasDisponibles, 
  renderBadges 
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 text-xs text-gray-800">
      {/* FORMULARIO DE REGISTRO / EDICIÓN */}
      <form onSubmit={handleAgregarTubo} className="lg:col-span-4 bg-white border border-gray-200 p-4 rounded-xl space-y-3 shadow-sm">
        <h3 className="font-bold text-gray-900 uppercase border-b border-gray-200 pb-2 text-xs">
          {editandoId ? 'Editar Tubo' : 'Nuevo Tubo'}
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
                  checked={(nuevoTubo.categorias || []).includes(cat)} 
                  onChange={() => { 
                    const acts = nuevoTubo.categorias || []; 
                    setNuevoTubo({ ...nuevoTubo, categorias: acts.includes(cat) ? acts.filter(c => c !== cat) : [...acts, cat] }); 
                  }} 
                />
                <span className="capitalize">{cat}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="text-gray-600 block mb-1 font-medium">Forma del Material:</label>
          <select 
            value={nuevoTubo.forma} 
            onChange={e => setNuevoTubo({ ...nuevoTubo, forma: e.target.value })} 
            className="w-full bg-white border border-gray-300 rounded-lg p-2 text-gray-900 font-bold focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          >
            <option value="redondo">Redondo (En Pulgadas)</option>
            <option value="cuadrado">Cuadrado / Rectangular (En cm)</option>
          </select>
        </div>

        <div>
          <label className="text-gray-600 block mb-1 font-medium">Material / Referencia:</label>
          <input 
            type="text" 
            placeholder="Ej. Galvanizado" 
            value={nuevoTubo.material} 
            onChange={e => setNuevoTubo({ ...nuevoTubo, material: e.target.value })} 
            className="w-full bg-white border border-gray-300 rounded-lg p-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" 
          />
        </div>

        <div>
          <label className="text-gray-600 block mb-1 font-medium">Calibre / Espesor:</label>
          <input 
            type="text" 
            placeholder="Ej. Calibre 18, 1.5mm" 
            value={nuevoTubo.calibre} 
            onChange={e => setNuevoTubo({ ...nuevoTubo, calibre: e.target.value })} 
            className="w-full bg-white border border-gray-300 rounded-lg p-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" 
          />
        </div>

        {nuevoTubo.forma === 'redondo' ? (
          <div>
            <label className="text-gray-600 block mb-1 font-medium">Diámetro (Pulgadas "):</label>
            <input 
              type="text" 
              placeholder="Ej. 2.5" 
              value={nuevoTubo.diametro_pulg} 
              onChange={e => setNuevoTubo({ ...nuevoTubo, diametro_pulg: e.target.value })} 
              className="w-full bg-white border border-gray-300 rounded-lg p-2 text-gray-900 font-mono placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" 
            />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-gray-600 block mb-1 font-medium">Ancho (cm):</label>
              <input 
                type="number" 
                placeholder="Ej. 4" 
                value={nuevoTubo.ancho_cm} 
                onChange={e => setNuevoTubo({ ...nuevoTubo, ancho_cm: e.target.value })} 
                className="w-full bg-white border border-gray-300 rounded-lg p-2 text-gray-900 font-mono placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" 
              />
            </div>
            <div>
              <label className="text-gray-600 block mb-1 font-medium">Alto (cm):</label>
              <input 
                type="number" 
                placeholder="Ej. 4" 
                value={nuevoTubo.alto_cm} 
                onChange={e => setNuevoTubo({ ...nuevoTubo, alto_cm: e.target.value })} 
                className="w-full bg-white border border-gray-300 rounded-lg p-2 text-gray-900 font-mono placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" 
              />
            </div>
          </div>
        )}

        <div>
          <label className="text-gray-600 block mb-1 font-medium">Precio Tira (6m):</label>
          <input 
            type="number" 
            placeholder="$ Costo" 
            value={nuevoTubo.precio_tira_6m} 
            onChange={e => setNuevoTubo({ ...nuevoTubo, precio_tira_6m: e.target.value })} 
            className="w-full bg-white border border-gray-300 rounded-lg p-2 text-gray-900 font-mono placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" 
          />
        </div>

        <button 
          type="submit" 
          className={`w-full text-white font-bold py-2 rounded-lg flex items-center justify-center gap-1 transition-colors shadow-sm ${
            editandoId ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          <Plus size={14} /> {editandoId ? 'Guardar Cambios' : 'Registrar Tubo'}
        </button>
      </form>

      {/* LISTADO DE TUBOS DISPONIBLES */}
      <div className="lg:col-span-8 bg-white border border-gray-200 p-4 rounded-xl space-y-3 shadow-sm">
        <h3 className="font-bold text-gray-900 uppercase border-b border-gray-200 pb-2 text-xs">
          Catálogo Tubos ({tubos.length})
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-[450px] overflow-y-auto pr-1">
          {tubos.map(t => (
            <div 
              key={t.id || t.material + Math.random()} 
              className={`bg-gray-50 p-3 rounded-lg border flex justify-between items-start transition-colors ${
                editandoId === t.id ? 'border-emerald-500 bg-emerald-50/20' : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="space-y-1">
                <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-extrabold uppercase border ${
                  t.forma === 'cuadrado' 
                    ? 'bg-amber-50 text-amber-700 border-amber-200' 
                    : 'bg-blue-50 text-blue-700 border-blue-200'
                }`}>
                  {t.forma === 'cuadrado' ? 'Tubo Cuadrado' : 'Tubo Redondo'}
                </span>
                
                <p className="font-bold text-gray-900 text-xs">
                  {t.material} {t.calibre && <span className="text-gray-500 font-normal">({t.calibre})</span>}
                </p>
                
                <p className="text-gray-600 text-[11px]">
                  Medida: <strong className="text-gray-900 font-mono">{t.forma === 'cuadrado' ? `${t.ancho_cm || 4}x${t.alto_cm || 4} cm` : `Ø ${t.diametro_pulg || 2}"`}</strong>
                </p>

                <p className="text-emerald-700 font-mono font-bold">
                  ${(t.precio_tira_6m || 0).toLocaleString()} <span className="text-gray-500 text-[10px] font-normal">/ tira</span>
                </p>
                
                {renderBadges(t.categorias)}
              </div>

              <div className="flex flex-col gap-1">
                <button onClick={() => editarTubo(t)} className="text-gray-400 hover:text-blue-600 p-1 transition-colors">
                  <Edit2 size={14} />
                </button>
                <button onClick={() => eliminarItem(t.id, 'tubos')} className="text-gray-400 hover:text-red-600 p-1 transition-colors">
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