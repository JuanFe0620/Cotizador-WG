import * as THREE from 'three';

const DIAMETRO_HUECO_REDONDA_M = 0.06; // 60 mm
const ANCHO_HUECO_CUADRADA_M = 0.10;    // 10 cm

export function construirCoronas(props = {}) {
  const { loader, detalles, params, obtenerPulgadasTubo, matGenerico, scene, esCuadrado } = props;

  // 1. OBTENER CANTIDAD DE CORONAS
  let cantidadCoronas = 1;
  if (typeof detalles === 'number') {
    cantidadCoronas = detalles;
  } else if (detalles && typeof detalles === 'object') {
    cantidadCoronas = parseInt(
      detalles.cantidad ?? detalles.cant ?? detalles.N_Coronas ?? detalles.val ?? 1,
      10
    );
  }

  if (isNaN(cantidadCoronas) || cantidadCoronas <= 0) return;

  const tramos = params?.tramos || [{ alto: 151 }];
  let acumuY = 0;

  // 2. MAPEAR TRAMOS
  const limitesTramos = tramos.map((t, idx) => {
    const altoM = (parseFloat(t.alto) || 151) / 100;
    const pulgadas = typeof obtenerPulgadasTubo === 'function' ? obtenerPulgadasTubo(idx) : 3;
    
    const tipoTexto = (t?.tipo || t?.forma || params?.tipoTubo || '').toLowerCase();
    const esTramoCuadrado = esCuadrado === true || tipoTexto.includes('cuad');
    
    const anchoTuboM = esTramoCuadrado ? (pulgadas / 100) : ((pulgadas * 25.4) / 1000);

    const item = { 
      inferior: acumuY, 
      superior: acumuY + altoM, 
      anchoTuboM, 
      esCuadrado: esTramoCuadrado 
    };
    
    acumuY += altoM;
    return item;
  });

  const esCuadradoGeneral = esCuadrado === true || limitesTramos[0]?.esCuadrado;
  const archivoCorona = esCuadradoGeneral 
    ? '/models/CoronaCuadraCubo.glb' 
    : '/models/CoronaRedondaPtriangular.glb';

  if (!loader) return;

  loader.load(
    archivoCorona,
    (gltfCor) => {
      const rawModel = gltfCor.scene;

      const boxOriginal = new THREE.Box3().setFromObject(rawModel);
      const centerOriginal = new THREE.Vector3();
      boxOriginal.getCenter(centerOriginal);

      rawModel.position.x = -centerOriginal.x;
      rawModel.position.z = -centerOriginal.z;
      rawModel.position.y = -boxOriginal.min.y;

      const contenedorBase = new THREE.Group();
      contenedorBase.add(rawModel);

      const medidaHuecoGLB = esCuadradoGeneral 
        ? ANCHO_HUECO_CUADRADA_M 
        : DIAMETRO_HUECO_REDONDA_M;

      const slotsPosibles = [];

      // 3. SECUENCIA DE ABAJO HACIA ARRIBA ⬆️

      // A) Primero se llenan los EMPALMES empezando por el más bajo
      for (let i = 0; i < limitesTramos.length - 1; i++) {
        const tramoInferior = limitesTramos[i];
        const tramoSuperior = limitesTramos[i + 1];

        // Corona superior del tramo inferior (apunta hacia abajo)
        slotsPosibles.push({
          y: tramoInferior.superior,
          anchoTuboM: tramoInferior.anchoTuboM,
          rotacionX: Math.PI
        });

        // Corona inferior del tramo superior (apunta hacia arriba)
        slotsPosibles.push({
          y: tramoSuperior.inferior,
          anchoTuboM: tramoSuperior.anchoTuboM,
          rotacionX: 0
        });
      }

      // B) Al final de todo se agrega la PUNTA SUPERIOR del poste
      const tramoPunta = limitesTramos[limitesTramos.length - 1];
      slotsPosibles.push({
        y: tramoPunta.superior,
        anchoTuboM: tramoPunta.anchoTuboM,
        rotacionX: Math.PI
      });

      // 4. RENDERIZAR SECUENCIALMENTE
      const totalARenderizar = Math.min(cantidadCoronas, slotsPosibles.length);

      for (let i = 0; i < totalARenderizar; i++) {
        const slot = slotsPosibles[i];
        const coronaInst = contenedorBase.clone(true);

        const factorEscala = slot.anchoTuboM / medidaHuecoGLB;
        coronaInst.scale.set(factorEscala, factorEscala, factorEscala);
        coronaInst.rotation.set(slot.rotacionX, 0, 0);
        coronaInst.position.set(0, slot.y, 0);

        coronaInst.traverse((child) => {
          if (child.isMesh) {
            child.material = matGenerico;
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });

        if (scene) scene.add(coronaInst);
      }
    },
    undefined,
    (err) => console.error(`Error cargando corona (${archivoCorona}):`, err)
  );
}