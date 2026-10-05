import React from 'react';
import { Plus, Trash2, Edit2, CircleDot } from 'lucide-react';

export default function TabBujes({
  bujes = [],
  nuevoBuje,
  setNuevoBuje,
  editandoId,
  handleAgregarBuje,
  editarBuje,
  eliminarItem,
  categoriasDisponibles = ['brazos', 'postes', 'totems', 'gabinetes'],
  renderBadges
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 text-xs text-gray-800">
      {/* FORMULARIO DE REGISTRO / EDICIÓN */}
      <form onSubmit={handleAgregarBuje} className="lg:col-span-4 bg-white border border-gray-200 p-4 rounded-xl space-y-3 shadow-sm">
        <h3 className="font-bold text-gray-900 uppercase border-b border-gray-200 pb-2 text-xs flex items-center gap-1.5">
          <CircleDot size={14} className="text-blue-600" />
          {editandoId ? 'Editar Buje / Anclaje' : 'Nuevo Buje / Anclaje'}
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
                  checked={(nuevoBuje.categorias || []).includes(cat)}
                  onChange={() => {
                    const acts = nuevoBuje.categorias || [];
                    setNuevoBuje({
                      ...nuevoBuje,
                      categorias: acts.includes(cat) ? acts.filter(c => c !== cat) : [...acts, cat]
                    });
                  }}
                />
                <span className="capitalize">{cat}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Nombre del buje */}
        <div>
          <label className="text-gray-600 block mb-1 font-medium">Nombre Buje / Anclaje:</label>
          <input
            type="text"
            required
            placeholder="Ej. Platina Redonda (Piso), Cubo 2x2, etc."
            value={nuevoBuje.nombre || ''}
            onChange={e => setNuevoBuje({ ...nuevoBuje, nombre: e.target.value })}
            className="w-full bg-white border border-gray-300 rounded-lg p-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Precio */}
        <div>
          <label className="text-gray-600 block mb-1 font-medium">Precio Unitario ($):</label>
          <input
            type="number"
            min="0"
            step="100"
            required
            placeholder="22000"
            value={nuevoBuje.precio ?? ''}
            onChange={e => setNuevoBuje({ ...nuevoBuje, precio: e.target.value })}
            className="w-full bg-white border border-gray-300 rounded-lg p-2 text-gray-900 font-mono placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
          <span className="text-[10px] text-gray-500 block mt-0.5">
            Costo base aplicado al seleccionar este buje en la cotización.
          </span>
        </div>

        {/* Subtipo / Posición */}
        <div>
          <label className="text-gray-600 block mb-1 font-medium">Ubicación / Función:</label>
          <select
            value={nuevoBuje.subtipo || 'ambos'}
            onChange={e => setNuevoBuje({ ...nuevoBuje, subtipo: e.target.value })}
            className="w-full bg-white border border-gray-300 rounded-lg p-2 text-gray-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          >
            <option value="base">Anclaje Base (Piso / Pared)</option>
            <option value="punta">Punta / Extremo (Carga / Cámara / Intercom)</option>
            <option value="ambos">Ambos / Intermedio (Universal)</option>
          </select>
        </div>

        <button
          type="submit"
          className={`w-full text-white font-bold py-2 rounded-lg flex items-center justify-center gap-1 transition-colors shadow-sm ${
            editandoId ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          <Plus size={14} /> {editandoId ? 'Guardar Cambios' : 'Registrar Buje'}
        </button>
      </form>

      {/* LISTADO DE BUJES REGISTRADOS */}
      <div className="lg:col-span-8 bg-white border border-gray-200 p-4 rounded-xl space-y-3 shadow-sm">
        <h3 className="font-bold text-gray-900 uppercase border-b border-gray-200 pb-2 text-xs flex justify-between items-center">
          <span>Bujes y Anclajes Registrados ({bujes.length})</span>
          <span className="text-[10px] text-gray-500 font-normal">Sincronizado con PostgreSQL</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-[500px] overflow-y-auto pr-1">
          {bujes.length === 0 ? (
            <div className="col-span-2 text-center py-8 text-gray-400 italic">
              No hay bujes registrados en la base de datos.
            </div>
          ) : (
            bujes.map((b, i) => {
              const subtipo = (b.subtipo || 'ambos').toLowerCase();
              let subtipoColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
              let subtipoTexto = 'Base y Punta';

              if (subtipo === 'base') {
                subtipoColor = 'bg-blue-50 text-blue-700 border-blue-200';
                subtipoTexto = 'Anclaje Base';
              } else if (subtipo === 'punta') {
                subtipoColor = 'bg-purple-50 text-purple-700 border-purple-200';
                subtipoTexto = 'Punta / Extremo';
              }

              return (
                <div
                  key={b.id || i}
                  className={`bg-gray-50 p-3 rounded-lg border flex justify-between items-start transition-colors ${
                    editandoId === b.id ? 'border-emerald-500 bg-emerald-50/20' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="space-y-1">
                    <p className="font-bold text-gray-900 text-xs">{b.nombre}</p>

                    <p className="text-emerald-700 font-mono font-bold">
                      ${(b.precio || 0).toLocaleString()} <span className="text-gray-500 text-[10px] font-normal">/ ud</span>
                    </p>

                    <div className="flex flex-wrap gap-1 pt-1">
                      <span className={`text-[8px] border px-1.5 py-0.5 rounded font-semibold uppercase ${subtipoColor}`}>
                        {subtipoTexto}
                      </span>
                    </div>

                    {renderBadges && renderBadges(b.categorias)}
                  </div>

                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => editarBuje(b)}
                      title="Editar buje"
                      className="text-gray-400 hover:text-blue-600 p-1 transition-colors"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => eliminarItem(b.id, 'bujes')}
                      title="Eliminar buje"
                      className="text-gray-400 hover:text-red-600 p-1 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
