import * as THREE from 'three';

/**
 * Selección Matricial de Planos CAD por Regla de Alto x Fondo
 */
export const obtenerRutaModeloGabinete = (altoCm, fondoCm) => {
  const alto = parseFloat(altoCm) || 0;
  const fondo = parseFloat(fondoCm) || 0;

  // --- FAMILIA DE FONDO PROFUNDO (Fondo >= 100 cm) ---
  if (fondo >= 100) {
    if (alto <= 119) {
      // Alto 90 cm (o menor a 120 cm)
      return '/models/Gab60X100X90sinRefuerzo.glb';
    } else if (alto >= 120 && alto < 150) {
      // Alto 120 cm
      return '/models/60X100X120.glb';
    } else {
      // Alto >= 150 cm
      return '/models/Gab60X100X150.glb';
    }
  }

  // --- FAMILIA ESTÁNDAR (Fondo < 100 cm, e.g. 60 cm) ---
  if (alto <= 119) {
    return '/models/Gab60X60X90sinRefuerzo.glb';
  } else if (alto >= 120 && alto < 150) {
    return '/models/Gab60X60X120.glb';
  } else {
    return '/models/Gab60X60X150.glb';
  }
};

export const construirCofreExteriores = ({ params, matGenerico, scene }) => {
  const altoUsuario = parseFloat(params?.alto || params?.altoTotalCm || params?.detalles?.alto || params?.altoGabinete) || 90;
  const anchoUsuario = parseFloat(params?.ancho || params?.detalles?.ancho || params?.anchoGabinete) || 60;
  const fondoUsuario = parseFloat(params?.fondo || params?.detalles?.fondo || params?.fondoGabinete) || 60;

  const H = altoUsuario / 100;
  const W = anchoUsuario / 100;
  const D = fondoUsuario / 100;
  const t = Math.min(0.004, Math.max(0.0025, Math.min(W, H, D) * 0.012));

  const grupoCofre = new THREE.Group();
  grupoCofre.name = 'modeloCofreExteriores';

  // 1. CUERPO PRINCIPAL (Caja metálica cerrada por lados, fondo, base y techo)
  const geoFondo = new THREE.BoxGeometry(W, H, t);
  const meshFondo = new THREE.Mesh(geoFondo, matGenerico);
  meshFondo.position.set(0, H / 2, -D / 2 + t / 2);

  const geoLateral = new THREE.BoxGeometry(t, H, D);
  const meshIzq = new THREE.Mesh(geoLateral, matGenerico);
  meshIzq.position.set(-W / 2 + t / 2, H / 2, 0);

  const meshDer = new THREE.Mesh(geoLateral, matGenerico);
  meshDer.position.set(W / 2 - t / 2, H / 2, 0);

  const geoTapa = new THREE.BoxGeometry(W, t, D);
  const meshBase = new THREE.Mesh(geoTapa, matGenerico);
  meshBase.position.set(0, t / 2, 0);

  const meshTechoBase = new THREE.Mesh(geoTapa, matGenerico);
  meshTechoBase.position.set(0, H - t / 2, 0);

  grupoCofre.add(meshFondo, meshIzq, meshDer, meshBase, meshTechoBase);

  // 2. MARCO FRONTAL CON PESTAÑA VIERTEAGUAS (Canaleta perimetral contra lluvia)
  const flangeW = Math.min(0.022, Math.min(W, H) * 0.08);
  const flangeD = 0.012;
  const zFlange = D / 2 - flangeD / 2;

  const marcoSup = new THREE.Mesh(new THREE.BoxGeometry(W, flangeW, flangeD), matGenerico);
  marcoSup.position.set(0, H - flangeW / 2, zFlange);

  const marcoInf = new THREE.Mesh(new THREE.BoxGeometry(W, flangeW, flangeD), matGenerico);
  marcoInf.position.set(0, flangeW / 2, zFlange);

  const marcoIzq = new THREE.Mesh(new THREE.BoxGeometry(flangeW, H - 2 * flangeW, flangeD), matGenerico);
  marcoIzq.position.set(-W / 2 + flangeW / 2, H / 2, zFlange);

  const marcoDer = new THREE.Mesh(new THREE.BoxGeometry(flangeW, H - 2 * flangeW, flangeD), matGenerico);
  marcoDer.position.set(W / 2 - flangeW / 2, H / 2, zFlange);

  // Labio vierteaguas hundido hacia el interior (canaleta perimetral)
  const matCanaleta = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    metalness: 0.45,
    roughness: 0.65
  });
  const labioW = 0.008;
  const labioD = 0.014;
  const zLabio = D / 2 - flangeD - labioD / 2 + 0.004;

  const labioSup = new THREE.Mesh(new THREE.BoxGeometry(W - 2 * flangeW + 0.006, labioW, labioD), matCanaleta);
  labioSup.position.set(0, H - flangeW - labioW / 2 + 0.003, zLabio);

  const labioInf = new THREE.Mesh(new THREE.BoxGeometry(W - 2 * flangeW + 0.006, labioW, labioD), matCanaleta);
  labioInf.position.set(0, flangeW + labioW / 2 - 0.003, zLabio);

  const labioIzq = new THREE.Mesh(new THREE.BoxGeometry(labioW, H - 2 * flangeW, labioD), matCanaleta);
  labioIzq.position.set(-W / 2 + flangeW + labioW / 2 - 0.003, H / 2, zLabio);

  const labioDer = new THREE.Mesh(new THREE.BoxGeometry(labioW, H - 2 * flangeW, labioD), matCanaleta);
  labioDer.position.set(W / 2 - flangeW - labioW / 2 + 0.003, H / 2, zLabio);

  grupoCofre.add(marcoSup, marcoInf, marcoIzq, marcoDer, labioSup, labioInf, labioIzq, labioDer);

  // 3. TECHO / CAPOTA VOLADIZA SUPERIOR (Visera con doblez perimetral hacia abajo ~1.8 cm)
  const overhangFront = Math.min(0.045, D * 0.18);
  const overhangSide = Math.min(0.022, W * 0.06);
  const overhangBack = 0.006;
  const visorW = W + 2 * overhangSide;
  const visorD = D + overhangFront + overhangBack;
  const visorCenterZ = (overhangFront - overhangBack) / 2;
  const doblezH = 0.018;
  const visorT = 0.0035;

  const grupoVisera = new THREE.Group();
  grupoVisera.name = 'techo_visera_voladiza';

  const tapaVisera = new THREE.Mesh(new THREE.BoxGeometry(visorW, visorT, visorD), matGenerico);
  tapaVisera.position.set(0, H + visorT / 2 + 0.002, visorCenterZ);

  const doblezFront = new THREE.Mesh(new THREE.BoxGeometry(visorW, doblezH, visorT), matGenerico);
  doblezFront.position.set(0, H + 0.002 - doblezH / 2 + visorT, visorCenterZ + visorD / 2 - visorT / 2);

  const doblezIzq = new THREE.Mesh(new THREE.BoxGeometry(visorT, doblezH, visorD), matGenerico);
  doblezIzq.position.set(-visorW / 2 + visorT / 2, H + 0.002 - doblezH / 2 + visorT, visorCenterZ);

  const doblezDer = new THREE.Mesh(new THREE.BoxGeometry(visorT, doblezH, visorD), matGenerico);
  doblezDer.position.set(visorW / 2 - visorT / 2, H + 0.002 - doblezH / 2 + visorT, visorCenterZ);

  const doblezBack = new THREE.Mesh(new THREE.BoxGeometry(visorW, doblezH * 0.65, visorT), matGenerico);
  doblezBack.position.set(0, H + 0.002 - (doblezH * 0.65) / 2 + visorT, visorCenterZ - visorD / 2 + visorT / 2);

  grupoVisera.add(tapaVisera, doblezFront, doblezIzq, doblezDer, doblezBack);
  grupoCofre.add(grupoVisera);

  // Material metálico para bisagras y leva de chapa
  const matMetal = new THREE.MeshStandardMaterial({
    color: 0xcbd5e1,
    metalness: 0.85,
    roughness: 0.25
  });

  // 5. PUERTA BATIENTE CIEGA (BISAGRAS DERECHAS) + CHAPA CROMADA (LADO IZQUIERDO)
  const grupoPuerta = new THREE.Group();
  grupoPuerta.name = 'grupo_puerta_cofre';
  const puertaW = W - 0.006;
  const puertaH = H - 0.006;
  grupoPuerta.position.set(W / 2 - 0.003, 0, D / 2 + 0.002);

  const puertaAbierta = params?.puertaAbierta !== false;
  grupoPuerta.rotation.y = puertaAbierta ? THREE.MathUtils.degToRad(40) : 0;

  const panelPuerta = new THREE.Mesh(new THREE.BoxGeometry(puertaW, puertaH, 0.003), matGenerico);
  panelPuerta.position.set(-puertaW / 2, H / 2, 0);
  grupoPuerta.add(panelPuerta);

  // Caja / doblez perimetral de refuerzo interno de la puerta
  const refuerzoAncho = 0.015;
  const refuerzoProf = 0.011;
  const margenRef = 0.016;
  const refZ = -refuerzoProf / 2 - 0.001;

  const refSup = new THREE.Mesh(new THREE.BoxGeometry(puertaW - 2 * margenRef, refuerzoAncho, refuerzoProf), matGenerico);
  refSup.position.set(-puertaW / 2, H - 0.003 - margenRef - refuerzoAncho / 2, refZ);

  const refInf = new THREE.Mesh(new THREE.BoxGeometry(puertaW - 2 * margenRef, refuerzoAncho, refuerzoProf), matGenerico);
  refInf.position.set(-puertaW / 2, 0.003 + margenRef + refuerzoAncho / 2, refZ);

  const refIzq = new THREE.Mesh(new THREE.BoxGeometry(refuerzoAncho, puertaH - 2 * margenRef, refuerzoProf), matGenerico);
  refIzq.position.set(-puertaW + margenRef + refuerzoAncho / 2, H / 2, refZ);

  const refDer = new THREE.Mesh(new THREE.BoxGeometry(refuerzoAncho, puertaH - 2 * margenRef, refuerzoProf), matGenerico);
  refDer.position.set(-margenRef - refuerzoAncho / 2, H / 2, refZ);

  grupoPuerta.add(refSup, refInf, refIzq, refDer);

  // Bisagras laterales en el lado derecho
  const posicionesBisagrasY = H >= 0.8 ? [H * 0.15, H * 0.5, H * 0.85] : [H * 0.18, H * 0.82];
  const geoBisagra = new THREE.CylinderGeometry(0.005, 0.005, 0.03, 12);
  posicionesBisagrasY.forEach((by) => {
    const bisagra = new THREE.Mesh(geoBisagra, matMetal);
    bisagra.position.set(0.002, by, 0.001);
    grupoPuerta.add(bisagra);
  });

  // Chapa cilíndrica cromada tipo moneda/llave en el costado izquierdo medio
  const matCromo = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    metalness: 0.95,
    roughness: 0.12
  });
  const chapaX = -puertaW + Math.min(0.042, puertaW * 0.12);
  const chapaY = H * 0.5;

  const grupoChapa = new THREE.Group();
  grupoChapa.name = 'chapa_cromada_cofre';
  grupoChapa.position.set(chapaX, chapaY, 0.003);

  const biselGeo = new THREE.CylinderGeometry(0.015, 0.016, 0.005, 24);
  biselGeo.rotateX(Math.PI / 2);
  const bisel = new THREE.Mesh(biselGeo, matCromo);

  const cilindroGeo = new THREE.CylinderGeometry(0.01, 0.01, 0.008, 24);
  cilindroGeo.rotateX(Math.PI / 2);
  const cilindro = new THREE.Mesh(cilindroGeo, matCromo);
  cilindro.position.z = 0.003;

  const ranura = new THREE.Mesh(new THREE.BoxGeometry(0.0025, 0.012, 0.002), matCanaleta);
  ranura.position.z = 0.007;

  const levaTrasera = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.008, 0.003), matMetal);
  levaTrasera.position.set(-0.008, 0, -0.014);

  grupoChapa.add(bisel, cilindro, ranura, levaTrasera);
  grupoPuerta.add(grupoChapa);

  grupoCofre.add(grupoPuerta);
  scene.add(grupoCofre);

  return { altoGabinete: altoUsuario };
};

export const construirGabinete = ({ loader, params, matGenerico, scene }) => {
  if (params?.tipoGabinete === 'cofre_exteriores') {
    return construirCofreExteriores({ params, matGenerico, scene });
  }
  const altoUsuario = parseFloat(params?.alto || params?.altoTotalCm || params?.detalles?.alto || params?.altoGabinete) || 90;
  const anchoUsuario = parseFloat(params?.ancho || params?.detalles?.ancho || params?.anchoGabinete) || 60;
  const fondoUsuario = parseFloat(params?.fondo || params?.detalles?.fondo || params?.fondoGabinete) || 60;

  // Medidas base nativas de los archivos .GLB para cálculo de escala
  const ANCHO_BASE_GLB = 60;
  let FONDO_BASE_GLB = 60;
  let ALTO_BASE_GLB = 90;

  if (fondoUsuario >= 100) {
    FONDO_BASE_GLB = 100;
    if (altoUsuario < 120) {
      ALTO_BASE_GLB = 90;
    } else if (altoUsuario >= 120 && altoUsuario < 150) {
      ALTO_BASE_GLB = 120;
    } else {
      ALTO_BASE_GLB = 150;
    }
  } else {
    FONDO_BASE_GLB = 60;
    if (altoUsuario < 120) {
      ALTO_BASE_GLB = 90;
    } else if (altoUsuario >= 120 && altoUsuario < 150) {
      ALTO_BASE_GLB = 120;
    } else {
      ALTO_BASE_GLB = 150;
    }
  }

  const escalaX = anchoUsuario / ANCHO_BASE_GLB;
  const escalaY = altoUsuario / ALTO_BASE_GLB;
  const escalaZ = fondoUsuario / FONDO_BASE_GLB;

  // Material de contraste para los componentes mecánicos internos
  const colorBase = matGenerico.color.clone();
  const hsl = { h: 0, s: 0, l: 0 };
  colorBase.getHSL(hsl);
  if (hsl.l < 0.2) colorBase.offsetHSL(0, 0, 0.25);
  else colorBase.offsetHSL(0, 0, -0.20);

  const matParal = new THREE.MeshStandardMaterial({
    color: colorBase,
    metalness: 0.8,
    roughness: 0.2
  });

  const rutaModelo = obtenerRutaModeloGabinete(altoUsuario, fondoUsuario);

  loader.load(
    rutaModelo,
    (gltf) => {
      const model = gltf.scene;
      model.name = 'modeloGabinete';

      model.traverse((child) => {
        if (child.isMesh) {
          child.material = matGenerico;
        }
      });

      model.scale.set(escalaX, escalaY, escalaZ);

      const box = new THREE.Box3().setFromObject(model);
      const center = new THREE.Vector3();
      box.getCenter(center);

      model.position.set(-center.x, -box.min.y, -center.z);
      scene.add(model);
    },
    undefined,
    (error) => console.error(`Error al cargar ${rutaModelo}:`, error)
  );

  // -------------------------------------------------------------
  // SISTEMA DE PARALES DE RACK INTERNOS (ESTRUCTURA 3D)
  // -------------------------------------------------------------
  const altoMetros = altoUsuario / 100;
  const anchoMetros = anchoUsuario / 100;
  const fondoMetros = fondoUsuario / 100;

  const anchoParal = 0.035;
  const fondoParal = 0.035;
  const largoParal = altoMetros * 0.92;
  const geoParal = new THREE.BoxGeometry(anchoParal, largoParal, fondoParal);

  const margenX = (anchoMetros / 2) - (anchoParal / 2) - 0.04;
  const posZFrontal = (fondoMetros / 2) - (fondoParal / 2) - 0.05;
  const posYCentro = altoMetros / 2;

  const grupoParales = new THREE.Group();
  grupoParales.name = 'sistema_parales_rack';

  // Carga Predeterminada: 2 Parales Frontales Alineados Mecánicamente
  const paralFrontalIzq = new THREE.Mesh(geoParal, matParal);
  paralFrontalIzq.position.set(-margenX, posYCentro, posZFrontal);

  const paralFrontalDer = new THREE.Mesh(geoParal, matParal);
  paralFrontalDer.position.set(margenX, posYCentro, posZFrontal);

  grupoParales.add(paralFrontalIzq, paralFrontalDer);

  // Accesorios Dinámicos: Parales Traseros / Intermedios
  const accesoriosSeleccionados = params?.accesoriosSeleccionados || [];
  const accesorios = params?.accesorios || [];

  const tieneParalesTraseros = accesoriosSeleccionados.some(id => {
    const acc = accesorios.find(a => String(a.id) === String(id));
    const nom = String(acc?.nombre || '').toLowerCase();
    return nom.includes('paral') || nom.includes('rack') || nom.includes('trasero');
  });

  if (tieneParalesTraseros) {
    const posZTrasero = -(fondoMetros / 2) + (fondoParal / 2) + 0.05;

    const paralTraseroIzq = new THREE.Mesh(geoParal, matParal);
    paralTraseroIzq.position.set(-margenX, posYCentro, posZTrasero);

    const paralTraseroDer = new THREE.Mesh(geoParal, matParal);
    paralTraseroDer.position.set(margenX, posYCentro, posZTrasero);

    grupoParales.add(paralTraseroIzq, paralTraseroDer);
  }

  scene.add(grupoParales);

  // Refuerzos de Piso y Ruedas
  accesoriosSeleccionados.forEach((accId) => {
    const accObj = accesorios.find(a => String(a.id) === String(accId));
    const nombreAcc = String(accObj?.nombre || '').toLowerCase();
    const idAcc = String(accObj?.id || '').toLowerCase();

    if (nombreAcc.includes('refuerzo') || nombreAcc.includes('piso') || idAcc.includes('refuerzo')) {
      const anchoM = (anchoUsuario / 100) * 0.92;
      const fondoM = (fondoUsuario / 100) * 0.92;

      const grupoCruz = new THREE.Group();
      grupoCruz.name = 'refuerzo_cruz_base';
      const geoX = new THREE.BoxGeometry(anchoM, 0.012, 0.05);
      const meshX = new THREE.Mesh(geoX, matParal);
      const geoZ = new THREE.BoxGeometry(0.05, 0.012, fondoM);
      const meshZ = new THREE.Mesh(geoZ, matParal);

      grupoCruz.add(meshX, meshZ);
      grupoCruz.position.set(0, 0.025, 0);
      scene.add(grupoCruz);
    }

    if (nombreAcc.includes('rueda') || idAcc.includes('rueda')) {
      const detallesAcc = params?.detallesAccesorios?.[accId] || {};
      const diametroPulgadas = detallesAcc.diametroRueda || 3;
      const factorEscala = diametroPulgadas / 3;

      loader.load('/models/Rueda.glb', (gltfRueda) => {
        const baseMeshRueda = gltfRueda.scene;
        const boxRueda = new THREE.Box3().setFromObject(baseMeshRueda);
        const centroRueda = new THREE.Vector3();
        boxRueda.getCenter(centroRueda);

        baseMeshRueda.position.x = -centroRueda.x;
        baseMeshRueda.position.z = -centroRueda.z;
        baseMeshRueda.position.y = -boxRueda.max.y;

        const margenBorde = 0.08;
        const offsetX = (anchoUsuario / 100) / 2 - margenBorde;
        const offsetZ = (fondoUsuario / 100) / 2 - margenBorde;

        [
          { x: -offsetX, z: -offsetZ },
          { x: offsetX, z: -offsetZ },
          { x: -offsetX, z: offsetZ },
          { x: offsetX, z: offsetZ }
        ].forEach((pos, idx) => {
          const contenedorRueda = new THREE.Group();
          contenedorRueda.name = `rueda_esquina_${idx}`;
          contenedorRueda.add(baseMeshRueda.clone());
          contenedorRueda.scale.set(factorEscala, factorEscala, factorEscala);
          contenedorRueda.position.set(pos.x, 0, pos.z);
          scene.add(contenedorRueda);
        });
      });
    }
  });

  return { altoGabinete: altoUsuario };
};