import * as THREE from 'three';

/**
 * 3.2. Selección Matricial de Planos CAD por Regla de Alto x Fondo
 */
export const obtenerRutaModeloGabinete = (altoCm, fondoCm) => {
  const alto = parseFloat(altoCm) || 0;
  const fondo = parseFloat(fondoCm) || 0;

  // Regla A: Si Alto = 90 cm Y Fondo >= 100 cm
  if (Math.abs(alto - 90) < 0.1 && fondo >= 100) {
    return '/models/Plano_Gabinete_90x100.glb';
  }

  // Regla B: Si 90 cm < Alto <= 120 cm Y Fondo >= 100 cm
  if (alto > 90 && alto <= 120 && fondo >= 100) {
    return '/models/Plano_Gabinete_120x100.glb';
  }

  // Regla C: Si Alto >= 150 cm Y Fondo >= 100 cm
  if (alto >= 150 && fondo >= 100) {
    return '/models/Plano_Gabinete_150x100.glb';
  }

  // Fallback: Si no cumple las dimensiones particulares
  if (fondo >= 100) {
    return '/models/Gab60X100X150.glb';
  }

  if (alto <= 119) {
    return '/models/Gab60X60X90sinRefuerzo.glb';
  } else if (alto >= 120 && alto < 150) {
    return '/models/Gab60X60X120.glb';
  } else {
    return '/models/Gab60X60X150.glb';
  }
};

export const construirGabinete = ({ loader, params, matGenerico, scene }) => {
  const altoUsuario = parseFloat(params?.alto || params?.altoTotalCm || params?.detalles?.alto || params?.altoGabinete) || 90;
  const anchoUsuario = parseFloat(params?.ancho || params?.detalles?.ancho || params?.anchoGabinete) || 60;
  const fondoUsuario = parseFloat(params?.fondo || params?.detalles?.fondo || params?.fondoGabinete) || 60;

  const ANCHO_BASE_GLB = 60;
  let FONDO_BASE_GLB = 60;
  let ALTO_BASE_GLB = 90;

  if (fondoUsuario >= 100) {
    FONDO_BASE_GLB = 100;
    ALTO_BASE_GLB = altoUsuario >= 150 ? 150 : (altoUsuario > 90 ? 120 : 90);
  } else {
    if (altoUsuario >= 120 && altoUsuario < 150) {
      ALTO_BASE_GLB = 120;
    } else if (altoUsuario >= 150) {
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
  // 3.3. SISTEMA DE PARALES DE RACK INTERNOS (ESTRUCTURA 3D)
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

  // Accesorios Dinámicos: Parales Traseros / Intermedios con Z-Offset
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