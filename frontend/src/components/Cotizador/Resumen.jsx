import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Trash2, FileText, ShoppingBag, Download, UserPlus, Search, UserCheck } from 'lucide-react';
import { exportarPdfTecnico } from '/src/utils/pdfService.js';

export default function Resumen({ items = [], setItems, consecutivo = 'COT-2001', setConsecutivo, visorRef, onGuardarCotizacion }) {
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [modalCliente, setModalCliente] = useState(false);
  const [clientes, setClientes] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [nuevoCliente, setNuevoCliente] = useState({ nit_cedula: '', nombre: '', telefono: '', direccion: '' });
  const [generandoPdf, setGenerandoPdf] = useState(false);
  const [guardandoCliente, setGuardandoCliente] = useState(false);

  useEffect(() => {
    let active = true;
    fetch('http://127.0.0.1:8000/api/clientes')
      .then(res => res.json())
      .then(data => {
        if (active && Array.isArray(data)) setClientes(data);
      })
      .catch((err) => console.error("Error cargando clientes:", err));
    return () => { active = false; };
  }, []);

  const formatoMoneda = useCallback((valor) => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(valor || 0);
  }, []);

  const formatoMonedaSinSimbolo = useCallback((valor) => {
    return new Intl.NumberFormat('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(valor || 0);
  }, []);

  const obtenerNit = useCallback((c) => c?.nit || c?.nit_cedula || c?.NIT || '', []);
  const limpiarNit = useCallback((val) => String(val || '').replace(/[\s.,-]/g, ''), []);

  const cambiarCantidadItem = (index, nuevaCant) => {
    const val = Math.max(1, parseInt(nuevaCant) || 1);
    setItems(prev => {
      const copia = [...prev];
      copia[index] = { ...copia[index], cantidad: val };
      return copia;
    });
  };

  const obtenerValoresComerciales = useCallback((item) => {
    const cantItem = Math.max(1, parseInt(item.cantidad || item.detalles?.cantidad || 1, 10));

    const parseSeguro = (val) => {
      const num = parseFloat(val);
      return isNaN(num) ? 0 : num;
    };

    // 1. Accesorios Convencionales
    const accesorios = item.accesoriosLista || item.accesorios_lista || item.detalles?.accesorios || [];
    const sumaAccesoriosLista = accesorios.reduce((acc, a) => {
      const cant = Number(a.cantidad || 1);
      let precioUnitario = Number(a.precioUnitario ?? a.precio_calculado ?? a.costo ?? a.precio ?? 0);

      if (precioUnitario === 0 && a.nombre) {
        const nom = a.nombre.toLowerCase();
        if (nom.includes('cubo')) precioUnitario = 15000;
        else if (nom.includes('pernos')) precioUnitario = 18000;
        else if (nom.includes('guía') || nom.includes('guia')) precioUnitario = 12000;
        else if (nom.includes('corona')) precioUnitario = 19893;
        else if (nom.includes('base')) precioUnitario = 57300;
      }

      return acc + (precioUnitario * cant);
    }, 0);

    // 2. Modelo Independiente: Brazo / BrazoGuardado
    const precioBrazo = parseSeguro(
      item.brazoPrecio ?? 
      item.brazo?.precio ?? 
      item.brazo?.costo_total ?? 
      item.detalles?.brazo?.precio ?? 
      item.costoBrazo ?? 
      0
    );

    // 3. Modelo Independiente: Bujes
    const bujeInicialPrecio = parseSeguro(item.bujeInicial?.precio ?? item.detalles?.bujeInicial?.precio ?? 0);
    const bujeFinalPrecio = parseSeguro(item.bujeFinal?.precio ?? item.detalles?.bujeFinal?.precio ?? 0);
    const bujesDirectosPrecio = parseSeguro(item.costoBujes ?? item.precioBujes ?? 0);
    const sumaBujes = bujeInicialPrecio + bujeFinalPrecio + bujesDirectosPrecio;

    // 4. Precios Base Estructura / Pintura
    const baseEstructura = parseSeguro(
      item.costoEstructura ?? item.costo_lamina_venta ?? item.costo_tubos_venta ?? 
      item.costoLamina ?? item.costo_lamina ?? item.costoBase ?? item.subtotal_estructura ?? 0
    );
    
    const basePintura = parseSeguro(
      item.costoPintura ?? item.costo_pintura_venta ?? item.subtotal_pintura ?? 0
    );

    const costoAccesoriosGeneral = parseSeguro(
      item.costoAccesorios ?? item.costo_accesorios_venta ?? 0
    );

    // Subtotal Accesorios + Brazos + Bujes
    const baseAccesoriosYComplementos = (accesorios.length > 0 ? sumaAccesoriosLista : costoAccesoriosGeneral) 
      + precioBrazo 
      + sumaBujes;

    const estructuraVenta = Math.round(baseEstructura * cantItem);
    const pinturaVenta = Math.round(basePintura * cantItem);
    const accesoriosVenta = Math.round(baseAccesoriosYComplementos * cantItem);

    const precioTotalItem = estructuraVenta + pinturaVenta + accesoriosVenta;

    return {
      cantItem,
      estructuraVenta,
      pinturaVenta,
      accesoriosVenta,
      precioTotalItem
    };
  }, []);

  const totalCotizacion = useMemo(() => {
    return items.reduce((acc, item) => {
      const { precioTotalItem } = obtenerValoresComerciales(item);
      return acc + precioTotalItem;
    }, 0);
  }, [items, obtenerValoresComerciales]);

  const numeroALetrasCOP = useCallback((monto) => {
    const Unidades = (num) => {
      const u = ["", "UN", "DOS", "TRES", "CUATRO", "CINCO", "SEIS", "SIETE", "OCHO", "NUEVE"];
      return u[num] || "";
    };

    const Decenas = (num) => {
      const decena = Math.floor(num / 10);
      const unidad = num % 10;
      switch (decena) {
        case 1:
          return ["DIEZ", "ONCE", "DOCE", "TRECE", "CATORCE", "QUINCE"][unidad] || ("DIECI" + Unidades(unidad));
        case 2:
          return unidad === 0 ? "VEINTE" : "VEINTI" + Unidades(unidad);
        case 3: return "TREINTA" + (unidad > 0 ? " Y " + Unidades(unidad) : "");
        case 4: return "CUARENTA" + (unidad > 0 ? " Y " + Unidades(unidad) : "");
        case 5: return "CINCUENTA" + (unidad > 0 ? " Y " + Unidades(unidad) : "");
        case 6: return "SESENTA" + (unidad > 0 ? " Y " + Unidades(unidad) : "");
        case 7: return "SETENTA" + (unidad > 0 ? " Y " + Unidades(unidad) : "");
        case 8: return "OCHENTA" + (unidad > 0 ? " Y " + Unidades(unidad) : "");
        case 9: return "NOVENTA" + (unidad > 0 ? " Y " + Unidades(unidad) : "");
        default: return Unidades(unidad);
      }
    };

    const Centenas = (num) => {
      const centenas = Math.floor(num / 100);
      const decenas = num % 100;
      switch (centenas) {
        case 1: return decenas > 0 ? "CIENTO " + Decenas(decenas) : "CIEN";
        case 2: return "DOSCIENTOS " + Decenas(decenas);
        case 3: return "TRESCIENTOS " + Decenas(decenas);
        case 4: return "CUATROCIENTOS " + Decenas(decenas);
        case 5: return "QUINIENTOS " + Decenas(decenas);
        case 6: return "SEISCIENTOS " + Decenas(decenas);
        case 7: return "SETECIENTOS " + Decenas(decenas);
        case 8: return "OCHOCIENTOS " + Decenas(decenas);
        case 9: return "NOVECIENTOS " + Decenas(decenas);
        default: return Decenas(decenas);
      }
    };

    const ResolverGrupo = (num, divisor, singular, plural) => {
      const cociente = Math.floor(num / divisor);
      const resto = num % divisor;
      let texto = "";
      if (cociente > 0) {
        texto = cociente === 1 ? singular : Centenas(cociente) + " " + plural;
      }
      return { texto, resto };
    };

    const Miles = (num) => {
      const { texto: textoMiles, resto } = ResolverGrupo(num, 1000, "UN MIL", "MIL");
      const textoCentenas = Centenas(resto);
      return [textoMiles, textoCentenas].filter(Boolean).join(" ");
    };

    const Millones = (num) => {
      const { texto: textoMillones, resto } = ResolverGrupo(num, 1000000, "UN MILLON", "MILLONES");
      const textoMiles = Miles(resto);
      return [textoMillones, textoMiles].filter(Boolean).join(" ");
    };

    const entero = Math.floor(monto);
    if (entero === 0) return "CERO PESOS CON 00/100 M/CTE";
    return (Millones(entero) + " PESOS CON 00/100 M/CTE").replace(/\s+/g, ' ').trim();
  }, []);

  const formatoCalibreTexto = useCallback((item) => {
    const tramos = item.tramos || item.detalles?.tramos || [];
    if (tramos.length > 0) {
      const t = tramos[0];
      const tipo = (t.tipoTubo || t.tipo || 'Tubo Industrial').replace(/tubo/gi, '').trim();
      const cal = t.calibre || t.calibreTexto || item.calibre || '';
      const diam = t.diametro || t.diametroTexto || item.diametro || '';
      return `Tubo ${tipo} Calibre ${cal}${diam ? ' Ø ' + diam + '"' : ''}`;
    }

    if (item.lamina || item.tipoLamina) {
      const cal = item.calibre ? ` (Calibre ${item.calibre})` : '';
      return `Lámina ${item.lamina || item.tipoLamina}${cal}`;
    }

    return item.descripcion || 'Estructura Metalmecánica';
  }, []);

  const obtenerDetalleTramo = useCallback((tr, item) => {
    const tipo = tr.tipoTubo || tr.tipo || item?.tipoTubo || 'Tubo Industrial';
    const diametro = tr.diametro || tr.diametroTexto || item?.diametro || '4';
    const calibre = tr.calibre || tr.calibreTexto || item?.calibre || '14';
    
    return `Tubo ${tipo.replace(/tubo/gi, '').trim()} Calibre ${calibre} de Ø ${diametro}"`;
  }, []);

  const obtenerObjetoBase = useCallback((item) => {
    const cat = (item.categoria || '').toLowerCase();
    if (cat === 'gabinetes') return null;

    return item.baseAnclaje || item.detalles?.baseAnclaje || item.base || item.detalles?.base || null;
  }, []);

  const obtenerDetalleBase = useCallback((baseObj) => {
    if (!baseObj) return null;
    const forma = baseObj.formaBase || baseObj.forma || 'Base Redonda';
    const diametro = baseObj.diametroBase || baseObj.diametroCm || baseObj.diametro || '30';
    const materialCalibre = baseObj.materialCalibre || baseObj.calibre || baseObj.material || 'Lámina HR 4.5 mm';
    
    return `${forma} de Ø ${diametro} cm en ${materialCalibre}`;
  }, []);

  const obtenerDetalleCartelas = useCallback((baseObj) => {
    if (!baseObj) return null;
    const cantPies = baseObj.cantidadPies || baseObj.cantCartelas || baseObj.cantidad || 0;
    const tipoPie = baseObj.tipoPieAmigo || baseObj.tipoCartela || baseObj.tipo || 'Pie Triangular';
    const altoCartela = baseObj.altoPieCm || baseObj.altoCartela || baseObj.altoPie || 15;

    if (cantPies <= 0) return null;
    return `${cantPies} pies de amigo tipo ${tipoPie} de ${altoCartela} cm de alto`;
  }, []);

  const handleEliminarItem = useCallback((id) => {
    setItems(prev => prev.filter(item => item.id !== id));
  }, [setItems]);

  const handleGuardarCliente = async () => {
    const nitValor = nuevoCliente.nit_cedula.trim();
    if (!nitValor || !nuevoCliente.nombre.trim() || guardandoCliente) return;

    setGuardandoCliente(true);
    const payload = {
      nit: nitValor,
      nit_cedula: nitValor,
      nombre: nuevoCliente.nombre.trim(),
      telefono: nuevoCliente.telefono.trim(),
      direccion: nuevoCliente.direccion.trim()
    };

    try {
      const res = await fetch('http://127.0.0.1:8000/api/clientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Error al guardar cliente');
      const data = await res.json();
      setClientes(prev => [...prev, data]);
      setClienteSeleccionado(data);
      setModalCliente(false);
      setNuevoCliente({ nit_cedula: '', nombre: '', telefono: '', direccion: '' });
      setBusqueda('');
    } catch (e) {
      console.error("Error al guardar cliente:", e);
    } finally {
      setGuardandoCliente(false);
    }
  };

  const handleExportarPDF = () => {
    exportarPdfTecnico({
      items,
      totalCotizacion,
      consecutivo,
      clienteSeleccionado,
      obtenerNit,
      obtenerValoresComerciales,
      formatoCalibreTexto,
      obtenerObjetoBase,
      obtenerDetalleTramo,
      obtenerDetalleBase,
      obtenerDetalleCartelas,
      numeroALetrasCOP,
      formatoMonedaSinSimbolo,
      visorRef,
      setGenerandoPdf
    });
  };

  const clientesFiltrados = useMemo(() => {
    const queryTexto = busqueda.toLowerCase().trim();
    if (!queryTexto) return clientes;

    const queryLimpia = limpiarNit(queryTexto);
    return clientes.filter(c => {
      const nombre = (c.nombre || '').toLowerCase();
      const nitOriginal = (obtenerNit(c)).toLowerCase();
      const nitLimpio = limpiarNit(nitOriginal);

      return nombre.includes(queryTexto) || nitOriginal.includes(queryTexto) || (queryLimpia !== '' && nitLimpio.includes(queryLimpia));
    });
  }, [clientes, busqueda, limpiarNit, obtenerNit]);

  return (
    <div className="bg-white border border-slate-200 text-slate-800 rounded-2xl p-5 flex flex-col h-full shadow-sm text-xs space-y-4">
      {/* CABECERA RESUMEN */}
      <div className="flex justify-between items-center pb-3 border-b border-slate-200">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <ShoppingBag size={18} className="text-blue-600" />
            Resumen de Cotización
          </h2>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[11px] text-slate-500 font-semibold">N° Consecutivo:</span>
            <input 
              type="text" 
              value={consecutivo} 
              onChange={(e) => setConsecutivo(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded px-1.5 py-0.5 text-xs font-bold text-blue-600 w-24 outline-none focus:border-blue-500"
            />
          </div>
        </div>
        <span className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full text-[10px] font-bold border border-blue-200">
          {items.length} {items.length === 1 ? 'Ítem' : 'Ítems'}
        </span>
      </div>

      {/* SECCIÓN CLIENTE */}
      <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl flex items-center justify-between">
        <div className="space-y-0.5">
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Cliente Asignado</span>
          {clienteSeleccionado ? (
            <div>
              <p className="font-bold text-slate-800 text-xs">{clienteSeleccionado.nombre}</p>
              <p className="text-[11px] text-slate-500 font-medium">NIT: {obtenerNit(clienteSeleccionado)}</p>
            </div>
          ) : (
            <p className="text-slate-500 italic text-xs">Ningún cliente seleccionado</p>
          )}
        </div>
        <button 
          onClick={() => setModalCliente(true)}
          className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 p-2 rounded-lg transition flex items-center gap-1.5 text-[11px] font-semibold shadow-sm"
        >
          <UserPlus size={14} className="text-blue-600" />
          {clienteSeleccionado ? 'Cambiar' : 'Seleccionar'}
        </button>
      </div>

      {/* LISTA DE ÍTEMS AGREGADOS */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {items.length === 0 ? (
          <div className="text-center py-8 text-slate-400 space-y-2 border-2 border-dashed border-slate-200 rounded-xl">
            <FileText size={32} className="mx-auto opacity-40 text-slate-400" />
            <p className="text-xs font-medium">No has añadido productos aún.</p>
          </div>
        ) : (
          items.map((item, index) => {
            const { cantItem, estructuraVenta, pinturaVenta, accesoriosVenta, precioTotalItem } = obtenerValoresComerciales(item);
            const accesorios = item.accesoriosLista || item.accesorios_lista || item.detalles?.accesorios || [];
            const tramos = item.tramos || item.detalles?.tramos || [];
            const baseObj = obtenerObjetoBase(item);
            const categoria = (item.categoria || '').toLowerCase();

            const brazoObj = item.brazo || item.brazoObjeto || item.detalles?.brazo;
            const bujeInicialObj = item.bujeInicial || item.detalles?.bujeInicial;
            const bujeFinalObj = item.bujeFinal || item.detalles?.bujeFinal;

            return (
              <div key={item.id || index} className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2 transition hover:border-slate-300">
                <div className="flex justify-between items-center gap-2 border-b border-slate-200 pb-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="bg-slate-200 text-slate-700 font-bold text-[9px] uppercase px-1.5 py-0.5 rounded">
                      {item.categoria || 'PRODUCTO'}
                    </span>
                    <h3 className="font-bold text-slate-800 text-xs">
                      {formatoCalibreTexto(item)}
                    </h3>
                  </div>

                  <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-lg p-0.5 shadow-sm">
                    <span className="text-[10px] font-bold text-slate-500 pl-1">Cant:</span>
                    <input 
                      type="number" 
                      min="1"
                      value={cantItem}
                      onChange={(e) => cambiarCantidadItem(index, e.target.value)}
                      className="w-12 text-center font-extrabold text-blue-600 bg-transparent outline-none text-xs"
                    />
                    <button 
                      onClick={() => handleEliminarItem(item.id)}
                      className="text-slate-400 hover:text-red-600 transition p-1 pl-1 border-l border-slate-200"
                      title="Eliminar elemento"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* TARJETA DINÁMICA SEGÚN DIVERSIFICACIÓN DE CATEGORÍA */}
                <div className="bg-white border border-slate-200 p-2.5 rounded-lg text-[10px] space-y-1 font-medium text-slate-700">
                  {categoria === 'gabinetes' || categoria === 'totems' ? (
                    <>
                      <p><strong className="text-slate-900">• Dimensiones:</strong> {item.alto || 120} cm (alto) x {item.ancho || 60} cm (ancho) x {item.fondo || 60} cm (fondo).</p>
                      <p><strong className="text-slate-900">• Calibre y Material:</strong> Lámina {item.lamina || item.tipoLamina || 'CR'} Calibre {item.calibre || 22}.</p>
                    </>
                  ) : (
                    <>
                      {tramos.length > 0 ? (
                        <p>
                          <strong className="text-slate-900">• Estructura Principal:</strong> {obtenerDetalleTramo(tramos[0], item)} x {tramos[0].alto || 300} cm.
                        </p>
                      ) : (
                        <p>
                          <strong className="text-slate-900">• Estructura Principal:</strong> Tubo Calibre {item.calibre || 14} Ø {item.diametro || 4}".
                        </p>
                      )}

                      {baseObj && obtenerDetalleBase(baseObj) && (
                        <p><strong className="text-slate-900">• Base de Anclaje:</strong> {obtenerDetalleBase(baseObj)}.</p>
                      )}

                      {baseObj && obtenerDetalleCartelas(baseObj) && (
                        <p><strong className="text-slate-900">• Refuerzos (Cartelas):</strong> {obtenerDetalleCartelas(baseObj)}.</p>
                      )}
                    </>
                  )}

                  <p><strong className="text-slate-900">• Acabado:</strong> Pintura electrostática color {item.pintura || item.detalles?.pintura || item.acabado || 'Blanco Brillante'}.</p>
                </div>

                {/* DETALLE DE BRAZOS Y BUJES (MODELOS ESTRUCTURALES ADICIONALES) */}
                {(brazoObj || bujeInicialObj || bujeFinalObj) && (
                  <div className="bg-white border border-slate-200 p-2 rounded-lg text-[10px] space-y-1">
                    <span className="font-bold text-slate-800 block border-b border-slate-100 pb-0.5">Brazo / Bujes Incorporados:</span>
                    
                    {brazoObj && (
                      <p className="text-slate-600 pl-1 border-l-2 border-blue-500">
                        • Brazo: <span className="font-semibold text-slate-800">{brazoObj.nombre || 'Brazo Especial'}</span> ({formatoMoneda(brazoObj.precio || brazoObj.costo_total || item.brazoPrecio || 0)})
                      </p>
                    )}

                    {bujeInicialObj && (
                      <p className="text-slate-600 pl-1 border-l-2 border-indigo-500">
                        • Buje Base: <span className="font-semibold text-slate-800">{bujeInicialObj.nombre}</span> ({formatoMoneda(bujeInicialObj.precio || 0)})
                      </p>
                    )}

                    {bujeFinalObj && (
                      <p className="text-slate-600 pl-1 border-l-2 border-indigo-500">
                        • Buje Punta: <span className="font-semibold text-slate-800">{bujeFinalObj.nombre}</span> ({formatoMoneda(bujeFinalObj.precio || 0)})
                      </p>
                    )}
                  </div>
                )}

                {/* ACCESORIOS CONVENCIONALES */}
                {accesorios.length > 0 && (
                  <div className="bg-white border border-slate-200 p-2 rounded-lg text-[10px] space-y-0.5">
                    <span className="font-bold text-slate-700 block">Otros Accesorios:</span>
                    {accesorios.map((acc, aIdx) => (
                      <p key={aIdx} className="text-slate-600 pl-1 border-l-2 border-amber-400">
                        • {acc.nombre || acc.descripcion} (x{acc.cantidad || 1})
                      </p>
                    ))}
                  </div>
                )}

                {/* DESGLOSE ECONÓMICO */}
                <div className="pt-2 border-t border-slate-200 grid grid-cols-3 gap-1 text-[10px] text-slate-500">
                  <div>Est: <span className="font-bold text-slate-700">{formatoMoneda(estructuraVenta)}</span></div>
                  <div>Pint: <span className="font-bold text-slate-700">{formatoMoneda(pinturaVenta)}</span></div>
                  <div>Acc/Comp: <span className="font-bold text-slate-700">{formatoMoneda(accesoriosVenta)}</span></div>
                </div>

                <div className="flex justify-between items-center pt-1 text-xs">
                  <span className="font-bold text-slate-700">Subtotal Ítem (x{cantItem}):</span>
                  <span className="font-extrabold text-blue-600">{formatoMoneda(precioTotalItem)}</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* TOTALES DE LA COTIZACIÓN */}
      <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl space-y-1.5 pt-3">
        <div className="flex justify-between text-xs text-slate-600">
          <span>Subtotal Neto</span>
          <span className="font-bold text-slate-800">{formatoMoneda(totalCotizacion)}</span>
        </div>
        <div className="flex justify-between text-xs text-slate-600">
          <span>IVA (19%)</span>
          <span className="font-bold text-slate-800">{formatoMoneda(totalCotizacion * 0.19)}</span>
        </div>
        <div className="flex justify-between text-sm font-extrabold text-slate-900 border-t border-slate-200 pt-2 mt-1">
          <span>Total Oferta</span>
          <span className="text-emerald-600 text-base">{formatoMoneda(totalCotizacion * 1.19)}</span>
        </div>
      </div>

      {/* BOTONES DE ACCIÓN */}
      <div className="grid grid-cols-2 gap-2 pt-1">
        <button
          onClick={onGuardarCotizacion}
          disabled={items.length === 0}
          className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 text-white disabled:text-slate-400 font-bold py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm text-xs"
        >
          Guardar BD
        </button>

        <button
          onClick={handleExportarPDF}
          disabled={generandoPdf || items.length === 0}
          className="bg-slate-800 hover:bg-slate-900 disabled:bg-slate-200 text-white disabled:text-slate-400 font-bold py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm text-xs"
        >
          <Download size={14} />
          {generandoPdf ? 'Generando...' : 'Exportar PDF'}
        </button>
      </div>

      {/* MODAL SELECCIÓN / CREACIÓN CLIENTE */}
      {modalCliente && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 w-full max-w-md space-y-4 shadow-xl text-xs">
            <h3 className="text-sm font-bold text-slate-800 uppercase border-b border-slate-100 pb-2">
              Seleccionar / Crear Cliente
            </h3>

            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Buscar por NIT o Nombre..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 outline-none focus:border-blue-500"
              />
            </div>

            <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
              {clientesFiltrados.map((c, idx) => (
                <div 
                  key={c.id || idx} 
                  onClick={() => { setClienteSeleccionado(c); setModalCliente(false); }}
                  className="p-2.5 bg-slate-50 hover:bg-blue-50 rounded-lg border border-slate-200 cursor-pointer flex justify-between items-center text-xs text-slate-700 font-medium"
                >
                  <span>{c.nombre} ({obtenerNit(c)})</span>
                  <UserCheck size={14} className="text-blue-600" />
                </div>
              ))}
            </div>

            <div className="border-t border-slate-100 pt-3 space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Crear Nuevo Cliente</span>
              <input 
                type="text" 
                placeholder="NIT / Cédula" 
                value={nuevoCliente.nit_cedula} 
                onChange={(e) => setNuevoCliente(prev => ({...prev, nit_cedula: e.target.value}))}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-800 outline-none" 
              />
              <input 
                type="text" 
                placeholder="Nombre o Razón Social" 
                value={nuevoCliente.nombre} 
                onChange={(e) => setNuevoCliente(prev => ({...prev, nombre: e.target.value}))}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-800 outline-none" 
              />
              <button 
                onClick={handleGuardarCliente}
                disabled={guardandoCliente}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2 rounded-lg transition"
              >
                {guardandoCliente ? 'Guardando...' : 'Guardar y Seleccionar'}
              </button>
            </div>

            <button onClick={() => setModalCliente(false)} className="w-full text-slate-400 hover:text-slate-600 text-xs py-1">Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
}