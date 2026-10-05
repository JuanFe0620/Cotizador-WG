import React from 'react';

export default function SelectorBujes({ params = {}, setParams, bujes = [] }) {
  // Función para normalizar texto
  const normalizar = (txt = '') =>
    String(txt)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();

  // Bujes base esenciales garantizados
  const BUJES_DEFAULT = [
    { id: 'platina_redonda', nombre: 'Platina Redonda (Piso)', precio: 22000, subtipo: 'base' },
    { id: 'platina_cuadrada', nombre: 'Platina Cuadrada (Piso)', precio: 22000, subtipo: 'base' },
    { id: 'videoportero_punta', nombre: 'Soporte Videoportero en Punta', precio: 45000, subtipo: 'punta' }
  ];

  // Combina bujes de BD con los bujes de platinas base si aún no están en la lista
  const bujesCombinados = [...bujes];
  BUJES_DEFAULT.forEach(defB => {
    const yaExiste = bujesCombinados.some(
      b => normalizar(b.nombre || '').includes(normalizar(defB.nombre.split(' ')[0])) &&
           normalizar(b.nombre || '').includes(normalizar(defB.nombre.split(' ')[1] || ''))
    );
    if (!yaExiste) {
      bujesCombinados.push(defB);
    }
  });

  const opcionesDisponibles = bujesCombinados.filter(b => {
    const nombre = normalizar(b.nombre || b.descripcion || '');
    return !nombre.includes('cubo de ensamble');
  });

  const handleBujeInicialChange = (e) => {
    const valor = e.target.value;
    const bujeObj = bujesCombinados.find(b => String(b.id) === String(valor)) || null;
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
    const bujeObj = bujesCombinados.find(b => String(b.id) === String(valor)) || null;
    const esVideoportero = bujeObj && (
      normalizar(bujeObj.nombre).includes('videoportero') || 
      normalizar(bujeObj.nombre).includes('portero')
    );

    setParams(prev => {
      const bujesPrevios = (prev.bujesSeleccionados || []).filter(
        id => String(id) !== String(prev.bujeFinalId)
      );
      const nuevosBujes = valor ? [...bujesPrevios, valor] : bujesPrevios;

      return {
        ...prev,
        bujeFinalId: valor,
        bujeFinal: bujeObj,
        bujesSeleccionados: nuevosBujes,
        ...(esVideoportero && { videoporteroPunta: true })
      };
    });
  };

  const caperuzaActiva = Boolean(params.caperuzaBase || params.cubreAnclaje || params.caperuza);
  const videoporteroActivo = Boolean(
    params.videoporteroPunta || 
    params.accesorioPunta === 'videoportero' ||
    normalizar(params.bujeFinal?.nombre || '').includes('videoportero')
  );

  return (
    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
      <span className="font-bold text-slate-600 uppercase block text-[10px] tracking-wider">
        CONEXIONES, BUJES Y ELEMENTOS DE BRAZO
      </span>

      <div className="grid grid-cols-2 gap-3">
        {/* Selector Buje Inicial (Base) */}
        <div>
          <label className="text-[10px] font-medium text-slate-600 block mb-1 flex items-center gap-1">
            <span>⚓</span> Buje / Platina Inicial (Base):
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
            <span>🎯</span> Buje / Accesorio Final (Punta):
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

      {/* Opciones Especiales: Caperuza embellecedora y Videoportero en punta */}
      <div className="pt-2 border-t border-slate-200/80 space-y-2">
        {/* Caperuza Cubre-Anclaje */}
        <label className="flex items-start gap-2 cursor-pointer select-none bg-white p-2 rounded-lg border border-slate-200 hover:border-slate-300 transition">
          <input
            type="checkbox"
            checked={caperuzaActiva}
            onChange={(e) => {
              const val = e.target.checked;
              setParams(prev => ({
                ...prev,
                caperuzaBase: val,
                cubreAnclaje: val
              }));
            }}
            className="w-4 h-4 mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-0"
          />
          <div>
            <span className="text-[11px] font-bold text-slate-700 block">
              Caperuza / Cubre-anclaje Embellecedora
            </span>
            <span className="text-[10px] text-slate-500 block">
              Oculta la platina de piso y los pernos con un embellecedor cónico en la base (+ $25.000)
            </span>
          </div>
        </label>

        {/* Videoportero en punta */}
        <label className="flex items-start gap-2 cursor-pointer select-none bg-white p-2 rounded-lg border border-slate-200 hover:border-slate-300 transition">
          <input
            type="checkbox"
            checked={videoporteroActivo}
            onChange={(e) => {
              const val = e.target.checked;
              setParams(prev => {
                const siguiente = {
                  ...prev,
                  videoporteroPunta: val,
                  accesorioPunta: val ? 'videoportero' : ''
                };
                if (val && !prev.bujeFinalId) {
                  const bujeVideo = bujesCombinados.find(b => normalizar(b.nombre).includes('videoportero'));
                  if (bujeVideo) {
                    siguiente.bujeFinalId = bujeVideo.id;
                    siguiente.bujeFinal = bujeVideo;
                  }
                }
                return siguiente;
              });
            }}
            className="w-4 h-4 mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-0"
          />
          <div>
            <span className="text-[11px] font-bold text-slate-700 block">
              Accesorio Videoportero en Punta de Brazo
            </span>
            <span className="text-[10px] text-slate-500 block">
              Monta soporte/caja de videoportero adaptado con visera sobre platina final (+ $45.000)
            </span>
          </div>
        </label>
      </div>
    </div>
  );
}