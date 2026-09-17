import * as THREE from 'three';

export function construirPlatinas(props) {
  const { matGenerico, scene, params, laminas } = props;

  // 1. Heredar dimensiones y la MISMA forma que la base principal
  const ladoBaseM = (parseFloat(params?.platinaLargo) || 30) / 100;
  const esExteriorCuadrado = (params?.formaBase || '').toLowerCase().includes('cuad');

  let espesorM = 0.003;
  if (Array.isArray(laminas)) {
    const lamina = laminas.find(l => String(l.id) === String(params?.laminaAnclajeId));
    if (lamina) espesorM = (parseFloat(lamina.espesor_mm) || 3.0) / 1000;
  }

  // 2. Construir la forma idéntica
  const shape = new THREE.Shape();
  const medioLado = ladoBaseM / 2;

  if (esExteriorCuadrado) {
    shape.moveTo(-medioLado, -medioLado);
    shape.lineTo(medioLado, -medioLado);
    shape.lineTo(medioLado, medioLado);
    shape.lineTo(-medioLado, medioLado);
    shape.closePath();
  } else {
    shape.absarc(0, 0, medioLado, 0, Math.PI * 2, false);
  }

  // 3. Barrenos para tornillos (coincidentes)
  const radioBarreno = 0.008;
  const radioBarrenosM = medioLado * 0.72;

  for (let i = 0; i < 4; i++) {
    const hole = new THREE.Path();
    let x, y;

    if (esExteriorCuadrado) {
      x = (i === 0 || i === 3 ? 1 : -1) * radioBarrenosM;
      y = (i === 0 || i === 1 ? 1 : -1) * radioBarrenosM;
    } else {
      const angulo = (i * Math.PI / 2) + (Math.PI / 4);
      x = Math.cos(angulo) * radioBarrenosM;
      y = Math.sin(angulo) * radioBarrenosM;
    }

    hole.absarc(x, y, radioBarreno, 0, Math.PI * 2, true);
    shape.holes.push(hole);
  }

  // 4. Malla y posición a -30 cm
  const extrudeSettings = { depth: espesorM, bevelEnabled: false, curveSegments: 32 };
  const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  const mesh = new THREE.Mesh(geometry, matGenerico);

  mesh.rotation.x = Math.PI / 2;
  mesh.position.y = -0.3; // -30 cm en Y

  scene.add(mesh);
}