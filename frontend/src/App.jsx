import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Calculator, Settings, Eye, AlertCircle, History, 
  CheckCircle2, Plus, ChevronLeft, ChevronRight, UserCog, LogOut 
} from 'lucide-react';

import Configurador from './components/Cotizador/Configurador';
import Resumen, { LISTA_VENDEDORES, LISTA_DISENADORES } from './components/Cotizador/Resumen';
import VisorM3 from './components/Visor3D/VisorM3';
import Galeria from './components/Galeria/Galeria';
import PanelAdmin from './components/Admin/PanelAdmin';
import HistorialCotizaciones from './components/Historial/HistorialCotizaciones';
import { calcularCostosBrazoParametrico } from './utils/costeoBrazos';
import { useAuth } from './context/AuthContext';
import ModalMiPerfil from './components/Perfil/ModalMiPerfil';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

export default function App() {
  const { user, perfil, esSuperAdmin, esDistribuidor, logout } = useAuth();
  const [modalPerfil, setModalPerfil] = useState(false);
  const [tabActual, setTabActual] = useState('cotizador');

  // Equipo: el distribuidor usa SU personal; la fábrica conserva las listas por defecto
  const listaVendedores = useMemo(
    () => (esDistribuidor ? (perfil?.personal || []).filter(p => p.tipo === 'ASESOR').map(p => p.nombre) : LISTA_VENDEDORES),
    [esDistribuidor, perfil]
  );
  const listaDisenadores = useMemo(
    () => (esDistribuidor ? (perfil?.personal || []).filter(p => p.tipo === 'DISENADOR').map(p => p.nombre) : LISTA_DISENADORES),
    [esDistribuidor, perfil]
  );

  // Marca blanca para el PDF (null => membrete de fábrica)
  const membretePdf = useMemo(() => (esDistribuidor && perfil ? {
    nombre: perfil.nombre_comercial,
    nit: perfil.nit,
    telefono: perfil.telefono,
    correo: perfil.correo,
    direccion: perfil.direccion,
    logo: perfil.logo_url
  } : null), [esDistribuidor, perfil]);
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
  const [cotizacionId, setCotizacionId] = useState(null);
  const [categoriaSel, setCategoriaSel] = useState('gabinetes');
  const [nivelPrecio, setNivelPrecio] = useState(1);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [notas, setNotas] = useState('');
  const [vendedor, setVendedor] = useState(listaVendedores[0] || '');
  const [disenador, setDisenador] = useState(listaDisenadores[0] || '');
  const [cargandoCotizacion, setCargandoCotizacion] = useState(false);
  const [errorBackend, setErrorBackend] = useState(null);
  const [mensajeExito, setMensajeExito] = useState(null);

  // Si el equipo cambia (Mi Perfil) y no hay selección, tomar el primero disponible
  useEffect(() => {
    if (!vendedor && listaVendedores[0]) setVendedor(listaVendedores[0]);
    if (!disenador && listaDisenadores[0]) setDisenador(listaDisenadores[0]);
  }, [listaVendedores, listaDisenadores]); // eslint-disable-line react-hooks/exhaustive-deps

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
      const ts = Date.now();
      const fetchOpts = { cache: 'no-store', headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate', 'Pragma': 'no-cache' } };
      const [resLaminas, resTubos, resAcc, resPin, resBrazos, resBujes, resMecanizados] = await Promise.all([
        fetch(`${API_BASE_URL}/api/laminas?_t=${ts}`, fetchOpts).then(r => r.ok ? r.json() : null),
        fetch(`${API_BASE_URL}/api/tubos?_t=${ts}`, fetchOpts).then(r => r.ok ? r.json() : null),
        fetch(`${API_BASE_URL}/api/accesorios?_t=${ts}`, fetchOpts).then(r => r.ok ? r.json() : null),
        fetch(`${API_BASE_URL}/api/pinturas?_t=${ts}`, fetchOpts).then(r => r.ok ? r.json() : null),
        fetch(`${API_BASE_URL}/api/brazos?_t=${ts}`, fetchOpts).then(r => r.ok ? r.json() : null),
        fetch(`${API_BASE_URL}/api/bujes?_t=${ts}`, fetchOpts).then(r => r.ok ? r.json() : null),
        fetch(`${API_BASE_URL}/api/mecanizados-totem?_t=${ts}`, fetchOpts).then(r => r.ok ? r.json() : null)
      ]);

      if (resLaminas && resLaminas.length > 0) setLaminas(resLaminas);
      if (resTubos && resTubos.length > 0) setTubos(resTubos);
      if (resAcc && Array.isArray(resAcc)) {
        setAccesorios(resAcc);
        localStorage.setItem('m3_accesorios', JSON.stringify(resAcc));
      }
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
        accesoriosSeleccionados: [],
        bujesSeleccionados: [],
        bujeInicialId: '',
        bujeFinalId: '',
        bujeBaseId: '',
        bujePuntaId: '',
        bujeInicial: null,
        bujeFinal: null,
        tipoBrazo: 'SIMPLE_L',
        conPieDeAmigo: false,
        longitudTravesanoT: 50,
        tieneCaperuza: false,
        caperuzaEmbellecedora: false,
        caperuzaBase: false,
        cubreAnclaje: false,
        tieneVideoportero: false,
        accesorioVideoportero: false,
        videoporteroPunta: false,
        soporteVideoportero: false,
        accesorioPunta: '',
        detallesAccesorios: {},
        cantidadesAcc: {},
        tramos: esPosteOBrazo 
          ? (prev.tramos?.length > 0 ? prev.tramos : [{ id: Date.now(), alto: categoriaSel === 'brazos' ? 60 : 150, tuboId: '', forma: 'redondo' }])
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
    setVendedor(listaVendedores[0] || '');
    setDisenador(listaDisenadores[0] || '');
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

    const prefijoActual = consecutivo.replace(/\d+$/, '');
    const numActual = parseInt(consecutivo.replace(/\D/g, ''), 10);
    if (isNaN(numActual)) return;

    if (direccion === 'anterior') {
      const objetivo = `${prefijoActual}${numActual - 1}`;
      const encontrada = lista.find(c => c.consecutivo === objetivo);
      if (encontrada) {
        await handleCargarCotizacionExistente(encontrada.id);
      } else {
        setConsecutivo(objetivo);
        setItemsCotizacion([]);
      }
    } else if (direccion === 'siguiente') {
      const objetivo = `${prefijoActual}${numActual + 1}`;
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
    const esBrazo = categoriaSel === 'brazos';
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

    // El distribuidor nunca calcula con costos de fábrica en el navegador: sin servidor no hay precio
    if (!dataServidor && esDistribuidor) {
      setErrorBackend("No se pudo calcular el precio del ítem. Verifica tu conexión e inténtalo de nuevo.");
      setCargandoCotizacion(false);
      return;
    }

    // --- CÁLCULO DE RESPALDO (Por si el servidor falla o responde 500) ---
    const desgloseLocalBrazo = esBrazo
      ? calcularCostosBrazoParametrico(paramsParaBackend, tubos, bujes, nivelPrecio)
      : null;

    let costoEstructuraLocal = 0;
    if (esBrazo && desgloseLocalBrazo) {
      costoEstructuraLocal = desgloseLocalBrazo.costoTubosVenta;
    } else if (tramosFiltrados.length > 0) {
      tramosFiltrados.forEach(tramo => {
        const tuboObj = tubos.find(t => String(t.id) === String(tramo.tuboId));
        const precioMetro = tuboObj ? Number(tuboObj.precio_metro || (tuboObj.precio_tira_6m / 6) || tuboObj.precio || 0) : 15000;
        const metros = (Number(tramo.alto) || 0) / 100;
        costoEstructuraLocal += precioMetro * metros;
      });
    }

    let costoAccesoriosLocal = esBrazo && desgloseLocalBrazo
      ? (
          desgloseLocalBrazo.costoBujesYPlatinasTotal +
          desgloseLocalBrazo.costoVarillaVenta +
          desgloseLocalBrazo.costoSoldaduraVenta +
          desgloseLocalBrazo.costoAdicionalesBrazo
        )
      : 0;

    accsValidos.forEach(accId => {
      const accObj = accesorios.find(a => String(a.id) === String(accId));
      const cant = paramsUnificados.cantidadesAcc?.[accId] || 1;
      const precioAcc = accObj ? Number(accObj.precio || accObj.precio_venta || 0) : 15000;
      costoAccesoriosLocal += precioAcc * cant;
    });

    const costoPinturaLocal = 12000;

    // Normalizar accesoriosLista e inyectar Caperuza (+$25.000) y Videoportero (+$45.000) si están activos en Brazo
    const tieneCaperuzaBrazo = esBrazo && Boolean(
      paramsParaBackend.tieneCaperuza ??
      paramsParaBackend.caperuzaEmbellecedora ??
      paramsParaBackend.caperuzaBase ??
      paramsParaBackend.cubreAnclaje ??
      paramsParaBackend.caperuza
    );
    const tieneVideoporteroBrazo = esBrazo && Boolean(
      paramsParaBackend.tieneVideoportero ??
      paramsParaBackend.accesorioVideoportero ??
      paramsParaBackend.videoporteroPunta ??
      paramsParaBackend.soporteVideoportero ??
      paramsParaBackend.accesorioPunta === 'videoportero'
    );

    let accesoriosListaFinal = Array.isArray(dataServidor?.accesorios_lista)
      ? dataServidor.accesorios_lista.map(a => ({ ...a }))
      : [];

    if (esBrazo) {
      // Si el servidor no devolvió lista (ej. modo offline), construir lista base con bujes seleccionados
      if (accesoriosListaFinal.length === 0) {
        if (paramsParaBackend.bujeInicial && paramsParaBackend.bujeInicial.precio) {
          const pIni = Number(paramsParaBackend.bujeInicial.precio) || 0;
          accesoriosListaFinal.push({
            id: `buje_${paramsParaBackend.bujeInicial.id}`,
            nombre: `Buje: ${paramsParaBackend.bujeInicial.nombre}`,
            cantidad: 1,
            precioUnitario: pIni,
            precio: pIni,
            total: pIni
          });
        }
        if (paramsParaBackend.bujeFinal && paramsParaBackend.bujeFinal.precio) {
          const cantFin = (paramsParaBackend.tipoBrazo === 'T' || paramsParaBackend.tipoBrazo === 'T_BILATERAL') ? 2 : 1;
          const pFin = Number(paramsParaBackend.bujeFinal.precio) || 0;
          accesoriosListaFinal.push({
            id: `buje_${paramsParaBackend.bujeFinal.id}`,
            nombre: `Buje: ${paramsParaBackend.bujeFinal.nombre}`,
            cantidad: cantFin,
            precioUnitario: pFin,
            precio: pFin * cantFin,
            total: pFin * cantFin
          });
        }
      }

      if (tieneCaperuzaBrazo) {
        const idxCap = accesoriosListaFinal.findIndex(a => {
          const txt = `${a.id || ''} ${a.nombre || ''}`.toLowerCase();
          return txt.includes('caperuza') || txt.includes('cubre-anclaje') || txt.includes('cubre anclaje');
        });
        const itemCaperuza = {
          id: 'caperuza_embellecedora',
          nombre: 'Caperuza / Cubre-anclaje Embellecedora',
          cantidad: 1,
          precioUnitario: 25000,
          precio: 25000,
          total: 25000
        };
        // Si el servidor ya la calculó (con margen del distribuidor) se respeta su precio
        if (idxCap < 0) {
          accesoriosListaFinal.push(itemCaperuza);
        }
      }

      if (tieneVideoporteroBrazo) {
        const idxVid = accesoriosListaFinal.findIndex(a => {
          const idStr = String(a.id || '').toLowerCase();
          const nomStr = String(a.nombre || '').toLowerCase();
          // Distinguir del buje final si el buje también se llama videoportero
          const esBuje = idStr.startsWith('buje_') || nomStr.startsWith('buje:');
          return !esBuje && (idStr.includes('videoportero') || nomStr.includes('videoportero') || nomStr.includes('portero'));
        });
        const itemVideoportero = {
          id: 'accesorio_videoportero_punta',
          nombre: 'Accesorio Videoportero en Punta de Brazo',
          cantidad: 1,
          precioUnitario: 45000,
          precio: 45000,
          total: 45000
        };
        if (idxVid < 0) {
          accesoriosListaFinal.push(itemVideoportero);
        }
      }
    }

    const sumaListaAccFinal = accesoriosListaFinal.reduce((acc, a) => {
      const cant = Number(a.cantidad || 1);
      const unit = Number(a.precioUnitario ?? a.precio ?? a.total ?? 0);
      return acc + (unit * cant);
    }, 0);

    const costoEstructuraReal = Number(
      dataServidor?.costoEstructura ||
      dataServidor?.costo_tubos_venta ||
      dataServidor?.costo_base ||
      (costoEstructuraLocal > 0 ? costoEstructuraLocal : 25000)
    );
    const costoPinturaReal = Number(dataServidor?.costo_pintura_venta || dataServidor?.costo_pintura || costoPinturaLocal);
    const costoAccReal = accesoriosListaFinal.length > 0
      ? sumaListaAccFinal
      : Number(dataServidor?.costo_accesorios_venta || dataServidor?.costo_accesorios || costoAccesoriosLocal);
    const totalReal = Math.round(costoEstructuraReal + costoPinturaReal + costoAccReal);

    let materialNombre = 'Estructura Estándar';
    if (categoriaSel === 'postes' || categoriaSel === 'brazos') {
      materialNombre = esBrazo
        ? `Soporte Brazo (${paramsParaBackend.tipoBrazo || 'SIMPLE_L'})`
        : 'Estructura Postes Multi-Tramo';
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
      medidas_texto: dataServidor?.medidas_texto || `${paramsParaBackend.alto || 60} cm`,
      lamina: materialNombre,
      laminaId: paramsParaBackend.laminaId,
      pintura: paramsParaBackend.nombrePintura || 'Estándar',
      colorPintura: paramsParaBackend.colorPintura || '#2563eb',
      
      costoEstructura: costoEstructuraReal,
      costoBase: costoEstructuraReal,
      costoPintura: costoPinturaReal,
      costoTubos: costoEstructuraReal,
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
      accesoriosLista: accesoriosListaFinal,
      accesorios_lista: accesoriosListaFinal,
      nivelPrecio,
      params: { ...paramsParaBackend, categoria: (categoriaSel || '').toUpperCase(), nivelPrecio },
      configuracion: { ...paramsParaBackend, categoria: (categoriaSel || '').toUpperCase(), nivelPrecio }
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
          id: cotizacionId,
          consecutivo: consecutivo,
          cliente_id: clienteSeleccionado?.id || null,
          clienteId: clienteSeleccionado?.id || null,
          clienteNombre: clienteSeleccionado?.nombre || 'Consumidor Final / Mostrador',
          clienteNit: clienteSeleccionado?.nit || null,
          vendedor: vendedor,
          asesor_nombre: vendedor,
          disenador: disenador,
          disenador_nombre: disenador,
          observaciones: notas || '',
          notas: notas || '',
          nivelPrecio: nivelPrecio,
          total: totalCotizacion,
          items: itemsPayload
        })
      });

      if (!res.ok) throw new Error("Error en la petición de guardado");

      const data = await res.json();
      setMensajeExito(`Cotización ${data.consecutivo_guardado || data.consecutivo} guardada correctamente.`);
      
      if (data.id) {
        setCotizacionId(data.id);
      }
      if (data.consecutivo_guardado || data.consecutivo) {
        setConsecutivo(data.consecutivo_guardado || data.consecutivo);
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
      
      setCotizacionId(data.id || id);
      setConsecutivo(data.consecutivo);
      setNivelPrecio(data.nivel_precio || 1);
      
      const itemsCargados = data.items || [];
      setItemsCotizacion(itemsCargados);

      setNotas(data.observaciones || '');
      setVendedor(data.asesor_id || data.asesor_nombre || data.vendedor || listaVendedores[0] || '');
      setDisenador(data.disenador_id || data.disenador_nombre || data.disenador || listaDisenadores[0] || '');

      if (data.cliente || data.cliente_id || data.cliente_nombre) {
        setClienteSeleccionado(data.cliente || {
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
          <img
            src={(esDistribuidor && perfil?.logo_url) ? perfil.logo_url : '/logo.png'}
            alt={esDistribuidor ? (perfil?.nombre_comercial || 'Logo') : 'WG Ingeniería'}
            className="h-9 max-w-[150px] object-contain"
            onError={(e) => { if (!e.currentTarget.src.endsWith('/logo.png') && !esDistribuidor) e.currentTarget.style.display = 'none'; }}
          />
          <h1 className="text-base font-bold text-slate-900 hidden md:block truncate max-w-[220px]">
            {esDistribuidor ? (perfil?.nombre_comercial || 'Mi Empresa') : 'Plataforma Integrada M3'}
          </h1>
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
          <button 
            onClick={() => { setTabActual('cotizador'); cargarDatosServidor(); }} 
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-semibold transition ${tabActual === 'cotizador' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'}`}
          >
            <Calculator size={14}/> Cotizador
          </button>
          <button onClick={() => setTabActual('historial')} className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-semibold transition ${tabActual === 'historial' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'}`}><History size={14}/> Historial</button>
          <button onClick={() => setTabActual('galeria')} className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-semibold transition ${tabActual === 'galeria' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'}`}><Eye size={14}/> 3D</button>
          {esSuperAdmin && (
            <button onClick={() => setTabActual('admin')} className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-semibold transition ${tabActual === 'admin' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'}`}><Settings size={14}/> Admin</button>
          )}
        </nav>

        <div className="flex items-center gap-2 text-xs">
          {esDistribuidor && (
            <button
              onClick={() => setModalPerfil(true)}
              className="bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 font-semibold px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition"
              title="Mi Perfil / Mi Empresa"
            >
              <UserCog size={15} /> <span className="hidden lg:inline">Mi Empresa</span>
            </button>
          )}
          <span className="hidden xl:inline text-slate-500 font-medium" title={user?.rol}>{user?.username}</span>
          <button
            onClick={logout}
            className="text-slate-500 hover:text-red-600 p-1.5 rounded-lg hover:bg-slate-100 transition"
            title="Cerrar sesión"
          >
            <LogOut size={16} />
          </button>
        </div>
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
                  cotizacionId={cotizacionId}
                  setCotizacionId={setCotizacionId}
                  accesorios={accesorios}
                  visorRef={visorRef}
                  clienteSeleccionado={clienteSeleccionado}
                  setClienteSeleccionado={setClienteSeleccionado}
                  notas={notas}
                  setNotas={setNotas}
                  vendedor={vendedor}
                  setVendedor={setVendedor}
                  disenador={disenador}
                  setDisenador={setDisenador}
                  API_BASE_URL={API_BASE_URL}
                  nivelPrecio={nivelPrecio}
                  listaVendedores={listaVendedores}
                  listaDisenadores={listaDisenadores}
                  membrete={membretePdf}
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
        {tabActual === 'admin' && esSuperAdmin && (
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

      {modalPerfil && esDistribuidor && <ModalMiPerfil onClose={() => setModalPerfil(false)} />}
    </div>
  );
}
