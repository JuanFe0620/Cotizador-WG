import * as THREE from 'three';

export const capturarVistaCAD = (virtualRenderer, escenaVirtual, box, tipoVista, anchoPx = 800, altoPx = 600) => {
  virtualRenderer.setSize(anchoPx, altoPx);
  virtualRenderer.setPixelRatio(2);

  const center = new THREE.Vector3();
  const size = new THREE.Vector3();
  box.getCenter(center);
  box.getSize(size);

  const aspect = anchoPx / altoPx;
  const maxDim = Math.max(size.x, size.y, size.z, 0.1);
  const margin = 1.25;
  
  let sizeX = size.x;
  let sizeY = size.y;

  if (tipoVista === 'FRONTAL') {
    sizeX = size.x;
    sizeY = size.y;
  } else if (tipoVista === 'LATERAL') {
    sizeX = size.z;
    sizeY = size.y;
  } else if (tipoVista === 'INFERIOR' || tipoVista === 'SUPERIOR') {
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
    case 'SUPERIOR':
      virtualCamera.position.set(center.x, center.y + dist, center.z);
      virtualCamera.up.set(0, 0, -1);
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

  virtualRenderer.clear();
  virtualRenderer.render(escenaVirtual, virtualCamera);
  return virtualRenderer.domElement.toDataURL('image/png');
};

export const capturar4VistasCAD = (scene, camera, esBrazo = false) => {
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

  // Un solo WebGLRenderer reutilizado para las 4 vistas (evita agotar contextos WebGL en el navegador)
  const virtualRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  let vistas = null;
  try {
    vistas = {
      iso: capturarVistaCAD(virtualRenderer, escenaVirtual, box, 'ISOMETRICA', 800, 550),
      frontal: capturarVistaCAD(virtualRenderer, escenaVirtual, box, 'FRONTAL', 800, 550),
      lateral: capturarVistaCAD(virtualRenderer, escenaVirtual, box, 'LATERAL', 400, 500),
      inferior: capturarVistaCAD(virtualRenderer, escenaVirtual, box, esBrazo ? 'SUPERIOR' : 'INFERIOR', 400, 500)
    };
  } finally {
    virtualRenderer.dispose();
    virtualRenderer.forceContextLoss?.();
  }

  return vistas;
};

// `marca`: { nombre, consecutivo } del distribuidor activo (o fábrica) para el pie de página (marca blanca)
export const construirPaginaPlanoCAD = async (pdf, visorRef, item, index = 1, marca = {}) => {
  const nombreMarca = String(marca?.nombre || 'Fábrica WG').slice(0, 60);
  const refCotizacion = marca?.consecutivo ? ` | Cotización ${marca.consecutivo}` : '';
  if (!visorRef?.current) return;

  const instancias = visorRef.current.getInstanciasThree ? visorRef.current.getInstanciasThree() : visorRef.current;
  const { scene, camera, promesaCarga } = instancias || {};
  if (!scene || !camera) return;

  if (promesaCarga) await promesaCarga;

  const categoria = (item?.categoria || 'GABINETES').toUpperCase();
  const esBrazo = categoria.includes('BRAZO');

  const vistas = capturar4VistasCAD(scene, camera, esBrazo);
  if (!vistas) return;
  const altoVal = parseFloat(item?.alto || item?.detalles?.alto || 90);
  const anchoVal = parseFloat(item?.ancho || item?.detalles?.ancho || 60);
  const fondoVal = parseFloat(item?.fondo || item?.detalles?.fondo || 60);
  const esCofreExteriores =
    item?.tipoGabinete === 'cofre_exteriores' ||
    item?.params?.tipoGabinete === 'cofre_exteriores' ||
    item?.configuracion?.tipoGabinete === 'cofre_exteriores' ||
    item?.detalles?.tipoGabinete === 'cofre_exteriores';

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
  pdf.text(esBrazo ? "1. VISTA ISOMÉTRICA" : "1. VISTA ISOMÉTRICA INTERIOR (PERSPECTIVA 3D)", 16, 140);

  pdf.setFillColor(250, 250, 250);
  pdf.rect(12, 147, 186, 134, 'F');
  pdf.setDrawColor(226, 232, 240);
  pdf.rect(12, 147, 186, 134, 'S');
  pdf.addImage(vistas.frontal, 'PNG', 15, 149, 180, 126, undefined, 'FAST');
  pdf.text(esBrazo ? "2. ELEVACIÓN FRONTAL" : "2. ELEVACIÓN FRONTAL (ALZADO COMPLETO)", 16, 278);

  pdf.setFontSize(7);
  pdf.setTextColor(148, 163, 184);
  pdf.text(`${nombreMarca}${refCotizacion} - Documentación Técnica CAD`, 12, 285);

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
  pdf.text(esBrazo ? "3. PERFIL LATERAL (DOBLECES)" : "3. PERFIL LATERAL DERECHO", 16, 130);

  pdf.setFillColor(250, 250, 250);
  pdf.rect(108, 23, 90, 110, 'F');
  pdf.setDrawColor(226, 232, 240);
  pdf.rect(108, 23, 90, 110, 'S');
  pdf.addImage(vistas.inferior, 'PNG', 111, 25, 84, 102, undefined, 'FAST');
  pdf.text(esBrazo ? "4. VISTA SUPERIOR (PLANTA)" : "4. VISTA INFERIOR (PLANTA PISO Y REFUERZOS)", 112, 130);

  const startY = 138;

  pdf.setFillColor(30, 41, 59);
  pdf.rect(12, startY, 90, 7, 'F');
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(255, 255, 255);
  pdf.text(esBrazo ? "GEOMETRÍA Y DOBLECES DEL BRAZO" : "DIMENSIONES Y GEOMETRÍA", 15, startY + 4.8);

  pdf.setFillColor(248, 250, 252);
  pdf.rect(12, startY + 7, 90, 138, 'F');
  pdf.setDrawColor(203, 213, 225);
  pdf.rect(12, startY + 7, 90, 138, 'S');

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8.5);
  pdf.setTextColor(51, 65, 85);

  const limpiarTxtCad = (txt) => String(txt || '')
    .replace(/\b(l[áa]mina)\s+\1\b/gi, '$1')
    .replace(/\b(calibre)\s+\1\b/gi, '$1')
    .replace(/(\(\s*calibre\s+[^)]+\))\s*\1/gi, '$1')
    .replace(/\b(buje\s*:)\s*buje\b/gi, '$1')
    .replace(/\s+/g, ' ')
    .trim();

  const tramosItem = item?.tramos || item?.detalles?.tramos || [];
  const paramsItem = item?.params || item?.configuracion || {};

  if (esBrazo) {
    const esBrazoT = paramsItem.tipoBrazo === 'T' || paramsItem.tipoBrazo === 'T_BILATERAL';
    const lonTravesanoCm = esBrazoT ? (parseFloat(paramsItem.longitudTravesanoT ?? 50) || 0) : 0;
    const desarrolloTramosCm = tramosItem.reduce((acc, tr) => acc + (parseFloat(tr.alto ?? tr.longitud ?? 0) || 0), 0);
    const desarrolloTotalCm = desarrolloTramosCm + lonTravesanoCm;
    const desarrolloTotalM = (desarrolloTotalCm / 100).toFixed(2);
    const cantidadDobleces = tramosItem.slice(1).filter(tr => Number(tr.angulo ?? 0) !== 0).length;

    const primerTramo = tramosItem[0] || {};
    const formaTubo = String(primerTramo.forma || paramsItem.forma || 'redondo').toLowerCase();
    const calRaw = primerTramo.calibre || item?.calibre || paramsItem.calibre || '';
    const calTxt = calRaw ? (String(calRaw).toLowerCase().includes('calibre') ? calRaw : `Calibre ${calRaw}`) : '';
    const medidaTubo = formaTubo === 'cuadrado'
      ? `${primerTramo.ancho_cm || paramsItem.ancho_cm || 4}x${primerTramo.alto_cm || paramsItem.alto_cm || 4} cm`
      : `Diam. ${primerTramo.diametro_pulg || primerTramo.diametro || paramsItem.diametro || 2}"`;
    const tuboBaseTxt = limpiarTxtCad(`Tubo ${formaTubo} ${calTxt} ${medidaTubo}`);

    const pasosSeq = tramosItem.map((tr, tIdx) => {
      const lonCm = parseFloat(tr.alto ?? tr.longitud ?? 0) || 0;
      const ang = tr.angulo !== undefined && tr.angulo !== '' ? Number(tr.angulo) : 0;
      if (tIdx === 0) return `Tramo 1: ${lonCm} cm (${ang === 0 ? '0° recto' : `${ang}°`})`;
      if (ang !== 0) return `Doblez ${ang}° -> Tramo ${tIdx + 1}: ${lonCm} cm`;
      return `Tramo ${tIdx + 1}: ${lonCm} cm (0° recto)`;
    });
    if (esBrazoT && lonTravesanoCm > 0) pasosSeq.push(`Travesaño T: ${lonTravesanoCm} cm`);
    const textoSecuencia = pasosSeq.join(' -> ') || 'N/A';

    let yIzq = startY + 18;
    const printIzq = (txt) => {
      const lineas = pdf.splitTextToSize(limpiarTxtCad(txt), 82);
      pdf.text(lineas, 16, yIzq);
      yIzq += lineas.length * 4.5 + 3.5;
    };

    printIzq(`• Tipo de Brazo: ${esBrazoT ? 'Brazo en T (Doble Cámara)' : 'Simple / En L'}`);
    printIzq(`• Tubo Base: ${tuboBaseTxt}`);
    printIzq(`• Longitud Desarrollada: ${desarrolloTotalCm} cm (${desarrolloTotalM} m)`);
    printIzq(`• Cantidad de Dobleces: ${cantidadDobleces}`);
    printIzq(`• Desglose Tramos/Dobleces: ${textoSecuencia}`);
    printIzq(`• Categoría: ${categoria}`);

    pdf.setFillColor(30, 41, 59);
    pdf.rect(108, startY, 90, 7, 'F');
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(255, 255, 255);
    pdf.text("MATERIALES Y MANUFACTURA", 111, startY + 4.8);

    pdf.setFillColor(248, 250, 252);
    pdf.rect(108, startY + 7, 90, 138, 'F');
    pdf.setDrawColor(203, 213, 225);
    pdf.rect(108, startY + 7, 90, 138, 'S');

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8.5);
    pdf.setTextColor(51, 65, 85);

    const rawAccs = item?.accesoriosLista || item?.accesorios_lista || item?.detalles?.accesorios || [];
    const accsValidos = (Array.isArray(rawAccs) ? rawAccs : [])
      .filter(a => a && (a.nombre || a.descripcion) && Number(a.cantidad ?? 1) > 0)
      .map(a => `${limpiarTxtCad(a.nombre || a.descripcion)} (x${a.cantidad || 1})`);

    let yDer = startY + 18;
    const printDer = (txt) => {
      const lineas = pdf.splitTextToSize(limpiarTxtCad(txt), 82);
      pdf.text(lineas, 112, yDer);
      yDer += lineas.length * 4.5 + 3.5;
    };

    printDer(`• Tubo Base: ${tuboBaseTxt}`);
    printDer(`• Acabado: ${item?.pintura || item?.detalles?.pintura || 'Negro Mate'}`);
    printDer(`• Proceso: Corte de tubo / Doblado en máquina / Soldadura`);
    printDer(`• Refuerzo: ${paramsItem.conPieDeAmigo ? 'Pie de Amigo (Varilla diagonal)' : 'Estándar sin pie de amigo'}`);
    printDer(`• Accesorios / Bujes: ${accsValidos.length > 0 ? accsValidos.join(', ') : 'Ninguno'}`);
  } else {
    pdf.text(`• Alto Estructura: ${altoVal} cm (~${ruCalculadas} RU)`, 16, startY + 20);
    pdf.text(`• Ancho Frontal: ${anchoVal} cm (${anchoVal * 10} mm)`, 16, startY + 34);
    pdf.text(`• Fondo / Profundidad: ${fondoVal} cm (${fondoVal * 10} mm)`, 16, startY + 48);
    if (esCofreExteriores) {
      const visorAnchoCm = (anchoVal + 4.4).toFixed(1);
      const visorFondoCm = (fondoVal + 5.1).toFixed(1);
      pdf.text(`• Visera Voladiza Sup.: ${visorAnchoCm} x ${visorFondoCm} cm (doblez 1.8 cm)`, 16, startY + 62);
      pdf.text(`• Marco Vierteaguas: Pestaña perimetral + Chapa cilíndrica`, 16, startY + 76);
      pdf.text(`• Categoría: ${categoria} (COFRE EXTERIORES)`, 16, startY + 90);
    } else {
      pdf.text(`• Capacidad Rack: ${ruCalculadas} Unidades RU (1.75")`, 16, startY + 62);
      pdf.text(`• Categoría: ${categoria}`, 16, startY + 76);
    }

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
    const matTxt = limpiarTxtCad(item?.lamina || item?.calibre || 'Lámina CR (Cal 20)');
    pdf.text(`• Material: ${matTxt}`, 112, startY + 20);
    pdf.text(`• Acabado: ${item?.pintura || item?.detalles?.pintura || 'Negro Mate'}`, 112, startY + 34);
    pdf.text(`• Proceso: Corte CNC / Plegado`, 112, startY + 48);
    pdf.text(esCofreExteriores ? `• Puerta: Ciega + Chapa Cromada + Vierteaguas` : `• Refuerzos: Platina Cruz Soldada`, 112, startY + 62);
    if (!esCofreExteriores) {
      pdf.text(`• Calidad: Pre-pintura requerida`, 112, startY + 76);
    }
  }

  pdf.setFontSize(7);
  pdf.setTextColor(148, 163, 184);
  pdf.text(`Planos multivista y despieces generados automáticamente para ${nombreMarca}${refCotizacion}.`, 12, 285);
};