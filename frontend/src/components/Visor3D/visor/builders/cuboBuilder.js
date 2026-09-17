import * as THREE from 'three';

export function construirCuboPoste({ loader, limitesTramos, matGenerico, scene, cantidad = 1 }) {
  if (!limitesTramos || limitesTramos.length === 0) return;

  // 1. Cargar el modelo .glb una sola vez
  loader.load(
    '/models/CuboPoste.glb',
    (gltfCubo) => {
      const cuboBase = gltfCubo.scene;
      const boxCubo = new THREE.Box3().setFromObject(cuboBase);
      const sizeCubo = new THREE.Vector3();
      boxCubo.getSize(sizeCubo);

      // Material con contraste
      const matCubo = matGenerico.clone();
      if (matCubo.color) matCubo.color.multiplyScalar(0.92);
      matCubo.roughness = 0.35;
      matCubo.metalness = 0.45;

      // 2. Ordenar los tramos de arriba hacia abajo (del más alto al más bajo)
      const tramosInvertidos = [...limitesTramos].reverse();

      // 3. Renderizar tantos cubos como pida la cantidad (máximo 1 por tramo)
      const totalCubos = Math.min(cantidad, tramosInvertidos.length);

      for (let i = 0; i < totalCubos; i++) {
        const tramoActual = tramosInvertidos[i];
        const altoPuntoMaximo = tramoActual.superior;
        const diametroSuperior = tramoActual.diametroM;

        // Clonar la malla para cada tramo
        const cuboModel = cuboBase.clone();

        // Calcular dimensiones según el diámetro del tramo actual (+3mm de holgura)
        const diametroAjustado = diametroSuperior + 0.003;
        const escalaXZ = diametroAjustado / (Math.max(sizeCubo.x, sizeCubo.z) || 1);
        const escalaY = escalaXZ;

        cuboModel.scale.set(escalaXZ, escalaY, escalaXZ);

        // Posicionar en la parte superior del tramo correspondiente
        const altoAncla = sizeCubo.y * escalaY;
        cuboModel.position.set(0, altoPuntoMaximo - altoAncla, 0);

        cuboModel.traverse((child) => {
          if (child.isMesh) {
            child.material = matCubo;
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });

        scene.add(cuboModel);
      }
    },
    undefined,
    (err) => console.error('Error cargando CuboPoste.glb:', err)
  );
}