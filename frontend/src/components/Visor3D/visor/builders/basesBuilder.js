import * as THREE from 'three';

export function construirBases(props) {
  const { loader, laminas, matGenerico, scene, obtenerPulgadasTubo, params, esCuadrado } = props;

  // 1. VERIFICACIÓN DE ACTIVACIÓN
  // Se renderiza si la casilla de incluir base/platina está activa o se ha seleccionado una forma válida
  const incluirBaseActivo = params?.incluirBase ?? params?.incluirPlatina ?? (params?.formaBase && params?.formaBase !== 'Sin Base');
  if (!incluirBaseActivo || params?.formaBase === 'Sin Base') return;

  const formaBase = params?.formaBase || 'Base Redonda';
  const esBaseCuadrada = String(formaBase).toLowerCase().includes('cuad');

  // 2. DIMENSIONES Y ESCALA SEGÚN PARÁMETROS
  // Dibuja la forma exterior (cuadrada o redonda) según 'params.ladoBase' / 'params.diametroBase' (20 cm de referencia).
  const medidaBaseCm = parseFloat(params?.ladoBase ?? params?.diametroBase ?? params?.dimensionBase ?? params?.platinaLargo ?? params?.anchoBase) || 20;
  const anchoDeseadoM = medidaBaseCm / 100;
  const medioLado = anchoDeseadoM / 2;

  // Dimensiones del tubo actual (coincidencia EXACTA para el orificio central)
  let pulgadasTubo = 3;
  try {
    if (typeof obtenerPulgadasTubo === 'function') {
      const p = obtenerPulgadasTubo(0);
      if (p && !isNaN(parseFloat(p))) pulgadasTubo = parseFloat(p);
    }
  } catch (e) {
    pulgadasTubo = 3;
  }

  // Radio o mitad de ancho del tubo actual
  const radioTuboM = esCuadrado 
    ? ((pulgadasTubo / 100) / 2) 
    : (((pulgadasTubo * 0.0254) / 2));

  // Espesor de lámina seleccionada (~6 mm o 0.006m)
  let espesorM = 0.006;
  if (Array.isArray(laminas) && params?.laminaAnclajeId) {
    const lamina = laminas.find(l => String(l.id) === String(params?.laminaAnclajeId));
    if (lamina) {
      const espMm = parseFloat(lamina.espesor_mm || lamina.espesorMm || lamina.calibre_mm);
      if (!isNaN(espMm) && espMm > 0) espesorM = espMm / 1000;
    }
  }

  // Grupo contenedor de la base y cartelas
  const grupoBaseCompleta = new THREE.Group();
  scene.add(grupoBaseCompleta);

  // 3. GENERACIÓN PROCEDURAL CON THREE.Shape Y THREE.ExtrudeGeometry
  const shapeBase = new THREE.Shape();

  // A) Contorno exterior (Cuadrado o Redondo)
  if (esBaseCuadrada) {
    shapeBase.moveTo(-medioLado, -medioLado);
    shapeBase.lineTo(medioLado, -medioLado);
    shapeBase.lineTo(medioLado, medioLado);
    shapeBase.lineTo(-medioLado, medioLado);
    shapeBase.closePath();
  } else {
    shapeBase.absarc(0, 0, medioLado, 0, Math.PI * 2, false);
  }

  // B) Orificio central coincidente EXACTAMENTE con las dimensiones del tubo actual (sin luz ni holgura)
  const holeCentro = new THREE.Path();
  if (esCuadrado) {
    const hw = radioTuboM;
    holeCentro.moveTo(-hw, -hw);
    holeCentro.lineTo(hw, -hw);
    holeCentro.lineTo(hw, hw);
    holeCentro.lineTo(-hw, hw);
    holeCentro.closePath();
  } else {
    holeCentro.absarc(0, 0, radioTuboM, 0, Math.PI * 2, true);
  }
  shapeBase.holes.push(holeCentro);

  // C) 4 Barrenos de fijación en las esquinas / perímetro exterior
  const radioBarreno = 0.008; // ~16mm diámetro
  const radioBarrenosM = medioLado * 0.75;

  for (let i = 0; i < 4; i++) {
    const holePerno = new THREE.Path();
    let bx, bz;
    if (esBaseCuadrada) {
      bx = (i === 0 || i === 3 ? 1 : -1) * radioBarrenosM;
      bz = (i === 0 || i === 1 ? 1 : -1) * radioBarrenosM;
    } else {
      const ang = (i * Math.PI / 2) + (Math.PI / 4);
      bx = Math.cos(ang) * radioBarrenosM;
      bz = Math.sin(ang) * radioBarrenosM;
    }
    holePerno.absarc(bx, bz, radioBarreno, 0, Math.PI * 2, true);
    shapeBase.holes.push(holePerno);
  }

  // D) Extrusión de la platina apoyada en el suelo (Y = 0)
  const extrudeSettings = {
    depth: espesorM,
    bevelEnabled: false,
    curveSegments: 36
  };
  const geomBase = new THREE.ExtrudeGeometry(shapeBase, extrudeSettings);
  const meshBase = new THREE.Mesh(geomBase, matGenerico);

  // Rotar en X para que la forma XY quede horizontal en el plano XZ y la extrusión crezca en +Y
  meshBase.rotation.x = -Math.PI / 2;
  meshBase.position.set(0, 0, 0);
  meshBase.castShadow = true;
  meshBase.receiveShadow = true;

  grupoBaseCompleta.add(meshBase);

  // 4. PIES DE AMIGO (CARTELAS) TANGENCIALES AL TUBO
  const usarPie = params?.usarPieAmigo ?? true;
  const numPies = usarPie ? (parseInt(params?.cantPieAmigo, 10) || 4) : 0;

  if (numPies > 0 && loader) {
    const tipoPie = String(params?.tipoPieAmigo || '').toLowerCase();
    const esTriangular = tipoPie.includes('triang');
    const archivoPie = esTriangular ? '/models/PiePrueba.glb' : '/models/PiealetaPrueba.glb';

    loader.load(
      archivoPie,
      (gltfPie) => {
        const pieModel = gltfPie.scene;
        const boxP = new THREE.Box3().setFromObject(pieModel);
        const sizeP = new THREE.Vector3();
        boxP.getSize(sizeP);

        // Altura de la cartela según params.altoPieAmigo (default 10 cm)
        const altoCartelaM = (parseFloat(params?.altoPieAmigo) || 10) / 100;
        const escalaYPie = altoCartelaM / (sizeP.y || 0.16);

        // Espacio radial disponible desde la pared exterior del tubo hasta el perímetro de la base
        const espacioLibreM = Math.max(0.04, medioLado - radioTuboM);
        const largoCartelaDeseadoM = espacioLibreM * 0.85;
        const escalaZPie = largoCartelaDeseadoM / (sizeP.z || 0.10);
        const escalaXPie = 1.0;

        for (let i = 0; i < numPies; i++) {
          const anguloRad = (i * 2 * Math.PI) / numPies;
          const grupoRadial = new THREE.Group();
          grupoRadial.rotation.y = anguloRad;

          const pieInst = pieModel.clone(true);
          pieInst.scale.set(escalaXPie, escalaYPie, escalaZPie);

          // Apoyado sobre la superficie superior de la platina (Y = espesorM)
          // y tangencial a la pared exterior del tubo (Z = radioTuboM)
          pieInst.position.set(
            -(boxP.min.x + boxP.max.x) / 2 * escalaXPie,
            espesorM - (boxP.min.y * escalaYPie),
            radioTuboM - (boxP.min.z * escalaZPie)
          );

          // Asignar el material de pintura seleccionado a todos los meshes hijos
          pieInst.traverse((child) => {
            if (child.isMesh) {
              child.material = matGenerico;
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });

          grupoRadial.add(pieInst);
          grupoBaseCompleta.add(grupoRadial);
        }
      },
      undefined,
      (err) => console.error(`Error al cargar pie de amigo (${archivoPie}):`, err)
    );
  }
}