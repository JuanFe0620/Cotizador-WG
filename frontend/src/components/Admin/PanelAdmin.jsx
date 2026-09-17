import React, { useState } from 'react';
import { Shield, Layers, Box, Wrench, Palette } from 'lucide-react';

import TabTubos from './TabTubos';
import TabAccesorios from './TabAccesorios';
import TabLaminas from './TabLaminas';
import TabPinturas from './TabPinturas';

export default function PanelAdmin({ 
  API_BASE_URL,
  recargarDatos,
  laminas = [], setLaminas, 
  tubos = [], setTubos, 
  accesorios = [], setAccesorios,
  pinturas = [], setPinturas 
}) {
  const [tabAdmin, setTabAdmin] = useState('tubos');
  const [editandoId, setEditandoId] = useState(null);

  const categoriasDisponibles = ['totems', 'postes', 'brazos', 'gabinetes'];

  // Estados Formularios
  const [nuevoTubo, setNuevoTubo] = useState({
    forma: 'redondo', material: '', calibre: '', diametro_pulg: '', ancho_cm: '', alto_cm: '', precio_tira_6m: '', categorias: ['postes', 'brazos']
  });

  const [nuevoAcc, setNuevoAcc] = useState({
    nombre: '', 
    precio: '', 
    categorias: ['gabinetes', 'totems', 'postes', 'brazos'],
    requiere_lamina: false,
    permite_n_pies: false,
    grupo_exclusion: ''
  });

  const [nuevaLamina, setNuevaLamina] = useState({
    material: '', calibre: '', precio_entera: '', alto_m: 2.44, ancho_m: 1.22, categorias: ['gabinetes', 'totems']
  });

  const [nuevaPintura, setNuevaPintura] = useState({
    nombre: '', hex: '#2563eb', precio_kg: ''
  });

  const RENDIMIENTO_M2_POR_KG = 8;
  const FACTOR_PINTURA = 1.5;

  const calcularPrecioM2 = (precioKg) => {
    if (!precioKg || isNaN(precioKg)) return 0;
    return (parseFloat(precioKg) / RENDIMIENTO_M2_POR_KG) * FACTOR_PINTURA;
  };

  const normalizarCategorias = (cats) => {
    if (!cats) return ['gabinetes', 'totems', 'postes', 'brazos'];
    if (Array.isArray(cats)) return cats;
    if (typeof cats === 'string') return cats.split(',').map(c => c.trim()).filter(Boolean);
    return ['gabinetes', 'totems', 'postes', 'brazos'];
  };

  // --- GUARDAR Y ACTUALIZAR FUNCIONES ---

  const handleAgregarTubo = async (e) => {
    if (e && e.preventDefault) e.preventDefault();

    const catString = Array.isArray(nuevoTubo.categorias) ? nuevoTubo.categorias.join(',') : 'postes,brazos';

    const payload = {
      forma: nuevoTubo.forma || 'redondo',
      material: nuevoTubo.material || 'CR',
      calibre: nuevoTubo.calibre || 'Estándar',
      precio_tira_6m: parseFloat(nuevoTubo.precio_tira_6m) || 0,
      categorias: catString,
      diametro_pulg: nuevoTubo.forma === 'redondo' ? (nuevoTubo.diametro_pulg ? String(nuevoTubo.diametro_pulg) : null) : null,
      ancho_cm: nuevoTubo.forma !== 'redondo' ? (nuevoTubo.ancho_cm ? String(nuevoTubo.ancho_cm) : null) : null,
      alto_cm: nuevoTubo.forma !== 'redondo' ? (nuevoTubo.alto_cm ? String(nuevoTubo.alto_cm) : null) : null,
    };

    try {
      const isEditing = editandoId !== null && editandoId !== undefined;
      const method = isEditing ? 'PUT' : 'POST';
      const endpoint = isEditing ? `${API_BASE_URL}/api/tubos/${editandoId}` : `${API_BASE_URL}/api/tubos`;

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        if (recargarDatos) await recargarDatos();
        setEditandoId(null);
        setNuevoTubo({ forma: 'redondo', material: '', calibre: '', diametro_pulg: '', ancho_cm: '', alto_cm: '', precio_tira_6m: '', categorias: ['postes', 'brazos'] });
      } else {
        const errorMsg = await res.text();
        alert(`Error guardando en base de datos: ${errorMsg}`);
      }
    } catch (err) {
      console.error("Error al guardar tubo:", err);
      alert("Error conectando con la API en Python.");
    }
  };

  const handleAgregarAccesorio = async (e) => {
    if (e && e.preventDefault) e.preventDefault();

    const catString = Array.isArray(nuevoAcc.categorias) ? nuevoAcc.categorias.join(',') : 'gabinetes,totems,postes,brazos';

    const payload = {
      nombre: nuevoAcc.nombre || 'Accesorio Genérico',
      precio: parseFloat(nuevoAcc.precio) || 0,
      categorias: catString,
      requiere_lamina: Boolean(nuevoAcc.requiere_lamina),
      permite_n_pies: Boolean(nuevoAcc.permite_n_pies),
      grupo_exclusion: nuevoAcc.grupo_exclusion || null
    };

    try {
      const isEditing = editandoId !== null && editandoId !== undefined;
      const method = isEditing ? 'PUT' : 'POST';
      const endpoint = isEditing ? `${API_BASE_URL}/api/accesorios/${editandoId}` : `${API_BASE_URL}/api/accesorios`;

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        if (recargarDatos) await recargarDatos();
        setEditandoId(null);
        setNuevoAcc({ 
          nombre: '', 
          precio: '', 
          categorias: ['gabinetes', 'totems', 'postes', 'brazos'],
          requiere_lamina: false,
          permite_n_pies: false,
          grupo_exclusion: ''
        });
      } else {
        const errorMsg = await res.text();
        alert(`Error guardando accesorio: ${errorMsg}`);
      }
    } catch (err) {
      console.error("Error al guardar accesorio:", err);
    }
  };

  const handleAgregarLamina = async (e) => {
    if (e && e.preventDefault) e.preventDefault();

    const catString = Array.isArray(nuevaLamina.categorias) ? nuevaLamina.categorias.join(',') : 'gabinetes,totems';

    const payload = {
      material: nuevaLamina.material || 'Lámina CR',
      calibre: nuevaLamina.calibre || 'Calibre 18',
      precio_entera: parseFloat(nuevaLamina.precio_entera) || 0,
      alto_m: parseFloat(nuevaLamina.alto_m) || 2.44,
      ancho_m: parseFloat(nuevaLamina.ancho_m) || 1.22,
      categorias: catString
    };

    try {
      const isEditing = editandoId !== null && editandoId !== undefined;
      const method = isEditing ? 'PUT' : 'POST';
      const endpoint = isEditing ? `${API_BASE_URL}/api/laminas/${editandoId}` : `${API_BASE_URL}/api/laminas`;

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        if (recargarDatos) await recargarDatos();
        setEditandoId(null);
        setNuevaLamina({ material: '', calibre: '', precio_entera: '', alto_m: 2.44, ancho_m: 1.22, categorias: ['gabinetes', 'totems'] });
      } else {
        const errorMsg = await res.text();
        alert(`Error guardando lámina: ${errorMsg}`);
      }
    } catch (err) {
      console.error("Error al guardar lámina:", err);
    }
  };

  const handleAgregarPintura = async (e) => {
    if (e && e.preventDefault) e.preventDefault();

    const pKg = parseFloat(nuevaPintura.precio_kg) || 0;
    const payload = {
      nombre: nuevaPintura.nombre || 'Pintura Estándar',
      hex: nuevaPintura.hex || '#2563eb',
      precio_kg: pKg,
      precio_m2: calcularPrecioM2(pKg)
    };

    try {
      const isEditing = editandoId !== null && editandoId !== undefined;
      const method = isEditing ? 'PUT' : 'POST';
      const endpoint = isEditing ? `${API_BASE_URL}/api/pinturas/${editandoId}` : `${API_BASE_URL}/api/pinturas`;

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        if (recargarDatos) await recargarDatos();
        setEditandoId(null);
        setNuevaPintura({ nombre: '', hex: '#2563eb', precio_kg: '' });
      } else {
        const errorMsg = await res.text();
        alert(`Error guardando pintura: ${errorMsg}`);
      }
    } catch (err) {
      console.error("Error al guardar pintura:", err);
    }
  };

  // --- CARGA DE DATOS EN FORMULARIO PARA EDICIÓN ---
  const editarTubo = (t) => { 
    setEditandoId(t.id); 
    setNuevoTubo({ 
      forma: t.forma || 'redondo', material: t.material || '', calibre: t.calibre || '', 
      diametro_pulg: t.diametro_pulg || '', ancho_cm: t.ancho_cm || '', 
      alto_cm: t.alto_cm || '', precio_tira_6m: t.precio_tira_6m || '', 
      categorias: normalizarCategorias(t.categorias) 
    }); 
  };

  const editarAccesorio = (a) => { 
    setEditandoId(a.id); 
    setNuevoAcc({ 
      nombre: a.nombre || '', 
      precio: a.precio || '', 
      categorias: normalizarCategorias(a.categorias),
      requiere_lamina: a.requiere_lamina || a.requiereLamina || false,
      permite_n_pies: a.permite_n_pies || a.permiteNPies || false,
      grupo_exclusion: a.grupo_exclusion || a.grupoExclusion || ''
    }); 
  };

  const editarLamina = (l) => { 
    setEditandoId(l.id); 
    setNuevaLamina({ 
      material: l.material || '', calibre: l.calibre || '', precio_entera: l.precio_entera || '', 
      alto_m: l.alto_m || 2.44, ancho_m: l.ancho_m || 1.22, 
      categorias: normalizarCategorias(l.categorias) 
    }); 
  };

  const editarPintura = (p) => { 
    setEditandoId(p.id); 
    setNuevaPintura({ nombre: p.nombre || '', hex: p.hex || '#2563eb', precio_kg: p.precio_kg || p.precioKg || '' }); 
  };

  const eliminarItem = async (id, tipo) => {
    if (!window.confirm(`¿Seguro que deseas eliminar este registro de la base de datos?`)) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/${tipo}/${id}`, { method: 'DELETE' });
      if (res.ok) {
        if (recargarDatos) await recargarDatos();
      }
    } catch (err) {
      console.error(`Error eliminando ${tipo}:`, err);
    }

    if (editandoId === id) setEditandoId(null);
  };

  const cambiarPestana = (tab) => { setTabAdmin(tab); setEditandoId(null); };

  const renderBadges = (categorias) => {
    const list = normalizarCategorias(categorias);
    if (list.length === 0) return null;

    return (
      <div className="flex gap-1 mt-1 flex-wrap">
        {list.map(c => (
          <span key={c} className="text-[8px] uppercase px-1.5 py-0.5 bg-gray-100 text-gray-700 rounded border border-gray-300 font-medium">
            {c}
          </span>
        ))}
      </div>
    );
  };

  return (
    <div className="w-full h-full max-h-[calc(100vh-80px)] overflow-y-auto pb-10 space-y-4 text-xs text-gray-800">
      
      {/* Selector de pestañas */}
      <div className="flex justify-between items-center bg-white border border-gray-200 p-3 rounded-xl shadow-sm">
        <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
          <Shield size={16} className="text-blue-600" /> Control de Inventario y Precios
        </h2>
        <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200 gap-1">
          <button 
            onClick={() => cambiarPestana('tubos')} 
            className={`px-3 py-1 rounded-md font-semibold transition-all duration-150 ${
              tabAdmin === 'tubos' 
                ? 'bg-white text-blue-600 shadow-sm border border-gray-200/60 font-bold' 
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'
            }`}
          >
            <Box size={13} className="inline mr-1" /> Tubos
          </button>
          <button 
            onClick={() => cambiarPestana('accesorios')} 
            className={`px-3 py-1 rounded-md font-semibold transition-all duration-150 ${
              tabAdmin === 'accesorios' 
                ? 'bg-white text-blue-600 shadow-sm border border-gray-200/60 font-bold' 
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'
            }`}
          >
            <Wrench size={13} className="inline mr-1" /> Accesorios
          </button>
          <button 
            onClick={() => cambiarPestana('laminas')} 
            className={`px-3 py-1 rounded-md font-semibold transition-all duration-150 ${
              tabAdmin === 'laminas' 
                ? 'bg-white text-blue-600 shadow-sm border border-gray-200/60 font-bold' 
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'
            }`}
          >
            <Layers size={13} className="inline mr-1" /> Láminas
          </button>
          <button 
            onClick={() => cambiarPestana('pinturas')} 
            className={`px-3 py-1 rounded-md font-semibold transition-all duration-150 ${
              tabAdmin === 'pinturas' 
                ? 'bg-white text-blue-600 shadow-sm border border-gray-200/60 font-bold' 
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'
            }`}
          >
            <Palette size={13} className="inline mr-1" /> Pinturas
          </button>
        </div>
      </div>

      {/* Renderizado de Pestañas Activas */}
      {tabAdmin === 'tubos' && (
        <TabTubos 
          tubos={tubos} nuevoTubo={nuevoTubo} setNuevoTubo={setNuevoTubo} 
          editandoId={editandoId} handleAgregarTubo={handleAgregarTubo} 
          editarTubo={editarTubo} eliminarItem={eliminarItem} 
          categoriasDisponibles={categoriasDisponibles} renderBadges={renderBadges} 
        />
      )}

      {tabAdmin === 'accesorios' && (
        <TabAccesorios 
          accesorios={accesorios} nuevoAcc={nuevoAcc} setNuevoAcc={setNuevoAcc} 
          editandoId={editandoId} handleAgregarAccesorio={handleAgregarAccesorio} 
          editarAccesorio={editarAccesorio} eliminarItem={eliminarItem} 
          categoriasDisponibles={categoriasDisponibles} renderBadges={renderBadges} 
        />
      )}

      {tabAdmin === 'laminas' && (
        <TabLaminas 
          laminas={laminas} nuevaLamina={nuevaLamina} setNuevaLamina={setNuevaLamina} 
          editandoId={editandoId} handleAgregarLamina={handleAgregarLamina} 
          editarLamina={editarLamina} eliminarItem={eliminarItem} 
          categoriasDisponibles={categoriasDisponibles} renderBadges={renderBadges} 
        />
      )}

      {tabAdmin === 'pinturas' && (
        <TabPinturas 
          pinturas={pinturas} nuevaPintura={nuevaPintura} setNuevaPintura={setNuevaPintura} 
          editandoId={editandoId} handleAgregarPintura={handleAgregarPintura} 
          editarPintura={editarPintura} eliminarItem={eliminarItem} 
          calcularPrecioM2={calcularPrecioM2} 
        />
      )}

    </div>
  );
}