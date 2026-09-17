import React from 'react';
import { Plus, Trash2, Edit2 } from 'lucide-react';

export default function TabPinturas({ 
  pinturas, 
  nuevaPintura, 
  setNuevaPintura, 
  editandoId, 
  handleAgregarPintura, 
  editarPintura, 
  eliminarItem, 
  calcularPrecioM2 
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 text-xs text-gray-800">
      {/* FORMULARIO DE REGISTRO / EDICIÓN */}
      <form onSubmit={handleAgregarPintura} className="lg:col-span-4 bg-white border border-gray-200 p-4 rounded-xl space-y-3 shadow-sm">
        <h3 className="font-bold text-gray-900 uppercase border-b border-gray-200 pb-2 text-xs">
          {editandoId ? 'Editar Pintura' : 'Nueva Pintura Electrostática'}
        </h3>

        <div>
          <label className="text-gray-600 block mb-1 font-medium">Nombre del Acabado:</label>
          <input 
            type="text" 
            placeholder="Ej. Verde Seguridad, Negro Mate" 
            value={nuevaPintura.nombre} 
            onChange={e => setNuevaPintura({ ...nuevaPintura, nombre: e.target.value })} 
            className="w-full bg-white border border-gray-300 rounded-lg p-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" 
          />
        </div>

        <div>
          <label className="text-gray-600 block mb-1 font-medium">Color / Tono (Hex):</label>
          <div className="flex gap-2">
            <input 
              type="color" 
              value={nuevaPintura.hex} 
              onChange={e => setNuevaPintura({ ...nuevaPintura, hex: e.target.value })} 
              className="h-9 w-12 bg-white border border-gray-300 rounded cursor-pointer p-0.5" 
            />
            <input 
              type="text" 
              value={nuevaPintura.hex} 
              onChange={e => setNuevaPintura({ ...nuevaPintura, hex: e.target.value })} 
              className="flex-1 bg-white border border-gray-300 rounded-lg p-2 text-gray-900 font-mono uppercase placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" 
            />
          </div>
        </div>

        <div>
          <label className="text-gray-600 block mb-1 font-medium">Precio por Kg ($):</label>
          <input 
            type="number" 
            placeholder="Ej. 24000" 
            value={nuevaPintura.precio_kg} 
            onChange={e => setNuevaPintura({ ...nuevaPintura, precio_kg: e.target.value })} 
            className="w-full bg-white border border-gray-300 rounded-lg p-2 text-gray-900 font-mono placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" 
          />
        </div>

        {nuevaPintura.precio_kg && (
          <div className="bg-blue-50/60 border border-blue-100 p-2.5 rounded-lg space-y-1">
            <p className="text-gray-600 text-[10px] font-medium">Cálculo estimado a m²:</p>
            <p className="text-blue-700 font-mono font-bold text-xs">
              ${Math.round(calcularPrecioM2(nuevaPintura.precio_kg)).toLocaleString()} / m²
            </p>
            <p className="text-[9px] text-gray-500">
              Base: Rendimiento 8 m²/kg x 1.5 de factor aplicador.
            </p>
          </div>
        )}

        <button 
          type="submit" 
          className={`w-full text-white font-bold py-2 rounded-lg flex items-center justify-center gap-1 transition-colors shadow-sm ${
            editandoId ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          <Plus size={14} /> {editandoId ? 'Guardar Cambios' : 'Registrar Pintura'}
        </button>
      </form>

      {/* LISTADO DE PINTURAS DISPONIBLES */}
      <div className="lg:col-span-8 bg-white border border-gray-200 p-4 rounded-xl space-y-3 shadow-sm">
        <h3 className="font-bold text-gray-900 uppercase border-b border-gray-200 pb-2 text-xs">
          Pinturas Disponibles ({pinturas.length})
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-[450px] overflow-y-auto pr-1">
          {pinturas.map((p, i) => {
            const precioKgReal = p.precio_kg || p.precioKg || 0;
            const precioM2Real = p.precio_m2 || p.precioM2 || calcularPrecioM2(precioKgReal);

            return (
              <div 
                key={p.id || i} 
                className={`bg-gray-50 p-3 rounded-lg border flex justify-between items-center transition-colors ${
                  editandoId === p.id ? 'border-emerald-500 bg-emerald-50/20' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div 
                    className="w-8 h-8 rounded-lg border border-gray-300 shadow-sm flex-shrink-0" 
                    style={{ backgroundColor: p.hex }} 
                  />
                  <div>
                    <p className="font-bold text-gray-900 text-xs">{p.nombre}</p>
                    {precioKgReal > 0 && (
                      <p className="text-gray-600 font-mono text-[11px]">
                        ${precioKgReal.toLocaleString()} <span className="text-gray-500 text-[9px]">/ Kg</span>
                      </p>
                    )}
                    <p className="text-emerald-700 font-mono font-bold">
                      ${Math.round(precioM2Real).toLocaleString()} <span className="text-gray-500 text-[10px] font-normal">/ m²</span>
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <button onClick={() => editarPintura(p)} className="text-gray-400 hover:text-blue-600 p-1 transition-colors">
                    <Edit2 size={14} />
                  </button>
                  <button onClick={() => eliminarItem(p.id, 'pinturas')} className="text-gray-400 hover:text-red-600 p-1 transition-colors">
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