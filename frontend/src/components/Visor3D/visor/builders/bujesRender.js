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

  let rutaGLB = '';
  let esPlacaBase = false;
  let esBase15x10 = false;
  let esPuntaBase = false;

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

      // Offset de alineación ha rotación Base15x10.glb rehegua
      if (esBase15x10 || rutaGLB.includes('Base15x10.glb')) {
        // Ombojere 180 grados Y eje rupi
        model.rotation.y += Math.PI;

        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        model.position.set(-center.x, -box.min.y, -center.z - radioTuboM);
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