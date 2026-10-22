import * as THREE from 'three';

export function construirPuerta({ loader, params, matGenerico, scene }) {
  const { 
    tipoPuerta = 'normal',
    acabadoPuerta = 'romo', 
    alto = 100, 
    ancho = 60, 
    fondo = 60 
  } = params;

  const altoCm = parseFloat(alto) || 100;
  const anchoCm = parseFloat(ancho) || 60;

  // 1. Limpieza preventiva y estricta de mallas previas de puerta en el grafo de escena
  const NOMBRE_GRUPO_PUERTA = 'nodo_puerta_gabinete';
  const puertaPrevia = scene.getObjectByName(NOMBRE_GRUPO_PUERTA);
  if (puertaPrevia) {
    scene.remove(puertaPrevia);
    puertaPrevia.traverse((child) => {
      if (child.isMesh) {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose());
          else child.material.dispose();
        }
      }
    });
  }

  // Identificador de ciclo asíncrono para prevenir race conditions de GLTFLoader
  const currentRequestId = (scene.userData._puertaRequestId || 0) + 1;
  scene.userData._puertaRequestId = currentRequestId;

  // 2. Mapeo del archivo según el alto más cercano de base
  let altoClave = '90';
  let altoBaseModelo = 90;

  if (altoCm >= 121) {
    altoClave = '150';
    altoBaseModelo = 150;
  } else if (altoCm >= 91) {
    altoClave = '120';
    altoBaseModelo = 120;
  }

  // 3. Renderizado condicional estricto y mutuamente excluyente
  const tipoNormalizado = String(tipoPuerta || '').trim().toLowerCase();
  const esVidrio = tipoNormalizado === 'vidrio';
  const esDoble = tipoNormalizado === 'doble';

  let nombreArchivo = '';
  if (esVidrio) {
    const sufijoPunta = acabadoPuerta === 'punta' ? 'Punta' : '';
    nombreArchivo = `PuertaVidrio${sufijoPunta} ${altoClave}x60x60.glb`;
  } else if (esDoble) {
    nombreArchivo = `PuertaDoble ${altoClave}x60x60.glb`;
  } else {
    // Puerta estándar sólida / lámina / metálica
    nombreArchivo = `Puerta ${altoClave}x60x60.glb`;
  }

  const rutaModelo = `/models/puertas/${nombreArchivo}`;

  // 4. Posicionamiento lateral (a la derecha del gabinete)
  const anchoGabineteM = anchoCm / 100;
  const offsetSeparacion = 0.20; // 20cm de separación
  const posX = (anchoGabineteM / 2) + offsetSeparacion;

  loader.load(
    rutaModelo,
    (gltf) => {
      // Verificar si hubo un cambio de selección durante la carga asíncrona
      if (scene.userData._puertaRequestId !== currentRequestId) {
        return;
      }

      const contenedorPuerta = new THREE.Group();
      contenedorPuerta.name = NOMBRE_GRUPO_PUERTA;

      const model = gltf.scene;

      // Ajuste de escala exacto según la altura y ancho ingresados
      const escalaY = altoCm / altoBaseModelo;
      const escalaX = anchoCm / 60;
      model.scale.set(escalaX, escalaY, 1);

      if (esVidrio) {
        // Material limpio para el marco: elimina texturas residuales o alfas perforados
        const matMarco = matGenerico ? matGenerico.clone() : new THREE.MeshStandardMaterial({
          color: 0x334155,
          metalness: 0.8,
          roughness: 0.2
        });
        matMarco.map = null;
        matMarco.alphaMap = null;
        matMarco.transparent = false;
        matMarco.opacity = 1.0;

        // Material limpio PBR para el panel de vidrio según especificación
        const matVidrioLimpio = new THREE.MeshStandardMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0.35,
          roughness: 0.08,
          metalness: 0.1,
          depthWrite: false
        });

        // Aplicar material limpio a la malla del marco
        model.traverse((child) => {
          if (child.isMesh) {
            child.material = matMarco;
          }
        });

        contenedorPuerta.add(model);

        // Panel de vidrio central aislado
        const anchoMarcoM = anchoCm / 100;
        const altoMarcoM = altoCm / 100;
        const geoVidrio = new THREE.BoxGeometry(anchoMarcoM * 0.72, altoMarcoM * 0.82, 0.004);
        const panelVidrio = new THREE.Mesh(geoVidrio, matVidrioLimpio);
        panelVidrio.name = 'panel_vidrio_central';
        panelVidrio.position.set(0, altoMarcoM / 2, 0);

        contenedorPuerta.add(panelVidrio);
      } else {
        // Renderizado único de la puerta sólida/lámina sin residuos de vidrio
        model.traverse((child) => {
          if (child.isMesh && matGenerico) {
            child.material = matGenerico;
          }
        });
        contenedorPuerta.add(model);
      }

      // Posicionar el grupo completo al lado del gabinete
      contenedorPuerta.position.set(posX, 0, 0);
      scene.add(contenedorPuerta);
    },
    undefined,
    (error) => {
      console.warn(`[PuertasBuilder] No se pudo cargar el modelo: ${rutaModelo}`, error);
    }
  );
}