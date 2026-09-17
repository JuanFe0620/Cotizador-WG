import React, { useState, useEffect } from 'react';
import { History, Search, FileText } from 'lucide-react';

export default function HistorialCotizaciones({ 
  API_BASE_URL, 
  onCargarCotizacionExistente,
  historialExterno,
  alCargarHistorial
}) {
  const [historial, setHistorial] = useState(historialExterno || []);
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(false);

  // Sincronizar estado si la lista principal del App cambia
  useEffect(() => {
    if (historialExterno) {
      setHistorial(historialExterno);
    }
  }, [historialExterno]);

  const cargarHistorial = async (filtro = '') => {
    setCargando(true);
    try {
      const url = filtro 
        ? `${API_BASE_URL}/api/cotizaciones?q=${encodeURIComponent(filtro)}`
        : `${API_BASE_URL}/api/cotizaciones`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setHistorial(data);
        if (alCargarHistorial) alCargarHistorial(data);
      }
    } catch (e) {
      console.error("Error al cargar historial:", e);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarHistorial(busqueda);
  }, []);

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setBusqueda(val);
    cargarHistorial(val);
  };

  return (
    <div className="h-full w-full max-w-6xl mx-auto flex flex-col gap-4 bg-white p-6 rounded-xl border border-slate-300 shadow-md overflow-hidden">
      <div className="flex justify-between items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <History className="text-blue-600" /> Historial de Cotizaciones
          </h2>
          <p className="text-xs text-slate-500">Consulta y recupera cotizaciones guardadas anteriormente.</p>
        </div>

        <div className="relative w-72">
          <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
          <input 
            type="text"
            placeholder="Buscar por consecutivo o cliente..."
            value={busqueda}
            onChange={handleSearchChange}
            className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto border border-slate-200 rounded-lg bg-white">
        {cargando ? (
          <div className="p-8 text-center text-slate-500 text-sm">Cargando cotizaciones...</div>
        ) : historial.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm">No se encontraron cotizaciones guardadas.</div>
        ) : (
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-100 text-slate-800 uppercase font-semibold sticky top-0 border-b border-slate-200">
              <tr>
                <th className="p-3">Consecutivo</th>
                <th className="p-3">Cliente</th>
                <th className="p-3">Fecha</th>
                <th className="p-3">Ítems</th>
                <th className="p-3">Total</th>
                <th className="p-3 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {historial.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50 transition">
                  <td className="p-3 font-bold text-blue-600">{c.consecutivo}</td>
                  <td className="p-3">{c.cliente_nombre}</td>
                  <td className="p-3 text-slate-500">{c.fecha}</td>
                  <td className="p-3">{c.num_items} ítem(s)</td>
                  <td className="p-3 font-semibold text-emerald-600">
                    ${Number(c.total).toLocaleString()}
                  </td>
                  <td className="p-3 text-right">
                    <button 
                      onClick={() => onCargarCotizacionExistente(c.id)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs transition flex items-center gap-1 ml-auto font-medium shadow-sm"
                    >
                      <FileText size={13} /> Abrir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}