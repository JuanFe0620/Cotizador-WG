import * as THREE from 'three';

export const capturarVistaCAD = (escenaVirtual, box, tipoVista, anchoPx = 800, altoPx = 600) => {
  const virtualRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  virtualRenderer.setSize(anchoPx, altoPx);
  virtualRenderer.setPixelRatio(2);

  const center = new THREE.Vector3();
  const size = new THREE.Vector3();
  box.getCenter(center);
  box.getSize(size);

  const aspect = anchoPx / altoPx;
  const maxDim = Math.max(size.x, size.y, size.z);
  const margin = 1.25;
  
  let sizeX = size.x;
  let sizeY = size.y;

  if (tipoVista === 'FRONTAL') {
    sizeX = size.x;
    sizeY = size.y;
  } else if (tipoVista === 'LATERAL') {
    sizeX = size.z;
    sizeY = size.y;
  } else if (tipoVista === 'INFERIOR') {
    sizeX = size.x;
    sizeY = size.z;
  } else {
    sizeX = maxDim;
    sizeY = maxDim;
  }

  const frustumSize = Math.max(sizeY, sizeX / aspect) * margin;

  const virtualCamera = new THREE.OrthographicCamera(
    -frustumSize * aspect / 2,
     frustumSize * aspect / 2,
     frustumSize / 2,
    -frustumSize / 2,
     0.1,
     1000
  );

  const dist = maxDim * 2;

  switch (tipoVista) {
    case 'FRONTAL':
      virtualCamera.position.set(center.x, center.y, center.z + dist);
      virtualCamera.up.set(0, 1, 0);
      break;
    case 'LATERAL':
      virtualCamera.position.set(center.x + dist, center.y, center.z);
      virtualCamera.up.set(0, 1, 0);
      break;
    case 'INFERIOR':
      virtualCamera.position.set(center.x, center.y - dist, center.z);
      virtualCamera.up.set(0, 0, 1);
      break;
    case 'ISOMETRICA':
    default:
      virtualCamera.position.set(
        center.x + dist,
        center.y + dist * 0.8,
        center.z + dist
      );
      virtualCamera.up.set(0, 1, 0);
      break;
  }

  virtualCamera.lookAt(center);
  virtualCamera.updateProjectionMatrix();

  virtualRenderer.render(escenaVirtual, virtualCamera);
  const imgData = virtualRenderer.domElement.toDataURL('image/png');

  virtualRenderer.dispose();
  return imgData;
};

export const capturar4VistasCAD = (scene, camera) => {
  if (!scene || !camera) return null;

  const escenaVirtual = new THREE.Scene();
  escenaVirtual.background = new THREE.Color(0xffffff);

  const ambientLight = new THREE.AmbientLight(0xffffff, 2.2);
  const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.4);
  dirLight1.position.set(15, -30, 20);
  const dirLight2 = new THREE.DirectionalLight(0xffffff, 0.8);
  dirLight2.position.set(-15, 15, -15);
  escenaVirtual.add(ambientLight, dirLight1, dirLight2);

  scene.updateMatrixWorld(true);

  scene.traverse((child) => {
    if (child.visible && (child.isMesh || child.isGroup)) {
      const esInvasivo = 
        child.isGridHelper || 
        child.isAxesHelper || 
        child.type === 'GridHelper' ||
        child.name?.toLowerCase().includes('cota') ||
        child.userData?.esCota;

      if (!esInvasivo && child.parent === scene) {
        escenaVirtual.add(child.clone(true));
      }
    }
  });

  escenaVirtual.updateMatrixWorld(true);
  const box = new THREE.Box3();

  escenaVirtual.traverse((child) => {
    if (child.isMesh && child.geometry) {
      child.geometry.computeBoundingBox();
      const meshBox = new THREE.Box3().copy(child.geometry.boundingBox).applyMatrix4(child.matrixWorld);
      box.union(meshBox);
    }
  });

  if (box.isEmpty() || !isFinite(box.min.x)) {
    box.set(new THREE.Vector3(-0.3, 0, -0.3), new THREE.Vector3(0.3, 1.5, 0.3));
  }

  return {
    iso: capturarVistaCAD(escenaVirtual, box, 'ISOMETRICA', 800, 550),
    frontal: capturarVistaCAD(escenaVirtual, box, 'FRONTAL', 800, 550),
    lateral: capturarVistaCAD(escenaVirtual, box, 'LATERAL', 400, 500),
    inferior: capturarVistaCAD(escenaVirtual, box, 'INFERIOR', 400, 500)
  };
};

export const construirPaginaPlanoCAD = async (pdf, visorRef, item, index = 1) => {
  if (!visorRef?.current) return;

  const instancias = visorRef.current.getInstanciasThree ? visorRef.current.getInstanciasThree() : visorRef.current;
  const { scene, camera, promesaCarga } = instancias || {};
  if (!scene || !camera) return;

  if (promesaCarga) await promesaCarga;

  const vistas = capturar4VistasCAD(scene, camera);
  if (!vistas) return;

  const categoria = (item?.categoria || 'GABINETES').toUpperCase();
  const altoVal = parseFloat(item?.alto || item?.detalles?.alto || 90);
  const anchoVal = parseFloat(item?.ancho || item?.detalles?.ancho || 60);
  const fondoVal = parseFloat(item?.fondo || item?.detalles?.fondo || 60);

  // 3.1. EQUIVALENCIA EN UNIDADES RACK (1 RU = 4.445 CM)
  const ruCalculadas = Math.round(altoVal / 4.445);

  // PÁGINA 1
  pdf.addPage();
  pdf.setFillColor(15, 23, 42);
  pdf.rect(0, 0, 210, 15, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.text(`PLANOS CAD - VISTAS PRINCIPALES - ÍTEM #${index} (PÁG 1/2)`, 12, 10.5);

  pdf.setDrawColor(203, 213, 225);
  pdf.rect(8, 19, 194, 270);

  pdf.setFillColor(250, 250, 250);
  pdf.rect(12, 23, 186, 120, 'F');
  pdf.setDrawColor(226, 232, 240);
  pdf.rect(12, 23, 186, 120, 'S');
  pdf.addImage(vistas.iso, 'PNG', 15, 25, 180, 110, undefined, 'FAST');
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(100, 116, 139);
  pdf.text("1. VISTA ISOMÉTRICA INTERIOR (PERSPECTIVA 3D)", 16, 140);

  pdf.setFillColor(250, 250, 250);
  pdf.rect(12, 147, 186, 134, 'F');
  pdf.setDrawColor(226, 232, 240);
  pdf.rect(12, 147, 186, 134, 'S');
  pdf.addImage(vistas.frontal, 'PNG', 15, 149, 180, 126, undefined, 'FAST');
  pdf.text("2. ELEVACIÓN FRONTAL (ALZADO COMPLETO)", 16, 278);

  pdf.setFontSize(7);
  pdf.setTextColor(148, 163, 184);
  pdf.text("Plataforma Integrada M3 - Documentación Técnica CAD", 12, 285);

  // PÁGINA 2
  pdf.addPage();
  pdf.setFillColor(15, 23, 42);
  pdf.rect(0, 0, 210, 15, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.text(`FICHA TÉCNICA Y PERFILES DETALLADOS - ÍTEM #${index} (PÁG 2/2)`, 12, 10.5);

  pdf.setDrawColor(203, 213, 225);
  pdf.rect(8, 19, 194, 270);

  pdf.setFillColor(250, 250, 250);
  pdf.rect(12, 23, 90, 110, 'F');
  pdf.setDrawColor(226, 232, 240);
  pdf.rect(12, 23, 90, 110, 'S');
  pdf.addImage(vistas.lateral, 'PNG', 15, 25, 84, 102, undefined, 'FAST');
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(100, 116, 139);
  pdf.text("3. PERFIL LATERAL DERECHO", 16, 130);

  pdf.setFillColor(250, 250, 250);
  pdf.rect(108, 23, 90, 110, 'F');
  pdf.setDrawColor(226, 232, 240);
  pdf.rect(108, 23, 90, 110, 'S');
  pdf.addImage(vistas.inferior, 'PNG', 111, 25, 84, 102, undefined, 'FAST');
  pdf.text("4. VISTA INFERIOR (PLANTA PISO Y REFUERZOS)", 112, 130);

  const startY = 138;

  pdf.setFillColor(30, 41, 59);
  pdf.rect(12, startY, 90, 7, 'F');
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(255, 255, 255);
  pdf.text("DIMENSIONES Y GEOMETRÍA", 15, startY + 4.8);

  pdf.setFillColor(248, 250, 252);
  pdf.rect(12, startY + 7, 90, 138, 'F');
  pdf.setDrawColor(203, 213, 225);
  pdf.rect(12, startY + 7, 90, 138, 'S');

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8.5);
  pdf.setTextColor(51, 65, 85);
  pdf.text(`• Alto Estructura: ${altoVal} cm (~${ruCalculadas} RU)`, 16, startY + 20);
  pdf.text(`• Ancho Frontal: ${anchoVal} cm (${anchoVal * 10} mm)`, 16, startY + 34);
  pdf.text(`• Fondo / Profundidad: ${fondoVal} cm (${fondoVal * 10} mm)`, 16, startY + 48);
  pdf.text(`• Capacidad Rack: ${ruCalculadas} Unidades RU (1.75")`, 16, startY + 62);
  pdf.text(`• Categoría: ${categoria}`, 16, startY + 76);

  pdf.setFillColor(30, 41, 59);
  pdf.rect(108, startY, 90, 7, 'F');
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(255, 255, 255);
  pdf.text("MATERIALES Y TRATAMIENTO", 111, startY + 4.8);

  pdf.setFillColor(248, 250, 252);
  pdf.rect(108, startY + 7, 90, 138, 'F');
  pdf.setDrawColor(203, 213, 225);
  pdf.rect(108, startY + 7, 90, 138, 'S');

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8.5);
  pdf.setTextColor(51, 65, 85);
  pdf.text(`• Material: ${item?.lamina || item?.calibre || 'Lámina CR (Cal 20)'}`, 112, startY + 20);
  pdf.text(`• Acabado: ${item?.pintura || item?.detalles?.pintura || 'Negro Mate'}`, 112, startY + 34);
  pdf.text(`• Proceso: Corte CNC / Plegado`, 112, startY + 48);
  pdf.text(`• Refuerzos: Platina Cruz Soldada`, 112, startY + 62);
  pdf.text(`• Calidad: Pre-pintura requerida`, 112, startY + 76);

  pdf.setFontSize(7);
  pdf.setTextColor(148, 163, 184);
  pdf.text("Planos multivista y despieces generados automáticamente por la Plataforma Integrada M3.", 12, 285);
};