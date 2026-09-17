import * as THREE from 'three';

function crearTextoSprite(texto, colorHex = '#ffffff') {
  const canvas = document.createElement('canvas');
  canvas.width = 300;
  canvas.height = 120;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
  ctx.roundRect(10, 15, 280, 90, 12);
  ctx.fill();

  ctx.strokeStyle = '#3b82f6';
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = colorHex;
  ctx.font = 'Bold 26px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(texto, 150, 60);

  const texture = new THREE.CanvasTexture(canvas);
  const spriteMaterial = new THREE.SpriteMaterial({ map: texture, depthTest: false });
  const sprite = new THREE.Sprite(spriteMaterial);
  sprite.scale.set(0.65, 0.28, 1);
  return sprite;
}

function crearLineaCota(inicio, fin, colorHex = 0x3b82f6) {
  const geometry = new THREE.BufferGeometry().setFromPoints([inicio, fin]);
  const material = new THREE.LineBasicMaterial({ color: colorHex, linewidth: 2 });
  return new THREE.Line(geometry, material);
}

export function construirCotas({ limitesTramos = [], scene, params = {} }) {
  if (!limitesTramos || limitesTramos.length === 0) return;

  const grupoExistente = scene.getObjectByName('grupo_cotas');
  if (grupoExistente) scene.remove(grupoExistente);

  const grupoCotas = new THREE.Group();
  grupoCotas.name = 'grupo_cotas';

  const offsetX = 0.55;

  // 1. COTAS DE ALTURA Y DIÁMETRO POR TRAMO
  limitesTramos.forEach((tramo, idx) => {
    const yInferior = tramo.inferior;
    const ySuperior = tramo.superior;
    const alturaTramoM = ySuperior - yInferior;
    const diametroCm = (tramo.diametroM * 100).toFixed(1);

    const p1 = new THREE.Vector3(offsetX, yInferior, 0);
    const p2 = new THREE.Vector3(offsetX, ySuperior, 0);
    grupoCotas.add(crearLineaCota(p1, p2, 0x60a5fa));
    grupoCotas.add(crearLineaCota(new THREE.Vector3(offsetX - 0.04, yInferior, 0), new THREE.Vector3(offsetX + 0.04, yInferior, 0), 0x60a5fa));
    grupoCotas.add(crearLineaCota(new THREE.Vector3(offsetX - 0.04, ySuperior, 0), new THREE.Vector3(offsetX + 0.04, ySuperior, 0), 0x60a5fa));

    const spriteAltura = crearTextoSprite(`H${idx + 1}: ${alturaTramoM.toFixed(2)}m`, '#60a5fa');
    spriteAltura.position.set(offsetX + 0.35, (yInferior + ySuperior) / 2, 0);
    grupoCotas.add(spriteAltura);

    const rad = tramo.diametroM / 2;
    const pD1 = new THREE.Vector3(-rad, ySuperior, 0);
    const pD2 = new THREE.Vector3(rad, ySuperior, 0);
    grupoCotas.add(crearLineaCota(pD1, pD2, 0xf59e0b));

    const spriteDiam = crearTextoSprite(`Ø ${diametroCm} cm`, '#f59e0b');
    spriteDiam.position.set(0, ySuperior + 0.12, 0);
    grupoCotas.add(spriteDiam);
  });

  // 2. MEDIDA 3D DE LA BASE (Ubicada a la izquierda)
  const baseActivada = params.incluirBase ?? params.incluirPlatina ?? true;

  if (baseActivada) {
    let largoCm = 0;
    let anchoCm = 0;

    scene.traverse((obj) => {
      // Ignoramos el tubo principal y buscamos mallas pegadas al suelo (y <= 0.05)
      if (obj.isMesh && obj.name !== 'grupo_cotas' && obj.position.y <= 0.05) {
        const box = new THREE.Box3().setFromObject(obj);
        const size = new THREE.Vector3();
        box.getSize(size);

        const sizeX = Math.round(size.x * 100);
        const sizeZ = Math.round(size.z * 100);

        if (sizeX > largoCm) largoCm = sizeX;
        if (sizeZ > anchoCm) anchoCm = sizeZ;
      }
    });

    // Si el usuario envió parámetros explícitos de dimensiones los toma, sino usa lo detectado
    const dimParam = Number(params.diametroBase || params.ladoBase || params.dimensionBase || params.diametro) || 0;
    if (dimParam > 0) {
      largoCm = dimParam;
      anchoCm = dimParam;
    }

    // Solo crea la etiqueta si efectivamente hay medidas reales detectadas
    if (largoCm > 0 && anchoCm > 0) {
      const textoBase = (largoCm === anchoCm) ? `Base: ⌀ ${largoCm} cm` : `Base: ${largoCm}x${anchoCm} cm`;
      const spriteBase = crearTextoSprite(textoBase, '#10b981');
      spriteBase.position.set(-offsetX - 0.3, 0.12, 0);
      grupoCotas.add(spriteBase);
    }
  }

  // 3. MEDIDA DE LOS PIES DE AMIGO (CARTELAS)
  const altoCartelaCm = Number(params.altoCartela || params.altoPieAmigo || params.altoCartelas) || 0;
  
  // Intenta leer largo explícito o aplica la proporción del plano (10 cm base x 16 cm alto)
  let largoCartelaCm = Number(
    params.largoCartela || 
    params.anchoCartela || 
    params.baseCartela || 
    params.largoPieAmigo
  ) || 0;

  if (largoCartelaCm === 0 && altoCartelaCm > 0) {
    largoCartelaCm = Math.round((altoCartelaCm * 10) / 16);
  }

  // Renderiza la etiqueta del Pie de Amigo limpia
  if (params.piesDeAmigo !== false && altoCartelaCm > 0) {
    const spriteCartela = crearTextoSprite(`Pie Amigo: ${largoCartelaCm}x${altoCartelaCm} cm`, '#c084fc');
    spriteCartela.position.set(-offsetX - 0.3, 0.45, 0);
    grupoCotas.add(spriteCartela);
  }

  scene.add(grupoCotas);
}