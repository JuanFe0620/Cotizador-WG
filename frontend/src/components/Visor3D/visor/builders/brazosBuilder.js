import * as THREE from 'three';
import { renderizarBujeOBase } from './bujesRender.js';

const PULG_A_METROS = 0.0254;
const CM_A_METROS = 0.01;
const MM_A_METROS = 0.001;

/**
 * Convierte un valor numérico o fracción en texto (ej. "1 1/2", "7/8", "2.5") a número flotante.
 */
function parsearNumeroOFraccion(texto) {
  if (typeof texto === 'number' && !isNaN(texto)) return texto;
  if (!texto) return NaN;

  const str = String(texto).trim().replace(',', '.');

  const matchFraccion = str.match(/(?:(\d+)\s+)?(\d+)\s*\/\s*(\d+)/);
  if (matchFraccion) {
    const entero = matchFraccion[1] ? parseFloat(matchFraccion[1]) : 0;
    const num = parseFloat(matchFraccion[2]);
    const den = parseFloat(matchFraccion[3]);
    if (den !== 0) return entero + num / den;
  }

  const matchNum = str.match(/(\d+(?:\.\d+)?)/);
  return matchNum ? parseFloat(matchNum[1]) : NaN;
}

/**
 * Convierte una medida numérica a metros según la unidad detectada en el texto o contexto.
 */
function convertirMedidaAMetros(valor, unidad = 'cm') {
  const num = parseFloat(valor);
  if (isNaN(num) || num <= 0) return 0;

  const u = String(unidad || '').toLowerCase();
  if (u === 'mm' || u.includes('milimetro') || u.includes('milímetro')) {
    return num * MM_A_METROS;
  }
  if (u === 'pulg' || u === 'in' || u === '"' || u.includes('pulgada')) {
    return num * PULG_A_METROS;
  }
  if (u === 'm' || u === 'metro' || u === 'metros') {
    return num;
  }
  return num * CM_A_METROS;
}

/**
 * Parser robusto que detecta el tipo de perfil (redondo, cuadrado, rectangular)
 * y extrae las dimensiones reales en metros a partir del tramo, catálogo de tubos o texto descriptivo.
 */
export function extraerPerfilYDimensionesTubo(tramo = {}, tubosLista = [], params = {}) {
  const tuboId = tramo?.tuboId ?? tramo?.tubo_id ?? params?.tuboId ?? '';
  const tuboObj = Array.isArray(tubosLista)
    ? tubosLista.find((t) => String(t.id) === String(tuboId))
    : null;

  const textoDescriptor = [
    tramo?.tuboNombre,
    tramo?.nombre,
    tramo?.descripcion,
    tramo?.medida,
    tramo?.seccion,
    tramo?.tipoPerfil,
    tramo?.tipoTubo,
    tuboObj?.nombre,
    tuboObj?.descripcion,
    tuboObj?.medida,
    tuboObj?.material,
    params?.seccion,
    params?.tipoPerfil,
    params?.tipoTubo
  ]
    .filter(Boolean)
    .join(' ');

  const formaExplicita = String(
    tramo?.forma ||
    tramo?.tipoPerfil ||
    tramo?.seccion ||
    tuboObj?.forma ||
    tramo?.tipo ||
    tuboObj?.tipo ||
    params?.tipoPerfil ||
    params?.seccion ||
    params?.forma ||
    ''
  ).toLowerCase();

  const textoLower = `${formaExplicita} ${textoDescriptor.toLowerCase()}`;

  const regexAxB = /(\d+(?:[.,]\d+)?(?:\s*\d+\/\d+)?)\s*(["”']|mm|cm|pulg|in)?\s*[xX*×]\s*(\d+(?:[.,]\d+)?(?:\s*\d+\/\d+)?)\s*(["”']|mm|cm|pulg|in)?/i;
  const matchAxB = textoDescriptor.match(regexAxB) || formaExplicita.match(regexAxB);

  let esPrismatico = false;
  if (formaExplicita.includes('redond') || formaExplicita.includes('circul')) {
    esPrismatico = false;
  } else if (
    formaExplicita.includes('cuad') ||
    formaExplicita.includes('rect') ||
    tramo?.esCuadrado === true ||
    params?.esCuadrado === true
  ) {
    esPrismatico = true;
  } else if (
    textoLower.includes('cuad') ||
    textoLower.includes('rect') ||
    Boolean(matchAxB)
  ) {
    esPrismatico = true;
  }

  // --- CASO 1: PERFIL CUADRADO O RECTANGULAR ---
  if (esPrismatico) {
    let anchoM = 0;
    let profundidadM = 0;

    const tuboEsPrismatico = tuboObj && String(tuboObj.forma || '').toLowerCase() !== 'redondo';
    const rawAnchoCm = (tuboEsPrismatico ? tuboObj?.ancho_cm : null) ?? tramo?.ancho_cm ?? tramo?.ancho ?? params?.anchoTubo ?? params?.ancho_cm;
    const rawAltoCm = (tuboEsPrismatico ? tuboObj?.alto_cm : null) ?? tramo?.alto_cm ?? tramo?.profundidad ?? tramo?.altoTubo ?? params?.alto_cm;

    if (matchAxB && (!rawAnchoCm || !tuboEsPrismatico)) {
      const val1 = parsearNumeroOFraccion(matchAxB[1]);
      const uni1 = matchAxB[2] || matchAxB[4] || '';
      const val2 = parsearNumeroOFraccion(matchAxB[3]);
      const uni2 = matchAxB[4] || matchAxB[2] || '';

      let unidadInferida = 'cm';
      if (uni1.includes('"') || uni1.includes('”') || uni1.includes("'") || uni1.toLowerCase().includes('pulg') || uni1.toLowerCase().includes('in')) {
        unidadInferida = 'pulg';
      } else if (uni1.toLowerCase().includes('mm') || textoLower.includes('mm')) {
        unidadInferida = 'mm';
      } else if (uni1.toLowerCase().includes('cm') || textoLower.includes('cm')) {
        unidadInferida = 'cm';
      } else if (val1 >= 20 || val2 >= 20) {
        unidadInferida = 'mm';
      } else if (textoDescriptor.includes('"')) {
        unidadInferida = 'pulg';
      }

      anchoM = convertirMedidaAMetros(val1, unidadInferida);
      profundidadM = convertirMedidaAMetros(val2, uni2 ? (uni2.includes('"') ? 'pulg' : uni2) : unidadInferida);
    }

    if (anchoM <= 0 && rawAnchoCm !== undefined && rawAnchoCm !== null && rawAnchoCm !== '') {
      const numAncho = parsearNumeroOFraccion(rawAnchoCm);
      const unidadAncho = numAncho >= 25 ? 'mm' : 'cm';
      anchoM = convertirMedidaAMetros(numAncho, unidadAncho);
    }

    if (profundidadM <= 0 && rawAltoCm !== undefined && rawAltoCm !== null && rawAltoCm !== '') {
      const numAlto = parsearNumeroOFraccion(rawAltoCm);
      const unidadAlto = numAlto >= 25 ? 'mm' : 'cm';
      profundidadM = convertirMedidaAMetros(numAlto, unidadAlto);
    }

    if (anchoM > 0 && profundidadM <= 0) profundidadM = anchoM;
    if (profundidadM > 0 && anchoM <= 0) anchoM = profundidadM;

    if (anchoM <= 0 || profundidadM <= 0) {
      anchoM = 0.04;
      profundidadM = 0.04;
    }

    const esRectangular = Math.abs(anchoM - profundidadM) > 0.001 || textoLower.includes('rect');
    const diametroEquivalenteM = Math.max(anchoM, profundidadM);

    return {
      tipoPerfil: esRectangular ? 'rectangular' : 'cuadrado',
      esPrismatico: true,
      esCuadrado: !esRectangular,
      esRectangular,
      anchoM,
      profundidadM,
      diametroM: diametroEquivalenteM,
      radioM: diametroEquivalenteM / 2,
      radioEquivalenteM: diametroEquivalenteM / 2
    };
  }

  // --- CASO 2: PERFIL REDONDO / CIRCULAR ---
  let diametroM = 0;
  const tuboEsRedondo = tuboObj && String(tuboObj.forma || 'redondo').toLowerCase() === 'redondo';

  const rawDiametroPulg =
    (tuboEsRedondo ? (tuboObj?.diametro_pulg ?? tuboObj?.diametro) : null) ??
    tramo?.diametro_pulg ??
    tramo?.diametro ??
    params?.diametro_pulg ??
    params?.diametro;

  if (rawDiametroPulg !== undefined && rawDiametroPulg !== null && rawDiametroPulg !== '') {
    const rawStr = String(rawDiametroPulg).toLowerCase();
    const val = parsearNumeroOFraccion(rawDiametroPulg);
    if (!isNaN(val) && val > 0) {
      if (rawStr.includes('mm') || val >= 20) {
        diametroM = convertirMedidaAMetros(val, 'mm');
      } else if (rawStr.includes('cm') || (val > 6 && val < 20)) {
        diametroM = convertirMedidaAMetros(val, 'cm');
      } else {
        diametroM = convertirMedidaAMetros(val, 'pulg');
      }
    }
  }

  if (diametroM <= 0 && textoDescriptor) {
    const textoSinCalibre = textoDescriptor.replace(/cal(?:ibre)?\.?\s*\d+/gi, '');
    const matchPulg = textoSinCalibre.match(/(\d+(?:\s+\d+\/\d+|\.\d+|\/\d+)?)\s*(?:["”']|pulg|in)/i);
    const matchMm = textoSinCalibre.match(/(\d+(?:\.\d+)?)\s*mm/i);
    const matchCm = textoSinCalibre.match(/(\d+(?:\.\d+)?)\s*cm/i);

    if (matchPulg) {
      diametroM = convertirMedidaAMetros(parsearNumeroOFraccion(matchPulg[1]), 'pulg');
    } else if (matchMm) {
      diametroM = convertirMedidaAMetros(parsearNumeroOFraccion(matchMm[1]), 'mm');
    } else if (matchCm) {
      diametroM = convertirMedidaAMetros(parsearNumeroOFraccion(matchCm[1]), 'cm');
    } else {
      const valGen = parsearNumeroOFraccion(textoSinCalibre);
      if (!isNaN(valGen) && valGen > 0) {
        diametroM = valGen >= 20
          ? convertirMedidaAMetros(valGen, 'mm')
          : convertirMedidaAMetros(valGen, 'pulg');
      }
    }
  }

  if (diametroM <= 0) {
    diametroM = 2.0 * PULG_A_METROS;
  }

  const radioM = diametroM / 2;

  return {
    tipoPerfil: 'redondo',
    esPrismatico: false,
    esCuadrado: false,
    esRectangular: false,
    anchoM: diametroM,
    profundidadM: diametroM,
    diametroM,
    radioM,
    radioEquivalenteM: radioM
  };
}

/**
 * Genera una geometría de un solo tubo continuo cuadrado o rectangular a lo largo de un CurvePath.
 */
function crearTuboPrismaticoContinuo(path, segments = 120, anchoM = 0.04, profundidadM = 0.04) {
  const puntos = path.getSpacedPoints(segments);
  const numPuntos = puntos.length;
  const tangentes = [];

  for (let i = 0; i < numPuntos; i++) {
    const u = i / (numPuntos - 1);
    tangentes.push(path.getTangentAt(u).normalize());
  }

  const normales = [];
  const binormales = [];

  const t0 = tangentes[0];
  const refVec = Math.abs(t0.z) < 0.9 ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(1, 0, 0);
  let right = new THREE.Vector3().crossVectors(t0, refVec).normalize();
  let depth = new THREE.Vector3().crossVectors(right, t0).normalize();

  normales.push(right.clone());
  binormales.push(depth.clone());

  for (let i = 1; i < numPuntos; i++) {
    const tPrev = tangentes[i - 1];
    const tCurr = tangentes[i];
    const qStep = new THREE.Quaternion().setFromUnitVectors(tPrev, tCurr);

    right = right.clone().applyQuaternion(qStep).normalize();
    depth = new THREE.Vector3().crossVectors(right, tCurr).normalize();
    right = new THREE.Vector3().crossVectors(tCurr, depth).normalize();

    normales.push(right.clone());
    binormales.push(depth.clone());
  }

  const hw = anchoM / 2;
  const hd = profundidadM / 2;

  const anillos = [];
  for (let i = 0; i < numPuntos; i++) {
    const p = puntos[i];
    const r = normales[i];
    const d = binormales[i];

    const c0 = new THREE.Vector3().copy(p).addScaledVector(r, -hw).addScaledVector(d, -hd);
    const c1 = new THREE.Vector3().copy(p).addScaledVector(r, hw).addScaledVector(d, -hd);
    const c2 = new THREE.Vector3().copy(p).addScaledVector(r, hw).addScaledVector(d, hd);
    const c3 = new THREE.Vector3().copy(p).addScaledVector(r, -hw).addScaledVector(d, hd);
    anillos.push([c0, c1, c2, c3]);
  }

  const positions = [];
  const indices = [];
  let vertOffset = 0;

  const paresCaras = [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 0]
  ];

  paresCaras.forEach(([idxA, idxB]) => {
    for (let i = 0; i < numPuntos; i++) {
      const vA = anillos[i][idxA];
      const vB = anillos[i][idxB];
      positions.push(vA.x, vA.y, vA.z);
      positions.push(vB.x, vB.y, vB.z);
    }

    for (let i = 0; i < numPuntos - 1; i++) {
      const a = vertOffset + i * 2;
      const b = vertOffset + i * 2 + 1;
      const c = vertOffset + (i + 1) * 2 + 1;
      const d = vertOffset + (i + 1) * 2;

      indices.push(a, b, c);
      indices.push(a, c, d);
    }

    vertOffset += numPuntos * 2;
  });

  const ini = anillos[0];
  positions.push(
    ini[0].x, ini[0].y, ini[0].z,
    ini[1].x, ini[1].y, ini[1].z,
    ini[2].x, ini[2].y, ini[2].z,
    ini[3].x, ini[3].y, ini[3].z
  );
  indices.push(vertOffset, vertOffset + 2, vertOffset + 1);
  indices.push(vertOffset, vertOffset + 3, vertOffset + 2);
  vertOffset += 4;

  const fin = anillos[numPuntos - 1];
  positions.push(
    fin[0].x, fin[0].y, fin[0].z,
    fin[1].x, fin[1].y, fin[1].z,
    fin[2].x, fin[2].y, fin[2].z,
    fin[3].x, fin[3].y, fin[3].z
  );
  indices.push(vertOffset, vertOffset + 1, vertOffset + 2);
  indices.push(vertOffset, vertOffset + 2, vertOffset + 3);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  return geometry;
}

export function buildBrazo(params = {}, tubosLista = [], accesoriosLista = [], loader = null) {
  const grupoBrazo = new THREE.Group();
  grupoBrazo.name = 'BrazoArticuladoGroup';

  const tramos = params.tramos || [];
  if (tramos.length === 0) return grupoBrazo;

  // 1. Material del Brazo
  const colorHex = params.colorPintura || params.pintura || params.color || '#2563eb';
  const materialTubo = new THREE.MeshStandardMaterial({
    color: new THREE.Color(colorHex),
    metalness: 0.3,
    roughness: 0.4
  });

  // 2. Origen y medidas reales del tubo seleccionado
  const modoSuelo = params.orientacion === 'suelo' || params.ubicacion === 'suelo';
  const alturaInicial = modoSuelo ? 0.0 : (parseFloat(params.alturaAnclajeCm) || 0) / 100;

  const primerTramo = tramos[0] || {};
  const perfilTubo = extraerPerfilYDimensionesTubo(primerTramo, tubosLista, params);
  const radioTuboM = perfilTubo.radioM;

  // 3. Cálculo de vértices (Lógica matemática original)
  let puntoActual = new THREE.Vector3(0, alturaInicial, 0);
  const puntosVertices = [puntoActual.clone()];
  let dirActual = new THREE.Vector3(0, 1, 0);

  tramos.forEach((tramo, index) => {
    const lonVal = parseFloat(tramo.alto) || parseFloat(tramo.longitud) || 150;
    const lonM = Math.max(lonVal, 1) / 100;
    const angDeg = tramo.angulo !== undefined && tramo.angulo !== '' ? parseFloat(tramo.angulo) : 0;

    if (index === 0) {
      const rad = (angDeg * Math.PI) / 180;
      dirActual = new THREE.Vector3(Math.sin(rad), Math.cos(rad), 0).normalize();
    } else {
      if (angDeg !== 0) {
        const rad = (angDeg * Math.PI) / 180;
        const ejeRot = new THREE.Vector3(1, 0, 0);
        dirActual.applyQuaternion(new THREE.Quaternion().setFromAxisAngle(ejeRot, rad)).normalize();
      }
    }

    puntoActual = puntoActual.clone().add(dirActual.clone().multiplyScalar(lonM));
    puntosVertices.push(puntoActual.clone());
  });

  // 4. Renderizado del Buje Inicial
  const p0 = puntosVertices[0];
  const p1 = puntosVertices[1] || new THREE.Vector3(0, alturaInicial + 1, 0);
  const dirInicial = new THREE.Vector3().subVectors(p1, p0).normalize();

  const bujeInicialVal = params.bujeInicial || params.bujeInicialId || params.buje_inicial_id || params.bujeBase;
  renderizarBujeOBase(loader, bujeInicialVal, p0, dirInicial, materialTubo, grupoBrazo, false, radioTuboM, perfilTubo);

  // 4.1 Caperuza embellecedora / Cubre-anclaje en base
  const tieneCaperuza = Boolean(
    params.tieneCaperuza ||
    params.caperuzaEmbellecedora ||
    params.caperuzaBase ||
    params.cubreAnclaje ||
    params.caperuza ||
    (params.accesoriosSeleccionados || []).some(
      (a) => String(typeof a === 'object' ? a.id : a).toLowerCase().includes('caperuza')
    )
  );

  if (tieneCaperuza) {
    const altoCaperuzaM = 0.085;
    const radioCaperuzaM = Math.max(radioTuboM * 4.6, 0.135);

    const grupoCaperuza = new THREE.Group();
    grupoCaperuza.name = 'CaperuzaEmbellecedoraBase';

    const caperuzaGeo = new THREE.CylinderGeometry(
      radioCaperuzaM,
      radioCaperuzaM,
      altoCaperuzaM,
      48,
      1,
      false
    );
    const caperuzaMesh = new THREE.Mesh(caperuzaGeo, materialTubo);
    caperuzaMesh.position.y = altoCaperuzaM / 2;
    caperuzaMesh.castShadow = true;
    caperuzaMesh.receiveShadow = true;
    grupoCaperuza.add(caperuzaMesh);

    const biselSuperiorGeo = new THREE.TorusGeometry(radioCaperuzaM - 0.003, 0.003, 16, 48);
    biselSuperiorGeo.rotateX(Math.PI / 2);
    const biselSuperior = new THREE.Mesh(biselSuperiorGeo, materialTubo);
    biselSuperior.position.y = altoCaperuzaM;
    grupoCaperuza.add(biselSuperior);

    const collarinCuelloGeo = perfilTubo.esPrismatico
      ? new THREE.BoxGeometry(perfilTubo.anchoM + 0.014, 0.006, perfilTubo.profundidadM + 0.014)
      : new THREE.CylinderGeometry(
          radioTuboM + 0.007,
          radioTuboM + 0.007,
          0.006,
          32
        );
    const collarinCuello = new THREE.Mesh(collarinCuelloGeo, materialTubo);
    collarinCuello.position.y = altoCaperuzaM + 0.003;
    grupoCaperuza.add(collarinCuello);

    const aroBaseGeo = new THREE.TorusGeometry(radioCaperuzaM, 0.0035, 16, 48);
    aroBaseGeo.rotateX(Math.PI / 2);
    const aroBaseMesh = new THREE.Mesh(aroBaseGeo, materialTubo);
    aroBaseMesh.position.y = 0.0035;
    grupoCaperuza.add(aroBaseMesh);

    const cuaternionCaperuza = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      dirInicial
    );
    grupoCaperuza.position.copy(p0);
    grupoCaperuza.quaternion.copy(cuaternionCaperuza);

    grupoBrazo.add(grupoCaperuza);
  }

  // 5. Renderizado del Buje Final o Brazo en T (Doble Cámara en Extremos)
  let bujeFinalVal = params.bujeFinal || params.bujeFinalId || params.buje_final_id || params.bujePunta;
  const tieneVideoporteroPunta = Boolean(
    params.tieneVideoportero ||
    params.accesorioVideoportero ||
    params.videoporteroPunta ||
    params.soporteVideoportero ||
    params.accesorioPunta === 'videoportero' ||
    (params.accesoriosSeleccionados || []).some(
      (a) => String(typeof a === 'object' ? a.id : a).toLowerCase().includes('videoportero')
    )
  );

  const bujeFinalEsVideoportero = Boolean(
    bujeFinalVal &&
    String(typeof bujeFinalVal === 'object' ? (bujeFinalVal.nombre || bujeFinalVal.id) : bujeFinalVal)
      .toLowerCase()
      .includes('videoportero')
  );

  if (tieneVideoporteroPunta && !bujeFinalVal) {
    bujeFinalVal = 'Soporte Videoportero en Punta';
  }

  const esBrazoEnT = params.tipoBrazo === 'T' || params.tipoBrazo === 'T_BILATERAL';

  if (puntosVertices.length >= 2) {
    const pUltimo = puntosVertices[puntosVertices.length - 1];
    const pPenultimo = puntosVertices[puntosVertices.length - 2];
    const dirFinal = new THREE.Vector3().subVectors(pUltimo, pPenultimo).normalize();

    if (esBrazoEnT) {
      const lonTravesanoCm = parseFloat(params.longitudTravesanoT ?? params.longitudTravesanoTCm ?? 50) || 50;
      const lonTravesanoM = Math.max(lonTravesanoCm, 20) / 100;
      const mitadT = lonTravesanoM / 2;

      // Eje transversal horizontal perpendicular a la dirección de llegada del brazo
      const ejeTravesano = Math.abs(dirFinal.x) > 0.7
        ? new THREE.Vector3(0, 0, 1)
        : new THREE.Vector3(1, 0, 0);

      const pExtremoIzq = pUltimo.clone().addScaledVector(ejeTravesano, -mitadT);
      const pExtremoDer = pUltimo.clone().addScaledVector(ejeTravesano, mitadT);

      // Construir el tubo transversal centrado en pUltimo
      const pathTravesano = new THREE.CurvePath();
      pathTravesano.add(new THREE.LineCurve3(pExtremoIzq, pExtremoDer));

      const travesanoGeo = perfilTubo.esPrismatico
        ? crearTuboPrismaticoContinuo(pathTravesano, 32, perfilTubo.anchoM, perfilTubo.profundidadM)
        : new THREE.TubeGeometry(pathTravesano, 32, radioTuboM, 24, false);

      const travesanoMesh = new THREE.Mesh(travesanoGeo, materialTubo);
      travesanoMesh.castShadow = true;
      travesanoMesh.receiveShadow = true;
      grupoBrazo.add(travesanoMesh);

      // Collarín / empalme limpio en la intersección T
      const collarUnionGeo = perfilTubo.esPrismatico
        ? new THREE.BoxGeometry(perfilTubo.anchoM + 0.008, 0.012, perfilTubo.profundidadM + 0.008)
        : new THREE.CylinderGeometry(radioTuboM + 0.004, radioTuboM + 0.004, 0.012, 28);
      const collarUnionMesh = new THREE.Mesh(collarUnionGeo, materialTubo);
      collarUnionMesh.position.copy(pUltimo).addScaledVector(dirFinal, -radioTuboM * 0.6);
      collarUnionMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dirFinal);
      grupoBrazo.add(collarUnionMesh);

      // Colocar las 2 mallas de los bujes en ambos extremos del travesaño (-longitudT/2 y +longitudT/2)
      const dirExtremoIzq = ejeTravesano.clone().negate();
      const dirExtremoDer = ejeTravesano.clone();

      renderizarBujeOBase(loader, bujeFinalVal, pExtremoIzq, dirExtremoIzq, materialTubo, grupoBrazo, true, radioTuboM, perfilTubo);
      renderizarBujeOBase(loader, bujeFinalVal, pExtremoDer, dirExtremoDer, materialTubo, grupoBrazo, true, radioTuboM, perfilTubo);

      if (tieneVideoporteroPunta && bujeFinalVal !== 'Soporte Videoportero en Punta' && !bujeFinalEsVideoportero) {
        renderizarBujeOBase(loader, 'Soporte Videoportero en Punta', pUltimo, dirFinal, materialTubo, grupoBrazo, true, radioTuboM, perfilTubo);
      }
    } else {
      renderizarBujeOBase(loader, bujeFinalVal, pUltimo, dirFinal, materialTubo, grupoBrazo, true, radioTuboM, perfilTubo);
      if (tieneVideoporteroPunta && bujeFinalVal !== 'Soporte Videoportero en Punta' && !bujeFinalEsVideoportero) {
        renderizarBujeOBase(loader, 'Soporte Videoportero en Punta', pUltimo, dirFinal, materialTubo, grupoBrazo, true, radioTuboM, perfilTubo);
      }
    }
  }

  // 6. Pie de Amigo (Varilla de Refuerzo Diagonal) — ÚNICAMENTE si conPieDeAmigo === true
  if (params.conPieDeAmigo === true && puntosVertices.length >= 2) {
    const radioVarillaM = 0.008; // Varilla de refuerzo Ø ~16mm
    let pAnclaje1 = null;
    let pAnclaje2 = null;

    if (puntosVertices.length >= 3) {
      // Si el brazo tiene 2 o más tramos (en L / articulado), une el tramo 1 con el tramo 2 en diagonal
      const v0 = puntosVertices[0];
      const v1 = puntosVertices[1];
      const v2 = puntosVertices[2];

      const vecTramo1 = new THREE.Vector3().subVectors(v0, v1);
      const vecTramo2 = new THREE.Vector3().subVectors(v2, v1);
      const dist1 = Math.min(vecTramo1.length() * 0.6, 0.40);
      const dist2 = Math.min(vecTramo2.length() * 0.6, 0.40);

      pAnclaje1 = v1.clone().addScaledVector(vecTramo1.clone().normalize(), dist1);
      pAnclaje2 = v1.clone().addScaledVector(vecTramo2.clone().normalize(), dist2);
    } else {
      // Si el brazo tiene 1 solo tramo, baja un soporte de pie de amigo desde la base hacia el 65% del brazo
      const v0 = puntosVertices[0];
      const v1 = puntosVertices[1];
      const vecBrazo = new THREE.Vector3().subVectors(v1, v0);
      const lonBrazoM = vecBrazo.length();
      const dirBrazo = vecBrazo.clone().normalize();

      const distBajada = Math.min(0.32, lonBrazoM * 0.55);
      const distAvance = lonBrazoM * 0.65;

      // Vector perpendicular hacia abajo/adentro respecto al tramo
      const dirBajada = Math.abs(dirBrazo.y) > 0.85
        ? new THREE.Vector3(-1, 0, 0)
        : new THREE.Vector3(0, -1, 0);

      pAnclaje1 = v0.clone().addScaledVector(dirBajada, distBajada);
      pAnclaje2 = v0.clone()
        .addScaledVector(dirBrazo, distAvance)
        .addScaledVector(dirBajada, radioTuboM * 0.85);

      // Pequeña platina de apoyo en el punto de bajada P1
      const platinaPieGeo = new THREE.BoxGeometry(0.06, 0.06, 0.008);
      const platinaPieMesh = new THREE.Mesh(platinaPieGeo, materialTubo);
      platinaPieMesh.position.copy(pAnclaje1);
      grupoBrazo.add(platinaPieMesh);
    }

    if (pAnclaje1 && pAnclaje2) {
      const vecDiagonal = new THREE.Vector3().subVectors(pAnclaje2, pAnclaje1);
      const lonVarillaM = vecDiagonal.length();

      if (lonVarillaM > 0.02) {
        const dirVarilla = vecDiagonal.clone().normalize();
        const puntoMedio = new THREE.Vector3().addVectors(pAnclaje1, pAnclaje2).multiplyScalar(0.5);

        const varillaGeo = new THREE.CylinderGeometry(radioVarillaM, radioVarillaM, lonVarillaM, 20);
        const varillaMesh = new THREE.Mesh(varillaGeo, materialTubo);
        varillaMesh.position.copy(puntoMedio);
        varillaMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dirVarilla);
        varillaMesh.castShadow = true;
        varillaMesh.receiveShadow = true;
        grupoBrazo.add(varillaMesh);
      }
    }
  }

  // 7. Path con Curvas Suaves y TubeGeometry (Original)
  const path = new THREE.CurvePath();
  const radioCurva = Math.max(radioTuboM * 2.5, 0.08);

  if (puntosVertices.length <= 2) {
    path.add(new THREE.LineCurve3(puntosVertices[0], puntosVertices[1]));
  } else {
    for (let i = 0; i < puntosVertices.length - 1; i++) {
      const pAct = puntosVertices[i];
      const pSig = puntosVertices[i + 1];

      if (i === 0) {
        const vSig = new THREE.Vector3().subVectors(pSig, pAct).normalize();
        const pFinSeg = new THREE.Vector3().subVectors(pSig, vSig.clone().multiplyScalar(radioCurva));
        path.add(new THREE.LineCurve3(pAct, pFinSeg));
      } else if (i === puntosVertices.length - 2) {
        const pAnt = puntosVertices[i - 1];
        const vAnt = new THREE.Vector3().subVectors(pAct, pAnt).normalize();
        const vSig = new THREE.Vector3().subVectors(pSig, pAct).normalize();

        const pStartCurve = new THREE.Vector3().addVectors(pAct, vAnt.clone().multiplyScalar(-radioCurva));
        const pEndCurve = new THREE.Vector3().addVectors(pAct, vSig.clone().multiplyScalar(radioCurva));

        path.add(new THREE.QuadraticBezierCurve3(pStartCurve, pAct, pEndCurve));
        path.add(new THREE.LineCurve3(pEndCurve, pSig));
      } else {
        const pAnt = puntosVertices[i - 1];
        const vAnt = new THREE.Vector3().subVectors(pAct, pAnt).normalize();
        const vSig = new THREE.Vector3().subVectors(pSig, pAct).normalize();

        const pStartCurve = new THREE.Vector3().addVectors(pAct, vAnt.clone().multiplyScalar(-radioCurva));
        const pEndCurve = new THREE.Vector3().addVectors(pAct, vSig.clone().multiplyScalar(radioCurva));

        path.add(new THREE.QuadraticBezierCurve3(pStartCurve, pAct, pEndCurve));

        const pFinSeg = new THREE.Vector3().subVectors(pSig, vSig.clone().multiplyScalar(radioCurva));
        path.add(new THREE.LineCurve3(pEndCurve, pFinSeg));
      }
    }
  }

  // 8. Renderizado final de un solo tubo continuo (Redondo con TubeGeometry, Cuadrado/Rectangular con barrido continuo)
  const tuboGeometria = perfilTubo.esPrismatico
    ? crearTuboPrismaticoContinuo(path, 160, perfilTubo.anchoM, perfilTubo.profundidadM)
    : new THREE.TubeGeometry(path, 120, radioTuboM, 24, false);

  const tuboMesh = new THREE.Mesh(tuboGeometria, materialTubo);
  tuboMesh.castShadow = true;
  tuboMesh.receiveShadow = true;

  grupoBrazo.add(tuboMesh);

  return grupoBrazo;
}
