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
  caladosFrente = [],
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

  const tieneCaladosReales = Array.isArray(caladosFrente) && caladosFrente.length > 0;
  const profundidadCalado = tieneCaladosReales ? Math.min(0.032, fondoM * 0.55) : 0;
  const hzCuerpo = hz - profundidadCalado;

  // Perfil 2D lateral donde X_2D se transforma en +Z_mundo al aplicar rotateY(-Math.PI / 2):
  // -hz = cara trasera (-Z), +hz = cara frontal (+Z)
  const perfilColumna = new THREE.Shape();
  perfilColumna.moveTo(-hz, espesorPlacaM);
  perfilColumna.lineTo(hzCuerpo, espesorPlacaM);

  if (incluirVisera && vueloVisera > 0) {
    perfilColumna.lineTo(hzCuerpo, alturaInicioBisel);
    if (!tieneCaladosReales) {
      perfilColumna.lineTo(hz + vueloVisera, altoM - caidaPuntaVisera);
      perfilColumna.lineTo(hz + vueloVisera, altoM - caidaPuntaVisera + espesorVisera);
      perfilColumna.lineTo(hz * 0.25, altoM);
    } else {
      perfilColumna.lineTo(hzCuerpo, altoM);
    }
  } else {
    perfilColumna.lineTo(hzCuerpo, altoM);
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

  // Lámina frontal perforada real (THREE.Shape con holes) + visera superior si hay calados en frente
  if (tieneCaladosReales) {
    const alturaTopeFrontal = (incluirVisera && vueloVisera > 0) ? alturaInicioBisel : altoM;
    const hw = anchoM / 2;

    const frenteShape = new THREE.Shape();
    frenteShape.moveTo(-hw, espesorPlacaM);
    frenteShape.lineTo(hw, espesorPlacaM);
    frenteShape.lineTo(hw, alturaTopeFrontal);
    frenteShape.lineTo(-hw, alturaTopeFrontal);
    frenteShape.closePath();

    caladosFrente.forEach((cal) => {
      const mw = Math.min(cal.anchoHueco, anchoM - 0.012) / 2;
      const mh = cal.altoHueco / 2;
      const yMinH = Math.max(espesorPlacaM + 0.008, cal.yPos - mh);
      const yMaxH = Math.min(alturaTopeFrontal - 0.008, cal.yPos + mh);
      if (mw > 0.01 && yMaxH > yMinH + 0.01) {
        const hole = new THREE.Path();
        hole.moveTo(-mw, yMinH);
        hole.lineTo(mw, yMinH);
        hole.lineTo(mw, yMaxH);
        hole.lineTo(-mw, yMaxH);
        hole.closePath();
        frenteShape.holes.push(hole);
      }
    });

    const frenteGeo = new THREE.ExtrudeGeometry(frenteShape, {
      depth: profundidadCalado,
      bevelEnabled: true,
      bevelThickness: 0.002,
      bevelSize: 0.002,
      bevelSegments: 2
    });
    frenteGeo.translate(0, 0, hzCuerpo);

    const frenteMesh = new THREE.Mesh(frenteGeo, matPrincipal);
    frenteMesh.castShadow = true;
    frenteMesh.receiveShadow = true;
    grupoColumna.add(frenteMesh);

    const frenteEdges = new THREE.LineSegments(new THREE.EdgesGeometry(frenteGeo, 25), matBorde);
    grupoColumna.add(frenteEdges);

    // Visera superior independiente sobre el frente perforado
    if (incluirVisera && vueloVisera > 0) {
      const viseraShape = new THREE.Shape();
      viseraShape.moveTo(hzCuerpo, alturaInicioBisel);
      viseraShape.lineTo(hz + vueloVisera, altoM - caidaPuntaVisera);
      viseraShape.lineTo(hz + vueloVisera, altoM - caidaPuntaVisera + espesorVisera);
      viseraShape.lineTo(hz * 0.25, altoM);
      viseraShape.lineTo(hzCuerpo, altoM);
      viseraShape.closePath();

      const viseraGeo = new THREE.ExtrudeGeometry(viseraShape, {
        depth: anchoM,
        bevelEnabled: true,
        bevelThickness: 0.002,
        bevelSize: 0.002,
        bevelSegments: 2
      });
      viseraGeo.translate(0, 0, -anchoM / 2);
      viseraGeo.rotateY(-Math.PI / 2);

      const viseraMesh = new THREE.Mesh(viseraGeo, matPrincipal);
      viseraMesh.castShadow = true;
      viseraMesh.receiveShadow = true;
      grupoColumna.add(viseraMesh);
    }
  }

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
function crearMaterialVideoportero(colorPintura) {
  const baseColor = new THREE.Color(colorPintura || '#1e293b');
  const hsl = { h: 0, s: 0, l: 0 };
  baseColor.getHSL(hsl);

  // Desplazamiento sutil de luminosidad (14%): aclara tonos oscuros y oscurece tonos claros
  const esOscuro = hsl.l < 0.45;
  const nuevaL = esOscuro
    ? Math.min(0.85, hsl.l + 0.14)
    : Math.max(0.12, hsl.l - 0.14);

  const colorTapa = new THREE.Color().setHSL(hsl.h, hsl.s, nuevaL);
  return new THREE.MeshStandardMaterial({
    color: colorTapa,
    metalness: 0.42,
    roughness: 0.34
  });
}

function construirCaperuzaVideoportero({
  anchoM,
  matPrincipal,
  matBorde
}) {
  const grupoCaperuza = new THREE.Group();
  grupoCaperuza.name = 'CaperuzaVideoportero';

  const anchoMaxEquipo = Math.max(anchoM * 0.84, 0.10);
  const escalaVP = 0.165 > anchoMaxEquipo ? anchoMaxEquipo / 0.165 : 1.0;

  const anchoEquipo = 0.165 * escalaVP;
  const altoEquipo = 0.35 * escalaVP;

  const espesorLamina = 0.003;
  const margenX = 0.006;
  const margenY = 0.008;

  const anchoInt = Math.min(anchoEquipo + margenX * 2, anchoM - 0.006);
  const anchoExt = anchoInt + espesorLamina * 2;
  const altoTotal = altoEquipo + margenY * 2;
  const yTop = altoTotal / 2;
  const yBot = -altoTotal / 2;

  const profSup = 0.075;
  const profInf = 0.025;
  const caidaTecho = 0.012;

  // 1. Faldones laterales (izquierdo y derecho) en plano ZY (X_2D -> +Z tras rotateY(-PI/2))
  const faldonShape = new THREE.Shape();
  faldonShape.moveTo(0, yBot);
  faldonShape.lineTo(profInf, yBot);
  faldonShape.lineTo(profSup, yTop - caidaTecho);
  faldonShape.lineTo(0, yTop);
  faldonShape.closePath();

  const faldonGeo = new THREE.ExtrudeGeometry(faldonShape, {
    depth: espesorLamina,
    bevelEnabled: false
  });
  faldonGeo.translate(0, 0, -espesorLamina / 2);
  faldonGeo.rotateY(-Math.PI / 2);

  const faldonEdgesGeo = new THREE.EdgesGeometry(faldonGeo, 25);

  [-1, 1].forEach((signoX) => {
    const posX = signoX * (anchoInt / 2 + espesorLamina / 2);
    const faldonMesh = new THREE.Mesh(faldonGeo, matPrincipal);
    faldonMesh.position.x = posX;
    faldonMesh.castShadow = true;
    faldonMesh.receiveShadow = true;
    grupoCaperuza.add(faldonMesh);

    if (matBorde) {
      const faldonEdges = new THREE.LineSegments(faldonEdgesGeo, matBorde);
      faldonEdges.position.x = posX;
      grupoCaperuza.add(faldonEdges);
    }
  });

  // 2. Techo / visera superior inclinada cubriendo todo el ancho exterior
  const techoShape = new THREE.Shape();
  techoShape.moveTo(0, yTop);
  techoShape.lineTo(profSup, yTop - caidaTecho);
  techoShape.lineTo(profSup, yTop - caidaTecho + espesorLamina);
  techoShape.lineTo(0, yTop + espesorLamina);
  techoShape.closePath();

  const techoGeo = new THREE.ExtrudeGeometry(techoShape, {
    depth: anchoExt,
    bevelEnabled: false
  });
  techoGeo.translate(0, 0, -anchoExt / 2);
  techoGeo.rotateY(-Math.PI / 2);

  const techoMesh = new THREE.Mesh(techoGeo, matPrincipal);
  techoMesh.castShadow = true;
  techoMesh.receiveShadow = true;
  grupoCaperuza.add(techoMesh);

  if (matBorde) {
    const techoEdges = new THREE.LineSegments(new THREE.EdgesGeometry(techoGeo, 25), matBorde);
    grupoCaperuza.add(techoEdges);
  }

  return grupoCaperuza;
}

function construirHuecoMecanizado({
  tipo,
  anchoM,
  altoM,
  matPrincipal,
  matMarco,
  matAcrilico,
  matOscuro,
  matLed,
  matBorde = null,
  matVideoportero = null,
  tieneCaperuzaVideoportero = false,
  loader = null
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
    // 'videoportero': Renderiza el modelo 3D real Plano Botones.glb rotado 180° (círculo grande abajo)
    if (loader) {
      const subGrupo = new THREE.Group();
      grupo.add(subGrupo);

      const construirFallbackProcedural = () => {
        const anchoModulo = Math.min(anchoM * 0.68, 0.165);
        const altoModulo = 0.21;
        const marcoGeo = new THREE.BoxGeometry(anchoModulo, altoModulo, 0.012);
        const marcoMesh = new THREE.Mesh(marcoGeo, matMarco);
        marcoMesh.position.z = 0.005;
        marcoMesh.castShadow = true;
        subGrupo.add(marcoMesh);
      };

      loader.load(
        encodeURI('/models/Plano Botones.glb'),
        (gltf) => {
          const model = gltf.scene;
          // Girar 180° en Y (-Math.PI / 2 = Math.PI / 2 + Math.PI) para que el frente mire hacia +Z
          // y mantener la rotación de 180° en Z para que el círculo grande quede abajo
          model.rotation.y = -Math.PI / 2;
          const pivoteRot = new THREE.Group();
          pivoteRot.add(model);
          pivoteRot.rotation.z = Math.PI;

          // Ajustar escala si el tótem es más angosto que el equipo (16.5 cm)
          const anchoMaxEquipo = Math.max(anchoM * 0.84, 0.10);
          if (0.165 > anchoMaxEquipo) {
            const escala = anchoMaxEquipo / 0.165;
            pivoteRot.scale.setScalar(escala);
          }

          pivoteRot.updateMatrixWorld(true);
          const box = new THREE.Box3().setFromObject(pivoteRot);
          const center = box.getCenter(new THREE.Vector3());
          // Montaje empotrado a ras: la caja trasera queda dentro del tótem (z < 0)
          // y solo el frente/bisel sobresale 4 mm hacia afuera (+Z)
          pivoteRot.position.set(-center.x, -center.y, -box.max.z + 0.004);

          pivoteRot.traverse((child) => {
            if (child.isMesh) {
              if (matVideoportero) {
                child.material = matVideoportero;
              }
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });

          subGrupo.add(pivoteRot);
        },
        undefined,
        (err) => {
          console.warn('Error cargando Plano Botones.glb en Tótem, usando fallback:', err);
          construirFallbackProcedural();
        }
      );
    } else {
      const anchoModulo = Math.min(anchoM * 0.68, 0.165);
      const altoModulo = 0.21;

      const marcoGeo = new THREE.BoxGeometry(anchoModulo, altoModulo, 0.012);
      const marcoMesh = new THREE.Mesh(marcoGeo, matMarco);
      marcoMesh.position.z = 0.005;
      marcoMesh.castShadow = true;
      grupo.add(marcoMesh);
    }

    if (tieneCaperuzaVideoportero) {
      const caperuzaVP = construirCaperuzaVideoportero({
        anchoM,
        matPrincipal,
        matBorde
      });
      grupo.add(caperuzaVP);
    }
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
  const tieneCaperuzaVideoportero = Boolean(
    params.caperuzaVideoportero ||
    params.tieneCaperuzaVideoportero ||
    params.caperuza_videoportero ||
    params.tieneCaperuza ||
    params.caperuza
  );
  const tieneLprFrente = listaFrente.includes('lpr');
  const matVideoportero = crearMaterialVideoportero(colorPintura);

  const alturaInicioBiselFrente = altoM - (tieneLprFrente ? 0.13 : 0.095);
  const alturaTopeFrontal = incluirVisera ? alturaInicioBiselFrente : altoM;

  const anchoMaxEquipoVP = Math.max(anchoM * 0.84, 0.10);
  const escalaVP = 0.165 > anchoMaxEquipoVP ? anchoMaxEquipoVP / 0.165 : 1.0;
  const anchoHuecoVP = Math.max(0.06, 0.165 * escalaVP - 0.016);
  const altoHuecoVP = Math.max(0.10, 0.35 * escalaVP - 0.016);

  const alturasFrente = calcularAlturasMecanizados(listaFrente, altoM).map((yPos, idx) => {
    if (listaFrente[idx] === 'videoportero') {
      const yMaxSeguro = alturaTopeFrontal - (0.35 * escalaVP) / 2 - 0.015;
      const yMinSeguro = espesorPlacaM + (0.35 * escalaVP) / 2 + 0.015;
      return Math.max(yMinSeguro, Math.min(yPos, yMaxSeguro));
    }
    return yPos;
  });

  const caladosFrente = listaFrente
    .map((tipo, idx) =>
      tipo === 'videoportero'
        ? {
            yPos: alturasFrente[idx] ?? altoM * 0.7,
            anchoHueco: anchoHuecoVP,
            altoHueco: altoHuecoVP
          }
        : null
    )
    .filter(Boolean);

  // 4. Columna orientada con frente y visera hacia +Z
  const columnaGroup = construirColumnaOrientada({
    altoM,
    anchoM,
    fondoM,
    espesorPlacaM,
    incluirVisera,
    tieneLprFrente,
    caladosFrente,
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
      matLed,
      matBorde,
      matVideoportero,
      tieneCaperuzaVideoportero,
      loader
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
      matLed,
      matBorde,
      matVideoportero,
      tieneCaperuzaVideoportero,
      loader
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
