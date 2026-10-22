/**
 * Utilidad de costeo para el módulo de "Brazos / Soportes de Cámaras".
 *
 * Soporta:
 * - Tipo 'SIMPLE_L' (Simple / En L): Tramos tubulares seleccionados + buje base + buje punta.
 * - Tipo 'T' (Brazo en T - Doble Cámara): Suma el travesaño en T, 2 bujes en los extremos y 1 soldadura en T.
 * - Switch 'conPieDeAmigo' (booleano): Suma internamente la varilla diagonal de refuerzo y 2 puntos de soldadura.
 * - Checkboxes adicionales:
 *   1. Caperuza / Cubre-anclaje Embellecedora (+ $25.000)
 *   2. Accesorio Videoportero en Punta de Brazo (+ $45.000)
 */

export const TIPOS_BRAZO = {
  SIMPLE_L: 'SIMPLE_L',
  T: 'T'
};

export const PRECIO_METRO_VARILLA_PIE = 14500;
export const COSTO_SOLDADURA_UNION_T = 15000;
export const COSTO_SOLDADURA_PUNTO_PIE = 9000;
export const PRECIO_CAPERUZA_EMBELLECEDORA = 25000;
export const PRECIO_ACCESORIO_VIDEOPORTERO = 45000;

export function evaluarPieDeAmigoActivo(params = {}) {
  return params.conPieDeAmigo === true;
}

export function evaluarTieneCaperuza(params = {}) {
  return Boolean(
    params.tieneCaperuza ??
    params.caperuzaEmbellecedora ??
    params.caperuzaBase ??
    params.cubreAnclaje ??
    params.caperuza
  );
}

export function evaluarTieneVideoportero(params = {}) {
  return Boolean(
    params.tieneVideoportero ??
    params.accesorioVideoportero ??
    params.videoporteroPunta ??
    params.soporteVideoportero ??
    params.accesorioPunta === 'videoportero'
  );
}

export function calcularCostosBrazoParametrico(
  params = {},
  catalogoTubos = [],
  catalogoBujes = [],
  nivelPrecio = 1
) {
  const factorMargen = nivelPrecio === 1 ? 1.55 : 2.2;
  const esBrazoT = params.tipoBrazo === 'T' || params.tipoBrazo === 'T_BILATERAL';
  const conPieDeAmigo = params.conPieDeAmigo === true;
  const tieneCaperuza = evaluarTieneCaperuza(params);
  const tieneVideoportero = evaluarTieneVideoportero(params);

  const tramos = Array.isArray(params.tramos) && params.tramos.length > 0
    ? params.tramos
    : [{ id: 1, alto: 60, tuboId: '' }];

  const resolverTubo = (tuboId, fallbackTramo = {}) => {
    const encontrado = (catalogoTubos || []).find(t => String(t.id) === String(tuboId));
    if (encontrado) return encontrado;
    return {
      id: tuboId || 'tubo_default',
      nombre: fallbackTramo.nombreTubo || 'Tubo Redondo 2"',
      forma: fallbackTramo.forma || 'redondo',
      diametro_pulg: fallbackTramo.diametro || 2.0,
      precio_tira_6m: 40000
    };
  };

  let costoTubosBase = 0;
  let longitudTotalTubosCm = 0;

  tramos.forEach((tramo) => {
    const lonCm = Math.max(0, parseFloat(tramo.alto ?? tramo.longitud ?? 60) || 0);
    const tuboObj = resolverTubo(tramo.tuboId || tramo.tubo_id, tramo);
    const precioTira6m = parseFloat(tuboObj.precio_tira_6m || tuboObj.precio || 40000);
    costoTubosBase += (precioTira6m / 600.0) * lonCm * 2.0;
    longitudTotalTubosCm += lonCm;
  });

  if (esBrazoT) {
    const lonTravesanoCm = Math.max(20, parseFloat(params.longitudTravesanoT ?? params.longitudTravesanoTCm ?? 50) || 50);
    const ultimoTramo = tramos[tramos.length - 1] || {};
    const tuboTrav = resolverTubo(ultimoTramo.tuboId || ultimoTramo.tubo_id, ultimoTramo);
    const precioTira6m = parseFloat(tuboTrav.precio_tira_6m || tuboTrav.precio || 40000);
    costoTubosBase += (precioTira6m / 600.0) * lonTravesanoCm * 2.0;
    longitudTotalTubosCm += lonTravesanoCm;
  }

  const costoTubosVenta = costoTubosBase * factorMargen;

  // Pie de amigo (solo si conPieDeAmigo === true)
  let longitudVarillaCm = 0;
  let costoVarillaBase = 0;
  let costoVarillaVenta = 0;

  if (conPieDeAmigo) {
    const lonSalienteCm = Math.max(20, parseFloat(tramos[0]?.alto ?? tramos[0]?.longitud ?? 60) || 60);
    const catetoH = Math.max(15, lonSalienteCm * 0.65);
    const catetoV = Math.max(18, Math.min(40, lonSalienteCm * 0.45));
    longitudVarillaCm = Math.sqrt(catetoH * catetoH + catetoV * catetoV);
    costoVarillaBase = (longitudVarillaCm / 100.0) * PRECIO_METRO_VARILLA_PIE;
    costoVarillaVenta = costoVarillaBase * factorMargen;
  }

  // Soldaduras adicionales
  const unionesT = esBrazoT ? 1 : 0;
  const puntosSoldaduraPie = conPieDeAmigo ? 2 : 0;
  const costoSoldaduraVenta =
    unionesT * COSTO_SOLDADURA_UNION_T + puntosSoldaduraPie * COSTO_SOLDADURA_PUNTO_PIE;

  // Bujes seleccionados (Inicial + Final x2 si es T)
  const buscarPrecioBuje = (identificador) => {
    if (!identificador || identificador === 'sin_buje' || identificador === 'none') return 0;
    if (typeof identificador === 'object' && identificador.precio !== undefined) {
      return parseFloat(identificador.precio) || 0;
    }
    const strId = String(typeof identificador === 'object' ? (identificador.id || identificador.nombre) : identificador).trim().toLowerCase();
    const match = (catalogoBujes || []).find(b => {
      if (String(b.id).toLowerCase() === strId || (b.nombre || '').trim().toLowerCase() === strId) return true;
      const slug = (b.nombre || '').trim().toLowerCase().replace(/\s+/g, '_').replace(/[()/]/g, '_');
      return strId.includes(slug) || slug.includes(strId);
    });
    if (match) {
      return parseFloat(match.precio ?? match.precio_venta ?? match.costo ?? 15000);
    }
    return 22000;
  };

  const bujeInicialRef = params.bujeInicial || params.bujeInicialId || params.bujeBase || '';
  const bujeFinalRef = params.bujeFinal || params.bujeFinalId || params.bujePunta || '';
  const cantidadPunta = esBrazoT ? 2 : 1;

  const costoBujeBase = buscarPrecioBuje(bujeInicialRef);
  const costoBujePunta = buscarPrecioBuje(bujeFinalRef) * cantidadPunta;
  const costoBujesYPlatinasTotal = costoBujeBase + costoBujePunta;

  // Elementos adicionales por checkbox: Caperuza (+$25.000) y Videoportero (+$45.000)
  const costoCaperuza = tieneCaperuza ? PRECIO_CAPERUZA_EMBELLECEDORA : 0;
  const costoVideoportero = tieneVideoportero ? PRECIO_ACCESORIO_VIDEOPORTERO : 0;
  const costoAdicionalesBrazo = costoCaperuza + costoVideoportero;

  return {
    tipoBrazo: esBrazoT ? 'T' : 'SIMPLE_L',
    conPieDeAmigo,
    tieneCaperuza,
    tieneVideoportero,
    longitudTotalTubosCm: Number(longitudTotalTubosCm.toFixed(1)),
    longitudVarillaCm: Number(longitudVarillaCm.toFixed(1)),
    costoTubosBase: Math.round(costoTubosBase),
    costoTubosVenta: Math.round(costoTubosVenta),
    costoVarillaBase: Math.round(costoVarillaBase),
    costoVarillaVenta: Math.round(costoVarillaVenta),
    costoSoldaduraVenta: Math.round(costoSoldaduraVenta),
    costoBujesYPlatinasTotal: Math.round(costoBujesYPlatinasTotal),
    costoCaperuza,
    costoVideoportero,
    costoAdicionalesBrazo
  };
}
