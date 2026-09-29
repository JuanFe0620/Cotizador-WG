import * as THREE from 'three';
import { renderizarBujeOBase } from './bujesRender.js';

const pulgAMetros = (pulg) => (parseFloat(pulg) || 2.0) * 0.0254;

export function buildBrazo(params = {}, tubosLista = [], accesoriosLista = [], loader = null) {
  const grupoBrazo = new THREE.Group();
  grupoBrazo.name = 'BrazoArticuladoGroup';

  const tramos = params.tramos || [];
  if (tramos.length === 0) return grupoBrazo;

  // 1. Material del Brazo
  const colorHex = params.colorPintura || params.pintura || params.color || '#2563eb';
  const materialTubo = new THREE.MeshStandardMaterial({
    color: new THREE.Color(colorHex),
    metalness: 0.3,
    roughness: 0.4
  });

  // 2. Origen y medidas
  const modoSuelo = params.orientacion === 'suelo' || params.ubicacion === 'suelo';
  const alturaInicial = modoSuelo ? 0.0 : (parseFloat(params.alturaAnclajeCm) || 0) / 100;

  const primerTramo = tramos[0] || {};
  const diametroPulg = parseFloat(primerTramo.diametro_pulg || primerTramo.diametro) || 2.0;
  const diametroTuboM = pulgAMetros(diametroPulg);
  const radioTuboM = diametroTuboM / 2;

  // 3. Cálculo de vértices (Lógica matemática original)
  let puntoActual = new THREE.Vector3(0, alturaInicial, 0);
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

  // 4. Renderizado del Buje Inicial
  const p0 = puntosVertices[0];
  const p1 = puntosVertices[1] || new THREE.Vector3(0, alturaInicial + 1, 0);
  const dirInicial = new THREE.Vector3().subVectors(p1, p0).normalize();

  const bujeInicialVal = params.bujeInicial || params.bujeInicialId || params.buje_inicial_id || params.bujeBase;
  renderizarBujeOBase(loader, bujeInicialVal, p0, dirInicial, materialTubo, grupoBrazo, false, radioTuboM);

  // 5. Renderizado del Buje Final
  const bujeFinalVal = params.bujeFinal || params.bujeFinalId || params.buje_final_id || params.bujePunta;
  if (puntosVertices.length >= 2) {
    const pUltimo = puntosVertices[puntosVertices.length - 1];
    const pPenultimo = puntosVertices[puntosVertices.length - 2];
    const dirFinal = new THREE.Vector3().subVectors(pUltimo, pPenultimo).normalize();

    renderizarBujeOBase(loader, bujeFinalVal, pUltimo, dirFinal, materialTubo, grupoBrazo, true, radioTuboM);
  }

  // 6. Path con Curvas Suaves y TubeGeometry (Restaurado del original)
  const path = new THREE.CurvePath();
  const radioCurva = Math.max(radioTuboM * 2.5, 0.08);

  if (puntosVertices.length <= 2) {
    path.add(new THREE.LineCurve3(puntosVertices[0], puntosVertices[1]));
  } else {
    for (let i = 0; i < puntosVertices.length - 1; i++) {
      const pAct = puntosVertices[i];
      const pSig = puntosVertices[i + 1];

      if (i === 0) {
        const vSig = new THREE.Vector3().subVectors(pSig, pAct).normalize();
        const pFinSeg = new THREE.Vector3().subVectors(pSig, vSig.clone().multiplyScalar(radioCurva));
        path.add(new THREE.LineCurve3(pAct, pFinSeg));
      } else if (i === puntosVertices.length - 2) {
        const pAnt = puntosVertices[i - 1];
        const vAnt = new THREE.Vector3().subVectors(pAct, pAnt).normalize();
        const vSig = new THREE.Vector3().subVectors(pSig, pAct).normalize();

        const pStartCurve = new THREE.Vector3().addVectors(pAct, vAnt.clone().multiplyScalar(-radioCurva));
        const pEndCurve = new THREE.Vector3().addVectors(pAct, vSig.clone().multiplyScalar(radioCurva));

        path.add(new THREE.QuadraticBezierCurve3(pStartCurve, pAct, pEndCurve));
        path.add(new THREE.LineCurve3(pEndCurve, pSig));
      } else {
        const pAnt = puntosVertices[i - 1];
        const vAnt = new THREE.Vector3().subVectors(pAct, pAnt).normalize();
        const vSig = new THREE.Vector3().subVectors(pSig, pAct).normalize();

        const pStartCurve = new THREE.Vector3().addVectors(pAct, vAnt.clone().multiplyScalar(-radioCurva));
        const pEndCurve = new THREE.Vector3().addVectors(pAct, vSig.clone().multiplyScalar(radioCurva));

        path.add(new THREE.QuadraticBezierCurve3(pStartCurve, pAct, pEndCurve));

        const pFinSeg = new THREE.Vector3().subVectors(pSig, vSig.clone().multiplyScalar(radioCurva));
        path.add(new THREE.LineCurve3(pEndCurve, pFinSeg));
      }
    }
  }

  // 7. Renderizado final del tubo
  const tuboGeometria = new THREE.TubeGeometry(path, 120, radioTuboM, 24, false);
  const tuboMesh = new THREE.Mesh(tuboGeometria, materialTubo);
  tuboMesh.castShadow = true;
  tuboMesh.receiveShadow = true;

  grupoBrazo.add(tuboMesh);

  return grupoBrazo;
}