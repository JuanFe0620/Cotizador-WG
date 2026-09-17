import * as THREE from 'three';

export function construirBases(props) {
  const { loader, laminas, matGenerico, scene, obtenerPulgadasTubo, params, esCuadrado } = props;

  if (!params?.formaBase || params.formaBase === 'Sin Base') return;

  // 1. DIMENSIONES
  const pulgadasTubo = typeof obtenerPulgadasTubo === 'function' ? obtenerPulgadasTubo(0) : 4;
  const radioTuboM = esCuadrado ? (pulgadasTubo / 100) / 2 : ((pulgadasTubo * 25.4) / 1000) / 2;
  const ladoBaseM = (parseFloat(params?.platinaLargo) || 30) / 100;
  
  let espesorM = 0.003;
  if (Array.isArray(laminas)) {
    const lamina = laminas.find(l => String(l.id) === String(params?.laminaAnclajeId));
    if (lamina) espesorM = (parseFloat(lamina.espesor_mm) || 3.0) / 1000;
  }

  const esExteriorCuadrado = (params.formaBase || '').toLowerCase().includes('cuad');

  // 2. SHAPE EXTERIOR
  const shapeBase = new THREE.Shape();
  const medioLado = ladoBaseM / 2;

  if (esExteriorCuadrado) {
    shapeBase.moveTo(-medioLado, -medioLado);
    shapeBase.lineTo(medioLado, -medioLado);
    shapeBase.lineTo(medioLado, medioLado);
    shapeBase.lineTo(-medioLado, medioLado);
    shapeBase.closePath();
  } else {
    shapeBase.absarc(0, 0, medioLado, 0, Math.PI * 2, false);
  }

  // 3. AGUJERO CENTRAL
  const holeCentro = new THREE.Path();
  if (esCuadrado) {
    holeCentro.moveTo(-radioTuboM, -radioTuboM);
    holeCentro.lineTo(radioTuboM, -radioTuboM);
    holeCentro.lineTo(radioTuboM, radioTuboM);
    holeCentro.lineTo(-radioTuboM, radioTuboM);
    holeCentro.closePath();
  } else {
    holeCentro.absarc(0, 0, radioTuboM, 0, Math.PI * 2, true);
  }
  shapeBase.holes.push(holeCentro);

  // 4. BARRENOS PARA TORNILLOS (Distribución limpia según forma)
  const radioBarreno = 0.008; // ~16mm
  const radioBarrenosM = medioLado * 0.72; // Distancia desde el centro

  for (let i = 0; i < 4; i++) {
    const holePerno = new THREE.Path();
    let x, y;

    if (esExteriorCuadrado) {
      // Posiciones en esquinas
      x = (i === 0 || i === 3 ? 1 : -1) * radioBarrenosM;
      y = (i === 0 || i === 1 ? 1 : -1) * radioBarrenosM;
    } else {
      // Distribución radial circular limpia (45°, 135°, 225°, 315°)
      const angulo = (i * Math.PI / 2) + (Math.PI / 4);
      x = Math.cos(angulo) * radioBarrenosM;
      y = Math.sin(angulo) * radioBarrenosM;
    }

    holePerno.absarc(x, y, radioBarreno, 0, Math.PI * 2, true);
    shapeBase.holes.push(holePerno);
  }

  // EXTRUSIÓN
  const extrudeSettings = { depth: espesorM, bevelEnabled: false, curveSegments: 32 };
  const geomBase = new THREE.ExtrudeGeometry(shapeBase, extrudeSettings);
  const meshBase = new THREE.Mesh(geomBase, matGenerico);
  
  meshBase.rotation.x = Math.PI / 2;
  meshBase.position.y = espesorM;
  scene.add(meshBase);

  // 5. PIES DE AMIGO
  const usarPie = params?.usarPieAmigo ?? true;
  const numPies = usarPie ? (parseInt(params?.cantPieAmigo, 10) || 4) : 0;

  if (numPies > 0 && loader) {
    const esAleta = params?.tipoPieAmigo === 'aleta';
    const archivoPie = esAleta ? '/models/PiealetaPrueba.glb' : '/models/PiePrueba.glb';

    loader.load(archivoPie, (gltfPie) => {
      const pieModel = gltfPie.scene;
      const boxP = new THREE.Box3().setFromObject(pieModel);
      const sizeP = new THREE.Vector3();
      boxP.getSize(sizeP);

      const altoCartelaM = (parseFloat(params?.altoPieAmigo) || 10) / 100;
      const espacioLibre = medioLado - radioTuboM;
      
      const escalaXZ = (espacioLibre * 0.85) / (Math.max(sizeP.x, sizeP.z) || 1);
      const escalaY = altoCartelaM / (sizeP.y || 0.1);

      let offsetAngulo = 0;
      if (!esCuadrado && esExteriorCuadrado) {
        offsetAngulo = Math.PI / 4; 
      }

      for (let i = 0; i < numPies; i++) {
        const angulo = (i * 2 * Math.PI) / numPies + offsetAngulo;
        const grupoRadial = new THREE.Group();
        grupoRadial.rotation.y = angulo;

        const pieInst = pieModel.clone();
        pieInst.scale.set(escalaXZ, escalaY, escalaXZ);
        
        pieInst.position.set(
          -boxP.min.x * escalaXZ,
          espesorM,
          radioTuboM - (boxP.min.z * escalaXZ)
        );

        pieInst.traverse(c => { if (c.isMesh) c.material = matGenerico; });
        grupoRadial.add(pieInst);
        scene.add(grupoRadial);
      }
    });
  }
}