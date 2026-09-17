import React, { useState } from 'react';
import { Shield, Plus, Trash2, Calculator, ShoppingCart } from 'lucide-react';

export default function CotizadorTubos({ tubos = [], pinturas = [], laminas = [], accesorios = [], setItems }) {
  const [tramos, setTramos] = useState([
    { id: 1, tuboId: '', cantidadMetros: '', pinturaId: '' }
  ]);
  const [accesoriosSeleccionados, setAccesoriosSeleccionados] = useState([]);
  const [tipoMargen, setTipoMargen] = useState('1.55');
  const [tipoAcc, setTipoAcc] = useState('estandar');
  
  // Formulario Platinas Cuadradas / Pies de Amigo
  const [platinaForm, setPlatinaForm] = useState({
    tipo: 'base',
    ladoCm: '',
    laminaId: '',
    cantidad: 1
  });

  const [accEstandarForm, setAccEstandarForm] = useState({
    accesorioId: '',
    cantidad: 1
  });

  const calcularAreaSuperficialPorMetro = (tubo) => {
    if (!tubo) return 0;
    if (tubo.forma === 'redondo') {
      const diametroPulgadas = parseFloat(tubo.diametro_pulg || 2);
      const diametroMetros = diametroPulgadas * 0.0254;
      return Math.PI * diametroMetros;
    } else {
      const anchoMetros = (parseFloat(tubo.ancho_cm) || 4) / 100;
      const altoMetros = (parseFloat(tubo.alto_cm) || 4) / 100;
      return 2 * (anchoMetros + altoMetros);
    }
  };

  const agregarTramo = () => {
    if (tramos.length < 3) {
      setTramos([...tramos, { id: Date.now(), tuboId: '', cantidadMetros: '', pinturaId: '' }]);
    }
  };

  const eliminarTramo = (id) => {
    if (tramos.length > 1) {
      setTramos(tramos.filter(t => t.id !== id));
    }
  };

  const handleTramoChange = (id, field, value) => {
    setTramos(tramos.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  const handleAgregarAccEstandar = (e) => {
    e.preventDefault();
    const acc = accesorios.find(a => a.id.toString() === accEstandarForm.accesorioId.toString());
    if (!acc) return;
    
    setAccesoriosSeleccionados([
      ...accesoriosSeleccionados,
      {
        id: Date.now(),
        descripcion: acc.nombre,
        cantidad: parseInt(accEstandarForm.cantidad),
        precioUnitario: acc.precio,
        total: acc.precio * parseInt(accEstandarForm.cantidad)
      }
    ]);
    setAccEstandarForm({ accesorioId: '', cantidad: 1 });
  };

  const handleAgregarPlatina = (e) => {
    e.preventDefault();
    const { tipo, ladoCm, laminaId, cantidad } = platinaForm;
    if (!ladoCm) return;

    const lado = parseFloat(ladoCm);
    const cant = parseInt(cantidad);
    const areaM2 = (lado * lado) / 10000;

    let precioUnitario = 0;
    let desc = '';

    if (tipo === 'plantilla') {
      precioUnitario = (areaM2 * 10000 * 1.5) + 4500;
      desc = `Plantilla Cuadrada de Instalación (${lado}x${lado} cm)`;
    } else {
      const lam = laminas.find(l => l.id.toString() === laminaId.toString());
      if (!lam) return;
      
      const areaLamina = (lam.alto_m || 2.44) * (lam.ancho_m || 1.22);
      const costoM2Lamina = lam.precio_entera / areaLamina;

      let factorArea = tipo === 'pie' ? 0.5 : 1.0;
      let costoBaseArea = areaM2 * factorArea * costoM2Lamina;
      
      precioUnitario = costoBaseArea * 1.6;
      desc = `${tipo === 'pie' ? 'Pie de Amigo' : 'Base Cuadrada'} (${lado}x${lado} cm) - ${lam.material} ${lam.calibre}`;
    }

    setAccesoriosSeleccionados([
      ...accesoriosSeleccionados,
      {
        id: Date.now(),
        descripcion: desc,
        cantidad: cant,
        precioUnitario: precioUnitario,
        total: precioUnitario * cant
      }
    ]);
    setPlatinaForm({ tipo: 'base', ladoCm: '', laminaId: '', cantidad: 1 });
  };

  const eliminarAccesorio = (id) => {
    setAccesoriosSeleccionados(accesoriosSeleccionados.filter(a => a.id !== id));
  };

  const factorMargen = parseFloat(tipoMargen);

  let subtotalEstructuraSinMargen = 0;
  let subtotalPinturaSinMargen = 0;
  let subtotalTubos = 0;

  const tramosCalculados = tramos.map(tramo => {
    const tubo = tubos.find(t => t.id.toString() === tramo.tuboId.toString());
    const pintura = pinturas.find(p => p.id.toString() === tramo.pinturaId.toString());
    const metros = parseFloat(tramo.cantidadMetros) || 0;

    if (!tubo || metros <= 0) return { ...tramo, costoMetroTubo: 0, costoMetroPintura: 0, subtotal: 0 };

    const costoMetroTubo = tubo.precio_tira_6m / 6;
    const areaSuperficialPerMetro = calcularAreaSuperficialPorMetro(tubo);
    
    const precioM2Pintura = pintura 
      ? (pintura.precioM2 || ((pintura.precioKg / 8) * 1.5))
      : 0;

    const costoMetroPintura = areaSuperficialPerMetro * precioM2Pintura;
    
    subtotalEstructuraSinMargen += (costoMetroTubo * metros);
    subtotalPinturaSinMargen += (costoMetroPintura * metros);

    const costoTotalMetro = (costoMetroTubo + costoMetroPintura) * factorMargen;
    const subtotal = costoTotalMetro * metros;

    subtotalTubos += subtotal;

    return {
      ...tramo,
      tubo,
      pintura,
      costoMetroTubo,
      costoMetroPintura,
      costoTotalMetro,
      subtotal
    };
  });

  const totalAccesorios = accesoriosSeleccionados.reduce((acc, item) => acc + item.total, 0);
  const granTotal = subtotalTubos + totalAccesorios;

const handleAgregarACotizacion = () => {
  if (!setItems) return;

  const tramosValidos = tramosCalculados.filter(t => t.tubo && t.cantidadMetros > 0);
  if (tramosValidos.length === 0) return;

  const primerTubo = tramosValidos[0].tubo;
  const primeraPintura = tramosValidos.find(t => t.pintura)?.pintura;

  // 1. Costos Base de Tubería y Pintura con su margen aplicado
  const costoEstructuraVenta = Math.round(subtotalEstructuraSinMargen * factorMargen);
  const costoPinturaVenta = Math.round(subtotalPinturaSinMargen * factorMargen);
  
  // 2. Costo Total de Accesorios (con margen aplicado una sola vez)
  const costoAccesoriosVenta = Math.round(totalAccesorios * factorMargen);

  // 3. El Total del Ítem debe ser la suma exacta de sus partes
  const totalItemCalculado = costoEstructuraVenta + costoPinturaVenta + costoAccesoriosVenta;

  // Mapeo de tramos en el formato que espera Resumen.jsx
  const listaTramosFormateada = tramosValidos.map(t => ({
    tuboNombre: `${t.tubo.material} ${t.tubo.calibre ? `(${t.tubo.calibre})` : ''}`,
    longitud: parseFloat(t.cantidadMetros) * 100,
    costo: Math.round(t.subtotal)
  }));

  // Mapeo de accesorios aplicando el factor de margen a cada precio unitario
  const listaAccesoriosFormateada = accesoriosSeleccionados.map(a => ({
    nombre: a.descripcion,
    cantidad: a.cantidad,
    precioUnitario: Math.round(a.precioUnitario * factorMargen),
    total: Math.round(a.total * factorMargen)
  }));

  const nuevoItem = {
    id: Date.now(),
    categoria: 'POSTES',
    descripcion: `${primerTubo.material} ${primerTubo.calibre ? `(${primerTubo.calibre})` : ''}`,
    medidas_texto: `${tramosValidos.reduce((acc, t) => acc + (parseFloat(t.cantidadMetros) * 100), 0)} cm`,
    pintura: primeraPintura ? primeraPintura.nombre : 'Sin Pintura',
    
    // Nombres exactos de claves que lee el Resumen
    costoEstructura: costoEstructuraVenta,
    costoPintura: costoPinturaVenta,
    costoAccesorios: costoAccesoriosVenta,
    precioTotal: totalItemCalculado,
    total: totalItemCalculado,

    tramos: listaTramosFormateada,
    accesoriosLista: listaAccesoriosFormateada
  };

  setItems(prev => [...prev, nuevoItem]);
};

  return (
    <div className="w-full max-w-6xl mx-auto p-4 space-y-6 text-xs text-slate-200">
      <div className="flex justify-between items-center bg-slate-800 p-4 rounded-xl border border-slate-700">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <Calculator size={18} className="text-blue-400" /> Cotizador de Tubería y Estructuras
        </h2>
        <div className="flex items-center gap-2">
          <label className="text-slate-400 font-semibold">Tipo de Tarifa / Margen:</label>
          <select 
            value={tipoMargen} 
            onChange={e => setTipoMargen(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-bold"
          >
            <option value="1.55">Opción 1 (x1.55)</option>
            <option value="1.70">Opción 2 (x1.70)</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 space-y-3">
            <div className="flex justify-between items-center border-b border-slate-700 pb-2">
              <h3 className="font-bold text-white uppercase">Secciones de Tubería</h3>
              {tramos.length < 3 && (
                <button onClick={agregarTramo} className="bg-blue-600 hover:bg-blue-500 text-white px-2.5 py-1 rounded-lg flex items-center gap-1 font-semibold">
                  <Plus size={13} /> Añadir Tramo
                </button>
              )}
            </div>

            {tramos.map((tramo, idx) => (
              <div key={tramo.id} className="bg-slate-900 p-3 rounded-lg border border-slate-700 space-y-2 relative">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-blue-400">Tramo #{idx + 1}</span>
                  {tramos.length > 1 && (
                    <button onClick={() => eliminarTramo(tramo.id)} className="text-slate-500 hover:text-red-400 p-1">
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <div>
                    <label className="text-slate-400 block mb-1">Tubo:</label>
                    <select 
                      value={tramo.tuboId} 
                      onChange={e => handleTramoChange(tramo.id, 'tuboId', e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded p-1.5 text-white"
                    >
                      <option value="">Seleccionar Tubo...</option>
                      {tubos.map(t => (
                        <option key={t.id} value={t.id}>
                          {t.material} {t.calibre ? `(${t.calibre})` : ''} - {t.forma === 'redondo' ? `Ø ${t.diametro_pulg}"` : `${t.ancho_cm}x${t.alto_cm}cm`}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">Cantidad Metros:</label>
                    <input 
                      type="number" 
                      placeholder="Ej. 6" 
                      value={tramo.cantidadMetros} 
                      onChange={e => handleTramoChange(tramo.id, 'cantidadMetros', e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded p-1.5 text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">Pintura:</label>
                    <select 
                      value={tramo.pinturaId} 
                      onChange={e => handleTramoChange(tramo.id, 'pinturaId', e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded p-1.5 text-white"
                    >
                      <option value="">Sin Pintura</option>
                      {pinturas.map(p => (
                        <option key={p.id} value={p.id}>{p.nombre}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 space-y-3">
            <div className="flex gap-2 border-b border-slate-700 pb-2">
              <button 
                onClick={() => setTipoAcc('estandar')} 
                className={`px-3 py-1 rounded font-bold ${tipoAcc === 'estandar' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                Accesorio Estándar
              </button>
              <button 
                onClick={() => setTipoAcc('platina')} 
                className={`px-3 py-1 rounded font-bold ${tipoAcc === 'platina' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                Platina Cuadrada / Pie de Amigo
              </button>
            </div>

            {tipoAcc === 'estandar' ? (
              <form onSubmit={handleAgregarAccEstandar} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
                <div className="md:col-span-6">
                  <label className="text-slate-400 block mb-1">Accesorio:</label>
                  <select 
                    value={accEstandarForm.accesorioId} 
                    onChange={e => setAccEstandarForm({ ...accEstandarForm, accesorioId: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-white"
                  >
                    <option value="">Seleccionar...</option>
                    {accesorios.map(a => (
                      <option key={a.id} value={a.id}>{a.nombre} - ${a.precio?.toLocaleString()}</option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-3">
                  <label className="text-slate-400 block mb-1">Cantidad:</label>
                  <input 
                    type="number" 
                    min="1" 
                    value={accEstandarForm.cantidad} 
                    onChange={e => setAccEstandarForm({ ...accEstandarForm, cantidad: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-white font-mono"
                  />
                </div>
                <div className="md:col-span-3">
                  <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-1.5 rounded">
                    Agregar
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleAgregarPlatina} className="space-y-2">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <div>
                    <label className="text-slate-400 block mb-1">Tipo Pieza:</label>
                    <select 
                      value={platinaForm.tipo} 
                      onChange={e => setPlatinaForm({ ...platinaForm, tipo: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-white"
                    >
                      <option value="base">Base Cuadrada Inferior</option>
                      <option value="pie">Pie de Amigo</option>
                      <option value="plantilla">Plantilla Instalación</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Lado Cuadrado (cm):</label>
                    <input 
                      type="number" 
                      placeholder="Ej. 20" 
                      value={platinaForm.ladoCm} 
                      onChange={e => setPlatinaForm({ ...platinaForm, ladoCm: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Cantidad:</label>
                    <input 
                      type="number" 
                      min="1" 
                      value={platinaForm.cantidad} 
                      onChange={e => setPlatinaForm({ ...platinaForm, cantidad: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-white font-mono"
                    />
                  </div>
                </div>

                {platinaForm.tipo !== 'plantilla' && (
                  <div>
                    <label className="text-slate-400 block mb-1">Lámina de Origen (Costo Material):</label>
                    <select 
                      value={platinaForm.laminaId} 
                      onChange={e => setPlatinaForm({ ...platinaForm, laminaId: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-white"
                    >
                      <option value="">Seleccionar Lámina...</option>
                      {laminas.map(l => (
                        <option key={l.id} value={l.id}>{l.material} {l.calibre} (${l.precio_entera?.toLocaleString()})</option>
                      ))}
                    </select>
                  </div>
                )}

                <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-1.5 rounded">
                  Calcular y Agregar Platina
                </button>
              </form>
            )}
          </div>
        </div>

        <div className="lg:col-span-5 bg-slate-800 p-4 rounded-xl border border-slate-700 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <h3 className="font-bold text-white uppercase border-b border-slate-700 pb-2">Resumen de Cotización</h3>
            
            <div className="space-y-2">
              <p className="text-slate-400 font-bold uppercase text-[10px]">Tubería y Pintura</p>
              {tramosCalculados.map((t, i) => t.tubo && (
                <div key={i} className="bg-slate-900 p-2.5 rounded border border-slate-700 flex justify-between items-center">
                  <div>
                    <p className="font-bold text-white">{t.tubo.material} ({t.cantidadMetros} m)</p>
                    <p className="text-[10px] text-slate-400">
                      Metro: ${Math.round(t.costoTotalMetro).toLocaleString()} 
                      {t.pintura && <span className="text-blue-400"> (Inc. {t.pintura.nombre})</span>}
                    </p>
                  </div>
                  <p className="font-mono font-bold text-emerald-400">${Math.round(t.subtotal).toLocaleString()}</p>
                </div>
              ))}
            </div>

            {accesoriosSeleccionados.length > 0 && (
              <div className="space-y-2">
                <p className="text-slate-400 font-bold uppercase text-[10px]">Accesorios y Platinas</p>
                {accesoriosSeleccionados.map((a) => (
                  <div key={a.id} className="bg-slate-900 p-2 rounded border border-slate-700 flex justify-between items-center">
                    <div>
                      <p className="font-bold text-white">{a.descripcion}</p>
                      <p className="text-[10px] text-slate-400">{a.cantidad}x ${Math.round(a.precioUnitario).toLocaleString()}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-emerald-400">${Math.round(a.total).toLocaleString()}</span>
                      <button onClick={() => eliminarAccesorio(a.id)} className="text-slate-500 hover:text-red-400">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-slate-900 p-4 rounded-xl border border-slate-700 space-y-3">
            <div className="space-y-1">
              <div className="flex justify-between text-slate-400">
                <span>Subtotal Tubos:</span>
                <span className="font-mono">${Math.round(subtotalTubos).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Total Accesorios:</span>
                <span className="font-mono">${Math.round(totalAccesorios).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-white font-bold text-sm pt-2 border-t border-slate-700">
                <span>TOTAL COTIZADO:</span>
                <span className="font-mono text-emerald-400 text-base">${Math.round(granTotal).toLocaleString()}</span>
              </div>
            </div>

            {setItems && (
              <button
                onClick={handleAgregarACotizacion}
                disabled={tramosCalculados.filter(t => t.tubo && t.cantidadMetros > 0).length === 0}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white font-bold py-2.5 rounded-lg transition flex items-center justify-center gap-2 text-xs shadow-lg"
              >
                <ShoppingCart size={15} />
                + Añadir a la Cotización
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}