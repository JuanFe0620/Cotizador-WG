import React from 'react';
import { Plus, Trash2, Edit2, Settings } from 'lucide-react';

export default function TabAccesorios({ 
  accesorios, 
  nuevoAcc, 
  setNuevoAcc, 
  editandoId, 
  handleAgregarAccesorio, 
  editarAccesorio, 
  eliminarItem, 
  categoriasDisponibles, 
  renderBadges 
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 text-xs text-gray-800">
      {/* FORMULARIO DE REGISTRO / EDICIÓN */}
      <form onSubmit={handleAgregarAccesorio} className="lg:col-span-4 bg-white border border-gray-200 p-4 rounded-xl space-y-3 shadow-sm">
        <h3 className="font-bold text-gray-900 uppercase border-b border-gray-200 pb-2 text-xs">
          {editandoId ? 'Editar Accesorio' : 'Nuevo Accesorio / Insumo'}
        </h3>
        
        {/* ¿Dónde se aplica? */}
        <div className="bg-gray-50 border border-gray-200 p-2.5 rounded-lg">
          <label className="text-gray-600 block mb-2 font-semibold">¿Dónde se aplica?</label>
          <div className="grid grid-cols-2 gap-1.5">
            {categoriasDisponibles.map(cat => (
              <label key={cat} className="flex items-center gap-1.5 cursor-pointer text-gray-700 hover:text-gray-900 font-medium">
                <input 
                  type="checkbox" 
                  className="accent-blue-600 rounded cursor-pointer" 
                  checked={(nuevoAcc.categorias || []).includes(cat)} 
                  onChange={() => { 
                    const acts = nuevoAcc.categorias || []; 
                    setNuevoAcc({ 
                      ...nuevoAcc, 
                      categorias: acts.includes(cat) ? acts.filter(c => c !== cat) : [...acts, cat] 
                    }); 
                  }} 
                />
                <span className="capitalize">{cat}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Nombre y Precio Base */}
        <div>
          <label className="text-gray-600 block mb-1 font-medium">Nombre Accesorio / Insumo:</label>
          <input 
            type="text" 
            placeholder="Ej. Platina Guía Cuadrada, Cubo, etc." 
            value={nuevoAcc.nombre || ''} 
            onChange={e => setNuevoAcc({ ...nuevoAcc, nombre: e.target.value })} 
            className="w-full bg-white border border-gray-300 rounded-lg p-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" 
          />
        </div>

        <div>
          <label className="text-gray-600 block mb-1 font-medium">Precio Unitario Fijo ($):</label>
          <input 
            type="number" 
            placeholder="0 si es calculado por fórmula" 
            value={nuevoAcc.precio || ''} 
            onChange={e => setNuevoAcc({ ...nuevoAcc, precio: e.target.value })} 
            className="w-full bg-white border border-gray-300 rounded-lg p-2 text-gray-900 font-mono placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" 
          />
          <span className="text-[10px] text-gray-500 block mt-0.5">
            Deja en $0 para Platinas/Coronas calculadas dinámicamente.
          </span>
        </div>

        {/* CONFIGURACIÓN PARAMÉTRICA Y GRUPOS */}
        <div className="bg-blue-50/50 border border-blue-100 p-3 rounded-lg space-y-2.5">
          <label className="text-blue-700 block font-bold text-[11px] uppercase flex items-center gap-1">
            <Settings size={12} /> Configuración Avanzada (Platinas/Fórmulas)
          </label>
          
          <label className="flex items-center gap-2 text-gray-700 hover:text-gray-900 cursor-pointer font-medium">
            <input 
              type="checkbox" 
              checked={nuevoAcc.requiere_lamina || false} 
              onChange={e => setNuevoAcc({ ...nuevoAcc, requiere_lamina: e.target.checked })}
              className="accent-blue-600 rounded cursor-pointer"
            />
            <span>Requiere Selección de Lámina / Calibre</span>
          </label>

          <label className="flex items-center gap-2 text-gray-700 hover:text-gray-900 cursor-pointer font-medium">
            <input 
              type="checkbox" 
              checked={nuevoAcc.permite_n_pies || false} 
              onChange={e => setNuevoAcc({ ...nuevoAcc, permite_n_pies: e.target.checked })}
              className="accent-blue-600 rounded cursor-pointer"
            />
            <span>Permite Pies de Amigo (N_Pies)</span>
          </label>

          <div>
            <label className="text-gray-600 block mb-1 font-medium">Grupo Exclusivo:</label>
            <select 
              value={nuevoAcc.grupo_exclusion || ''} 
              onChange={e => setNuevoAcc({ ...nuevoAcc, grupo_exclusion: e.target.value })}
              className="w-full bg-white border border-gray-300 rounded-lg p-1.5 text-gray-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Ninguno (Accesorio Estándar)</option>
              <option value="platina">Platina (Exclusión mutua entre platinas)</option>
              <option value="corona">Corona (Exclusión mutua entre coronas)</option>
            </select>
          </div>
        </div>

        <button 
          type="submit" 
          className={`w-full text-white font-bold py-2 rounded-lg flex items-center justify-center gap-1 transition-colors shadow-sm ${
            editandoId ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          <Plus size={14} /> {editandoId ? 'Guardar Cambios' : 'Registrar Accesorio'}
        </button>
      </form>

      {/* LISTADO DE ACCESORIOS REGISTRADOS */}
      <div className="lg:col-span-8 bg-white border border-gray-200 p-4 rounded-xl space-y-3 shadow-sm">
        <h3 className="font-bold text-gray-900 uppercase border-b border-gray-200 pb-2 text-xs">
          Accesorios e Insumos ({accesorios.length})
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-[500px] overflow-y-auto pr-1">
          {accesorios.map((a, i) => {
            const requiereLam = a.requiere_lamina || a.requiereLamina;
            const permitePies = a.permite_n_pies || a.permiteNPies;
            const grupo = a.grupo_exclusion || a.grupoExclusion;

            return (
              <div 
                key={a.id || i} 
                className={`bg-gray-50 p-3 rounded-lg border flex justify-between items-start transition-colors ${
                  editandoId === a.id ? 'border-emerald-500 bg-emerald-50/20' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="space-y-1">
                  <p className="font-bold text-gray-900 text-xs">{a.nombre}</p>
                  
                  <p className="text-emerald-700 font-mono font-bold">
                    {a.precio > 0 ? (
                      <>${(a.precio || 0).toLocaleString()} <span className="text-gray-500 text-[10px] font-normal">/ ud</span></>
                    ) : (
                      <span className="text-blue-700 text-[10px] font-medium font-sans bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">
                        Costo Calculado por Fórmula
                      </span>
                    )}
                  </p>

                  {/* Insignias de Configuración Avanzada */}
                  <div className="flex flex-wrap gap-1 pt-1">
                    {requiereLam && (
                      <span className="text-[8px] bg-blue-50 text-blue-700 border border-blue-200 px-1 py-0.5 rounded font-semibold">
                        +Lámina
                      </span>
                    )}
                    {permitePies && (
                      <span className="text-[8px] bg-amber-50 text-amber-700 border border-amber-200 px-1 py-0.5 rounded font-semibold">
                        +Pies
                      </span>
                    )}
                    {grupo && (
                      <span className="text-[8px] bg-purple-50 text-purple-700 border border-purple-200 px-1 py-0.5 rounded font-semibold uppercase">
                        Grupo: {grupo}
                      </span>
                    )}
                  </div>

                  {renderBadges(a.categorias)}
                </div>

                <div className="flex flex-col gap-1">
                  <button onClick={() => editarAccesorio(a)} className="text-gray-400 hover:text-blue-600 p-1 transition-colors">
                    <Edit2 size={14} />
                  </button>
                  <button onClick={() => eliminarItem(a.id, 'accesorios')} className="text-gray-400 hover:text-red-600 p-1 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}