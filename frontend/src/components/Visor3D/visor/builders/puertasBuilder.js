import * as THREE from 'three';

export function construirPuerta({ loader, params, matGenerico, scene }) {
  const { 
    tipoPuerta = 'vidrio', 
    acabadoPuerta = 'romo', 
    alto = 100, 
    ancho = 60, 
    fondo = 60 
  } = params;

  const altoCm = parseFloat(alto) || 100;
  const anchoCm = parseFloat(ancho) || 60;

  // 1. Mapeo del archivo según el alto más cercano de base
  let altoClave = '90';
  let altoBaseModelo = 90; // Alto de referencia en cm del archivo .glb

  if (altoCm >= 135) {
    altoClave = '150';
    altoBaseModelo = 150;
  } else if (altoCm >= 105) {
    altoClave = '120';
    altoBaseModelo = 120;
  }

  let nombreArchivo = '';
  if (tipoPuerta === 'vidrio') {
    const sufijoPunta = acabadoPuerta === 'punta' ? 'Punta' : '';
    nombreArchivo = `PuertaVidrio${sufijoPunta} ${altoClave}x60x60.glb`;
  } else if (tipoPuerta === 'normal') {
    nombreArchivo = `PuertaNormal ${altoClave}x60x60.glb`;
  } else if (tipoPuerta === 'doble') {
    nombreArchivo = `PuertaDoble ${altoClave}x60x60.glb`;
  }

  const rutaModelo = `/models/puertas/${nombreArchivo}`;

  // 2. Posicionamiento lateral (a la derecha del gabinete)
  const anchoGabineteM = (parseFloat(ancho) || 60) / 100;
  const offsetSeparacion = 0.20; // 20cm de separación
  const posX = (anchoGabineteM / 2) + offsetSeparacion;

  loader.load(
    rutaModelo,
    (gltf) => {
      const model = gltf.scene;

      // 3. Ajuste de escala exacto según la altura y ancho ingresados
      const escalaY = altoCm / altoBaseModelo;
      const escalaX = anchoCm / 60; // Asumiendo base de 60cm de ancho
      model.scale.set(escalaX, escalaY, 1);

      // 4. Aplicar el color/material del gabinete a la puerta
      model.traverse((child) => {
        if (child.isMesh) {
          const nombreMat = (child.material?.name || '').toLowerCase();
          const nombreMesh = (child.name || '').toLowerCase();

          // Preservar material si se trata explícitamente del vidrio transparente
          const esVidrio = nombreMat.includes('vidrio') || nombreMat.includes('glass') || 
                           nombreMesh.includes('vidrio') || nombreMesh.includes('glass');

          if (!esVidrio && matGenerico) {
            child.material = matGenerico;
          }
        }
      });

      // 5. Posicionar al lado del gabinete
      model.position.set(posX, 0, 0);

      scene.add(model);
    },
    undefined,
    (error) => {
      console.warn(`[PuertasBuilder] No se pudo cargar el modelo: ${rutaModelo}`, error);
    }
  );
}