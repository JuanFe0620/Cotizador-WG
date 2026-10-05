import * as THREE from 'three';

/**
 * Normaliza un identificador de mecanizado a uno de los tipos soportados:
 * 'lpr' | 'videoportero' | 'biometrico' | 'tapa_registro'
 */
function normalizarTipoMecanizado(raw, porDefecto = 'videoportero') {
  const txt = String(raw || '').trim().toLowerCase();
  if (!txt) return porDefecto;
  if (txt.includes('lpr') || txt.includes('ventana') || txt.includes('camara') || txt.includes('pantalla')) {
    return 'lpr';
  }
  if (txt.includes('bio') || txt.includes('teclado') || txt.includes('lector') || txt === 'control_acceso') {
    return 'biometrico';
  }
  if (txt.includes('tapa') || txt.includes('registro') || txt.includes('inspeccion') || txt.includes('chapa')) {
    return 'tapa_registro';
  }
  if (txt.includes('video') || txt.includes('portero') || txt.includes('calado')) {
    return 'videoportero';
  }
  return porDefecto;
}

/**
 * Obtiene las listas de mecanizados frontales (+Z) y traseros (-Z) según params.
 */
function extraerMecanizadosPorCara(params = {}) {
  // 1. Cara Frontal (+Z)
  let listaFrente = [];
  if (Array.isArray(params.mecanizadosFrente)) {
    const cant =
      params.cantidadMecanizadosFrente !== undefined
        ? Number(params.cantidadMecanizadosFrente)
        : params.mecanizadosFrente.length;
    listaFrente = params.mecanizadosFrente
      .slice(0, cant)
      .map((m) => normalizarTipoMecanizado(m, 'videoportero'));
  } else if (params.cantidadMecanizadosFrente === 0) {
    listaFrente = [];
  } else if (Array.isArray(params.modulos) && params.modulos.length > 0) {
    listaFrente = params.modulos.slice(0, 2).map((m) => normalizarTipoMecanizado(m, 'videoportero'));
  } else if (params.tipoFrente) {
    if (params.tipoFrente === 'mixto') {
      listaFrente = ['videoportero', 'biometrico'];
    } else {
      listaFrente = [normalizarTipoMecanizado(params.tipoFrente, 'videoportero')];
    }
  } else {
    listaFrente = ['videoportero'];
  }

  // 2. Cara Trasera (-Z)
  let listaTrasera = [];
  if (Array.isArray(params.mecanizadosTraseros)) {
    const cant =
      params.cantidadMecanizadosTraseros !== undefined
        ? Number(params.cantidadMecanizadosTraseros)
        : params.mecanizadosTraseros.length;
    listaTrasera = params.mecanizadosTraseros
      .slice(0, cant)
      .map((m) => normalizarTipoMecanizado(m, 'tapa_registro'));
  } else if (params.cantidadMecanizadosTraseros === 0 || params.tapaRegistro === false) {
    listaTrasera = [];
  } else {
    listaTrasera = ['tapa_registro'];
  }

  return { listaFrente, listaTrasera };
}

/**
 * Construye la placa base rectangular paramétrica (anchoPlatina en X, fondoPlatina en Z)
 * y los pies de amigo / cartelas en los costados laterales (-X y +X) con perforaciones circulares alineadas.
 */
/**
 * Construye la placa base rectangular paramétrica (anchoPlatina en X, fondoPlatina en Z)
 * y los pies de amigo / cartelas en las caras frontal (+Z) y trasera (-Z) reforzando hacia adelante y atrás.
 */
function construirBaseYCartelasLaterales({
  anchoM,
  fondoM,
  anchoPlatinaM,
  fondoPlatinaM,
  paresCartelas,
  espesorPlacaM,
  matPrincipal,
  matOscuro
}) {
  const grupoBase = new THREE.Group();
  grupoBase.name = 'TotemBaseYCartelas';

  const baseAnchoM = Math.max(anchoPlatinaM, anchoM + 0.04);
  const baseFondoM = Math.max(fondoPlatinaM, fondoM + 0.08);
  const rEsquina = 0.014;

  const hw = baseAnchoM / 2;
  const hd = baseFondoM / 2;

  // Placa base en plano 2D (X = ancho lateral, Y = fondo Z tras rotar)
  const placaShape = new THREE.Shape();
  placaShape.moveTo(-hw + rEsquina, -hd);
  placaShape.lineTo(hw - rEsquina, -hd);
  placaShape.quadraticCurveTo(hw, -hd, hw, -hd + rEsquina);
  placaShape.lineTo(hw, hd - rEsquina);
  placaShape.quadraticCurveTo(hw, hd, hw - rEsquina, hd);
  placaShape.lineTo(-hw + rEsquina, hd);
  placaShape.quadraticCurveTo(-hw, hd, -hw, hd - rEsquina);
  placaShape.lineTo(-hw, -hd + rEsquina);
  placaShape.quadraticCurveTo(-hw, -hd, -hw + rEsquina, -hd);

  // 4 perforaciones de anclaje en las esquinas de la platina
  const offsetHoleX = Math.max(hw - 0.024, anchoM / 2 + 0.02);
  const offsetHoleZ = Math.max(hd - 0.025, fondoM / 2 + 0.02);
  const radioPerforacionBase = 0.0075;

  const coordsAnclajes = [
    [-offsetHoleX, -offsetHoleZ],
    [offsetHoleX, -offsetHoleZ],
    [offsetHoleX, offsetHoleZ],
    [-offsetHoleX, offsetHoleZ]
  ];

  coordsAnclajes.forEach(([hx, hz]) => {
    const hole = new THREE.Path();
    hole.absarc(hx, hz, radioPerforacionBase, 0, Math.PI * 2, false);
    placaShape.holes.push(hole);
  });

  const placaGeo = new THREE.ExtrudeGeometry(placaShape, {
    depth: espesorPlacaM,
    bevelEnabled: true,
    bevelThickness: 0.0015,
    bevelSize: 0.0015,
    bevelSegments: 2
  });
  placaGeo.rotateX(-Math.PI / 2);

  const placaMesh = new THREE.Mesh(placaGeo, matPrincipal);
  placaMesh.castShadow = true;
  placaMesh.receiveShadow = true;
  grupoBase.add(placaMesh);

  // Pies de amigo / Cartelas en el eje Z (Frontal +Z y Trasera -Z reforzando hacia adelante y atrás)
  const alaDisponibleZ = Math.max((baseFondoM - fondoM) / 2 - 0.008, 0.045);
  const altoCartelaM = 0.18;
  const espesorCartelaM = 0.005;

  // Perfil 2D de la cartela:
  // x va desde 0 (pared frontal/trasera de la columna) hasta alaDisponibleZ (hacia el borde de la platina)
  // y va desde 0 (sobre la platina) hasta altoCartelaM (sobre la columna)
  const cartelaShape = new THREE.Shape();
  cartelaShape.moveTo(0, 0);
  cartelaShape.lineTo(alaDisponibleZ, 0);
  cartelaShape.lineTo(alaDisponibleZ, 0.022);
  cartelaShape.lineTo(0.016, altoCartelaM);
  cartelaShape.lineTo(0, altoCartelaM);
  cartelaShape.closePath();

  // Perforaciones circulares alineadas en las cartelas
  const rHoleInf = Math.min(alaDisponibleZ * 0.19, 0.011);
  const agujeroInf = new THREE.Path();
  agujeroInf.absarc(alaDisponibleZ * 0.42, altoCartelaM * 0.27, rHoleInf, 0, Math.PI * 2, false);
  cartelaShape.holes.push(agujeroInf);

  const rHoleSup = Math.min(alaDisponibleZ * 0.14, 0.008);
  const agujeroSup = new THREE.Path();
  agujeroSup.absarc(alaDisponibleZ * 0.28, altoCartelaM * 0.57, rHoleSup, 0, Math.PI * 2, false);
  cartelaShape.holes.push(agujeroSup);

  const cartelaGeo = new THREE.ExtrudeGeometry(cartelaShape, {
    depth: espesorCartelaM,
    bevelEnabled: true,
    bevelThickness: 0.001,
    bevelSize: 0.001,
    bevelSegments: 1
  });
  // Centrar espesor de la cartela en Z local
  cartelaGeo.translate(0, 0, -espesorCartelaM / 2);

  const posicionesX =
    Number(paresCartelas) === 1 ? [0] : [-anchoM * 0.28, anchoM * 0.28];

  // Cara frontal (+Z) y cara trasera (-Z)
  posicionesX.forEach((xPos) => {
    // Cartela frontal (+Z reforzando hacia adelante)
    const cartelaFrontal = new THREE.Mesh(cartelaGeo, matPrincipal);
    cartelaFrontal.position.set(xPos, espesorPlacaM, fondoM / 2);
    cartelaFrontal.rotation.y = -Math.PI / 2;
    cartelaFrontal.castShadow = true;
    cartelaFrontal.receiveShadow = true;
    grupoBase.add(cartelaFrontal);

    // Cartela trasera (-Z reforzando hacia atrás)
    const cartelaTrasera = new THREE.Mesh(cartelaGeo, matPrincipal);
    cartelaTrasera.position.set(xPos, espesorPlacaM, -fondoM / 2);
    cartelaTrasera.rotation.y = Math.PI / 2;
    cartelaTrasera.castShadow = true;
    cartelaTrasera.receiveShadow = true;
    grupoBase.add(cartelaTrasera);
  });

  // Pernos de anclaje en las 4 esquinas
  const pernoGeo = new THREE.CylinderGeometry(0.005, 0.005, espesorPlacaM * 1.35, 12);
  coordsAnclajes.forEach(([hx, hz]) => {
    const perno = new THREE.Mesh(pernoGeo, matOscuro);
    perno.position.set(hx, espesorPlacaM * 0.68, hz);
    grupoBase.add(perno);
  });

  return grupoBase;
}

/**
 * Construye una cámara LPR montada en el lateral (eje X) con soporte saliente.
 */
function construirCamaraLPRLateral({
  lado = 'derecha',
  altoM,
  anchoM,
  fondoM,
  matPrincipal,
  matMarco,
  matOscuro,
  matLed
}) {
  const grupoCamara = new THREE.Group();
  grupoCamara.name = `CamaraLPRLateral_${lado}`;
  const signoX = lado === 'izquierda' ? -1 : 1;

  // Altura ergonómica de detección LPR vehicular/acceso (~78% de la columna o ~1.25m)
  const yCamara = Math.min(altoM - 0.20, Math.max(altoM * 0.78, 1.15));
  const xColumna = signoX * (anchoM / 2);

  // 1. Brida metálica de montaje en la cara lateral de la columna
  const bridaGeo = new THREE.BoxGeometry(0.008, 0.08, 0.08);
  const bridaMesh = new THREE.Mesh(bridaGeo, matMarco);
  bridaMesh.position.set(xColumna + signoX * 0.004, yCamara, 0);
  bridaMesh.castShadow = true;
  grupoCamara.add(bridaMesh);

  // 2. Brazo tubular saliente hacia el lateral (+X o -X)
  const largoBrazoM = 0.14;
  const brazoGeo = new THREE.CylinderGeometry(0.013, 0.013, largoBrazoM, 16);
  brazoGeo.rotateZ(Math.PI / 2);
  const brazoMesh = new THREE.Mesh(brazoGeo, matPrincipal);
  brazoMesh.position.set(xColumna + signoX * (largoBrazoM / 2), yCamara, 0);
  brazoMesh.castShadow = true;
  grupoCamara.add(brazoMesh);

  // 3. Rótula articulada de orientación
  const rotulaGeo = new THREE.SphereGeometry(0.018, 16, 16);
  const rotulaMesh = new THREE.Mesh(rotulaGeo, matMarco);
  rotulaMesh.position.set(xColumna + signoX * largoBrazoM, yCamara, 0);
  grupoCamara.add(rotulaMesh);

  // 4. Carcasa Cámara LPR Tipo Bullet orientada hacia adelante (+Z vehicular)
  const grupoCarcasa = new THREE.Group();
  grupoCarcasa.position.set(xColumna + signoX * largoBrazoM, yCamara, 0);
  grupoCarcasa.rotation.y = -signoX * 0.12; // Leve convergencia hacia el centro del carril
  grupoCarcasa.rotation.x = 0.08;          // Leve inclinación hacia abajo

  // Cuerpo de la cámara
  const cuerpoGeo = new THREE.BoxGeometry(0.062, 0.052, 0.15);
  const cuerpoMesh = new THREE.Mesh(cuerpoGeo, matPrincipal);
  cuerpoMesh.position.set(0, 0, 0.05);
  cuerpoMesh.castShadow = true;
  grupoCarcasa.add(cuerpoMesh);

  // Visera protectora solar/intemperie
  const viseraGeo = new THREE.BoxGeometry(0.070, 0.004, 0.16);
  const viseraMesh = new THREE.Mesh(viseraGeo, matMarco);
  viseraMesh.position.set(0, 0.029, 0.055);
  grupoCarcasa.add(viseraMesh);

  // Frontal óptico oscuro
  const frontalGeo = new THREE.BoxGeometry(0.054, 0.044, 0.004);
  const frontalMesh = new THREE.Mesh(frontalGeo, matOscuro);
  frontalMesh.position.set(0, 0, 0.126);
  grupoCarcasa.add(frontalMesh);

  // Lente LPR
  const lenteGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.006, 20);
  lenteGeo.rotateX(Math.PI / 2);
  const lenteMesh = new THREE.Mesh(lenteGeo, matOscuro);
  lenteMesh.position.set(0, 0.003, 0.128);
  grupoCarcasa.add(lenteMesh);

  // Anillo IR LPR
  const irGeo = new THREE.RingGeometry(0.009, 0.014, 20);
  const irMesh = new THREE.Mesh(irGeo, matLed);
  irMesh.position.set(0, 0.003, 0.130);
  grupoCarcasa.add(irMesh);

  grupoCamara.add(grupoCarcasa);
  return grupoCamara;
}

/**
 * Construye la columna prismática con su frente orientado hacia +Z
 * y la visera superior inclinada proyectándose hacia +Z (adelante).
 */
function construirColumnaOrientada({
  altoM,
  anchoM,
  fondoM,
  espesorPlacaM,
  incluirVisera,
  tieneLprFrente,
  matPrincipal,
  matBorde
}) {
  const grupoColumna = new THREE.Group();
  grupoColumna.name = 'TotemColumnaProcedural';

  const hz = fondoM / 2;
  const vueloVisera = incluirVisera ? (tieneLprFrente ? 0.075 : 0.045) : 0.0;
  const alturaInicioBisel = altoM - (tieneLprFrente ? 0.13 : 0.095);
  const caidaPuntaVisera = tieneLprFrente ? 0.024 : 0.015;
  const espesorVisera = 0.018;

  // Perfil 2D lateral donde X_2D se transforma en +Z_mundo al aplicar rotateY(-Math.PI / 2):
  // -hz = cara trasera (-Z), +hz = cara frontal (+Z)
  const perfilColumna = new THREE.Shape();
  perfilColumna.moveTo(-hz, espesorPlacaM);
  perfilColumna.lineTo(hz, espesorPlacaM);

  if (incluirVisera && vueloVisera > 0) {
    perfilColumna.lineTo(hz, alturaInicioBisel);
    perfilColumna.lineTo(hz + vueloVisera, altoM - caidaPuntaVisera);
    perfilColumna.lineTo(hz + vueloVisera, altoM - caidaPuntaVisera + espesorVisera);
    perfilColumna.lineTo(hz * 0.25, altoM);
  } else {
    perfilColumna.lineTo(hz, altoM);
  }

  perfilColumna.lineTo(-hz, altoM);
  perfilColumna.closePath();

  const columnaGeo = new THREE.ExtrudeGeometry(perfilColumna, {
    depth: anchoM,
    bevelEnabled: true,
    bevelThickness: 0.002,
    bevelSize: 0.002,
    bevelSegments: 2
  });

  // Centrar extrusión y rotar -90° en Y para que +X_2D apunte exactamente hacia +Z (Frente)
  columnaGeo.translate(0, 0, -anchoM / 2);
  columnaGeo.rotateY(-Math.PI / 2);

  const columnaMesh = new THREE.Mesh(columnaGeo, matPrincipal);
  columnaMesh.castShadow = true;
  columnaMesh.receiveShadow = true;
  grupoColumna.add(columnaMesh);

  const edgesGeo = new THREE.EdgesGeometry(columnaGeo, 25);
  const edgesLine = new THREE.LineSegments(edgesGeo, matBorde);
  grupoColumna.add(edgesLine);

  // Faldones laterales de la visera superior en +Z
  if (incluirVisera && vueloVisera > 0) {
    const faldonShape = new THREE.Shape();
    faldonShape.moveTo(hz, alturaInicioBisel);
    faldonShape.lineTo(hz + vueloVisera, altoM - caidaPuntaVisera);
    faldonShape.lineTo(hz + vueloVisera, altoM - caidaPuntaVisera + espesorVisera);
    faldonShape.lineTo(hz, altoM);
    faldonShape.closePath();

    const faldonGeo = new THREE.ExtrudeGeometry(faldonShape, {
      depth: 0.004,
      bevelEnabled: false
    });
    faldonGeo.translate(0, 0, -0.002);
    faldonGeo.rotateY(-Math.PI / 2);

    [-1, 1].forEach((signoX) => {
      const faldon = new THREE.Mesh(faldonGeo, matPrincipal);
      faldon.position.x = signoX * (anchoM / 2 + 0.001);
      faldon.castShadow = true;
      grupoColumna.add(faldon);
    });
  }

  return grupoColumna;
}

/**
 * Crea un módulo/hueco mecanizado empotrado en la lámina (orientado localmente hacia +Z).
 * Si se monta en la cara posterior (-Z), el grupo se rota Math.PI en Y.
 */
function construirHuecoMecanizado({
  tipo,
  anchoM,
  altoM,
  matPrincipal,
  matMarco,
  matAcrilico,
  matOscuro,
  matLed
}) {
  const grupo = new THREE.Group();
  grupo.name = `Mecanizado_${tipo}`;

  if (tipo === 'lpr') {
    // Ventana LPR con visera/acrílico oscuro y óptica doble
    const anchoModulo = Math.min(anchoM * 0.78, 0.20);
    const altoModulo = 0.16;

    // Marco metálico biselado
    const marcoGeo = new THREE.BoxGeometry(anchoModulo, altoModulo, 0.014);
    const marcoMesh = new THREE.Mesh(marcoGeo, matMarco);
    marcoMesh.position.z = 0.006;
    marcoMesh.castShadow = true;
    grupo.add(marcoMesh);

    // Visera individual protectora sobre la ventana LPR
    const capotaSupGeo = new THREE.BoxGeometry(anchoModulo + 0.012, 0.005, 0.042);
    const capotaSup = new THREE.Mesh(capotaSupGeo, matPrincipal);
    capotaSup.position.set(0, altoModulo / 2 + 0.002, 0.020);
    capotaSup.rotation.x = 0.12;
    grupo.add(capotaSup);

    // Panel acrílico polarizado oscuro empotrado
    const acrilicoGeo = new THREE.BoxGeometry(anchoModulo - 0.02, altoModulo - 0.02, 0.006);
    const acrilicoMesh = new THREE.Mesh(acrilicoGeo, matAcrilico);
    acrilicoMesh.position.z = 0.012;
    grupo.add(acrilicoMesh);

    // Lente LPR y anillo iluminador IR
    const lenteGeo = new THREE.CylinderGeometry(0.022, 0.022, 0.008, 24);
    lenteGeo.rotateX(Math.PI / 2);
    const lente = new THREE.Mesh(lenteGeo, matOscuro);
    lente.position.set(-anchoModulo * 0.16, 0, 0.015);
    grupo.add(lente);

    const anilloIrGeo = new THREE.RingGeometry(0.012, 0.018, 24);
    const anilloIr = new THREE.Mesh(anilloIrGeo, matLed);
    anilloIr.position.set(anchoModulo * 0.18, 0, 0.016);
    grupo.add(anilloIr);
  } else if (tipo === 'biometrico') {
    // Lector Biométrico / Teclado con bisel metálico sobresaliente
    const anchoBisel = Math.min(anchoM * 0.70, 0.17);
    const altoBisel = 0.21;

    // Bisel metálico sobresaliente
    const baseBiselGeo = new THREE.BoxGeometry(anchoBisel, altoBisel, 0.022);
    const baseBisel = new THREE.Mesh(baseBiselGeo, matMarco);
    baseBisel.position.z = 0.010;
    baseBisel.castShadow = true;
    grupo.add(baseBisel);

    // Panel acrílico oscuro interior
    const panelGeo = new THREE.BoxGeometry(anchoBisel - 0.018, altoBisel - 0.018, 0.006);
    const panel = new THREE.Mesh(panelGeo, matAcrilico);
    panel.position.z = 0.020;
    grupo.add(panel);

    // Pantalla superior de estado
    const displayGeo = new THREE.BoxGeometry(anchoBisel - 0.042, 0.036, 0.004);
    const display = new THREE.Mesh(displayGeo, matLed);
    display.position.set(0, altoBisel * 0.25, 0.023);
    grupo.add(display);

    // Matriz de teclado (3x4)
    const teclaGeo = new THREE.BoxGeometry(0.016, 0.012, 0.004);
    for (let f = 0; f < 4; f++) {
      for (let c = -1; c <= 1; c++) {
        const tecla = new THREE.Mesh(teclaGeo, matMarco);
        tecla.position.set(c * 0.024, 0.015 - f * 0.019, 0.023);
        grupo.add(tecla);
      }
    }

    // Sensor óptico de huella / tarjeta inferior
    const lectorGeo = new THREE.BoxGeometry(0.032, 0.024, 0.005);
    const lector = new THREE.Mesh(lectorGeo, matLed);
    lector.position.set(0, -altoBisel * 0.34, 0.023);
    grupo.add(lector);
  } else if (tipo === 'tapa_registro') {
    // Tapa de inspección/registro con chapa y celosías de ventilación
    const anchoTapa = Math.max(anchoM * 0.74, 0.13);
    const altoTapa = Math.min(altoM * 0.42, 0.52);

    const tapaGeo = new THREE.BoxGeometry(anchoTapa, altoTapa, 0.006);
    const tapaMesh = new THREE.Mesh(tapaGeo, matPrincipal);
    tapaMesh.position.z = 0.003;
    grupo.add(tapaMesh);

    const bordeTapa = new THREE.LineSegments(
      new THREE.EdgesGeometry(tapaGeo),
      matOscuro
    );
    bordeTapa.position.z = 0.004;
    grupo.add(bordeTapa);

    // Chapa / cerradura metálica
    const cilindroChapaGeo = new THREE.CylinderGeometry(0.010, 0.010, 0.008, 20);
    cilindroChapaGeo.rotateX(Math.PI / 2);
    const chapa = new THREE.Mesh(cilindroChapaGeo, matMarco);
    chapa.position.set(anchoTapa * 0.32, 0, 0.007);
    grupo.add(chapa);

    const bocallaveGeo = new THREE.BoxGeometry(0.003, 0.009, 0.004);
    const bocallave = new THREE.Mesh(bocallaveGeo, matOscuro);
    bocallave.position.set(anchoTapa * 0.32, 0, 0.010);
    grupo.add(bocallave);

    // Ranuras de ventilación cortadas a láser en la tapa
    const ranuraGeo = new THREE.BoxGeometry(anchoTapa * 0.55, 0.004, 0.004);
    for (let i = -2; i <= 2; i++) {
      const ranura = new THREE.Mesh(ranuraGeo, matOscuro);
      ranura.position.set(0, altoTapa * 0.28 + i * 0.012, 0.006);
      grupo.add(ranura);
    }
  } else {
    // 'videoportero': Calado Videoportero / Control de Acceso con marco biselado, acrílico y parlante
    const anchoModulo = Math.min(anchoM * 0.68, 0.165);
    const altoModulo = 0.21;

    const marcoGeo = new THREE.BoxGeometry(anchoModulo, altoModulo, 0.012);
    const marcoMesh = new THREE.Mesh(marcoGeo, matMarco);
    marcoMesh.position.z = 0.005;
    marcoMesh.castShadow = true;
    grupo.add(marcoMesh);

    // Ventana de acrílico oscuro superior
    const acrilicoGeo = new THREE.BoxGeometry(anchoModulo - 0.022, altoModulo * 0.48, 0.006);
    const acrilicoMesh = new THREE.Mesh(acrilicoGeo, matAcrilico);
    acrilicoMesh.position.set(0, altoModulo * 0.15, 0.010);
    grupo.add(acrilicoMesh);

    // Lente de cámara IP
    const aroGeo = new THREE.CylinderGeometry(0.016, 0.016, 0.006, 24);
    aroGeo.rotateX(Math.PI / 2);
    const aro = new THREE.Mesh(aroGeo, matMarco);
    aro.position.set(0, altoModulo * 0.16, 0.012);
    grupo.add(aro);

    const lenteGeo = new THREE.CylinderGeometry(0.010, 0.010, 0.007, 24);
    lenteGeo.rotateX(Math.PI / 2);
    const lente = new THREE.Mesh(lenteGeo, matOscuro);
    lente.position.set(0, altoModulo * 0.16, 0.013);
    grupo.add(lente);

    // Calados láser de parlante/micrófono
    const ranuraAudioGeo = new THREE.BoxGeometry(anchoModulo * 0.52, 0.0035, 0.004);
    for (let i = -1; i <= 1; i++) {
      const ranura = new THREE.Mesh(ranuraAudioGeo, matOscuro);
      ranura.position.set(0, -0.010 + i * 0.008, 0.011);
      grupo.add(ranura);
    }

    // Botón timbre iluminado
    const haloGeo = new THREE.CylinderGeometry(0.014, 0.014, 0.005, 24);
    haloGeo.rotateX(Math.PI / 2);
    const halo = new THREE.Mesh(haloGeo, matLed);
    halo.position.set(0, -altoModulo * 0.25, 0.011);
    grupo.add(halo);

    const botonGeo = new THREE.CylinderGeometry(0.010, 0.010, 0.007, 24);
    botonGeo.rotateX(Math.PI / 2);
    const boton = new THREE.Mesh(botonGeo, matMarco);
    boton.position.set(0, -altoModulo * 0.25, 0.012);
    grupo.add(boton);
  }

  return grupo;
}

/**
 * Calcula las alturas Y en metros para 1 o 2 mecanizados en una cara,
 * respetando alturas ergonómicas estándar (vehicular ~110-130cm, peatonal/camión ~150-180cm).
 */
function calcularAlturasMecanizados(lista, altoM) {
  if (lista.length === 1) {
    const tipo = lista[0];
    if (tipo === 'tapa_registro') {
      return [Math.max(altoM * 0.45, 0.45)];
    }
    // Si hay 1 hueco de equipo, ubicarlo en la zona superior ergonómica (~115-155cm según alto del tótem)
    return [Math.min(altoM - 0.22, Math.max(altoM * 0.76, 0.95))];
  }

  if (lista.length >= 2) {
    // Hueco 1 (Superior: ~150-180cm o 78% de la altura)
    const ySuperior = Math.min(altoM - 0.20, Math.max(altoM * 0.78, 1.05));
    // Hueco 2 (Inferior vehicular o registro: ~105-120cm o 46% de la altura)
    const yInferior =
      lista[1] === 'tapa_registro'
        ? Math.max(altoM * 0.36, 0.38)
        : Math.min(ySuperior - 0.32, Math.max(altoM * 0.50, 0.65));
    return [ySuperior, yInferior];
  }

  return [];
}

/**
 * Construye el grupo 3D completo del Tótem con orientación +Z frontal,
 * base paramétrica, cartelas laterales en X y mecanizados en caras +Z / -Z.
 */
export function buildTotem(params = {}, loader = null, material = null) {
  const grupoTotem = new THREE.Group();
  grupoTotem.name = 'TotemProceduralGroup';

  // 1. Dimensiones del cuerpo en metros
  const rawAlto = parseFloat(params.alto ?? params.alto_cm ?? 150) || 150;
  const rawAncho = parseFloat(params.ancho ?? params.ancho_cm ?? 25) || 25;
  const rawFondo = parseFloat(params.fondo ?? params.fondo_cm ?? 15) || 15;

  const altoM = (rawAlto < 10 ? rawAlto * 100 : rawAlto) / 100;
  const anchoM = (rawAncho < 5 ? rawAncho * 100 : rawAncho) / 100;
  const fondoM = (rawFondo < 5 ? rawFondo * 100 : rawFondo) / 100;
  const espesorPlacaM = 0.008;

  // Dimensiones paramétricas de la platina base
  const rawAnchoPlatina =
    parseFloat(params.anchoPlatina ?? params.anchoBase ?? params.ladoBase) || rawAncho + 16;
  const rawFondoPlatina =
    parseFloat(params.fondoPlatina ?? params.fondoBase) || rawFondo + 10;

  const anchoPlatinaM = (rawAnchoPlatina < 5 ? rawAnchoPlatina * 100 : rawAnchoPlatina) / 100;
  const fondoPlatinaM = (rawFondoPlatina < 5 ? rawFondoPlatina * 100 : rawFondoPlatina) / 100;
  const paresCartelas = Number(params.paresCartelas) || 2;

  // 2. Materiales
  const colorPintura = params.colorPintura || params.pintura || '#1e293b';
  const matPrincipal =
    material ||
    new THREE.MeshStandardMaterial({
      color: new THREE.Color(colorPintura),
      metalness: 0.35,
      roughness: 0.42
    });

  const matMarco = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#94a3b8'),
    metalness: 0.75,
    roughness: 0.25
  });

  const matAcrilico = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#090d16'),
    metalness: 0.85,
    roughness: 0.12
  });

  const matOscuro = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#0f172a'),
    metalness: 0.5,
    roughness: 0.6
  });

  const matLed = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#38bdf8'),
    emissive: new THREE.Color('#0284c7'),
    emissiveIntensity: 0.85,
    roughness: 0.2
  });

  const matBorde = new THREE.LineBasicMaterial({
    color: new THREE.Color('#0f172a'),
    transparent: true,
    opacity: 0.35
  });

  // 3. Mecanizados en frente (+Z) y posterior (-Z)
  const { listaFrente, listaTrasera } = extraerMecanizadosPorCara(params);
  const incluirVisera = params.viseraSuperior !== false;
  const tieneLprFrente = listaFrente.includes('lpr');

  // 4. Columna orientada con frente y visera hacia +Z
  const columnaGroup = construirColumnaOrientada({
    altoM,
    anchoM,
    fondoM,
    espesorPlacaM,
    incluirVisera,
    tieneLprFrente,
    matPrincipal,
    matBorde
  });
  grupoTotem.add(columnaGroup);

  // 5. Base de anclaje paramétrica + cartelas laterales en X (-X y +X)
  const incluirBase = params.incluirBase !== false && params.incluirPlatina !== false;
  if (incluirBase) {
    const baseGroup = construirBaseYCartelasLaterales({
      anchoM,
      fondoM,
      anchoPlatinaM,
      fondoPlatinaM,
      paresCartelas,
      espesorPlacaM,
      matPrincipal,
      matOscuro
    });
    grupoTotem.add(baseGroup);
  }

  // 6. Posicionar mecanizados en la cara frontal (+Z)
  const zFrente = fondoM / 2;
  const alturasFrente = calcularAlturasMecanizados(listaFrente, altoM);
  listaFrente.forEach((tipo, idx) => {
    const yPos = alturasFrente[idx] ?? altoM * 0.7;
    const modMesh = construirHuecoMecanizado({
      tipo,
      anchoM,
      altoM,
      matPrincipal,
      matMarco,
      matAcrilico,
      matOscuro,
      matLed
    });
    modMesh.position.set(0, yPos, zFrente);
    grupoTotem.add(modMesh);
  });

  // 7. Posicionar mecanizados / tapa de registro en la cara posterior (-Z)
  const zTrasero = -fondoM / 2;
  const alturasTraseras = calcularAlturasMecanizados(listaTrasera, altoM);
  listaTrasera.forEach((tipo, idx) => {
    const yPos = alturasTraseras[idx] ?? altoM * 0.48;
    const modTrasero = construirHuecoMecanizado({
      tipo,
      anchoM,
      altoM,
      matPrincipal,
      matMarco,
      matAcrilico,
      matOscuro,
      matLed
    });
    modTrasero.position.set(0, yPos, zTrasero);
    modTrasero.rotation.y = Math.PI; // Mira hacia -Z (hacia atrás)
    grupoTotem.add(modTrasero);
  });

  // 8. Cámaras LPR Laterales (Eje X: Izquierda, Derecha o Ambas)
  const lprLateral = String(
    params.camaraLPRLateral || params.camara_lpr_lateral || params.lprLateral || ''
  ).toLowerCase().trim();

  if (lprLateral === 'izquierda' || lprLateral === 'ambas') {
    const camIzq = construirCamaraLPRLateral({
      lado: 'izquierda',
      altoM,
      anchoM,
      fondoM,
      matPrincipal,
      matMarco,
      matOscuro,
      matLed
    });
    grupoTotem.add(camIzq);
  }

  if (lprLateral === 'derecha' || lprLateral === 'ambas') {
    const camDer = construirCamaraLPRLateral({
      lado: 'derecha',
      altoM,
      anchoM,
      fondoM,
      matPrincipal,
      matMarco,
      matOscuro,
      matLed
    });
    grupoTotem.add(camDer);
  }

  grupoTotem.userData = {
    altoTotemM: altoM,
    anchoTotemM: anchoM,
    fondoTotemM: fondoM
  };

  return grupoTotem;
}

export const construirTotem = buildTotem;
export default buildTotem;
