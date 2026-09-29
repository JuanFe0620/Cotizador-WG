import React from 'react';

export default function SelectorBujes({ params = {}, setParams, bujes = [] }) {
  // Función para normalizar texto
  const normalizar = (txt = '') =>
    String(txt)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();

  // Muestra todos los bujes disponibles en ambos desplegables para no excluir Rosetas ni Bases
  const opcionesDisponibles = bujes.filter(b => {
    const nombre = normalizar(b.nombre || b.descripcion || '');
    // Excluir únicamente conectores de ensamble si se manejan por separado
    return !nombre.includes('cubo de ensamble');
  });

  const handleBujeInicialChange = (e) => {
    const valor = e.target.value;
    const bujeObj = bujes.find(b => String(b.id) === String(valor)) || null;
    setParams(prev => {
      const bujesPrevios = (prev.bujesSeleccionados || []).filter(
        id => String(id) !== String(prev.bujeInicialId)
      );
      const nuevosBujes = valor ? [...bujesPrevios, valor] : bujesPrevios;

      return {
        ...prev,
        bujeInicialId: valor,
        bujeInicial: bujeObj,
        bujesSeleccionados: nuevosBujes
      };
    });
  };

  const handleBujeFinalChange = (e) => {
    const valor = e.target.value;
    const bujeObj = bujes.find(b => String(b.id) === String(valor)) || null;
    setParams(prev => {
      const bujesPrevios = (prev.bujesSeleccionados || []).filter(
        id => String(id) !== String(prev.bujeFinalId)
      );
      const nuevosBujes = valor ? [...bujesPrevios, valor] : bujesPrevios;

      return {
        ...prev,
        bujeFinalId: valor,
        bujeFinal: bujeObj,
        bujesSeleccionados: nuevosBujes
      };
    });
  };

  return (
    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
      <span className="font-bold text-slate-600 uppercase block text-[10px] tracking-wider">
        CONEXIONES Y BUJES DE BRAZO
      </span>

      <div className="grid grid-cols-2 gap-3">
        {/* Selector Buje Inicial (Base) */}
        <div>
          <label className="text-[10px] font-medium text-slate-600 block mb-1 flex items-center gap-1">
            <span>⚓</span> Buje Inicial (Base):
          </label>
          <select
            value={params.bujeInicialId || ''}
            onChange={handleBujeInicialChange}
            className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">-- Sin Buje Base --</option>
            {opcionesDisponibles.map(b => (
              <option key={b.id} value={b.id}>
                {b.nombre || b.descripcion} {b.precio ? `(+$${Number(b.precio).toLocaleString('es-CO')})` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Selector Buje Final (Carga) */}
        <div>
          <label className="text-[10px] font-medium text-slate-600 block mb-1 flex items-center gap-1">
            <span>🎯</span> Buje Final (Carga):
          </label>
          <select
            value={params.bujeFinalId || ''}
            onChange={handleBujeFinalChange}
            className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">-- Sin Buje Carga --</option>
            {opcionesDisponibles.map(b => (
              <option key={b.id} value={b.id}>
                {b.nombre || b.descripcion} {b.precio ? `(+$${Number(b.precio).toLocaleString('es-CO')})` : ''}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}