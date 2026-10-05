import * as THREE from 'three';

function limpiarTexto(val) {
  if (!val) return '';
  let str = '';
  if (typeof val === 'object') {
    str = `${val.nombre || ''} ${val.label || ''} ${val.descripcion || ''} ${val.id || ''} ${val.tipo || ''}`;
  } else {
    str = String(val);
  }
  return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

function construirPlatinaBaseProcedural(esCuadrada, radioTuboM, materialTubo) {
  const grupo = new THREE.Group();
  grupo.name = esCuadrada ? 'PlatinaCuadradaBase' : 'PlatinaRedondaBase';

  const ladoM = Math.max(radioTuboM * 5.2, 0.20);
  const medioLado = ladoM / 2;
  const espesorM = 0.008;

  const shape = new THREE.Shape();
  if (esCuadrada) {
    const rEsq = 0.012;
    shape.moveTo(-medioLado + rEsq, -medioLado);
    shape.lineTo(medioLado - rEsq, -medioLado);
    shape.quadraticCurveTo(medioLado, -medioLado, medioLado, -medioLado + rEsq);
    shape.lineTo(medioLado, medioLado - rEsq);
    shape.quadraticCurveTo(medioLado, medioLado, medioLado - rEsq, medioLado);
    shape.lineTo(-medioLado + rEsq, medioLado);
    shape.quadraticCurveTo(-medioLado, medioLado, -medioLado, medioLado - rEsq);
    shape.lineTo(-medioLado, -medioLado + rEsq);
    shape.quadraticCurveTo(-medioLado, -medioLado, -medioLado + rEsq, -medioLado);
  } else {
    shape.absarc(0, 0, medioLado, 0, Math.PI * 2, false);
  }

  // Agujero central para paso del tubo/cableado
  const agujeroCentral = new THREE.Path();
  agujeroCentral.absarc(0, 0, radioTuboM * 0.75, 0, Math.PI * 2, true);
  shape.holes.push(agujeroCentral);

  // 4 orificios para pernos de anclaje
  const radioBarreno = 0.007;
  const radioBarrenosM = medioLado * 0.72;
  const coordsPernos = [];

  for (let i = 0; i < 4; i++) {
    const hole = new THREE.Path();
    let x, z;
    if (esCuadrada) {
      x = (i === 0 || i === 3 ? 1 : -1) * radioBarrenosM;
      z = (i === 0 || i === 1 ? 1 : -1) * radioBarrenosM;
    } else {
      const angulo = (i * Math.PI / 2) + (Math.PI / 4);
      x = Math.cos(angulo) * radioBarrenosM;
      z = Math.sin(angulo) * radioBarrenosM;
    }
    hole.absarc(x, z, radioBarreno, 0, Math.PI * 2, true);
    shape.holes.push(hole);
    coordsPernos.push([x, z]);
  }

  const geom = new THREE.ExtrudeGeometry(shape, {
    depth: espesorM,
    bevelEnabled: true,
    bevelThickness: 0.0015,
    bevelSize: 0.0015,
    bevelSegments: 2
  });
  geom.rotateX(-Math.PI / 2);

  const mesh = new THREE.Mesh(geom, materialTubo);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  grupo.add(mesh);

  // Pernos de anclaje
  const matPerno = new THREE.MeshStandardMaterial({
    color: 0x334155,
    metalness: 0.8,
    roughness: 0.3
  });
  const pernoGeo = new THREE.CylinderGeometry(0.006, 0.006, espesorM * 1.5, 12);
  coordsPernos.forEach(([px, pz]) => {
    const pMesh = new THREE.Mesh(pernoGeo, matPerno);
    pMesh.position.set(px, espesorM * 0.75, pz);
    grupo.add(pMesh);
  });

  return grupo;
}

function construirVideoporteroPunta(radioTuboM, materialTubo) {
  const grupo = new THREE.Group();
  grupo.name = 'AccesorioVideoporteroPunta';

  const matMarco = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    metalness: 0.8,
    roughness: 0.25
  });
  const matAcrilico = new THREE.MeshStandardMaterial({
    color: 0x090d16,
    metalness: 0.9,
    roughness: 0.1
  });
  const matOscuro = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    metalness: 0.5,
    roughness: 0.6
  });
  const matLed = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0284c7,
    emissiveIntensity: 0.85
  });

  // 1. Platina final soldada en la punta del tubo (sirve de respaldo estructural)
  const anchoPlatinaM = 0.15;
  const altoPlatinaM = 0.22;
  const espesorPlatinaM = 0.008; // 8 mm de lámina estructural

  // La platina se ubica con su respaldo en Z = 0 (punto exacto de acople del tubo)
  const platinaFinalGeo = new THREE.BoxGeometry(anchoPlatinaM, altoPlatinaM, espesorPlatinaM);
  const platinaFinal = new THREE.Mesh(platinaFinalGeo, materialTubo);
  platinaFinal.position.set(0, 0, espesorPlatinaM / 2);
  platinaFinal.castShadow = true;
  platinaFinal.receiveShadow = true;
  grupo.add(platinaFinal);

  // Cordón de soldadura perimetral entre el tubo y el respaldo de la platina (en Z = 0)
  const soldaduraGeo = new THREE.TorusGeometry(radioTuboM, 0.0035, 12, 32);
  const soldaduraMesh = new THREE.Mesh(soldaduraGeo, materialTubo);
  soldaduraMesh.position.set(0, 0, 0);
  grupo.add(soldaduraMesh);

  // 4 pernos de fijación en las esquinas de la platina
  const matPerno = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8, roughness: 0.3 });
  const pernoGeo = new THREE.CylinderGeometry(0.004, 0.004, espesorPlatinaM + 0.003, 16);
  pernoGeo.rotateX(Math.PI / 2);
  const margenX = anchoPlatinaM / 2 - 0.012;
  const margenY = altoPlatinaM / 2 - 0.012;
  [
    [-margenX, -margenY],
    [margenX, -margenY],
    [-margenX, margenY],
    [margenX, margenY]
  ].forEach(([px, py]) => {
    const pMesh = new THREE.Mesh(pernoGeo, matPerno);
    pMesh.position.set(px, py, espesorPlatinaM / 2);
    grupo.add(pMesh);
  });

  // 2. Caja del videoportero: montada DIRECTAMENTE sobre la cara frontal de la platina (Z = espesorPlatinaM)
  // Estrictamente PARALELO a la platina (rotation = 0 en todos los ejes)
  const anchoCaja = 0.13;
  const altoCaja = 0.20;
  const profCaja = 0.045; // 4.5 cm de perfil
  const zFrentePlatina = espesorPlatinaM;
  const zFrenteCaja = zFrentePlatina + profCaja;

  // Carcasa principal
  const cajaGeo = new THREE.BoxGeometry(anchoCaja, altoCaja, profCaja);
  const cajaMesh = new THREE.Mesh(cajaGeo, materialTubo);
  cajaMesh.position.set(0, 0, zFrentePlatina + profCaja / 2);
  cajaMesh.castShadow = true;
  cajaMesh.receiveShadow = true;
  grupo.add(cajaMesh);

  // Visera protectora cortagotas superior (plana y paralela al borde superior)
  const viseraGeo = new THREE.BoxGeometry(anchoCaja + 0.014, 0.005, profCaja + 0.025);
  const viseraMesh = new THREE.Mesh(viseraGeo, matMarco);
  viseraMesh.position.set(0, altoCaja / 2 + 0.0025, zFrentePlatina + (profCaja + 0.025) / 2);
  grupo.add(viseraMesh);

  // Marco biselado frontal
  const marcoGeo = new THREE.BoxGeometry(anchoCaja - 0.010, altoCaja - 0.010, 0.004);
  const marcoMesh = new THREE.Mesh(marcoGeo, matMarco);
  marcoMesh.position.set(0, 0, zFrenteCaja + 0.002);
  grupo.add(marcoMesh);

  // Panel acrílico polarizado de la cámara (mitad superior)
  const altoAcrilico = altoCaja * 0.42;
  const acrilicoGeo = new THREE.BoxGeometry(anchoCaja - 0.022, altoAcrilico, 0.003);
  const acrilicoMesh = new THREE.Mesh(acrilicoGeo, matAcrilico);
  acrilicoMesh.position.set(0, altoCaja * 0.20, zFrenteCaja + 0.0045);
  grupo.add(acrilicoMesh);

  // Lente de la cámara con bisel
  const lenteGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.004, 24);
  lenteGeo.rotateX(Math.PI / 2);
  const lenteMesh = new THREE.Mesh(lenteGeo, matOscuro);
  lenteMesh.position.set(0, altoCaja * 0.22, zFrenteCaja + 0.0065);
  grupo.add(lenteMesh);

  const aroLenteGeo = new THREE.TorusGeometry(0.014, 0.0018, 12, 24);
  const aroLenteMesh = new THREE.Mesh(aroLenteGeo, matMarco);
  aroLenteMesh.position.set(0, altoCaja * 0.22, zFrenteCaja + 0.0065);
  grupo.add(aroLenteMesh);

  // Ranuras horizontales de altavoz / intercomunicador
  const ranuraGeo = new THREE.BoxGeometry(anchoCaja * 0.45, 0.0025, 0.002);
  for (let r = -1; r <= 1; r++) {
    const ranura = new THREE.Mesh(ranuraGeo, matOscuro);
    ranura.position.set(0, -altoCaja * 0.06 + r * 0.007, zFrenteCaja + 0.0045);
    grupo.add(ranura);
  }

  // Botón de llamada con anillo iluminado LED
  const yBoton = -altoCaja * 0.26;
  const haloGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.003, 24);
  haloGeo.rotateX(Math.PI / 2);
  const haloMesh = new THREE.Mesh(haloGeo, matLed);
  haloMesh.position.set(0, yBoton, zFrenteCaja + 0.005);
  grupo.add(haloMesh);

  const botonGeo = new THREE.CylinderGeometry(0.010, 0.010, 0.005, 24);
  botonGeo.rotateX(Math.PI / 2);
  const botonMesh = new THREE.Mesh(botonGeo, matMarco);
  botonMesh.position.set(0, yBoton, zFrenteCaja + 0.0065);
  grupo.add(botonMesh);

  return grupo;
}

export function renderizarBujeOBase(
  loader, 
  valBuje, 
  punto, 
  direccion, 
  materialTubo, 
  grupoBrazo, 
  esFinal = false,
  radioTuboM = 0.0254
) {
  if (!valBuje) return;

  const str = limpiarTexto(valBuje);
  if (!str || str === 'none' || str === 'null' || str === 'undefined' || str === 'sin buje' || str === 'sin_buje' || str === '0') {
    return;
  }

  console.log(`🔍 [LOG BUJE] Evaluando valBuje (${esFinal ? 'FINAL' : 'INICIAL'}):`, `"${str}"`);

  // Casos especiales procedurales (Platinas base redonda/cuadrada y Videoportero en punta)
  const esPlatinaRedonda = str.includes('platina redonda') || str.includes('base redonda') || str === 'platina_redonda';
  const esPlatinaCuadrada = str.includes('platina cuadrada') || str.includes('base cuadrada') || str === 'platina_cuadrada';
  const esVideoportero = str.includes('videoportero') || str.includes('portero') || str.includes('intercom');

  if (esPlatinaRedonda || esPlatinaCuadrada || esVideoportero) {
    const grupoContenedor = new THREE.Group();
    grupoContenedor.position.copy(punto);

    if (esVideoportero) {
      // Orientar de modo que:
      // - El respaldo de la platina (Z = 0) coincide exactamente con la punta del tubo (punto)
      // - El vector normal hacia el frente de la platina y del videoportero sigue la dirección del tubo (vForward)
      // - La orientación vertical (Y local) apunta hacia arriba en el mundo (vRealUp)
      const vForward = direccion.clone().normalize();
      let vUp = new THREE.Vector3(0, 1, 0);
      if (Math.abs(vForward.dot(vUp)) > 0.92) {
        vUp = new THREE.Vector3(0, 0, -Math.sign(vForward.y || 1));
      }
      const vRight = new THREE.Vector3().crossVectors(vUp, vForward).normalize();
      const vRealUp = new THREE.Vector3().crossVectors(vForward, vRight).normalize();

      const matrizRotacion = new THREE.Matrix4().makeBasis(vRight, vRealUp, vForward);
      const cuaternionAlineacion = new THREE.Quaternion().setFromRotationMatrix(matrizRotacion);
      grupoContenedor.quaternion.copy(cuaternionAlineacion);

      grupoContenedor.add(construirVideoporteroPunta(radioTuboM, materialTubo));
      grupoBrazo.add(grupoContenedor);
      return;
    }

    const dirNorm = direccion.clone().normalize();
    const cuaternionAlineacion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dirNorm);
    grupoContenedor.quaternion.copy(cuaternionAlineacion);
    grupoBrazo.add(grupoContenedor);

    if (esPlatinaRedonda) {
      grupoContenedor.add(construirPlatinaBaseProcedural(false, radioTuboM, materialTubo));
      return;
    }
    if (esPlatinaCuadrada) {
      grupoContenedor.add(construirPlatinaBaseProcedural(true, radioTuboM, materialTubo));
      return;
    }
  }

  let rutaGLB = '';
  let esPlacaBase = false;
  let esBase15x10 = false;
  let esPuntaBase = false;
  let esPuntaExtensible = false;

  // MAPEO DE RUTAS SEGÚN PALABRAS CLAVE O IDS DE LA BASE DE DATOS (seed.py)
  if (str === '4' || str === 'buje_4' || str.includes('platina') || str.includes('15x10') || str.includes('rectangular') || str.includes('perforada')) {
    rutaGLB = '/models/Base15x10.glb';
    esBase15x10 = true;
  } else if (str === '2' || str === 'buje_2' || str.includes('roseta') || str.includes('rozeta') || str.includes('punta roseta')) {
    rutaGLB = '/models/PuntaRoseta.glb';
  } else if (str === '1' || str === 'buje_1' || str.includes('escualizable') || str.includes('pared') || str.includes('plana') || str.includes('base universal')) {
    rutaGLB = '/models/BaseParedBuje.glb';
    esPlacaBase = true;
  } else if (str === '3' || str === 'buje_3' || str.includes('buje universal') || str.includes('conica') || str.includes('circular') || str.includes('punta base') || str.includes('universal')) {
    rutaGLB = '/models/PuntaBase.glb';
    esPuntaBase = true;
  } else if (str === '5' || str === 'buje_5' || str.includes('extensible') || str.includes('ptz')) {
    rutaGLB = '/models/Puntaextensible.glb';
    esPuntaExtensible = true;
  } else {
    rutaGLB = esFinal ? '/models/PuntaRoseta.glb' : '/models/BaseParedBuje.glb';
    console.warn(`⚠️ No se identificó clave en "${str}". Se intentará cargar por defecto: ${rutaGLB}`);
  }

  if (!loader) {
    console.error('❌ Error: No se proporcionó el GLTFLoader a renderizarBujeOBase.');
    return;
  }

  // CONTENEDOR 3D PARA EL MODELO GLB
  const grupoContenedor = new THREE.Group();

  if (!esFinal && esPlacaBase) {
    grupoContenedor.position.set(punto.x, punto.y, punto.z - radioTuboM);
  } else {
    grupoContenedor.position.copy(punto);
  }

  // ALINEACIÓN Y ORIENTACIÓN
  const dirNorm = direccion.clone().normalize();
  const cuaternionAlineacion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dirNorm);

  // Rotar PuntaBase.glb 180°
  const debeInvertir = esPuntaBase ? !esFinal : esFinal;

  if (debeInvertir) {
    const cuaternionInversion = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI);
    grupoContenedor.quaternion.copy(cuaternionAlineacion.multiply(cuaternionInversion));
  } else {
    grupoContenedor.quaternion.copy(cuaternionAlineacion);
  }

  grupoBrazo.add(grupoContenedor);

  // CARGA DEL MODELO GLB REAL
  loader.load(
    encodeURI(rutaGLB),
    (gltf) => {
      const model = gltf.scene;

      // Escala dinámica proporcional al tubo
      const diametroModeloOriginalM = 1.5 * 0.0254; // 1.5 pulgadas
      const diametroTuboM = radioTuboM * 2;
      const factorEscala = (diametroTuboM / diametroModeloOriginalM);
      model.scale.set(factorEscala, factorEscala, factorEscala);

      // CASO 1: Platina 15x10 (Placa plana con apoyo desfasado al radio del tubo)
      if (esBase15x10 || rutaGLB.includes('Base15x10.glb')) {
        model.rotation.y += Math.PI;

        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        model.position.set(-center.x, -box.min.y, -center.z - radioTuboM);
      }

      // CASO 2: Punta Extensible / Buje PTZ (Cilíndrico concéntrico al centro del tubo)
      if (esPuntaExtensible || rutaGLB.includes('Puntaextensible.glb')) {
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        // Alineación concéntrica exacta en X y Z, apoyado en el extremo en Y
        model.position.set(-center.x, -box.min.y, -center.z);
      }

      model.traverse((child) => {
        if (child.isMesh && materialTubo) {
          child.material = materialTubo;
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      grupoContenedor.add(model);
      console.log(`✅ Cargar con éxito GLB: ${rutaGLB}`);
    },
    undefined,
    (err) => console.error(`❌ Error al cargar el archivo GLB en ${rutaGLB}:`, err)
  );
}