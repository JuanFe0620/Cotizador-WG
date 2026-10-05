import React, { useState, useEffect, useRef } from 'react';
import { 
  Calculator, Settings, Eye, AlertCircle, History, 
  CheckCircle2, Plus, ChevronLeft, ChevronRight 
} from 'lucide-react';

import Configurador from './components/Cotizador/Configurador';
import Resumen from './components/Cotizador/Resumen';
import VisorM3 from './components/Visor3D/VisorM3';
import Galeria from './components/Galeria/Galeria';
import PanelAdmin from './components/Admin/PanelAdmin';
import HistorialCotizaciones from './components/Historial/HistorialCotizaciones';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

export default function App() {
  const [tabActual, setTabActual] = useState('cotizador');
  const visorRef = useRef(null);
  
  const [laminas, setLaminas] = useState(() => {
    const local = localStorage.getItem('m3_laminas');
    return local ? JSON.parse(local) : [];
  });
  
  const [tubos, setTubos] = useState(() => {
    const local = localStorage.getItem('m3_tubos');
    return local ? JSON.parse(local) : [];
  });
  
  const [accesorios, setAccesorios] = useState(() => {
    const local = localStorage.getItem('m3_accesorios');
    return local ? JSON.parse(local) : [];
  });

  const [pinturas, setPinturas] = useState(() => {
    const local = localStorage.getItem('m3_pinturas');
    return local ? JSON.parse(local) : [];
  });

  useEffect(() => {
    localStorage.setItem('m3_laminas', JSON.stringify(laminas));
  }, [laminas]);

  useEffect(() => {
    localStorage.setItem('m3_tubos', JSON.stringify(tubos));
  }, [tubos]);

  useEffect(() => {
    localStorage.setItem('m3_accesorios', JSON.stringify(accesorios));
  }, [accesorios]);

  useEffect(() => {
    localStorage.setItem('m3_pinturas', JSON.stringify(pinturas));
  }, [pinturas]);

  const [itemsCotizacion, setItemsCotizacion] = useState([]);
  const [consecutivo, setConsecutivo] = useState('COT-2001');
  const [categoriaSel, setCategoriaSel] = useState('gabinetes');
  const [nivelPrecio, setNivelPrecio] = useState(1);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [notas, setNotas] = useState('');
  const [cargandoCotizacion, setCargandoCotizacion] = useState(false);
  const [errorBackend, setErrorBackend] = useState(null);
  const [mensajeExito, setMensajeExito] = useState(null);

  const [historialCotizaciones, setHistorialCotizaciones] = useState([]);
  const [editandoFormulario, setEditandoFormulario] = useState(true);

  // Estado inicial limpio sin selecciones por defecto de bujes ni accesorios
  const [params, setParams] = useState({
    laminaId: '',
    alto: 120,
    ancho: 60,
    fondo: 60,
    tramos: [],
    accesoriosSeleccionados: [],
    bujesSeleccionados: [],
    bujeInicialId: '',
    bujeFinalId: '',
    detallesAccesorios: {},
    cantidadesAcc: {},
    incluirBioporter: false,
    incluirBase: true,
    incluirPlatina: true,
    formaBase: 'Base Redonda',
    ladoBase: 25,
    laminaAnclajeId: '',
    incluirPiesAmigo: true,
    cantidadPies: 4,
    altoCartela: 10,
    colorPintura: '#2563eb',
    nombrePintura: 'Azul Poliéster Electrostática',
    precioPinturaKg: 24000,
    rendimientoPinturaKgM2: 8.0
  });

  const actualizarParams = (action) => {
    setEditandoFormulario(true);
    setParams(action);
  };

  const obtenerSiguienteConsecutivo = async () => {
    try {
      const r = await fetch(`${API_BASE_URL}/api/cotizaciones/siguiente-consecutivo`);
      if (r.ok) {
        const data = await r.json();
        if (data.consecutivo) setConsecutivo(data.consecutivo);
      }
    } catch (e) {
      console.warn("No se pudo obtener el consecutivo dinámico:", e);
    }
  };

  const [brazos, setBrazos] = useState(() => {
    const local = localStorage.getItem('m3_brazos');
    return local ? JSON.parse(local) : [];
  });

  const [bujes, setBujes] = useState(() => {
    const local = localStorage.getItem('m3_bujes');
    return local ? JSON.parse(local) : [];
  });

  const [mecanizadosTotem, setMecanizadosTotem] = useState(() => {
    const local = localStorage.getItem('m3_mecanizados_totem');
    return local ? JSON.parse(local) : [];
  });

  useEffect(() => {
    localStorage.setItem('m3_brazos', JSON.stringify(brazos));
  }, [brazos]);

  useEffect(() => {
    localStorage.setItem('m3_bujes', JSON.stringify(bujes));
  }, [bujes]);

  useEffect(() => {
    localStorage.setItem('m3_mecanizados_totem', JSON.stringify(mecanizadosTotem));
  }, [mecanizadosTotem]);

  const cargarDatosServidor = async () => {
    try {
      const [resLaminas, resTubos, resAcc, resPin, resBrazos, resBujes, resMecanizados] = await Promise.all([
        fetch(`${API_BASE_URL}/api/laminas`).then(r => r.ok ? r.json() : null),
        fetch(`${API_BASE_URL}/api/tubos`).then(r => r.ok ? r.json() : null),
        fetch(`${API_BASE_URL}/api/accesorios`).then(r => r.ok ? r.json() : null),
        fetch(`${API_BASE_URL}/api/pinturas`).then(r => r.ok ? r.json() : null),
        fetch(`${API_BASE_URL}/api/brazos`).then(r => r.ok ? r.json() : null),
        fetch(`${API_BASE_URL}/api/bujes`).then(r => r.ok ? r.json() : null),
        fetch(`${API_BASE_URL}/api/mecanizados-totem`).then(r => r.ok ? r.json() : null)
      ]);

      if (resLaminas && resLaminas.length > 0) setLaminas(resLaminas);
      if (resTubos && resTubos.length > 0) setTubos(resTubos);
      if (resAcc && resAcc.length > 0) setAccesorios(resAcc);
      if (resPin && resPin.length > 0) setPinturas(resPin);
      if (resBrazos && resBrazos.length > 0) setBrazos(resBrazos);
      if (resBujes && resBujes.length > 0) setBujes(resBujes);
      if (resMecanizados && resMecanizados.length > 0) setMecanizadosTotem(resMecanizados);
    } catch (err) {
      console.warn("Utilizando registros locales sincronizados por ausencia de backend:", err);
    }
  };

  const cargarHistorial = async (filtro = '') => {
    try {
      const url = filtro 
        ? `${API_BASE_URL}/api/cotizaciones?q=${encodeURIComponent(filtro)}`
        : `${API_BASE_URL}/api/cotizaciones`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setHistorialCotizaciones(data);
        return data;
      }
    } catch (e) {
      console.error("Error al cargar historial:", e);
    }
    return [];
  };

  useEffect(() => {
    cargarDatosServidor();
    obtenerSiguienteConsecutivo();
    cargarHistorial();
  }, []);

  // LIMPIEZA RIGUROSA AL CAMBIAR CATEGORÍA
  useEffect(() => {
    const esPosteOBrazo = categoriaSel === 'postes' || categoriaSel === 'brazos';
    
    setEditandoFormulario(true);
    setParams(prev => {
      if (prev.categoria === categoriaSel) return prev;

      const nuevoState = {
        ...prev,
        categoria: categoriaSel,
        // Limpiar de forma explícita selecciones de accesorios y bujes antiguos
        accesoriosSeleccionados: [],
        bujesSeleccionados: [],
        bujeInicialId: '',
        bujeFinalId: '',
        bujeBaseId: '',
        bujePuntaId: '',
        bujeInicial: null,
        bujeFinal: null,
        detallesAccesorios: {},
        cantidadesAcc: {},
        tramos: esPosteOBrazo 
          ? (prev.tramos?.length > 0 ? prev.tramos : [{ id: Date.now(), alto: 150, tuboId: '', forma: 'redondo' }])
          : []
      };

      if (!esPosteOBrazo) {
        delete nuevoState.brazo;
        delete nuevoState.brazosMontados;
        delete nuevoState.brazos;
        delete nuevoState.brazoPTZ;
        delete nuevoState.brazo_id;
      }

      return nuevoState;
    });
  }, [categoriaSel]);

  const handleNuevaCotizacion = async () => {
    setItemsCotizacion([]);
    setClienteSeleccionado(null);
    setNotas('');
    await obtenerSiguienteConsecutivo();
    setEditandoFormulario(true);
    setMensajeExito("Nueva cotización iniciada.");
    setTimeout(() => setMensajeExito(null), 3000);
  };

  const handleNavegarCotizacion = async (direccion) => {
    let lista = historialCotizaciones;
    if (lista.length === 0) {
      lista = await cargarHistorial();
    }

    const numActual = parseInt(consecutivo.replace(/\D/g, ''), 10);
    if (isNaN(numActual)) return;

    if (direccion === 'anterior') {
      const objetivo = `COT-${numActual - 1}`;
      const encontrada = lista.find(c => c.consecutivo === objetivo);
      if (encontrada) {
        await handleCargarCotizacionExistente(encontrada.id);
      } else {
        setConsecutivo(objetivo);
        setItemsCotizacion([]);
      }
    } else if (direccion === 'siguiente') {
      const objetivo = `COT-${numActual + 1}`;
      const encontrada = lista.find(c => c.consecutivo === objetivo);
      if (encontrada) {
        await handleCargarCotizacionExistente(encontrada.id);
      } else {
        await obtenerSiguienteConsecutivo();
        setItemsCotizacion([]);
      }
    }
  };

  const handleCambioCategoria = (nuevaCat) => {
    setCategoriaSel(nuevaCat);
    setErrorBackend(null);
  };

const handleAgregarACotizacion = async (payload = {}) => {
    setCargandoCotizacion(true);
    setErrorBackend(null);

    const esGabinete = categoriaSel === 'gabinetes' || categoriaSel === 'totems';
    const paramsUnificados = { ...params, ...payload };
    
    if (esGabinete) {
      delete paramsUnificados.brazo;
      delete paramsUnificados.brazosMontados;
      delete paramsUnificados.brazos;
      delete paramsUnificados.brazoPTZ;
      delete paramsUnificados.brazo_id;
    }

    // Normalización de tramos
    const tramosFiltrados = esGabinete ? [] : (paramsUnificados.tramos || []).map(t => ({
      ...t,
      tuboId: t.tuboId || t.tubo_id || '',
      alto: Number(t.alto || t.longitud || 0)
    }));
    
    // Filtrado de accesorios
    const rawAccs = paramsUnificados.accesoriosSeleccionados || [];
    const accsValidos = rawAccs.filter(id => {
      if (id === null || id === undefined || id === '') return false;
      const idStr = String(typeof id === 'object' ? id.id : id).toLowerCase();
      return idStr !== 'platina_base' && idStr !== 'platina_anclaje';
    });

    const paramsParaBackend = {
      ...paramsUnificados,
      tramos: tramosFiltrados,
      accesoriosSeleccionados: accsValidos,
      bujesSeleccionados: paramsUnificados.bujesSeleccionados || [],
      bujeInicialId: paramsUnificados.bujeInicialId || paramsUnificados.bujeBaseId || '',
      bujeFinalId: paramsUnificados.bujeFinalId || paramsUnificados.bujePuntaId || '',
      cantidadesAcc: paramsUnificados.cantidadesAcc || {},
      detallesAccesorios: paramsUnificados.detallesAccesorios || {},
      incluirBase: esGabinete ? false : (paramsUnificados.incluirBase ?? true),
      incluirPlatina: esGabinete ? false : (paramsUnificados.incluirPlatina ?? true),
      formaBase: paramsUnificados.formaBase || 'Base Redonda',
      ladoBase: esGabinete ? 0 : Number(paramsUnificados.ladoBase || paramsUnificados.dimensionBase || 25),
      laminaAnclajeId: paramsUnificados.laminaAnclajeId || paramsUnificados.laminaId || '',
      incluirPiesAmigo: esGabinete ? false : (paramsUnificados.incluirPiesAmigo ?? true),
      cantidadPies: Number(paramsUnificados.cantidadPies || 4),
      altoCartela: Number(paramsUnificados.altoCartela || 10)
    };

    let dataServidor = null;

    try {
      const respuesta = await fetch(`${API_BASE_URL}/api/cotizar/item`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoria: categoriaSel,
          nivelPrecio: nivelPrecio,
          params: paramsParaBackend
        })
      });

      if (respuesta.ok) {
        dataServidor = await respuesta.json();
      } else {
        console.warn("Servidor respondió con error 500, ejecutando cálculo de contingencia local.");
      }
    } catch (error) {
      console.warn("Servidor inalcanzable, calculando contingencia local:", error);
    }

    // --- CÁLCULO DE RESPALDO (Por si el servidor falla o responde 500) ---
    let costoEstructuraLocal = 0;
    if (tramosFiltrados.length > 0) {
      tramosFiltrados.forEach(tramo => {
        const tuboObj = tubos.find(t => String(t.id) === String(tramo.tuboId));
        const precioMetro = tuboObj ? Number(tuboObj.precio_metro || tuboObj.precio || 0) : 15000;
        const metros = (Number(tramo.alto) || 0) / 100;
        costoEstructuraLocal += precioMetro * metros;
      });
    }

    let costoAccesoriosLocal = 0;
    accsValidos.forEach(accId => {
      const accObj = accesorios.find(a => String(a.id) === String(accId));
      const cant = paramsUnificados.cantidadesAcc?.[accId] || 1;
      const precioAcc = accObj ? Number(accObj.precio || accObj.precio_venta || 0) : 15000;
      costoAccesoriosLocal += precioAcc * cant;
    });

    const costoPinturaLocal = 12000; // Valor base estimado de pintura

    // Extraer valores finales (Servidor primero, si no existe usa el Respaldo Local)
    const costoBaseReal = Number(dataServidor?.costo_base || dataServidor?.costo_tubos_venta || (costoEstructuraLocal > 0 ? costoEstructuraLocal : 25000));
    const costoPinturaReal = Number(dataServidor?.costo_pintura_venta || dataServidor?.costo_pintura || costoPinturaLocal);
    const costoAccReal = Number(dataServidor?.costo_accesorios_venta || dataServidor?.costo_accesorios || costoAccesoriosLocal);
    const totalReal = Number(dataServidor?.precio_venta || dataServidor?.total || (costoBaseReal + costoPinturaReal + costoAccReal));

    let materialNombre = 'Estructura Estándar';
    if (categoriaSel === 'postes' || categoriaSel === 'brazos') {
      materialNombre = 'Estructura Postes Multi-Tramo';
    } else {
      const laminaObj = laminas.find(l => String(l.id) === String(paramsParaBackend.laminaId));
      if (laminaObj) {
        materialNombre = `${laminaObj.material || 'Lámina'} (${laminaObj.calibre || 'Estándar'})`;
      }
    }

    const nuevoItem = {
      id: Date.now(),
      categoria: (categoriaSel || '').toUpperCase(),
      descripcion: `${materialNombre} - Pintura: ${paramsParaBackend.nombrePintura || 'Estándar'} (${dataServidor?.area_m2 || 1.5} m²)`,
      lamina: materialNombre,
      laminaId: paramsParaBackend.laminaId,
      pintura: paramsParaBackend.nombrePintura || 'Estándar',
      colorPintura: paramsParaBackend.colorPintura || '#2563eb',
      
      costoBase: costoBaseReal,
      costoPintura: costoPinturaReal,
      costoTubos: costoBaseReal,
      costoAccesorios: costoAccReal,
      total: totalReal,
      
      areaPintable: dataServidor?.area_m2 || 1.5,
      alto: paramsParaBackend.alto || 150,
      ancho: paramsParaBackend.ancho || 50,
      fondo: paramsParaBackend.fondo || 30,

      tramos: tramosFiltrados,
      accesoriosSeleccionados: paramsParaBackend.accesoriosSeleccionados,
      bujesSeleccionados: paramsParaBackend.bujesSeleccionados,
      detallesAccesorios: paramsParaBackend.detallesAccesorios,
      cantidadesAcc: paramsUnificados.cantidadesAcc,
      accesoriosLista: dataServidor?.accesorios_lista || [],
      params: { ...paramsParaBackend, categoria: (categoriaSel || '').toUpperCase() },
      configuracion: { ...paramsParaBackend, categoria: (categoriaSel || '').toUpperCase() }
    };

    setItemsCotizacion(prev => [...prev, nuevoItem]);

    setEditandoFormulario(true);
    setCargandoCotizacion(false);
    setMensajeExito("Ítem agregado a la cotización.");
    setTimeout(() => setMensajeExito(null), 2500);
  };

  const handleGuardarCotizacionBD = async (datosGuardados = null) => {
    if (datosGuardados && datosGuardados.consecutivo_guardado) {
      setConsecutivo(datosGuardados.consecutivo_guardado);
      cargarHistorial();
      return;
    }

    if (itemsCotizacion.length === 0) {
      alert("No hay ítems para guardar en la cotización.");
      return;
    }

    const totalCotizacion = itemsCotizacion.reduce((acc, curr) => acc + (curr.total || 0), 0);

    const itemsPayload = itemsCotizacion.map(item => ({
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
      total: item.total || 0,
      accesoriosLista: item.accesoriosLista || [],
      configuracion: item.configuracion || item.params || item.detalles || item,
      params: item.params || item.configuracion || item.detalles || item
    }));

    try {
      const res = await fetch(`${API_BASE_URL}/api/cotizaciones/guardar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consecutivo: consecutivo,
          cliente_id: clienteSeleccionado?.id || null,
          clienteId: clienteSeleccionado?.id || null,
          clienteNombre: clienteSeleccionado?.nombre || 'Consumidor Final / Mostrador',
          clienteNit: clienteSeleccionado?.nit || null,
          observaciones: notas || '',
          notas: notas || '',
          nivelPrecio: nivelPrecio,
          total: totalCotizacion,
          items: itemsPayload
        })
      });

      if (!res.ok) throw new Error("Error en la petición de guardado");

      const data = await res.json();
      setMensajeExito(`Cotización ${data.consecutivo_guardado} guardada correctamente.`);
      
      if (data.consecutivo_guardado) {
        setConsecutivo(data.consecutivo_guardado);
      }
      cargarHistorial();

      setTimeout(() => setMensajeExito(null), 4000);

    } catch (e) {
      console.error("Error al guardar cotización:", e);
      setErrorBackend("No se pudo conectar con la base de datos para registrar la cotización.");
    }
  };

  const handleCargarCotizacionExistente = async (id) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/cotizaciones/${id}`);
      if (!res.ok) throw new Error("No se pudo obtener el detalle");
      const data = await res.json();
      
      setConsecutivo(data.consecutivo);
      setNivelPrecio(data.nivel_precio || 1);
      
      const itemsCargados = data.items || [];
      setItemsCotizacion(itemsCargados);

      // Cargar observaciones
      setNotas(data.observaciones || '');

      // Cargar cliente asignado
      if (data.cliente_id || data.cliente_nombre) {
        setClienteSeleccionado({
          id: data.cliente_id || null,
          nombre: data.cliente_nombre || 'Consumidor Final / Mostrador',
          nit: data.cliente_nit || '',
          nit_cedula: data.cliente_nit || ''
        });
      } else {
        setClienteSeleccionado(null);
      }

      if (itemsCargados.length > 0) {
        const primerItem = itemsCargados[0];
        const configRestaurada = primerItem.configuracion || primerItem.params || primerItem.detalles || {};
        
        const catRecuperada = (primerItem.categoria || configRestaurada.categoria || 'gabinetes').toLowerCase();
        setCategoriaSel(catRecuperada);

        const altoReal = parseFloat(configRestaurada.alto ?? primerItem.alto ?? 150);
        const anchoReal = parseFloat(configRestaurada.ancho ?? primerItem.ancho ?? 50);
        const fondoReal = parseFloat(configRestaurada.fondo ?? primerItem.fondo ?? 30);
        const laminaReal = configRestaurada.laminaId || configRestaurada.lamina || primerItem.laminaId || primerItem.lamina || '';

        const paramsRestaurados = {
          ...configRestaurada,
          categoria: catRecuperada,
          alto: altoReal,
          ancho: anchoReal,
          fondo: fondoReal,
          laminaId: laminaReal,
          incluirBase: configRestaurada.incluirBase ?? primerItem.incluirBase ?? true,
          incluirPlatina: configRestaurada.incluirPlatina ?? primerItem.incluirPlatina ?? true,
          formaBase: configRestaurada.formaBase || primerItem.formaBase || 'Base Redonda',
          ladoBase: configRestaurada.ladoBase || primerItem.ladoBase || 25,
          colorPintura: configRestaurada.colorPintura || primerItem.colorPintura || primerItem.pintura || '#2563eb',
          nombrePintura: configRestaurada.nombrePintura || primerItem.nombrePintura || primerItem.pintura || 'Estándar',
          tramos: configRestaurada.tramos || primerItem.tramos || [],
          accesoriosSeleccionados: configRestaurada.accesoriosSeleccionados || primerItem.accesoriosSeleccionados || [],
          bujesSeleccionados: configRestaurada.bujesSeleccionados || primerItem.bujesSeleccionados || [],
          bujeInicialId: configRestaurada.bujeInicialId || primerItem.bujeInicialId || '',
          bujeFinalId: configRestaurada.bujeFinalId || primerItem.bujeFinalId || '',
          detallesAccesorios: configRestaurada.detallesAccesorios || primerItem.detallesAccesorios || {},
          cantidadesAcc: configRestaurada.cantidadesAcc || primerItem.cantidadesAcc || {},
          incluirBioporter: configRestaurada.incluirBioporter ?? primerItem.incluirBioporter ?? false,
          incluirPiesAmigo: configRestaurada.incluirPiesAmigo ?? primerItem.incluirPiesAmigo ?? true,
          cantidadPies: configRestaurada.cantidadPies ?? primerItem.cantidadPies ?? 4,
          altoCartela: configRestaurada.altoCartela ?? primerItem.altoCartela ?? 10
        };

        setParams(paramsRestaurados);
      }

      setEditandoFormulario(true);
      setTabActual('cotizador');
      setMensajeExito(`Cotización ${data.consecutivo} cargada en el cotizador.`);
      setTimeout(() => setMensajeExito(null), 3000);
    } catch (e) {
      console.error("Error al cargar cotización:", e);
      alert("Error al intentar recuperar la cotización.");
    }
  };

  const ultimoItem = itemsCotizacion[itemsCotizacion.length - 1];
  const datosParaVisor = (!editandoFormulario && ultimoItem) ? ultimoItem : params;

  return (
    <div className="w-screen h-screen bg-slate-100 text-slate-800 flex flex-col overflow-hidden m-0 p-0 font-sans">
      <header className="bg-white border-b border-slate-300 px-4 py-2 flex justify-between items-center w-full shrink-0 h-14 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 font-black text-white px-3 py-1 rounded-lg shadow-sm">M3</div>
          <h1 className="text-base font-bold text-slate-900 hidden md:block">Plataforma Integrada M3</h1>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={handleNuevaCotizacion}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition flex items-center gap-1 shadow-sm"
            title="Crear Nueva Cotización Limpia"
          >
            <Plus size={15} /> <span className="hidden sm:inline">Nueva Cotización</span>
          </button>

          <div className="flex items-center bg-slate-100 rounded-lg border border-slate-300 p-0.5 text-xs">
            <button 
              onClick={() => handleNavegarCotizacion('anterior')}
              className="p-1.5 hover:bg-slate-200 text-slate-700 rounded transition"
              title="Cotización Anterior"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="px-2 font-mono font-bold text-blue-600 text-xs">{consecutivo}</span>
            <button 
              onClick={() => handleNavegarCotizacion('siguiente')}
              className="p-1.5 hover:bg-slate-200 text-slate-700 rounded transition"
              title="Cotización Siguiente"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-slate-100 px-3 py-1 rounded-xl border border-slate-300 text-xs">
          <span className="text-slate-600 font-medium hidden sm:inline">Margen:</span>
          <select 
            value={nivelPrecio} 
            onChange={(e) => setNivelPrecio(Number(e.target.value))}
            className="bg-white text-blue-700 font-bold outline-none cursor-pointer rounded px-2 py-0.5 border border-slate-300"
          >
            <option value={1}>Precio 1 </option>
            <option value={2}>Precio 2 </option>
          </select>
        </div>

        <nav className="flex bg-slate-100 p-1 rounded-xl border border-slate-300 gap-1 text-xs">
          <button onClick={() => setTabActual('cotizador')} className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-semibold transition ${tabActual === 'cotizador' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'}`}><Calculator size={14}/> Cotizador</button>
          <button onClick={() => setTabActual('historial')} className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-semibold transition ${tabActual === 'historial' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'}`}><History size={14}/> Historial</button>
          <button onClick={() => setTabActual('galeria')} className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-semibold transition ${tabActual === 'galeria' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'}`}><Eye size={14}/> 3D</button>
          <button onClick={() => setTabActual('admin')} className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-semibold transition ${tabActual === 'admin' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'}`}><Settings size={14}/> Admin</button>
        </nav>
      </header>

      {errorBackend && (
        <div className="bg-red-100 border-b border-red-300 px-6 py-2 flex items-center justify-between text-red-800 text-xs font-medium">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} />
            <span>{errorBackend}</span>
          </div>
          <button onClick={() => setErrorBackend(null)} className="font-bold hover:underline">✕</button>
        </div>
      )}

      {mensajeExito && (
        <div className="bg-emerald-100 border-b border-emerald-300 px-6 py-2 flex items-center gap-2 text-emerald-800 text-xs font-medium">
          <CheckCircle2 size={16} />
          <span>{mensajeExito}</span>
        </div>
      )}

      <main className="flex-1 w-full p-4 overflow-hidden bg-slate-100">
        {tabActual === 'cotizador' && (
          <div className="grid grid-cols-12 gap-4 h-full w-full">
            <div className="col-span-12 lg:col-span-3 h-full overflow-y-auto pr-1">
              <Configurador 
                categoriaSel={categoriaSel} 
                setCategoriaSel={handleCambioCategoria} 
                params={params} 
                setParams={actualizarParams} 
                laminas={laminas}
                tubos={tubos}
                accesorios={accesorios} 
                pinturas={pinturas}
                bujes={bujes}
                handleAgregar={handleAgregarACotizacion} 
                cargando={cargandoCotizacion}
              />
            </div>

            <div className="col-span-12 lg:col-span-3 h-full overflow-y-auto pr-1 flex flex-col gap-4">
              <div className="flex-1">
                <Resumen 
                  items={itemsCotizacion} 
                  setItems={setItemsCotizacion} 
                  consecutivo={consecutivo}
                  setConsecutivo={setConsecutivo}
                  visorRef={visorRef}
                  clienteSeleccionado={clienteSeleccionado}
                  setClienteSeleccionado={setClienteSeleccionado}
                  notas={notas}
                  setNotas={setNotas}
                  API_BASE_URL={API_BASE_URL}
                  onGuardarCotizacion={handleGuardarCotizacionBD}
                />
              </div>
            </div>

            <div className="col-span-12 lg:col-span-6 h-full">
              <VisorM3 
                ref={visorRef}
                categoriaSel={datosParaVisor.categoria?.toLowerCase() || categoriaSel}
                ancho={datosParaVisor.ancho}
                alto={datosParaVisor.alto}
                fondo={datosParaVisor.fondo}
                incluirBioporter={params.incluirBioporter}
                setParams={actualizarParams}
                params={datosParaVisor}
                tubos={tubos}
                laminas={laminas}
                accesorios={accesorios}
                colorPintura={datosParaVisor.colorPintura || params.colorPintura}
              />
            </div>
          </div>
        )}

        {tabActual === 'historial' && (
          <HistorialCotizaciones 
            API_BASE_URL={API_BASE_URL}
            onCargarCotizacionExistente={handleCargarCotizacionExistente}
            historialExterno={historialCotizaciones}
            alCargarHistorial={setHistorialCotizaciones}
          />
        )}

        {tabActual === 'galeria' && <Galeria />}
        {tabActual === 'admin' && (
          <PanelAdmin 
            API_BASE_URL={API_BASE_URL}
            recargarDatos={cargarDatosServidor}
            laminas={laminas} setLaminas={setLaminas}
            tubos={tubos} setTubos={setTubos}
            accesorios={accesorios} setAccesorios={setAccesorios}
            pinturas={pinturas} setPinturas={setPinturas}
            bujes={bujes} setBujes={setBujes}
            mecanizadosTotem={mecanizadosTotem} setMecanizadosTotem={setMecanizadosTotem}
            params={params} setParams={actualizarParams}
          />
        )}
      </main>
    </div>
  );
}