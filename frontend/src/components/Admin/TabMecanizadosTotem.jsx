import React from 'react';
import { Plus, Trash2, Edit2, Cpu, Camera } from 'lucide-react';

export default function TabMecanizadosTotem({
  mecanizadosTotem = [],
  nuevoMecanizado,
  setNuevoMecanizado,
  editandoId,
  handleAgregarMecanizado,
  editarMecanizado,
  eliminarItem
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 text-xs text-gray-800">
      {/* FORMULARIO DE REGISTRO / EDICIÓN */}
      <form onSubmit={handleAgregarMecanizado} className="lg:col-span-4 bg-white border border-gray-200 p-4 rounded-xl space-y-3 shadow-sm">
        <h3 className="font-bold text-gray-900 uppercase border-b border-gray-200 pb-2 text-xs flex items-center gap-1.5">
          <Cpu size={14} className="text-blue-600" />
          {editandoId ? 'Editar Mecanizado / Perforación Tótem' : 'Nuevo Mecanizado de Tótem'}
        </h3>

        {/* Clave técnica */}
        <div>
          <label className="text-gray-600 block mb-1 font-medium">Clave Técnica (Identificador Único):</label>
          <input
            type="text"
            required
            placeholder="ej: camara_lpr_lateral, videoportero, sensor_rfid"
            value={nuevoMecanizado.clave || ''}
            onChange={e => setNuevoMecanizado({
              ...nuevoMecanizado,
              clave: e.target.value.toLowerCase().trim().replace(/\s+/g, '_')
            })}
            className="w-full bg-white border border-gray-300 rounded-lg p-2 text-gray-900 font-mono placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
          <span className="text-[10px] text-gray-500 block mt-0.5">
            Texto sin espacios ni acentos. Usado por el cotizador y el visor 3D.
          </span>
        </div>

        {/* Nombre descriptivo */}
        <div>
          <label className="text-gray-600 block mb-1 font-medium">Nombre Descriptivo:</label>
          <input
            type="text"
            required
            placeholder="Ej. Cámara LPR Lateral (Soporte + Mecanizado)"
            value={nuevoMecanizado.nombre || ''}
            onChange={e => setNuevoMecanizado({ ...nuevoMecanizado, nombre: e.target.value })}
            className="w-full bg-white border border-gray-300 rounded-lg p-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Precio */}
        <div>
          <label className="text-gray-600 block mb-1 font-medium">Costo de Perforación / Mecanizado ($):</label>
          <input
            type="number"
            min="0"
            step="500"
            required
            placeholder="35000"
            value={nuevoMecanizado.precio ?? ''}
            onChange={e => setNuevoMecanizado({ ...nuevoMecanizado, precio: e.target.value })}
            className="w-full bg-white border border-gray-300 rounded-lg p-2 text-gray-900 font-mono placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
          <span className="text-[10px] text-gray-500 block mt-0.5">
            Costo base aplicado al seleccionar este mecanizado en el tótem.
          </span>
        </div>

        {/* Área m2 */}
        <div>
          <label className="text-gray-600 block mb-1 font-medium">Área Ocupada / Tapa (m²):</label>
          <input
            type="number"
            min="0"
            step="0.01"
            placeholder="0.08"
            value={nuevoMecanizado.area_m2 ?? 0.08}
            onChange={e => setNuevoMecanizado({ ...nuevoMecanizado, area_m2: parseFloat(e.target.value) || 0.08 })}
            className="w-full bg-white border border-gray-300 rounded-lg p-2 text-gray-900 font-mono placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Flag Cámara / LPR */}
        <div className="bg-indigo-50/60 border border-indigo-100 p-2.5 rounded-lg">
          <label className="flex items-center gap-2 text-gray-700 hover:text-gray-900 cursor-pointer font-medium">
            <input
              type="checkbox"
              checked={Boolean(nuevoMecanizado.es_lpr)}
              onChange={e => setNuevoMecanizado({ ...nuevoMecanizado, es_lpr: e.target.checked })}
              className="accent-indigo-600 rounded cursor-pointer"
            />
            <span className="flex items-center gap-1.5 font-semibold text-indigo-900">
              <Camera size={13} className="text-indigo-600" />
              ¿Es Accesorio / Cámara LPR?
            </span>
          </label>
          <span className="text-[10px] text-gray-500 block mt-1">
            Activa el tratamiento especial de soporte saliente y mecanizado óptico.
          </span>
        </div>

        <button
          type="submit"
          className={`w-full text-white font-bold py-2 rounded-lg flex items-center justify-center gap-1 transition-colors shadow-sm ${
            editandoId ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          <Plus size={14} /> {editandoId ? 'Guardar Cambios' : 'Registrar Mecanizado'}
        </button>
      </form>

      {/* LISTADO DE MECANIZADOS REGISTRADOS */}
      <div className="lg:col-span-8 bg-white border border-gray-200 p-4 rounded-xl space-y-3 shadow-sm">
        <h3 className="font-bold text-gray-900 uppercase border-b border-gray-200 pb-2 text-xs flex justify-between items-center">
          <span>Mecanizados de Tótem Registrados ({mecanizadosTotem.length})</span>
          <span className="text-[10px] text-gray-500 font-normal">Sincronizado con PostgreSQL</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-[500px] overflow-y-auto pr-1">
          {mecanizadosTotem.length === 0 ? (
            <div className="col-span-2 text-center py-8 text-gray-400 italic">
              No hay mecanizados registrados en la base de datos.
            </div>
          ) : (
            mecanizadosTotem.map((m, i) => {
              const esLpr = m.es_lpr || m.esLpr;
              return (
                <div
                  key={m.id || i}
                  className={`bg-gray-50 p-3 rounded-lg border flex justify-between items-start transition-colors ${
                    editandoId === m.id ? 'border-emerald-500 bg-emerald-50/20' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="space-y-1">
                    <p className="font-bold text-gray-900 text-xs">{m.nombre}</p>

                    <p className="text-emerald-700 font-mono font-bold">
                      ${(m.precio || 0).toLocaleString()} <span className="text-gray-500 text-[10px] font-normal">/ ud</span>
                    </p>

                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="font-mono text-[9px] bg-slate-100 text-slate-700 border border-slate-300 px-1.5 py-0.5 rounded">
                        clave: {m.clave}
                      </span>
                      {esLpr && (
                        <span className="text-[8px] bg-indigo-50 text-indigo-700 border border-indigo-200 px-1 py-0.5 rounded font-semibold">
                          LPR / Cámara
                        </span>
                      )}
                      <span className="text-[8px] bg-slate-100 text-slate-600 border border-slate-200 px-1 py-0.5 rounded font-medium">
                        {m.area_m2 ?? 0.08} m²
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => editarMecanizado(m)}
                      title="Editar mecanizado"
                      className="text-gray-400 hover:text-blue-600 p-1 transition-colors"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => eliminarItem(m.id, 'mecanizados-totem')}
                      title="Eliminar mecanizado"
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
