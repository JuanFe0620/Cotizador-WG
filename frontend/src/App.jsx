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
  
  // Persistencia dual: Backend / LocalStorage sincronizado con el Admin
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

  // Guardar dinámicamente en LocalStorage cuando Admin modifique el estado
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
  const [cargandoCotizacion, setCargandoCotizacion] = useState(false);
  const [errorBackend, setErrorBackend] = useState(null);
  const [mensajeExito, setMensajeExito] = useState(null);

  // Estados para el Historial y Navegación
  const [historialCotizaciones, setHistorialCotizaciones] = useState([]);

  // Control de modo activo para el Visor 3D
  const [editandoFormulario, setEditandoFormulario] = useState(true);

  const [params, setParams] = useState({
    laminaId: '',
    alto: 120,
    ancho: 60,
    fondo: 60,
    tramos: [],
    accesoriosSeleccionados: [],
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

  // Estado para los brazos
  const [brazos, setBrazos] = useState(() => {
    const local = localStorage.getItem('m3_brazos');
    return local ? JSON.parse(local) : [];
  });

  useEffect(() => {
    localStorage.setItem('m3_brazos', JSON.stringify(brazos));
  }, [brazos]);

  const cargarDatosServidor = async () => {
    try {
      const [resLaminas, resTubos, resAcc, resPin, resBrazos] = await Promise.all([
        fetch(`${API_BASE_URL}/api/laminas`).then(r => r.ok ? r.json() : null),
        fetch(`${API_BASE_URL}/api/tubos`).then(r => r.ok ? r.json() : null),
        fetch(`${API_BASE_URL}/api/accesorios`).then(r => r.ok ? r.json() : null),
        fetch(`${API_BASE_URL}/api/pinturas`).then(r => r.ok ? r.json() : null),
        fetch(`${API_BASE_URL}/api/brazos`).then(r => r.ok ? r.json() : null)
      ]);

      if (resLaminas && resLaminas.length > 0) setLaminas(resLaminas);
      if (resTubos && resTubos.length > 0) setTubos(resTubos);
      if (resAcc && resAcc.length > 0) setAccesorios(resAcc);
      if (resPin && resPin.length > 0) setPinturas(resPin);
      if (resBrazos && resBrazos.length > 0) setBrazos(resBrazos);
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

  // Limpieza estricta de parámetros según la categoría seleccionada
  useEffect(() => {
    const esPosteOBrazo = categoriaSel === 'postes' || categoriaSel === 'brazos';
    
    setEditandoFormulario(true);
    setParams(prev => {
      const nuevoState = {
        ...prev,
        accesoriosSeleccionados: [],
        detallesAccesorios: {},
        cantidadesAcc: {},
        tramos: esPosteOBrazo 
          ? [{ id: Date.now(), alto: 150, tuboId: '', forma: 'redondo' }] 
          : []
      };

      // Si cambiamos a Gabinetes o Totems, se eliminan los brazos retenidos
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
    
    // Si es Gabinete/Totem, remover cualquier residuo de brazos pasados por params
    if (esGabinete) {
      delete paramsUnificados.brazo;
      delete paramsUnificados.brazosMontados;
      delete paramsUnificados.brazos;
      delete paramsUnificados.brazoPTZ;
      delete paramsUnificados.brazo_id;
    }

    const tramosFiltrados = esGabinete ? [] : (paramsUnificados.tramos || []);
    const rawAccs = paramsUnificados.accesoriosSeleccionados || [];
    const accsValidos = rawAccs.filter(id => id !== null && id !== undefined && id !== '');

    const paramsParaBackend = {
      ...paramsUnificados,
      tramos: tramosFiltrados,
      accesoriosSeleccionados: accsValidos,
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
        console.warn("El backend respondió con error, usando estimación local.");
      }
    } catch (error) {
      console.warn("Servidor no accesible, calculando ítem localmente...", error);
    }

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
      costoPintura: dataServidor?.costo_pintura_venta || 18500,
      costoTubos: dataServidor?.costo_tubos_venta || 0,
      areaPintable: dataServidor?.area_m2 || 1.5,
      alto: paramsParaBackend.alto || 150,
      ancho: paramsParaBackend.ancho || 50,
      fondo: paramsParaBackend.fondo || 30,

      incluirBase: paramsParaBackend.incluirBase,
      incluirPlatina: paramsParaBackend.incluirPlatina,
      formaBase: paramsParaBackend.formaBase,
      ladoBase: paramsParaBackend.ladoBase,
      laminaAnclajeId: paramsParaBackend.laminaAnclajeId,
      incluirPiesAmigo: paramsParaBackend.incluirPiesAmigo,
      cantidadPies: paramsParaBackend.cantidadPies,
      altoCartela: paramsParaBackend.altoCartela,

      tramos: tramosFiltrados,
      accesoriosSeleccionados: paramsParaBackend.accesoriosSeleccionados,
      detallesAccesorios: paramsParaBackend.detallesAccesorios,
      cantidadesAcc: paramsUnificados.cantidadesAcc,
      accesoriosLista: dataServidor?.accesorios_lista || [],
      costoBase: dataServidor?.costo_base || 401758,
      total: dataServidor?.precio_venta || 420258
    };

    setItemsCotizacion(prev => [...prev, nuevoItem]);

    setParams(prev => {
      const res = {
        ...prev,
        accesoriosSeleccionados: [],
        detallesAccesorios: {},
        cantidadesAcc: {},
        tramos: (categoriaSel === 'postes' || categoriaSel === 'brazos') 
          ? [{ id: Date.now(), alto: 150, tuboId: '', forma: 'redondo' }]
          : []
      };

      if (esGabinete) {
        delete res.brazo;
        delete res.brazosMontados;
        delete res.brazos;
        delete res.brazoPTZ;
      }

      return res;
    });

    setEditandoFormulario(false);
    setCargandoCotizacion(false);
  };

  const handleGuardarCotizacionBD = async () => {
    if (itemsCotizacion.length === 0) {
      alert("No hay ítems para guardar en la cotización.");
      return;
    }

    const totalCotizacion = itemsCotizacion.reduce((acc, curr) => acc + (curr.total || 0), 0);

    try {
      const res = await fetch(`${API_BASE_URL}/api/cotizaciones/guardar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consecutivo: consecutivo,
          clienteNombre: 'Cliente General (Sin NIT)',
          nivelPrecio: nivelPrecio,
          total: totalCotizacion,
          items: itemsCotizacion
        })
      });

      if (!res.ok) throw new Error("Error en la petición de guardado");

      const data = await res.json();
      setMensajeExito(`Cotización ${data.consecutivo_guardado} guardada correctamente.`);
      
      setConsecutivo(data.siguiente_consecutivo);
      setItemsCotizacion([]);
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

      if (itemsCargados.length > 0) {
        const primerItem = itemsCargados[0];
        const detalles = primerItem.detalles || {};
        
        const catRecuperada = (primerItem.categoria || data.categoria || 'gabinetes').toLowerCase();
        setCategoriaSel(catRecuperada);

        const altoReal = parseFloat(primerItem.alto || detalles.alto || 150);
        const anchoReal = parseFloat(primerItem.ancho || detalles.ancho || 50);
        const fondoReal = parseFloat(primerItem.fondo || detalles.fondo || 30);
        const laminaReal = primerItem.laminaId || detalles.laminaId || primerItem.lamina || '';

        setParams(prev => ({
          ...prev,
          ...detalles,
          ...primerItem,
          categoria: catRecuperada,
          alto: altoReal,
          ancho: anchoReal,
          fondo: fondoReal,
          laminaId: laminaReal,
          incluirBase: primerItem.incluirBase ?? detalles.incluirBase ?? true,
          incluirPlatina: primerItem.incluirPlatina ?? detalles.incluirPlatina ?? true,
          formaBase: primerItem.formaBase || detalles.formaBase || 'Base Redonda',
          ladoBase: primerItem.ladoBase || detalles.ladoBase || 25,
          colorPintura: primerItem.colorPintura || detalles.colorPintura || primerItem.pintura || '#2563eb',
          nombrePintura: primerItem.nombrePintura || primerItem.pintura || 'Estándar',
          tramos: primerItem.tramos || detalles.tramos || prev.tramos,
          accesoriosSeleccionados: primerItem.accesoriosSeleccionados || detalles.accesoriosSeleccionados || [],
          detallesAccesorios: primerItem.detallesAccesorios || detalles.detallesAccesorios || {},
          cantidadesAcc: primerItem.cantidadesAcc || detalles.cantidadesAcc || {}
        }));
      }

      setEditandoFormulario(false);
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
      {/* HEADER MODO CLARO */}
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
            params={params} setParams={actualizarParams}
          />
        )}
      </main>
    </div>
  );
}