import * as THREE from 'three';

const pulgAMetros = (pulg) => {
  const num = parseFloat(pulg) || 2.0;
  return num * 0.0254;
};

export function buildBrazo(params = {}, tubosLista = [], accesoriosLista = [], loader = null) {
  const grupoBrazo = new THREE.Group();
  grupoBrazo.name = 'BrazoArticuladoGroup';

  const tramos = params.tramos || [];
  if (tramos.length === 0) return grupoBrazo;

  // 1. Material
  const colorHex = params.colorPintura || params.pintura || params.color || '#2563eb';
  const materialTubo = new THREE.MeshStandardMaterial({
    color: new THREE.Color(colorHex),
    metalness: 0.3,
    roughness: 0.4
  });

  // 2. Origen del Brazo
  const modoSuelo = params.orientacion === 'suelo' || params.ubicacion === 'suelo';
  const alturaInicial = modoSuelo ? 0.0 : (parseFloat(params.alturaAnclajeCm) || 0) / 100;

  // 3. Medidas dinámicas
  const primerTramo = tramos[0] || {};
  const diametroPulg = parseFloat(primerTramo.diametro_pulg) || 2.0;
  const diametroTuboM = pulgAMetros(diametroPulg);
  const radioTuboM = diametroTuboM / 2;

  // 4. Detección del Buje
  const valBujeRaw = params.bujeInicial || params.bujeInicialId || params.buje_inicial_id || params.bujeBase || '';
  const valStr = String(valBujeRaw).toLowerCase().trim();
  const tieneBuje = valStr !== '' && valStr !== 'null' && valStr !== 'undefined' && valStr !== '0' && !valStr.includes('sin buje') && !valStr.includes('--');

  let puntoActual = new THREE.Vector3(0, alturaInicial, 0);

  // Carga e Integración de la Base (Auto-ajustable)
  if (loader && tieneBuje) {
    loader.load(
      '/models/BaseParedBuje.glb',
      (gltf) => {
        const bujeModel = gltf.scene;

        // Base original diseñada para 1.5 pulgadas (0.0381m) + 5% holgura
        const diametroModeloOriginalM = pulgAMetros(1.5); 
        const factorEscala = (diametroTuboM / diametroModeloOriginalM) * 1.05;

        bujeModel.scale.set(factorEscala, factorEscala, factorEscala);

        // Alineación en Z usando el radio del tubo
        const offsetZ = -radioTuboM;

        bujeModel.position.set(0, alturaInicial, offsetZ);
        bujeModel.rotation.set(0, 0, 0);

        bujeModel.traverse((child) => {
          if (child.isMesh) {
            child.material = materialTubo;
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });

        grupoBrazo.add(bujeModel);
      },
      undefined,
      (err) => console.error('Error al cargar /models/BaseParedBuje.glb:', err)
    );
  }

  // 5. Cálculo de vértices base del tubo
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

  // 6. Generación del Path con Curvas Suaves (Fillets)
  const path = new THREE.CurvePath();
  const radioCurva = Math.max(radioTuboM * 2.5, 0.08); // Radio del dobles del tubo

  if (puntosVertices.length <= 2) {
    path.add(new THREE.LineCurve3(puntosVertices[0], puntosVertices[1]));
  } else {
    for (let i = 0; i < puntosVertices.length - 1; i++) {
      const pActual = puntosVertices[i];
      const pSiguiente = puntosVertices[i + 1];

      if (i === 0) {
        const pAnterior = pActual;
        const vSiguiente = new THREE.Vector3().subVectors(pSiguiente, pActual).normalize();
        const pInicioSegmento = pAnterior;
        const pFinSegmento = new THREE.Vector3().subVectors(pSiguiente, vSiguiente.clone().multiplyScalar(radioCurva));
        
        path.add(new THREE.LineCurve3(pInicioSegmento, pFinSegmento));
      } else if (i === puntosVertices.length - 2) {
        const pAnterior = puntosVertices[i - 1];
        const vAnterior = new THREE.Vector3().subVectors(pActual, pAnterior).normalize();
        const vSiguiente = new THREE.Vector3().subVectors(pSiguiente, pActual).normalize();

        const pStartCurve = new THREE.Vector3().addVectors(pActual, vAnterior.clone().multiplyScalar(-radioCurva));
        const pEndCurve = new THREE.Vector3().addVectors(pActual, vSiguiente.clone().multiplyScalar(radioCurva));

        path.add(new THREE.QuadraticBezierCurve3(pStartCurve, pActual, pEndCurve));
        path.add(new THREE.LineCurve3(pEndCurve, pSiguiente));
      } else {
        const pAnterior = puntosVertices[i - 1];
        const vAnterior = new THREE.Vector3().subVectors(pActual, pAnterior).normalize();
        const vSiguiente = new THREE.Vector3().subVectors(pSiguiente, pActual).normalize();

        const pStartCurve = new THREE.Vector3().addVectors(pActual, vAnterior.clone().multiplyScalar(-radioCurva));
        const pEndCurve = new THREE.Vector3().addVectors(pActual, vSiguiente.clone().multiplyScalar(radioCurva));

        path.add(new THREE.QuadraticBezierCurve3(pStartCurve, pActual, pEndCurve));

        const pFinSegmento = new THREE.Vector3().subVectors(pSiguiente, vSiguiente.clone().multiplyScalar(radioCurva));
        path.add(new THREE.LineCurve3(pEndCurve, pFinSegmento));
      }
    }
  }

  // 7. Renderizado final del tubo suavizado
  const tuboGeometria = new THREE.TubeGeometry(path, 120, radioTuboM, 24, false);
  const tuboMesh = new THREE.Mesh(tuboGeometria, materialTubo);
  tuboMesh.castShadow = true;
  tuboMesh.receiveShadow = true;

  grupoBrazo.add(tuboMesh);

  return grupoBrazo;
}