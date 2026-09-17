import React from 'react';
import { Eye, Box } from 'lucide-react';

export default function Galeria() {
  const rendersEstaticos = [
    { id: 1, nombre: 'Tótem Publicitario LED', desc: 'Línea de exhibición exterior fija' },
    { id: 2, nombre: 'Poste Cómputo de Tráfico', desc: 'Estructura pesada con soporte para cámaras' },
    { id: 3, nombre: 'Gabinete Doble Tapa NEMA', desc: 'Gabinete de control estanco para intemperie' }
  ];

  return (
    <div className="space-y-6 w-full">
      <h2 className="text-lg font-bold text-white border-b border-slate-700 pb-3 flex items-center gap-2">
        <Eye size={20} className="text-blue-400" /> Galería de Renders 3D Estáticos (Showroom M3)
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
        {rendersEstaticos.map((item) => (
          <div key={item.id} className="bg-slate-800 border border-slate-700 rounded-2xl p-5 space-y-3 shadow-xl">
            <div className="bg-slate-950 rounded-xl h-[220px] flex flex-col items-center justify-center border border-slate-700 text-slate-500">
              <Box size={40} className="text-blue-500/50 mb-2" />
              <span className="text-xs text-slate-400">[ Render 3D Estático ]</span>
            </div>
            <h3 className="font-bold text-slate-200 text-sm">{item.nombre}</h3>
            <p className="text-xs text-slate-400">{item.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}