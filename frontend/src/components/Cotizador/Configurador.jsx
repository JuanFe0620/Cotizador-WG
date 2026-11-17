import React, { useState, useEffect } from 'react';
import { Plus, BookmarkPlus } from 'lucide-react';
import SelectorPintura from './configurador/SelectorPintura';
import SelectorTramos from './configurador/SelectorTramos';
import SelectorBujes from './configurador/SelectorBujes';
import SelectorBrazosPoste from './configurador/SelectorBrazosPoste';
import BaseAnclaje from './configurador/BaseAnclaje';
import ListaAccesorios from './configurador/ListaAccesorios';
import ConfiguradorTotem from './configurador/ConfiguradorTotem';
import { calcularCostosBrazoParametrico } from '../../utils/costeoBrazos';

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function Configurador({ 
  categoriaSel, 
  setCategoriaSel, 
  categoriasPermitidas = ['totems', 'postes', 'brazos', 'gabinetes'],
  permiteVideoportero = true,
  params, 
  setParams, 
  laminas = [], 
  tubos = [], 
  pinturas = [], 
  accesorios = [], 
  bujes: propBujes = [],
  nivelPrecio = 1,
  modoCliente = false,
  handleAgregar,
  cargando = false
}) {
  const esGabinete = categoriaSel === 'gabinetes';
  const esTotem = categoriaSel === 'totems';
  const esBrazo = categoriaSel === 'brazos';
  const esPoste = categoriaSel === 'postes';

  const [tipoPuerta, setTipoPuerta] = useState(params.tipoPuerta || 'normal');
  const [cantidadesAcc, setCantidadesAcc] = useState(params.cantidadesAcc || {});
  const [usarPersonalizada, setUsarPersonalizada] = useState(params.usarPersonalizada || false);
  const [incluirPlatina, setIncluirPlatina] = useState((esGabinete || esBrazo) ? false : (params.incluirBase ?? true));
  const [platinaMedida, setPlatinaMedida] = useState(params.ladoBase || params.platinaLargo || 20);
  const [nombreBrazoPersonalizado, setNombreBrazoPersonalizado] = useState('');
  const [guardandoBrazo, setGuardandoBrazo] = useState(false);
  const [msgBrazoGuardado, setMsgBrazoGuardado] = useState(null);
  const [laminaAnclajeId, setLaminaAnclajeId] = useState(params.laminaAnclajeId || '');
  const [ubicacion, setUbicacion] = useState(params.ubicacion || (esBrazo ? 'suspendido' : 'suelo'));
  
  const [bujesLocales, setBujesLocales] = useState([]);
  const bujes = (propBujes && propBujes.length > 0) ? propBujes : bujesLocales;

  useEffect(() => {
    if (!propBujes || propBujes.length === 0) {
      fetch(`${API_BASE_URL}/api/bujes`)
        .then(res => {
          if (!res.ok) return fetch(`${API_BASE_URL}/bujes`);
          return res;
        })
        .then(res => {
          if (!res.ok) throw new Error("Error consultando bujes");
          return res.json();
        })
        .then(data => setBujesLocales(data))
        .catch(err => console.error("Error al obtener los bujes:", err));
    }
  }, [propBujes]);

  // Sincronizar ubicación inicial hacia el visor si aún no está definida en params
  useEffect(() => {
    if (!params.ubicacion) {
      const ubicacionDefecto = esBrazo ? 'suspendido' : 'suelo';
      setUbicacion(ubicacionDefecto);
      setParams(prev => ({
        ...prev,
        ubicacion: ubicacionDefecto,
        tipoUbicacion: ubicacionDefecto,
        montaje: ubicacionDefecto,
        suspendido: ubicacionDefecto === 'suspendido',
        esSuspendido: ubicacionDefecto === 'suspendido'
      }));
    }
  }, [categoriaSel]);

  const cambiarUbicacion = (nuevaUbicacion) => {
    setUbicacion(nuevaUbicacion);
    setParams(prev => ({
      ...prev,
      ubicacion: nuevaUbicacion,
      tipoUbicacion: nuevaUbicacion,
      montaje: nuevaUbicacion,
      suspendido: nuevaUbicacion === 'suspendido',
      esSuspendido: nuevaUbicacion === 'suspendido'
    }));
  };

  const MARGEN_ESTRUCTURA_CM = 10;
  const calcularRU = (altoCm) => {
    const cm = parseFloat(altoCm) || 0;
    const cmUtiles = cm - MARGEN_ESTRUCTURA_CM;
    if (cmUtiles <= 0) return 0;
    return Math.floor(cmUtiles / 4.445);
  };

  const unidadesRUCalculadas = esGabinete ? calcularRU(params.alto) : 0;

  // CAMBIO DE CATEGORÍA CON LIMPIEZA CONTROLADA
  const cambiarCategoria = (nuevaCat) => {
    if (nuevaCat === categoriaSel) return;

    const ubicacionNueva = nuevaCat === 'brazos' ? 'suspendido' : 'suelo';
    const esNuevoTotem = nuevaCat === 'totems';
    const laminaDefectoTotem = laminas[0]?.id ? String(laminas[0].id) : 'CR-16';

    setCategoriaSel(nuevaCat);
    setTipoPuerta('normal');
    setCantidadesAcc({});
    setUsarPersonalizada(false);
    setIncluirPlatina(nuevaCat === 'gabinetes' || nuevaCat === 'brazos' ? false : true);
    setPlatinaMedida(20);
    setLaminaAnclajeId(esNuevoTotem ? laminaDefectoTotem : '');
    setUbicacion(ubicacionNueva);

    setParams({
      categoria: nuevaCat,
      ubicacion: ubicacionNueva,
      tipoUbicacion: ubicacionNueva,
      montaje: ubicacionNueva,
      suspendido: ubicacionNueva === 'suspendido',
      esSuspendido: ubicacionNueva === 'suspendido',
      alto: esNuevoTotem ? 150 : '',
      ancho: esNuevoTotem ? 25 : '',
      fondo: esNuevoTotem ? 15 : '',
      tipoGabinete: 'estandar',
      ...(esNuevoTotem && {
        alto_cm: 150,
        ancho_cm: 25,
        fondo_cm: 15,
        tipoFrente: 'videoportero',
        modulos: ['videoportero'],
        viseraSuperior: true,
        caperuzaVideoportero: false,
        tieneCaperuzaVideoportero: false,
        tapaRegistro: true,
        anchoBase: 39,
        fondoBase: 25,
        paresCartelas: 2,
        colorPintura: '#1e293b',
        pintura: '#1e293b'
      }),
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
      tramos: [],
      accesoriosSeleccionados: [],
      detallesAccesorios: {},
      cantidadesAcc: {},
      bujesSeleccionados: [],
      bujeInicialId: '',
      bujeFinalId: '',
      bujeBaseId: '',
      bujePuntaId: '',
      bujeInicial: null,
      bujeFinal: null,
      incluirBase: nuevaCat === 'gabinetes' || nuevaCat === 'brazos' ? false : true,
      incluirPlatina: nuevaCat === 'gabinetes' || nuevaCat === 'brazos' ? false : true,
      laminaId: esNuevoTotem ? laminaDefectoTotem : '',
      laminaAnclajeId: esNuevoTotem ? laminaDefectoTotem : '',
      tipoPinturaId: ''
    });
  };

  useEffect(() => {
    if (params.cantidadesAcc && Object.keys(params.cantidadesAcc).length > 0) {
      setCantidadesAcc(params.cantidadesAcc);
    }
    if (params.tipoPuerta) setTipoPuerta(params.tipoPuerta);
    if (params.usarPersonalizada !== undefined) setUsarPersonalizada(params.usarPersonalizada);
    if (params.platinaLargo || params.ladoBase) setPlatinaMedida(params.platinaLargo || params.ladoBase);
    if (params.laminaAnclajeId) setLaminaAnclajeId(params.laminaAnclajeId);
    if (params.ubicacion && params.ubicacion !== ubicacion) setUbicacion(params.ubicacion);
  }, [params]);

  const manejarCambioPlatina = (campo, valor) => {
    if (campo === 'incluir') {
      const nuevoValor = (esGabinete || esBrazo) ? false : valor;
      setIncluirPlatina(nuevoValor);

      setParams(prev => {
        const accActuales = prev.accesoriosSeleccionados || [];
        const accGuia = accesorios.find(acc => {
          const idStr = String(acc.id || '').toLowerCase();
          const nombreStr = String(acc.nombre || '').toLowerCase();
          return idStr.includes('guia') || idStr.includes('platina_guia') || nombreStr.includes('platina guía') || nombreStr.includes('platina guia');
        });

        const realId = accGuia ? accGuia.id : null;
        let nuevosAcc = [];
        const detallesActualizados = { ...(prev.detallesAccesorios || {}) };

        if (nuevoValor) {
          const yaExiste = accActuales.some(item => {
            const itemIdStr = String(typeof item === 'object' ? item.id : item).toLowerCase();
            return (realId && String(item) === String(realId)) || itemIdStr.includes('guia') || itemIdStr.includes('platina_guia');
          });

          const idInsertar = realId !== null ? realId : 'platina_guia';
          nuevosAcc = yaExiste ? accActuales : [...accActuales, idInsertar];

          if (idInsertar) {
            detallesActualizados[idInsertar] = {
              ...(detallesActualizados[idInsertar] || {}),
              laminaId: laminaAnclajeId || prev.laminaAnclajeId || (laminas[0]?.id ? String(laminas[0].id) : '')
            };
          }
        } else {
          nuevosAcc = accActuales.filter(item => {
            const itemIdStr = String(typeof item === 'object' ? item.id : item).toLowerCase();
            const esMismoId = realId !== null && String(item) === String(realId);
            return !esMismoId && !itemIdStr.includes('guia') && !itemIdStr.includes('platina_guia');
          });

          Object.keys(detallesActualizados).forEach(key => {
            const keyStr = String(key).toLowerCase();
            if ((realId && String(key) === String(realId)) || keyStr.includes('guia') || keyStr.includes('platina_guia')) {
              delete detallesActualizados[key];
            }
          });
        }

        return {
          ...prev,
          incluirBase: nuevoValor,
          incluirPlatina: nuevoValor,
          formaBase: nuevoValor ? (prev.formaBase || 'Base Redonda') : 'Sin Base',
          accesoriosSeleccionados: [...nuevosAcc],
          detallesAccesorios: detallesActualizados,
          ...(!nuevoValor && { laminaAnclajeId: '' })
        };
      });
    } else if (campo === 'medida') {
      const num = parseFloat(valor) || 0;
      setPlatinaMedida(num);

      setParams(prev => {
        const detallesActualizados = { ...(prev.detallesAccesorios || {}) };
        Object.keys(detallesActualizados).forEach(key => {
          if (String(key).toLowerCase().includes('guia') || String(key).toLowerCase().includes('platina_guia')) {
            detallesActualizados[key] = {
              ...detallesActualizados[key],
              ladoBase: num,
              dimensionBase: num,
              platinaLargo: num,
              platinaAncho: num,
              largo: num,
              ancho: num,
              dimension: num
            };
          }
        });

        return {
          ...prev,
          ladoBase: num,
          dimensionBase: num,
          dimension: num,
          platinaLargo: num,
          platinaAncho: num,
          anchoBase: num,
          detallesAccesorios: detallesActualizados
        };
      });
    }
  };

  const handleSetCantidadesAcc = (nuevasCantidades) => {
    const estadoActualizado = typeof nuevasCantidades === 'function' 
      ? nuevasCantidades(cantidadesAcc) 
      : nuevasCantidades;

    setCantidadesAcc(estadoActualizado);
    setParams(prev => ({ ...prev, cantidadesAcc: estadoActualizado }));
  };

  let recPlatina = { largo: 15, desc: 'Plantilla Liviana 15cm' };
  const altoRef = (params.tramos || []).reduce((acc, t) => acc + (parseFloat(t.alto) || 0), 0) || parseFloat(params.alto) || 0;
  if (altoRef > 3000) recPlatina = { largo: 60, desc: 'Base Estructural 60cm' };
  else if (altoRef > 600) recPlatina = { largo: 35, desc: 'Plantilla Reforzada 35cm' };
  else if (altoRef > 250) recPlatina = { largo: 25, desc: 'Plantilla Pesada 25cm' };
  else if (altoRef > 150) recPlatina = { largo: 20, desc: 'Plantilla Estándar 20cm' };

  const medidaUsar = parseFloat(
    platinaMedida || params.ladoBase || (usarPersonalizada ? platinaMedida : recPlatina.largo)
  ) || 20;

  useEffect(() => {
    if (!params.accesoriosSeleccionados || esGabinete || esBrazo) return;

    const rawAcc = params.accesoriosSeleccionados || [];
    const tieneGuia = rawAcc.some(acc => {
      const id = String(typeof acc === 'object' ? acc.id : acc).toLowerCase();
      return id.includes('guia') || id.includes('platina_guia');
    });

    if (tieneGuia) {
      setParams(prev => {
        const detalles = { ...(prev.detallesAccesorios || {}) };
        Object.keys(detalles).forEach(key => {
          if (String(key).toLowerCase().includes('guia')) {
            detalles[key] = {
              ...detalles[key],
              ladoBase: medidaUsar,
              dimensionBase: medidaUsar,
              platinaLargo: medidaUsar,
              platinaAncho: medidaUsar
            };
          }
        });
        return { ...prev, detallesAccesorios: detalles };
      });
    }
  }, [medidaUsar, esGabinete, esBrazo]);

  const validarFormulario = () => {
    if (esTotem || esGabinete) {
      if (!params.laminaId) return false;
      if (!params.alto || parseFloat(params.alto) <= 0) return false;
      if (!params.ancho || parseFloat(params.ancho) <= 0) return false;
      if (!params.fondo || parseFloat(params.fondo) <= 0) return false;
    }

    if (esPoste || esBrazo) {
      if (!params.tramos || params.tramos.length === 0) return false;
      const tieneTramoIncompleto = params.tramos.some(t => !t.tuboId || !t.alto || parseFloat(t.alto) <= 0);
      if (tieneTramoIncompleto) return false;
    }

    if (!esGabinete && !esBrazo && !esTotem && incluirPlatina) {
      const tieneLaminaAnclaje = laminaAnclajeId || params.laminaAnclajeId;
      if (!tieneLaminaAnclaje) return false;
    }

    return true;
  };

  const esFormularioValido = validarFormulario();

  const presionarAgregar = () => {
    if (!esFormularioValido) return;

    // 1. Bujes seleccionados en selectores desplegables
    const bujeInicialObj = bujes.find(b => String(b.id) === String(params.bujeInicialId)) || null;
    const bujeFinalObj = bujes.find(b => String(b.id) === String(params.bujeFinalId)) || null;

    // 2. Lista limpia de Bujes para el backend
    const bujesSeleccionadosLimpios = [];
    if (params.bujeInicialId) bujesSeleccionadosLimpios.push(params.bujeInicialId);
    if (params.bujeFinalId) bujesSeleccionadosLimpios.push(params.bujeFinalId);

    // 3. Extraer IDs de accesorios manuales seleccionados
    const rawAccSeleccionados = params.accesoriosSeleccionados || [];
    
    const accFiltrados = rawAccSeleccionados.filter(accItem => {
      const accId = String(typeof accItem === 'object' ? (accItem.id || accItem.codigo) : accItem).toLowerCase();

      const esBujeDesplegable = 
        (params.bujeInicialId && accId === String(params.bujeInicialId).toLowerCase()) || 
        (params.bujeFinalId && accId === String(params.bujeFinalId).toLowerCase());
      
      const esPlatinaBase = accId === 'platina_base' || accId === 'platina_anclaje';

      if (esBujeDesplegable || esPlatinaBase) return false;
      return true;
    });

    // Mapeo limpio respetando cantidades y formatos
    const listaAcc = accFiltrados.map(accItem => {
      const accId = typeof accItem === 'object' ? accItem.id : accItem;
      const cant = cantidadesAcc[accId] || (typeof accItem === 'object' ? accItem.cantidad : 1) || 1;
      return { id: accId, cantidad: cant };
    });

    const tieneCaperuza = Boolean(
      params.tieneCaperuza ??
      params.caperuzaEmbellecedora ??
      params.caperuzaBase ??
      params.cubreAnclaje ??
      params.caperuza
    );

    const tieneVideoportero = Boolean(
      params.tieneVideoportero ??
      params.accesorioVideoportero ??
      params.videoporteroPunta ??
      params.soporteVideoportero ??
      params.accesorioPunta === 'videoportero'
    );

    if (tieneCaperuza) {
      if (!listaAcc.some(a => String(a.id || '').toLowerCase().includes('caperuza'))) {
        listaAcc.push({
          id: 'caperuza_embellecedora',
          nombre: 'Caperuza / Cubre-anclaje Embellecedora',
          cantidad: 1,
          precioUnitario: 25000,
          precio: 25000,
          total: 25000
        });
      }
    }
    if (tieneVideoportero) {
      if (!listaAcc.some(a => String(a.id || '').toLowerCase().includes('videoportero'))) {
        listaAcc.push({
          id: 'accesorio_videoportero_punta',
          nombre: 'Accesorio Videoportero en Punta de Brazo',
          cantidad: 1,
          precioUnitario: 45000,
          precio: 45000,
          total: 45000
        });
      }
    }

    // 4. Tramos
    const tramosLista = (params.tramos || []).map(t => {
      const tuboObj = tubos.find(tb => String(tb.id) === String(t.tuboId)) || {};
      const formaReal = (tuboObj.forma || t.forma || t.tipo || 'redondo').toLowerCase();
      const esCuad = formaReal.includes('cuad') || formaReal.includes('rect');
      const anchoCm = tuboObj.ancho_cm ?? t.ancho_cm ?? '';
      const altoCm = tuboObj.alto_cm ?? t.alto_cm ?? anchoCm ?? '';
      const diamPulg = tuboObj.diametro_pulg ?? tuboObj.diametro ?? t.diametro_pulg ?? t.diametro ?? '';

      return {
        ...t,
        forma: formaReal,
        tipo: formaReal,
        tipoPerfil: formaReal,
        seccion: formaReal,
        ancho_cm: anchoCm,
        alto_cm: altoCm,
        diametro_pulg: diamPulg,
        tipoTubo: tuboObj.tipo || tuboObj.tipo_tubo || t.tipoTubo || (esCuad ? 'Tubo Cuadrado' : 'Tubo Redondo'),
        tuboNombre: tuboObj.nombre || tuboObj.descripcion || t.tuboNombre || (
          esCuad
            ? `Tubo Cuadrado ${anchoCm}x${altoCm} cm`
            : `Tubo Ø ${diamPulg}"`
        ),
        diametro: diamPulg,
        calibre: tuboObj.calibre || tuboObj.calibreTexto || tuboObj.espesor || t.calibre || 'Calibre Estándar'
      };
    });

    const sumaTramosBase = tramosLista.reduce((acc, t) => {
      const val = parseFloat(t.alto || t.longitud || 0);
      return acc + (val < 10 ? val * 100 : val);
    }, 0);

    const extraTravesanoT = (esBrazo && (params.tipoBrazo === 'T' || params.tipoBrazo === 'T_BILATERAL'))
      ? (parseFloat(params.longitudTravesanoT) || 50)
      : 0;

    const sumaTramos = sumaTramosBase + extraTravesanoT;

    const altoCalculado = esGabinete || esTotem 
      ? (parseFloat(params.alto) || 100) 
      : (sumaTramos > 0 ? sumaTramos : (parseFloat(params.alto) || 150));

    // 5. Payload Final perfectamente estructurado
    const payloadFinal = JSON.parse(JSON.stringify({
      ...params,
      cantidad: 1,
      categoria: categoriaSel,
      ubicacion: ubicacion,
      tipoUbicacion: ubicacion,
      montaje: ubicacion,
      suspendido: ubicacion === 'suspendido',
      esSuspendido: ubicacion === 'suspendido',
      alto: altoCalculado,
      alto_cm: altoCalculado,
      tramos: tramosLista,
      cantidadesAcc: cantidadesAcc,
      bujeInicial: bujeInicialObj ? {
        id: bujeInicialObj.id,
        nombre: bujeInicialObj.nombre || bujeInicialObj.descripcion,
        precio: parseFloat(bujeInicialObj.precio || 0)
      } : null,
      bujeFinal: bujeFinalObj ? {
        id: bujeFinalObj.id,
        nombre: bujeFinalObj.nombre || bujeFinalObj.descripcion,
        precio: parseFloat(bujeFinalObj.precio || 0)
      } : null,
      accesoriosSeleccionados: accFiltrados.map(a => typeof a === 'object' ? a.id : a),
      accesorios_lista: listaAcc,
      bujesSeleccionados: bujesSeleccionadosLimpios
    }));

    handleAgregar(payloadFinal);
  };

  const handleGuardarBrazoPersonalizado = async () => {
    const nombreLimpio = nombreBrazoPersonalizado.trim();
    const tramosActuales = Array.isArray(params.tramos) ? params.tramos : [];
    if (!nombreLimpio) {
      setMsgBrazoGuardado({ tipo: 'error', texto: 'Ingresa un nombre para guardar el brazo.' });
      return;
    }
    if (tramosActuales.length === 0) {
      setMsgBrazoGuardado({ tipo: 'error', texto: 'Agrega al menos un tramo al brazo antes de guardarlo.' });
      return;
    }

    setGuardandoBrazo(true);
    setMsgBrazoGuardado(null);

    try {
      const esBrazoT = params.tipoBrazo === 'T' || params.tipoBrazo === 'T_BILATERAL';
      const lonTravesanoCm = esBrazoT ? (parseFloat(params.longitudTravesanoT ?? 50) || 0) : 0;
      const desarrolloCm = tramosActuales.reduce((acc, t) => acc + (parseFloat(t.alto || t.longitud || 0)), 0) + lonTravesanoCm;
      const desarrolloTotalM = Number((desarrolloCm / 100).toFixed(3));
      const cantidadDobleces = Math.max(0, tramosActuales.length - 1);

      const costeo = calcularCostosBrazoParametrico(params, tubos, bujes, nivelPrecio);
      let costoTotal = Number(costeo?.total || 0);
      if (params.tieneCaperuza) costoTotal += 25000;
      if (params.tieneVideoportero || params.accesorioVideoportero || params.videoporteroPunta || params.soporteVideoportero) {
        costoTotal += 45000;
      }

      const bujeInicialObj = params.bujeInicial || bujes.find(b => String(b.id) === String(params.bujeInicialId)) || null;
      const bujeFinalObj = params.bujeFinal || bujes.find(b => String(b.id) === String(params.bujeFinalId)) || null;

      const payload = {
        nombre: nombreLimpio,
        tubo_id: tramosActuales[0]?.tuboId ? Number(tramosActuales[0].tuboId) || null : null,
        tramos: tramosActuales,
        buje_inicial_id: params.bujeInicialId || null,
        buje_final_id: params.bujeFinalId || null,
        desarrollo_total_m: desarrolloTotalM,
        cantidad_dobleces: cantidadDobleces,
        costo_total: Math.round(costoTotal),
        configuracion: {
          tipoBrazo: params.tipoBrazo || 'SIMPLE_L',
          longitudTravesanoT: params.longitudTravesanoT || 50,
          conPieDeAmigo: Boolean(params.conPieDeAmigo),
          tieneCaperuza: Boolean(params.tieneCaperuza),
          tieneVideoportero: Boolean(
            params.tieneVideoportero || params.accesorioVideoportero || params.videoporteroPunta || params.soporteVideoportero
          ),
          accesorioPunta: params.accesorioPunta || '',
          bujeInicialId: params.bujeInicialId || '',
          bujeInicial: bujeInicialObj,
          bujeFinalId: params.bujeFinalId || '',
          bujeFinal: bujeFinalObj,
          bujesSeleccionados: params.bujesSeleccionados || [],
          accesoriosSeleccionados: params.accesoriosSeleccionados || [],
          colorPintura: params.colorPintura || '#2563eb',
          nombrePintura: params.nombrePintura || ''
        }
      };

      const res = await fetch(`${API_BASE_URL}/api/brazos-guardados`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || `Error HTTP ${res.status}`);
      }

      setNombreBrazoPersonalizado('');
      setMsgBrazoGuardado({ tipo: 'ok', texto: `Brazo "${nombreLimpio}" guardado en Mis Brazos.` });
    } catch (err) {
      setMsgBrazoGuardado({ tipo: 'error', texto: err.message || 'No se pudo guardar el brazo.' });
    } finally {
      setGuardandoBrazo(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-4 text-xs shadow-sm">
      {categoriasPermitidas.length === 0 ? (
        <div className="p-4 text-center text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
          No tienes módulos de cotización habilitados. Contacta al administrador.
        </div>
      ) : (
      <>
      <div
        className="grid gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200"
        style={{ gridTemplateColumns: `repeat(${categoriasPermitidas.length}, minmax(0, 1fr))` }}
      >
        {categoriasPermitidas.map(cat => (
          <button
            key={cat}
            onClick={() => cambiarCategoria(cat)}
            className={`py-2 font-semibold capitalize rounded-lg text-xs transition ${
              categoriaSel === cat 
                ? 'bg-blue-600 text-white shadow-sm' 
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {!esTotem && (
        <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl p-2">
          <span className="text-[11px] font-semibold text-slate-600">Ubicación / Montaje:</span>
          <div className="grid grid-cols-2 gap-1 bg-slate-200/70 p-0.5 rounded-lg">
            {[
              { id: 'suelo', label: 'A Suelo' },
              { id: 'suspendido', label: 'Suspendido' }
            ].map(op => (
              <button
                key={op.id}
                type="button"
                onClick={() => cambiarUbicacion(op.id)}
                className={`px-3 py-1 rounded-md text-[11px] font-semibold transition ${
                  ubicacion === op.id
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-800'
                }`}
              >
                {op.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {esTotem ? (
        <ConfiguradorTotem
          params={params}
          setParams={setParams}
          laminas={laminas}
          pinturas={pinturas}
        />
      ) : (
        <>
          <div className="space-y-3">
            <span className="font-bold text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-100 pb-1.5 block">
              MATERIAL BASE ({categoriaSel})
            </span>

            {esGabinete && (
              <>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Tipo de Estructura
                  </span>
                  <div className="grid grid-cols-2 gap-1.5 bg-slate-200/70 p-1 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setParams(prev => ({ ...prev, tipoGabinete: 'estandar' }))}
                      className={`py-1.5 px-2 rounded-md text-[11px] font-semibold transition ${
                        (params.tipoGabinete || 'estandar') === 'estandar'
                          ? 'bg-white text-blue-600 shadow-sm'
                          : 'text-slate-600 hover:text-slate-800'
                      }`}
                    >
                      Gabinete Estándar
                    </button>
                    <button
                      type="button"
                      onClick={() => setParams(prev => ({ ...prev, tipoGabinete: 'cofre_exteriores', tipoPuerta: 'normal' }))}
                      className={`py-1.5 px-2 rounded-md text-[11px] font-semibold transition ${
                        params.tipoGabinete === 'cofre_exteriores'
                          ? 'bg-white text-orange-600 shadow-sm'
                          : 'text-slate-600 hover:text-slate-800'
                      }`}
                    >
                      Cofre Exteriores (NEMA)
                    </button>
                  </div>
                  {params.tipoGabinete === 'cofre_exteriores' && (
                    <p className="text-[10px] text-orange-700 bg-orange-50 border border-orange-200 rounded-lg px-2 py-1 leading-snug">
                      Incluye techo/visera voladiza, marco vierteaguas y puerta ciega con chapa cromada.
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-[11px] font-medium text-slate-700 block mb-1">Tipo de Lámina:</label>
                  <select 
                    value={params.laminaId || ''} 
                    onChange={e => setParams(prev => ({ ...prev, laminaId: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium"
                  >
                    <option value="">-- Selecciona Lámina --</option>
                    {laminas.filter(l => l.categorias?.includes(categoriaSel)).map(l => (
                      <option key={l.id} value={l.id}>{l.material} ({l.calibre})</option>
                    ))}
                  </select>
                </div>
                
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-slate-600 text-[11px] font-medium">Alto (cm)</label>
                      <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1 rounded border border-blue-200">
                        ~{unidadesRUCalculadas} RU
                      </span>
                    </div>
                    <input 
                      type="number" 
                      placeholder="0"
                      value={params.alto || ''} 
                      onChange={e => setParams(prev => ({ ...prev, alto: e.target.value }))} 
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-slate-800 font-mono text-center outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                    />
                  </div>
                  <div>
                    <label className="text-slate-600 block mb-1 text-[11px] font-medium">Ancho (cm)</label>
                    <input 
                      type="number" 
                      placeholder="0"
                      value={params.ancho || ''} 
                      onChange={e => setParams(prev => ({ ...prev, ancho: e.target.value }))} 
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-slate-800 font-mono text-center outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                    />
                  </div>
                  <div>
                    <label className="text-slate-600 block mb-1 text-[11px] font-medium">Fondo (cm)</label>
                    <input 
                      type="number" 
                      placeholder="0"
                      value={params.fondo || ''} 
                      onChange={e => setParams(prev => ({ ...prev, fondo: e.target.value }))} 
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-slate-800 font-mono text-center outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                    />
                  </div>
                </div>
              </>
            )}

            {(esPoste || esBrazo) && (
              <div className="space-y-4">
                <SelectorTramos 
                  params={params} 
                  setParams={setParams} 
                  tubos={tubos} 
                  categoriaSel={categoriaSel}
                  modoCliente={modoCliente}
                />

                {esBrazo && (
                  <>
                    <SelectorBujes
                      params={params}
                      setParams={setParams}
                      bujes={bujes}
                      modoCliente={modoCliente}
                    />

                    <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-2">
                      <span className="font-bold text-indigo-800 uppercase block text-[10px] tracking-wider">
                        Guardar Brazo en Catálogo / Mis Brazos
                      </span>
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          value={nombreBrazoPersonalizado}
                          onChange={(e) => setNombreBrazoPersonalizado(e.target.value)}
                          placeholder="Ej. Brazo Tipo L 80cm + Videoportero"
                          className="flex-1 bg-white border border-indigo-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <button
                          type="button"
                          onClick={handleGuardarBrazoPersonalizado}
                          disabled={guardandoBrazo}
                          className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-semibold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1 transition shadow-sm shrink-0"
                        >
                          <BookmarkPlus size={14} />
                          <span>{guardandoBrazo ? 'Guardando...' : 'Guardar'}</span>
                        </button>
                      </div>
                      {msgBrazoGuardado && (
                        <p className={`text-[11px] font-medium ${msgBrazoGuardado.tipo === 'ok' ? 'text-emerald-700' : 'text-red-600'}`}>
                          {msgBrazoGuardado.texto}
                        </p>
                      )}
                    </div>
                  </>
                )}

                {esPoste && (
                  <SelectorBrazosPoste
                    params={params}
                    setParams={setParams}
                    accesorios={accesorios}
                    modoCliente={modoCliente}
                  />
                )}
              </div>
            )}
          </div>

          <SelectorPintura 
            params={params} 
            setParams={setParams} 
            pinturas={pinturas} 
            category={categoriaSel}
            modoCliente={modoCliente}
          />

          {!esGabinete && !esBrazo && (
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <label className="flex items-center gap-2 cursor-pointer text-slate-700 font-medium select-none">
                <input 
                  type="checkbox" 
                  checked={incluirPlatina} 
                  onChange={(e) => manejarCambioPlatina('incluir', e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 bg-slate-100 text-blue-600 focus:ring-0" 
                />
                <span>Incluir Base / Platina de Anclaje</span>
              </label>

              {incluirPlatina && (
                <BaseAnclaje 
                  requiereAnclaje={true}
                  usarPersonalizada={usarPersonalizada}
                  setUsarPersonalizada={(val) => {
                    setUsarPersonalizada(val);
                    setParams(prev => ({ ...prev, usarPersonalizada: val }));
                  }}
                  categoriaSel={categoriaSel}
                  params={params}
                  setParams={setParams}
                  recPlatina={recPlatina}
                  platinaLargo={platinaMedida}
                  setPlatinaLargo={(val) => manejarCambioPlatina('medida', val)}
                  laminaAnclajeId={laminaAnclajeId}
                  setLaminaAnclajeId={(val) => {
                    setLaminaAnclajeId(val);
                    setParams(prev => ({ ...prev, laminaAnclajeId: val }));
                  }}
                  laminas={laminas}
                />
              )}
            </div>
          )}
        </>
      )}

      <ListaAccesorios 
        accesorios={accesorios}
        categoriaSel={categoriaSel}
        params={params}
        setParams={setParams}
        cantidadesAcc={cantidadesAcc}
        setCantidadesAcc={handleSetCantidadesAcc}
        laminas={laminas}
        tubos={tubos}
      />

      <div className="pt-2">
        <button
          onClick={presionarAgregar}
          disabled={cargando || !esFormularioValido}
          className={`w-full font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition text-sm ${
            cargando || !esFormularioValido 
              ? 'bg-slate-300 text-slate-500 cursor-not-allowed opacity-60' 
              : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md active:scale-[0.98]'
          }`}
        >
          <Plus size={18} />
          {cargando ? 'Enviando al Backend...' : 'Añadir a la Cotización'}
        </button>
      </div>
      </>
      )}
    </div>
  );
}
