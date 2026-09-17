import * as THREE from 'three';

export function construirTubos({ loader, params, tubos = [], matGenerico, scene }) {
  const tramos = params?.tramos || [{ alto: 150 }];
  const alturasTramosM = tramos.map(t => (parseFloat(t.alto) || 150) / 100);
  const limitesTramos = [];
  let acumuY = 0;
  const promesasCarga = [];

  const obtenerMedidaReal = (tramo, tuboObj, esCuadrado = false) => {
    if (esCuadrado) {
      if (tramo?.ancho_cm) return parseFloat(tramo.ancho_cm);
      if (tuboObj?.ancho_cm) return parseFloat(tuboObj.ancho_cm);
    } else {
      if (tramo?.diametro_pulg) return parseFloat(tramo.diametro_pulg);
      if (tuboObj?.diametro_pulg) return parseFloat(tuboObj.diametro_pulg);
    }

    if (tramo?.diametro) return parseFloat(tramo.diametro);
    if (tuboObj?.diametro) return parseFloat(tuboObj.diametro);

    const textoMedida = String(tuboObj?.medida || tuboObj?.nombre || tramo?.medida || tramo?.nombre || '');

    const matchDimensiones = textoMedida.match(/(\d+(\.\d+)?)\s*x\s*(\d+(\.\d+)?)/i);
    if (matchDimensiones) {
      return parseFloat(matchDimensiones[1]);
    }

    if (textoMedida.includes('/')) {
      const partes = textoMedida.match(/(\d+)?\s*(\d+)\/(\d+)/);
      if (partes) {
        const entero = partes[1] ? parseFloat(partes[1]) : 0;
        const num = parseFloat(partes[2]);
        const den = parseFloat(partes[3]);
        return entero + (num / den);
      }
    }

    const match = textoMedida.match(/(\d+(\.\d+)?)/);
    return match ? parseFloat(match[1]) : 3;
  };

  const obtenerPulgadasTubo = (tramoIdx = 0) => {
    const tramo = tramos[tramoIdx] || tramos[0];
    const tuboObj = tubos.find(t => String(t.id) === String(tramo?.tuboId));
    const forma = (tramo?.forma || tramo?.tipo || tuboObj?.forma || '').toLowerCase();
    const esCuadrado = forma.includes('cuadrado');
    return obtenerMedidaReal(tramo, tuboObj, esCuadrado);
  };

  tramos.forEach((tramo, idx) => {
    const altoM = alturasTramosM[idx];
    const tuboObj = tubos.find(t => String(t.id) === String(tramo?.tuboId));
    
    const forma = (tramo?.forma || tramo?.tipo || tuboObj?.forma || '').toLowerCase();
    const esCuadrado = forma.includes('cuadrado');

    const valorNumerico = obtenerMedidaReal(tramo, tuboObj, esCuadrado);
    let diametroM = 0.03;

    if (esCuadrado) {
      diametroM = valorNumerico / 100;
    } else {
      diametroM = (valorNumerico * 2.54) / 100;
    }

    const modeloArchivo = esCuadrado ? '/models/CuadradoPoste.glb' : '/models/TuboPoste.glb';
    const yPos = acumuY;

    const p = new Promise((resolve) => {
      loader.load(
        modeloArchivo,
        (gltfTubo) => {
          const tuboBaseModel = gltfTubo.scene;
          const boxTubo = new THREE.Box3().setFromObject(tuboBaseModel);
          const sizeTubo = new THREE.Vector3();
          boxTubo.getSize(sizeTubo);

          const escalaXZ = diametroM / (Math.max(sizeTubo.x, sizeTubo.z) || 1);
          const escalaY = altoM / (sizeTubo.y || 1);

          tuboBaseModel.scale.set(escalaXZ, escalaY, escalaXZ);
          tuboBaseModel.position.set(0, yPos, 0);

          tuboBaseModel.traverse((child) => {
            if (child.isMesh) {
              child.material = matGenerico;
              child.userData = { ...child.userData, esTubo: true };
            }
          });

          scene.add(tuboBaseModel);
          resolve(tuboBaseModel);
        },
        undefined,
        (err) => {
          console.error(`Error cargando el modelo ${modeloArchivo}:`, err);
          const geo = esCuadrado 
            ? new THREE.BoxGeometry(diametroM, altoM, diametroM) 
            : new THREE.CylinderGeometry(diametroM / 2, diametroM / 2, altoM, 32);
          const meshFallback = new THREE.Mesh(geo, matGenerico);
          meshFallback.position.set(0, yPos + altoM / 2, 0);
          scene.add(meshFallback);
          resolve(meshFallback);
        }
      );
    });

    promesasCarga.push(p);

    limitesTramos.push({
      inferior: acumuY,
      superior: acumuY + altoM,
      diametroM,
      radioM: diametroM / 2,
      esCuadrado,
      valorOriginal: valorNumerico
    });

    acumuY += altoM;
  });

  // --- ROLADO CUELLO DE GANSO PTZ EN EL ÚLTIMO TRAMO DEL POSTE ---
  const esCuelloGanzo = params?.esCuelloGanzo || params?.remateGanzo || params?.tipoRemate === 'ptz_ganzo';
  if (esCuelloGanzo && limitesTramos.length > 0) {
    const ultimoTramo = limitesTramos[limitesTramos.length - 1];
    const radioTuboM = ultimoTramo.radioM;
    const radioGanzoM = (parseFloat(params?.radioGanzoCm) || 15) / 100;
    const alturaTop = acumuY;

    // Crear la curva tubular paramétrica en la cima
    const p0 = new THREE.Vector3(0, alturaTop, 0);
    const p1 = new THREE.Vector3(0, alturaTop + radioGanzoM, 0);
    const p2 = new THREE.Vector3(0.15, alturaTop + radioGanzoM, 0);
    const p3 = new THREE.Vector3(0.20, alturaTop + (radioGanzoM * 0.4), 0);

    const ganzoCurve = new THREE.CubicBezierCurve3(p0, p1, p2, p3);
    const ganzoGeo = new THREE.TubeGeometry(ganzoCurve, 32, radioTuboM, 24, false);
    const ganzoMesh = new THREE.Mesh(ganzoGeo, matGenerico);
    
    ganzoMesh.castShadow = true;
    ganzoMesh.receiveShadow = true;
    scene.add(ganzoMesh);
  }

  return { 
    obtenerPulgadasTubo, 
    limitesTramos,
    promesaCarga: Promise.all(promesasCarga) 
  };
}