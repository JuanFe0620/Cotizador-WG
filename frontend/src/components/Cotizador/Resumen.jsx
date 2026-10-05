import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Trash2, FileText, ShoppingBag, Download, UserPlus, Search, UserCheck, Edit3, Check, RotateCcw, Briefcase, Compass } from 'lucide-react';
import { exportarPdfTecnico } from '/src/utils/pdfService.js';

export const LISTA_VENDEDORES = [
  "ZAPATA CARRANZA PAOLA KATHERINE - 0012",
  "CORTES TORRES SANDRA PATRICIA - 0013",
  "DUARTE RODRIGUEZ GUILLERMO - 0011",
  "FARFAN CIFUENTES CRISTIAN FELIPE - 0008",
  "GARCIA RAYO JUAN FELIPE - 0006",
  "GARCIA CARRANZA WILFRED HERNANDO - 0002",
  "RAMIREZ CARRANZA NORA VIVIANA - 0016"
];

export const LISTA_DISENADORES = [
  "WILFRED GARCIA",
  "LINA PUELLO",
  "INGENIERÍA WG"
];

export default function Resumen({ 
  items = [], 
  setItems, 
  consecutivo = 'COT-2001', 
  setConsecutivo, 
  visorRef, 
  onGuardarCotizacion,
  clienteSeleccionado: clienteProp,
  setClienteSeleccionado: setClienteProp,
  notas: notasProp,
  setNotas: setNotasProp,
  vendedor: vendedorProp,
  disenador: disenadorProp,
  API_BASE_URL = 'http://127.0.0.1:8000'
}) {
  const [clienteInterno, setClienteInterno] = useState(null);
  const clienteSeleccionado = clienteProp !== undefined ? clienteProp : clienteInterno;
  const setClienteSeleccionado = setClienteProp || setClienteInterno;

  const [notasInterno, setNotasInterno] = useState('');
  const notas = notasProp !== undefined ? notasProp : notasInterno;
  const setNotas = setNotasProp || setNotasInterno;

  const [vendedorSeleccionado, setVendedorSeleccionado] = useState(vendedorProp || LISTA_VENDEDORES[0]);
  const [disenadorSeleccionado, setDisenadorSeleccionado] = useState(disenadorProp || LISTA_DISENADORES[0]);

  const [modalCliente, setModalCliente] = useState(false);
  const [clientes, setClientes] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [nuevoCliente, setNuevoCliente] = useState({ nit_cedula: '', nombre: '', telefono: '', direccion: '' });
  const [generandoPdf, setGenerandoPdf] = useState(false);
  const [guardandoCliente, setGuardandoCliente] = useState(false);
  const [guardandoBD, setGuardandoBD] = useState(false);
  const [mensajeGuardado, setMensajeGuardado] = useState(null);
  const [editandoIdx, setEditandoIdx] = useState(null);
  const [precioTemp, setPrecioTemp] = useState('');

  const baseUrl = API_BASE_URL || 'http://127.0.0.1:8000';

  useEffect(() => {
    let active = true;
    fetch(`${baseUrl}/api/clientes`)
      .then(res => res.json())
      .then(data => {
        if (active && Array.isArray(data)) setClientes(data);
      })
      .catch((err) => console.error("Error cargando clientes:", err));
    return () => { active = false; };
  }, [baseUrl]);

  const formatoMoneda = useCallback((valor) => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(valor || 0);
  }, []);

  const formatoMonedaSinSimbolo = useCallback((valor) => {
    return new Intl.NumberFormat('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(valor || 0);
  }, []);

  const obtenerNit = useCallback((c) => c?.nit || c?.nit_cedula || c?.NIT || '', []);
  const limpiarNit = useCallback((val) => String(val || '').replace(/[\s.,-]/g, ''), []);

  const obtenerValoresComerciales = useCallback((item) => {
    const cantItem = Math.max(1, parseInt(item.cantidad || item.detalles?.cantidad || 1, 10));

    const parseSeguro = (val) => {
      const num = parseFloat(val);
      return isNaN(num) ? 0 : num;
    };

    // 1. Obtener lista limpia enviada desde la API
    const rawAccs = item.accesoriosLista || item.accesorios_lista || item.detalles?.accesoriosLista || [];
    
    const accesorios = rawAccs.filter(a => {
      if (!a) return false;
      const nom = String(a.nombre || a.descripcion || '').toLowerCase();
      const idStr = String(a.id || '').toLowerCase();
      if (item.categoria === 'BRAZOS' || item.categoria === 'BRAZO') {
        if ((nom.includes('cubo') || idStr.includes('cubo') || nom.includes('perno') || idStr.includes('perno')) && !a.seleccionadoExplicitamente) {
          return false;
        }
      }
      return true;
    });

    // Suma exacta de lo que viene en la lista de accesorios (Bujes + Bases + Accesorios manuales)
    const sumaAccesoriosLista = accesorios.reduce((acc, a) => {
      const cant = Number(a.cantidad || 1);
      const precioUnitario = Number(a.precioUnitario ?? a.precio_calculado ?? a.costo ?? a.precio ?? a.total ?? 0);
      return acc + (precioUnitario * cant);
    }, 0);

    // 2. Precios Base Estructura / Pintura
    const baseEstructura = parseSeguro(
      item.costoEstructura ?? item.costo_lamina_venta ?? item.costo_tubos_venta ?? 
      item.costoLamina ?? item.costo_lamina ?? item.costoBase ?? item.subtotal_estructura ?? 0
    );
    
    const basePintura = parseSeguro(
      item.costoPintura ?? item.costo_pintura_venta ?? item.subtotal_pintura ?? 0
    );

    const precioBrazo = parseSeguro(
      item.brazoPrecio ?? item.brazo?.precio ?? item.brazo?.costo_total ?? item.detalles?.brazo?.precio ?? item.costoBrazo ?? 0
    );

    // Si la lista de la API trae elementos, usamos el total sumado directamente sin duplicar bujes
    const costoAccesoriosTotal = sumaAccesoriosLista > 0 
      ? sumaAccesoriosLista 
      : parseSeguro(item.costoAccesorios ?? item.costo_accesorios_venta ?? 0);

    const estructuraVenta = Math.round(baseEstructura * cantItem);
    const pinturaVenta = Math.round(basePintura * cantItem);
    const accesoriosVenta = Math.round((costoAccesoriosTotal + precioBrazo) * cantItem);

    const precioCalculado = estructuraVenta + pinturaVenta + accesoriosVenta;

    // Verificar si el usuario ha sobrescrito el precio manualmente
    const precioPers = item.precio_personalizado ?? item.precioPersonalizado;
    const esEditado = precioPers !== undefined && precioPers !== null && !isNaN(Number(precioPers));
    const precioTotalItem = esEditado ? Math.round(Number(precioPers)) : precioCalculado;

    return {
      cantItem,
      estructuraVenta,
      pinturaVenta,
      accesoriosVenta,
      precioCalculado,
      precioTotalItem,
      esEditado,
      accesoriosLimpios: accesorios
    };
  }, []);

  const cambiarCantidadItem = (index, nuevaCant) => {
    const val = Math.max(1, parseInt(nuevaCant) || 1);
    setItems(prev => {
      const copia = [...prev];
      const it = copia[index];
      const precioPers = it.precio_personalizado ?? it.precioPersonalizado;
      if (precioPers !== undefined && precioPers !== null && !isNaN(Number(precioPers))) {
        const cantAnt = Math.max(1, parseInt(it.cantidad || it.detalles?.cantidad || 1, 10));
        const unitario = it.precio_unitario || Math.round(Number(precioPers) / cantAnt);
        const nuevoTotal = Math.round(unitario * val);
        copia[index] = {
          ...it,
          cantidad: val,
          precio_personalizado: nuevoTotal,
          precioPersonalizado: nuevoTotal,
          total: nuevoTotal,
          subtotal: nuevoTotal,
          precio_unitario: unitario
        };
      } else {
        copia[index] = { ...it, cantidad: val };
      }
      return copia;
    });
  };

  const handleEditarPrecioItem = useCallback((index, nuevoValor) => {
    setItems(prev => {
      const copia = [...prev];
      const it = copia[index];
      if (!it) return prev;
      const cant = Math.max(1, parseInt(it.cantidad || it.detalles?.cantidad || 1, 10));

      if (nuevoValor === null || nuevoValor === '' || isNaN(Number(nuevoValor))) {
        // Restablecer al precio original calculado
        const { precioCalculado } = obtenerValoresComerciales({
          ...it,
          precio_personalizado: null,
          precioPersonalizado: null
        });
        copia[index] = {
          ...it,
          precio_personalizado: null,
          precioPersonalizado: null,
          total: precioCalculado,
          subtotal: precioCalculado,
          precio_unitario: Math.round(precioCalculado / cant)
        };
      } else {
        const numVal = Math.max(0, Math.round(Number(nuevoValor)));
        copia[index] = {
          ...it,
          precio_personalizado: numVal,
          precioPersonalizado: numVal,
          total: numVal,
          subtotal: numVal,
          precio_unitario: Math.round(numVal / cant)
        };
      }
      return copia;
    });
  }, [obtenerValoresComerciales]);

  const iniciarEdicionPrecio = (index, precioActual) => {
    setEditandoIdx(index);
    setPrecioTemp(String(precioActual));
  };

  const guardarEdicionPrecio = (index) => {
    handleEditarPrecioItem(index, precioTemp);
    setEditandoIdx(null);
  };

  const cancelarEdicionPrecio = () => {
    setEditandoIdx(null);
    setPrecioTemp('');
  };

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
      const res = await fetch(`${baseUrl}/api/clientes`, {
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

  const guardarCotizacionBD = async (silencioso = false) => {
    if (items.length === 0) {
      if (!silencioso) alert("No hay ítems para guardar en la cotización.");
      return null;
    }

    setGuardandoBD(true);
    try {
      const itemsPayload = items.map(item => {
        const { precioTotalItem } = obtenerValoresComerciales(item);
        const configItem = item.configuracion || item.params || item.detalles || item;

        const paramsCompletos = {
          ...configItem,
          categoria: item.categoria || configItem.categoria,
          alto: item.alto ?? configItem.alto,
          ancho: item.ancho ?? configItem.ancho,
          fondo: item.fondo ?? configItem.fondo,
          laminaId: item.laminaId ?? configItem.laminaId,
          lamina: item.lamina ?? configItem.lamina,
          pintura: item.pintura ?? configItem.pintura,
          colorPintura: item.colorPintura ?? configItem.colorPintura,
          nombrePintura: item.nombrePintura ?? configItem.nombrePintura,
          tramos: item.tramos || configItem.tramos || [],
          formaBase: item.formaBase || configItem.formaBase,
          ladoBase: item.ladoBase ?? configItem.ladoBase,
          incluirBase: item.incluirBase ?? configItem.incluirBase,
          incluirPlatina: item.incluirPlatina ?? configItem.incluirPlatina,
          incluirPiesAmigo: item.incluirPiesAmigo ?? configItem.incluirPiesAmigo,
          cantidadPies: item.cantidadPies ?? configItem.cantidadPies,
          altoCartela: item.altoCartela ?? configItem.altoCartela,
          bujesSeleccionados: item.bujesSeleccionados || configItem.bujesSeleccionados || [],
          bujeInicialId: item.bujeInicialId || configItem.bujeInicialId || '',
          bujeFinalId: item.bujeFinalId || configItem.bujeFinalId || '',
          accesoriosSeleccionados: item.accesoriosSeleccionados || configItem.accesoriosSeleccionados || [],
          detallesAccesorios: item.detallesAccesorios || configItem.detallesAccesorios || {},
          cantidadesAcc: item.cantidadesAcc || configItem.cantidadesAcc || {},
          incluirBioporter: item.incluirBioporter ?? configItem.incluirBioporter,
          precio_personalizado: item.precio_personalizado,
          cantidad: item.cantidad || 1
        };

        return {
          categoria: item.categoria || 'GABINETES',
          descripcion: item.descripcion || 'Estructura Metalmecánica',
          lamina: item.lamina || '',
          pintura: item.pintura || '',
          costoPintura: item.costoPintura || 0,
          costoTubos: item.costoTubos || 0,
          areaPintable: item.areaPintable || 0,
          alto: item.alto || 0,
          ancho: item.ancho || 0,
          fondo: item.fondo || 0,
          costoBase: item.costoBase || 0,
          total: precioTotalItem,
          accesoriosLista: item.accesoriosLista || item.accesorios_lista || item.detalles?.accesoriosLista || [],
          configuracion: paramsCompletos,
          params: paramsCompletos
        };
      });

      const url = `${baseUrl}/api/cotizaciones/guardar`;
      const payload = {
        consecutivo: consecutivo,
        cliente_id: clienteSeleccionado?.id || null,
        clienteId: clienteSeleccionado?.id || null,
        clienteNombre: clienteSeleccionado?.nombre || 'Consumidor Final / Mostrador',
        cliente_nombre: clienteSeleccionado?.nombre || 'Consumidor Final / Mostrador',
        clienteNit: obtenerNit(clienteSeleccionado) || null,
        cliente_nit: obtenerNit(clienteSeleccionado) || null,
        vendedor: vendedorSeleccionado,
        disenador: disenadorSeleccionado,
        observaciones: notas || '',
        notas: notas || '',
        nivelPrecio: 1,
        total: totalCotizacion,
        items: itemsPayload
      };

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Error ${res.status}: ${errorText}`);
      }

      const data = await res.json();

      if (data.consecutivo_guardado) {
        setConsecutivo(data.consecutivo_guardado);
      }

      if (!silencioso) {
        setMensajeGuardado(data.mensaje || `Cotización ${data.consecutivo_guardado || consecutivo} guardada con éxito`);
        setTimeout(() => setMensajeGuardado(null), 3500);
      }

      if (onGuardarCotizacion) {
        try {
          onGuardarCotizacion(data);
        } catch (e) {
          console.warn("Callback onGuardarCotizacion warning:", e);
        }
      }

      return data;
    } catch (e) {
      console.error("Error al guardar cotización:", e);
      if (!silencioso) {
        alert("Error al conectar con la base de datos para guardar la cotización: " + e.message);
      }
      return null;
    } finally {
      setGuardandoBD(false);
    }
  };

  const handleExportarPDF = async () => {
    if (items.length === 0) {
      alert("No hay ítems para exportar.");
      return;
    }

    setGenerandoPdf(true);
    let consecutivoFinal = consecutivo;

    try {
      // 1. Guardar primero automáticamente en base de datos
      const dataGuardado = await guardarCotizacionBD(true);
      if (dataGuardado && dataGuardado.consecutivo_guardado) {
        consecutivoFinal = dataGuardado.consecutivo_guardado;
        setConsecutivo(consecutivoFinal);
      }

      // 2. Exportar el PDF con el consecutivo confirmado, vendedor y diseñador
      exportarPdfTecnico({
        items,
        totalCotizacion,
        consecutivo: consecutivoFinal,
        clienteSeleccionado,
        vendedor: vendedorSeleccionado,
        vendedorSeleccionado: vendedorSeleccionado,
        disenador: disenadorSeleccionado,
        disenadorSeleccionado: disenadorSeleccionado,
        notas,
        observaciones: notas,
        notasObservaciones: notas,
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
    } catch (err) {
      console.error("Error al exportar PDF:", err);
      setGenerandoPdf(false);
      alert("Error al generar PDF: " + err.message);
    }
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

      {/* SECCIÓN RESPONSABLES: ASESOR COMERCIAL Y DISEÑADOR */}
      <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl space-y-2.5">
        <div>
          <label className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1 mb-1 tracking-wider">
            <Briefcase size={12} className="text-blue-600" />
            Asesor / Vendedor
          </label>
          <select
            value={vendedorSeleccionado}
            onChange={(e) => setVendedorSeleccionado(e.target.value)}
            className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs text-slate-800 font-semibold outline-none focus:border-blue-500 shadow-sm cursor-pointer"
          >
            {LISTA_VENDEDORES.map((v, idx) => (
              <option key={idx} value={v}>{v}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1 mb-1 tracking-wider">
            <Compass size={12} className="text-blue-600" />
            Diseñador / Dibujante
          </label>
          <select
            value={disenadorSeleccionado}
            onChange={(e) => setDisenadorSeleccionado(e.target.value)}
            className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs text-slate-800 font-semibold outline-none focus:border-blue-500 shadow-sm cursor-pointer"
          >
            {LISTA_DISENADORES.map((d, idx) => (
              <option key={idx} value={d}>{d}</option>
            ))}
          </select>
        </div>
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
            const { cantItem, estructuraVenta, pinturaVenta, accesoriosVenta, precioCalculado, precioTotalItem, esEditado, accesoriosLimpios } = obtenerValoresComerciales(item);
            const tramos = item.tramos || item.detalles?.tramos || [];
            const baseObj = obtenerObjetoBase(item);
            const categoria = (item.categoria || '').toLowerCase();

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

                {/* TARJETA DINÁMICA SEGÚN CATEGORÍA */}
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

                {/* ACCESORIOS SELECCIONADOS (MOSTRAR ÚNICA Y EXCLUSIVAMENTE LO DEVUELTO POR LA API) */}
                {accesoriosLimpios.length > 0 && (
                  <div className="bg-white border border-slate-200 p-2 rounded-lg text-[10px] space-y-0.5">
                    <span className="font-bold text-slate-700 block">Otros Accesorios:</span>
                    {accesoriosLimpios.map((acc, aIdx) => (
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

                <div className="flex justify-between items-center pt-2 text-xs border-t border-slate-100">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-slate-700">Subtotal Ítem (x{cantItem}):</span>
                    {esEditado && (
                      <span className="bg-amber-100 text-amber-800 text-[9px] font-bold px-1.5 py-0.5 rounded border border-amber-300">
                        Manual
                      </span>
                    )}
                  </div>

                  {editandoIdx === index ? (
                    <div className="flex items-center gap-1">
                      <div className="relative flex items-center">
                        <span className="absolute left-2 text-[11px] text-slate-400 font-bold">$</span>
                        <input
                          type="number"
                          autoFocus
                          value={precioTemp}
                          onChange={(e) => setPrecioTemp(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') guardarEdicionPrecio(index);
                            if (e.key === 'Escape') cancelarEdicionPrecio();
                          }}
                          className="w-28 pl-5 pr-1 py-1 text-xs font-bold text-blue-700 bg-white border border-blue-500 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-sm"
                          placeholder="Valor total"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => guardarEdicionPrecio(index)}
                        title="Guardar precio personalizado"
                        className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm transition"
                      >
                        <Check size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={cancelarEdicionPrecio}
                        title="Cancelar edición"
                        className="p-1.5 bg-slate-200 hover:bg-slate-300 text-slate-600 rounded-lg transition"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      {esEditado && precioCalculado !== precioTotalItem && (
                        <span className="line-through text-slate-400 text-[10px]" title="Precio calculado sugerido">
                          {formatoMoneda(precioCalculado)}
                        </span>
                      )}
                      <span className={`font-extrabold ${esEditado ? 'text-amber-600' : 'text-blue-600'}`}>
                        {formatoMoneda(precioTotalItem)}
                      </span>
                      <button
                        type="button"
                        onClick={() => iniciarEdicionPrecio(index, precioTotalItem)}
                        title="Sobrescribir precio manualmente"
                        className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                      >
                        <Edit3 size={13} />
                      </button>
                      {esEditado && (
                        <button
                          type="button"
                          onClick={() => handleEditarPrecioItem(index, null)}
                          title="Restablecer precio al valor sugerido"
                          className="p-1 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
                        >
                          <RotateCcw size={12} />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* NOTAS / OBSERVACIONES */}
      <div className="space-y-1">
        <label className="text-[10px] uppercase font-bold text-slate-500 block tracking-wider">
          Notas / Observaciones
        </label>
        <textarea
          rows={2}
          placeholder="Escribe aquí notas adicionales o condiciones especiales para el PDF..."
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs text-slate-800 outline-none focus:border-blue-500 resize-none"
        />
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
      <div className="flex flex-col gap-1.5 pt-1">
        {mensajeGuardado && (
          <div className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-1.5 text-center transition">
            {mensajeGuardado}
          </div>
        )}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => guardarCotizacionBD(false)}
            disabled={guardandoBD || items.length === 0}
            className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 text-white disabled:text-slate-400 font-bold py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm text-xs"
          >
            {guardandoBD ? 'Guardando...' : 'Guardar BD'}
          </button>

          <button
            onClick={handleExportarPDF}
            disabled={generandoPdf || guardandoBD || items.length === 0}
            className="bg-slate-800 hover:bg-slate-900 disabled:bg-slate-200 text-white disabled:text-slate-400 font-bold py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm text-xs"
          >
            <Download size={14} />
            {generandoPdf ? 'Generando...' : 'Exportar PDF'}
          </button>
        </div>
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