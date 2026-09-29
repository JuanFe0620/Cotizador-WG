import React, { useEffect } from 'react';
import { Shield, Sliders, Layers, Settings2 } from 'lucide-react';

export const OPCIONES_MECANIZADO_FRONTAL = [
  {
    id: 'videoportero',
    label: 'Calado Videoportero / Control de Acceso',
    costoBase: 35000
  },
  {
    id: 'lpr',
    label: 'Ventana LPR con visera/acrílico',
    costoBase: 50000
  },
  {
    id: 'biometrico',
    label: 'Lector Biométrico / Teclado',
    costoBase: 35000
  }
];

export const OPCIONES_MECANIZADO_TRASERO = [
  {
    id: 'tapa_registro',
    label: 'Tapa de inspección/registro con chapa',
    costoBase: 35000
  },
  {
    id: 'videoportero',
    label: 'Calado Videoportero / Control de Acceso',
    costoBase: 35000
  },
  {
    id: 'biometrico',
    label: 'Lector Biométrico / Teclado',
    costoBase: 35000
  },
  {
    id: 'lpr',
    label: 'Ventana LPR con visera/acrílico',
    costoBase: 50000
  }
];

const CALIBRES_DEFECTO = [
  { id: 'CR-16', material: 'Cold Rolled', calibre: 'Calibre 16 (1.5 mm)' },
  { id: 'CR-14', material: 'Cold Rolled', calibre: 'Calibre 14 (1.9 mm)' },
  { id: 'GALV-16', material: 'Galvanizada', calibre: 'Calibre 16 (1.5 mm)' },
  { id: 'GALV-14', material: 'Galvanizada', calibre: 'Calibre 14 (1.9 mm)' }
];

const COLORES_ELECTROSTATICA = [
  { id: 'negro_texturizado', nombre: 'Negro Microtexturizado', hex: '#1e293b' },
  { id: 'gris_grafito', nombre: 'Gris Grafito RAL 7024', hex: '#334155' },
  { id: 'azul_corporativo', nombre: 'Azul Electro-Industrial', hex: '#2563eb' },
  { id: 'amarillo_vial', nombre: 'Amarillo Seguridad Vial', hex: '#eab308' },
  { id: 'blanco_trafico', nombre: 'Blanco Tráfico RAL 9016', hex: '#e2e8f0' }
];

export default function ConfiguradorTotem({
  params = {},
  setParams,
  laminas = [],
  pinturas = []
}) {
  const laminasTotem = laminas.filter(
    (l) => !l.categorias || l.categorias.includes('totems') || l.categorias.includes('gabinetes')
  );
  const opcionesLamina =
    laminasTotem.length > 0 ? laminasTotem : laminas.length > 0 ? laminas : CALIBRES_DEFECTO;

  useEffect(() => {
    setParams((prev) => {
      const primeraLaminaId =
        prev.laminaId || (opcionesLamina[0]?.id ? String(opcionesLamina[0].id) : 'CR-16');
      const altoInicial = Number(prev.alto) || 150;
      const anchoInicial = Number(prev.ancho) || 25;
      const fondoInicial = Number(prev.fondo) || 15;
      const incluirBase = prev.incluirBase !== undefined ? prev.incluirBase : true;

      const anchoPlatinaInit = Number(prev.anchoPlatina || prev.anchoBase) || anchoInicial + 16;
      const fondoPlatinaInit = Number(prev.fondoPlatina || prev.fondoBase) || fondoInicial + 10;

      const mecanizadosFrenteInit = Array.isArray(prev.mecanizadosFrente)
        ? prev.mecanizadosFrente
        : ['videoportero'];
      const mecanizadosTraserosInit = Array.isArray(prev.mecanizadosTraseros)
        ? prev.mecanizadosTraseros
        : ['tapa_registro'];

      return {
        ...prev,
        categoria: 'totems',
        laminaId: primeraLaminaId,
        laminaAnclajeId: prev.laminaAnclajeId || primeraLaminaId,
        alto: altoInicial,
        alto_cm: altoInicial,
        ancho: anchoInicial,
        ancho_cm: anchoInicial,
        fondo: fondoInicial,
        fondo_cm: fondoInicial,
        cantidadMecanizadosFrente:
          prev.cantidadMecanizadosFrente !== undefined
            ? Number(prev.cantidadMecanizadosFrente)
            : mecanizadosFrenteInit.length,
        mecanizadosFrente: mecanizadosFrenteInit,
        cantidadMecanizadosTraseros:
          prev.cantidadMecanizadosTraseros !== undefined
            ? Number(prev.cantidadMecanizadosTraseros)
            : mecanizadosTraserosInit.length,
        mecanizadosTraseros: mecanizadosTraserosInit,
        viseraSuperior: prev.viseraSuperior !== undefined ? prev.viseraSuperior : true,
        tapaRegistro:
          prev.tapaRegistro !== undefined
            ? prev.tapaRegistro
            : mecanizadosTraserosInit.includes('tapa_registro'),
        incluirBase: incluirBase,
        incluirPlatina: incluirBase,
        anchoPlatina: anchoPlatinaInit,
        fondoPlatina: fondoPlatinaInit,
        anchoBase: anchoPlatinaInit,
        fondoBase: fondoPlatinaInit,
        paresCartelas: prev.paresCartelas || 2,
        colorPintura: prev.colorPintura || prev.pintura || '#1e293b',
        pintura: prev.pintura || prev.colorPintura || '#1e293b'
      };
    });
  }, []);

  const actualizarDimension = (campo, valor) => {
    const numVal = valor === '' ? '' : Number(valor);
    setParams((prev) => {
      const siguiente = {
        ...prev,
        [campo]: valor,
        [`${campo}_cm`]: numVal || 0
      };
      if (campo === 'ancho' && !prev.basePersonalizada && numVal) {
        siguiente.anchoPlatina = numVal + 16;
        siguiente.anchoBase = numVal + 16;
      }
      if (campo === 'fondo' && !prev.basePersonalizada && numVal) {
        siguiente.fondoPlatina = numVal + 10;
        siguiente.fondoBase = numVal + 10;
      }
      return siguiente;
    });
  };

  const cambiarCantidadMecanizados = (cara, nuevaCantidad) => {
    const cant = Number(nuevaCantidad);
    setParams((prev) => {
      if (cara === 'frente') {
        const actuales = Array.isArray(prev.mecanizadosFrente) ? [...prev.mecanizadosFrente] : [];
        let nuevos = actuales.slice(0, cant);
        while (nuevos.length < cant) {
          nuevos.push(nuevos.length === 0 ? 'videoportero' : 'biometrico');
        }
        return {
          ...prev,
          cantidadMecanizadosFrente: cant,
          mecanizadosFrente: nuevos,
          modulos: nuevos
        };
      } else {
        const actuales = Array.isArray(prev.mecanizadosTraseros) ? [...prev.mecanizadosTraseros] : [];
        let nuevos = actuales.slice(0, cant);
        while (nuevos.length < cant) {
          nuevos.push(nuevos.length === 0 ? 'tapa_registro' : 'videoportero');
        }
        return {
          ...prev,
          cantidadMecanizadosTraseros: cant,
          mecanizadosTraseros: nuevos,
          tapaRegistro: nuevos.includes('tapa_registro')
        };
      }
    });
  };

  const cambiarTipoMecanizado = (cara, indice, nuevoTipo) => {
    setParams((prev) => {
      if (cara === 'frente') {
        const lista = [...(prev.mecanizadosFrente || [])];
        lista[indice] = nuevoTipo;
        return {
          ...prev,
          mecanizadosFrente: lista,
          modulos: lista
        };
      } else {
        const lista = [...(prev.mecanizadosTraseros || [])];
        lista[indice] = nuevoTipo;
        return {
          ...prev,
          mecanizadosTraseros: lista,
          tapaRegistro: lista.includes('tapa_registro')
        };
      }
    });
  };

  const mecanizadosFrente = Array.isArray(params.mecanizadosFrente)
    ? params.mecanizadosFrente
    : ['videoportero'];
  const cantFrente =
    params.cantidadMecanizadosFrente !== undefined
      ? Number(params.cantidadMecanizadosFrente)
      : mecanizadosFrente.length;

  const mecanizadosTraseros = Array.isArray(params.mecanizadosTraseros)
    ? params.mecanizadosTraseros
    : ['tapa_registro'];
  const cantTrasera =
    params.cantidadMecanizadosTraseros !== undefined
      ? Number(params.cantidadMecanizadosTraseros)
      : mecanizadosTraseros.length;

  const incluirBase = params.incluirBase !== false;
  const viseraActiva = params.viseraSuperior !== false;
  const colorActual = params.colorPintura || params.pintura || '#1e293b';

  return (
    <div className="space-y-4 text-xs">
      {/* 1. DIMENSIONES DEL TÓTEM */}
      <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-3 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="font-bold text-slate-700 uppercase text-[10px] tracking-wider flex items-center gap-1.5">
            <Sliders size={13} className="text-blue-600" />
            Dimensiones de Columna (cm)
          </span>
          <span className="text-[10px] text-slate-500 font-mono">
            {params.alto || 150} × {params.ancho || 25} × {params.fondo || 15} cm
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2.5">
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-slate-600 text-[11px] font-medium">Altura</label>
              <span className="text-[9px] text-slate-400">120-180</span>
            </div>
            <input
              type="number"
              min={100}
              max={240}
              step={5}
              value={params.alto ?? 150}
              onChange={(e) => actualizarDimension('alto', e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-800 font-mono text-center outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-slate-600 text-[11px] font-medium">Ancho Frontal</label>
              <span className="text-[9px] text-slate-400">15-30</span>
            </div>
            <input
              type="number"
              min={12}
              max={50}
              step={1}
              value={params.ancho ?? 25}
              onChange={(e) => actualizarDimension('ancho', e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-800 font-mono text-center outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-slate-600 text-[11px] font-medium">Profundidad</label>
              <span className="text-[9px] text-slate-400">15-25</span>
            </div>
            <input
              type="number"
              min={10}
              max={40}
              step={1}
              value={params.fondo ?? 15}
              onChange={(e) => actualizarDimension('fondo', e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-800 font-mono text-center outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-1.5 pt-1">
          <span className="text-[10px] text-slate-500 font-medium">Alturas:</span>
          {[
            { label: 'Vehicular (125 cm)', alto: 125, ancho: 22, fondo: 15 },
            { label: 'Peatonal/Estándar (150 cm)', alto: 150, ancho: 25, fondo: 15 },
            { label: 'Doble/Camión (180 cm)', alto: 180, ancho: 30, fondo: 20 }
          ].map((preset) => {
            const esActivo =
              Number(params.alto) === preset.alto && Number(params.ancho) === preset.ancho;
            return (
              <button
                key={preset.label}
                type="button"
                onClick={() =>
                  setParams((prev) => ({
                    ...prev,
                    alto: preset.alto,
                    alto_cm: preset.alto,
                    ancho: preset.ancho,
                    ancho_cm: preset.ancho,
                    fondo: preset.fondo,
                    fondo_cm: preset.fondo,
                    anchoPlatina: prev.basePersonalizada ? prev.anchoPlatina : preset.ancho + 16,
                    fondoPlatina: prev.basePersonalizada ? prev.fondoPlatina : preset.fondo + 10,
                    anchoBase: prev.basePersonalizada ? prev.anchoBase : preset.ancho + 16,
                    fondoBase: prev.basePersonalizada ? prev.fondoBase : preset.fondo + 10
                  }))
                }
                className={`px-2 py-1 rounded-md text-[10px] font-medium transition border ${
                  esActivo
                    ? 'bg-blue-50 border-blue-300 text-blue-700'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. SELECTOR DE CALIBRE DE LÁMINA */}
      <div>
        <label className="text-[11px] font-semibold text-slate-700 block mb-1.5">
          Calibre y Material de Lámina:
        </label>
        <select
          value={params.laminaId || ''}
          onChange={(e) => {
            const val = e.target.value;
            const lamObj = opcionesLamina.find((l) => String(l.id) === String(val));
            setParams((prev) => ({
              ...prev,
              laminaId: val,
              laminaAnclajeId: prev.laminaAnclajeId || val,
              calibre: lamObj ? `${lamObj.material} ${lamObj.calibre}` : val
            }));
          }}
          className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 font-medium"
        >
          <option value="">-- Selecciona Lámina y Calibre --</option>
          {opcionesLamina.map((l) => (
            <option key={l.id} value={l.id}>
              {l.material} - {l.calibre}
            </option>
          ))}
        </select>
      </div>

      {/* 3. MECANIZADOS Y HUECOS DE EQUIPOS (FRENTE Y POSTERIOR) */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-3">
        <span className="font-bold text-slate-700 uppercase text-[10px] tracking-wider flex items-center gap-1.5">
          <Layers size={13} className="text-blue-600" />
          Mecanizados y Huecos de Equipos
        </span>

        {/* CARA FRONTAL (+Z) */}
        <div className="bg-white border border-slate-200 rounded-lg p-2.5 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-800 block">
                Cara Frontal (+Z)
              </span>
              <span className="text-[10px] text-slate-500">
                Perforaciones láser, biseles y visores frontales
              </span>
            </div>
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              {[0, 1, 2].map((num) => (
                <button
                  key={`frente-cant-${num}`}
                  type="button"
                  onClick={() => cambiarCantidadMecanizados('frente', num)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition ${
                    cantFrente === num
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {num} {num === 1 ? 'Hueco' : 'Huecos'}
                </button>
              ))}
            </div>
          </div>

          {cantFrente > 0 && (
            <div className="space-y-2 pt-1 border-t border-slate-100">
              {Array.from({ length: cantFrente }).map((_, idx) => {
                const etiquetaAltura =
                  cantFrente === 1
                    ? 'Altura Estándar (~120-150 cm)'
                    : idx === 0
                    ? 'Superior - Peatonal / Camión (~155 cm)'
                    : 'Inferior - Vehicular (~110 cm)';

                return (
                  <div key={`slot-frente-${idx}`} className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-600 flex justify-between">
                      <span>Módulo Frontal #{idx + 1}</span>
                      <span className="text-blue-600 font-mono">{etiquetaAltura}</span>
                    </label>
                    <select
                      value={mecanizadosFrente[idx] || 'videoportero'}
                      onChange={(e) => cambiarTipoMecanizado('frente', idx, e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-800 text-[11px] font-medium outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {OPCIONES_MECANIZADO_FRONTAL.map((op) => (
                        <option key={op.id} value={op.id}>
                          {op.label}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* CARA TRASERA (-Z) */}
        <div className="bg-white border border-slate-200 rounded-lg p-2.5 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-800 block">
                Cara Trasera / Posterior (-Z)
              </span>
              <span className="text-[10px] text-slate-500">
                Tapa de registro con chapa o módulos posteriores
              </span>
            </div>
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              {[0, 1, 2].map((num) => (
                <button
                  key={`trasera-cant-${num}`}
                  type="button"
                  onClick={() => cambiarCantidadMecanizados('trasera', num)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition ${
                    cantTrasera === num
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {num} {num === 1 ? 'Módulo' : 'Módulos'}
                </button>
              ))}
            </div>
          </div>

          {cantTrasera > 0 && (
            <div className="space-y-2 pt-1 border-t border-slate-100">
              {Array.from({ length: cantTrasera }).map((_, idx) => {
                const etiquetaTrasera =
                  cantTrasera === 1
                    ? 'Posición Central / Estándar'
                    : idx === 0
                    ? 'Posición Superior'
                    : 'Posición Inferior / Registro';

                return (
                  <div key={`slot-trasero-${idx}`} className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-600 flex justify-between">
                      <span>Mecanizado Posterior #{idx + 1}</span>
                      <span className="text-slate-500 font-mono">{etiquetaTrasera}</span>
                    </label>
                    <select
                      value={mecanizadosTraseros[idx] || 'tapa_registro'}
                      onChange={(e) => cambiarTipoMecanizado('trasera', idx, e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-800 text-[11px] font-medium outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {OPCIONES_MECANIZADO_TRASERO.map((op) => (
                        <option key={op.id} value={op.id}>
                          {op.label}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 4. OPCIONES ESTRUCTURALES Y BASE DE ANCLAJE */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-3">
        <span className="font-bold text-slate-700 uppercase text-[10px] tracking-wider flex items-center gap-1.5">
          <Shield size={13} className="text-blue-600" />
          Estructura y Base de Anclaje Lateral
        </span>

        {/* Visera superior inclinada hacia +Z */}
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-700 block">
              Visera Superior Inclinada (+Z)
            </span>
            <span className="text-[10px] text-slate-500">
              Capota frontal biselada cortagotas hacia adelante
            </span>
          </div>
          <div className="grid grid-cols-2 gap-1 bg-slate-200/80 p-0.5 rounded-lg">
            {[
              { val: true, label: 'Sí' },
              { val: false, label: 'No' }
            ].map((op) => (
              <button
                key={op.label}
                type="button"
                onClick={() => setParams((prev) => ({ ...prev, viseraSuperior: op.val }))}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${
                  viseraActiva === op.val
                    ? 'bg-white text-blue-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {op.label}
              </button>
            ))}
          </div>
        </div>

        {/* Base de anclaje paramétrica + pies de amigo laterales en X */}
        <div className="border-t border-slate-200/70 pt-2.5 space-y-2.5">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={incluirBase}
              onChange={(e) => {
                const activo = e.target.checked;
                setParams((prev) => ({
                  ...prev,
                  incluirBase: activo,
                  incluirPlatina: activo
                }));
              }}
              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-0"
            />
            <div>
              <span className="text-[11px] font-semibold text-slate-700 block">
                Base de Anclaje con Cartelas Laterales (Eje X)
              </span>
              <span className="text-[10px] text-slate-500">
                Platina paramétrica + pies de amigo perforados en costados izquierdo/derecho
              </span>
            </div>
          </label>

          {incluirBase && (
            <div className="grid grid-cols-3 gap-2 bg-white p-2.5 rounded-lg border border-slate-200">
              <div>
                <label className="text-[10px] text-slate-600 font-medium block mb-1">
                  Ancho Platina (X cm)
                </label>
                <input
                  type="number"
                  min={18}
                  max={80}
                  value={params.anchoPlatina ?? params.anchoBase ?? Number(params.ancho || 25) + 16}
                  onChange={(e) => {
                    const v = Number(e.target.value) || 0;
                    setParams((prev) => ({
                      ...prev,
                      basePersonalizada: true,
                      anchoPlatina: v,
                      anchoBase: v,
                      ladoBase: v
                    }));
                  }}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-1.5 text-center font-mono text-slate-800"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-600 font-medium block mb-1">
                  Fondo Platina (Z cm)
                </label>
                <input
                  type="number"
                  min={14}
                  max={70}
                  value={params.fondoPlatina ?? params.fondoBase ?? Number(params.fondo || 15) + 10}
                  onChange={(e) => {
                    const v = Number(e.target.value) || 0;
                    setParams((prev) => ({
                      ...prev,
                      basePersonalizada: true,
                      fondoPlatina: v,
                      fondoBase: v
                    }));
                  }}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-1.5 text-center font-mono text-slate-800"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-600 font-medium block mb-1">
                  Cartelas Laterales
                </label>
                <select
                  value={params.paresCartelas || 2}
                  onChange={(e) =>
                    setParams((prev) => ({
                      ...prev,
                      paresCartelas: Number(e.target.value)
                    }))
                  }
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-1.5 text-center font-medium text-slate-800"
                >
                  <option value={1}>1 Par (2 uds)</option>
                  <option value={2}>2 Pares (4 uds)</option>
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 5. SELECTOR DE COLOR DE PINTURA ELECTROSTÁTICA */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="font-bold text-slate-700 uppercase text-[10px] tracking-wider flex items-center gap-1.5">
            <Settings2 size={13} className="text-blue-600" />
            Pintura Electrostática y Horneado
          </span>
          <span className="text-[10px] font-mono text-slate-500 uppercase">{colorActual}</span>
        </div>

        <div className="grid grid-cols-5 gap-1.5">
          {COLORES_ELECTROSTATICA.map((col) => {
            const esColorActivo = colorActual.toLowerCase() === col.hex.toLowerCase();
            return (
              <button
                key={col.id}
                type="button"
                title={col.nombre}
                onClick={() =>
                  setParams((prev) => ({
                    ...prev,
                    colorPintura: col.hex,
                    pintura: col.hex,
                    nombrePintura: col.nombre
                  }))
                }
                className={`flex flex-col items-center gap-1 p-1.5 rounded-lg border transition ${
                  esColorActivo
                    ? 'border-blue-600 bg-blue-50/70 ring-1 ring-blue-500'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <span
                  className="w-6 h-6 rounded-full border border-slate-300 shadow-inner"
                  style={{ backgroundColor: col.hex }}
                />
                <span className="text-[9px] text-slate-600 font-medium truncate w-full text-center">
                  {col.nombre.split(' ')[0]}
                </span>
              </button>
            );
          })}
        </div>

        {pinturas && pinturas.length > 0 && (
          <select
            value={params.tipoPinturaId || ''}
            onChange={(e) => {
              const idPint = e.target.value;
              const pintObj = pinturas.find((p) => String(p.id) === String(idPint));
              setParams((prev) => ({
                ...prev,
                tipoPinturaId: idPint,
                ...(pintObj?.color_hex && {
                  colorPintura: pintObj.color_hex,
                  pintura: pintObj.color_hex
                })
              }));
            }}
            className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-700 text-[11px]"
          >
            <option value="">Acabado Electrostático Estándar (Poliéster Exterior)</option>
            {pinturas.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre || p.tipo} {p.color ? `- ${p.color}` : ''}
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
}
