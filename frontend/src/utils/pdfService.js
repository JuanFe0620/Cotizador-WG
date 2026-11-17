import jsPDF from 'jspdf';
import { construirPaginaPlanoCAD } from '/src/components/Visor3D/visor/builders/generadorPlanoCAD.js';

// Limpieza de caracteres incompatibles con fuentes estándar de jsPDF
export const limpiarTextoTipografico = (texto) => {
  if (texto === null || texto === undefined) return '';
  if (typeof texto !== 'string') texto = String(texto);

  return texto
    .normalize('NFC')
    .replace(/[Ø⌀]\s*/g, 'Diam. ')
    .replace(/[Ø⌀]/g, 'Diam.')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[–—]/g, '-')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
};

export const exportarPdfTecnico = async ({
  items,
  totalCotizacion,
  consecutivo,
  clienteSeleccionado,
  vendedor = "ZAPATA CARRANZA PAOLA KATHERINE - 0012",
  disenador = "WILFRED GARCIA",
  notas = "",
  observaciones = "",
  porcentajeAnticipo = 50,
  porcentajeSaldo = 50,
  tiempoEntregaDias = 8,
  obtenerNit,
  obtenerValoresComerciales,
  formatoCalibreTexto,
  obtenerObjetoBase,
  obtenerDetalleTramo,
  obtenerDetalleBase,
  obtenerDetalleCartelas,
  numeroALetrasCOP,
  formatoMonedaSinSimbolo,
  visorRef,
  setGenerandoPdf,
  // Marca blanca: datos del distribuidor activo { nombre, nit, telefono, correo, direccion, logo }.
  // null => membrete institucional de la fábrica (WG).
  membrete = null,
  vendedoresLista: vendedoresListaProp = null,
  disenadoresLista: disenadoresListaProp = null
}) => {
  if (items.length === 0) return;
  
  if (setGenerandoPdf) setGenerandoPdf(true);

  try {
    const subtotalGeneralNeto = totalCotizacion;
    const ivaGeneral = Math.round(subtotalGeneralNeto * 0.19);
    const totalPagarConIva = subtotalGeneralNeto + ivaGeneral;

    const montoAnticipo = Math.round(totalPagarConIva * (porcentajeAnticipo / 100));
    const montoSaldo = totalPagarConIva - montoAnticipo;

    const payloadCotizacion = {
      consecutivo,
      cliente: clienteSeleccionado ? clienteSeleccionado.nombre : 'Cliente General',
      cliente_id: clienteSeleccionado?.id || null,
      nit: obtenerNit(clienteSeleccionado) || '222222222222',
      vendedor,
      disenador,
      porcentaje_anticipo: porcentajeAnticipo,
      porcentaje_saldo: porcentajeSaldo,
      subtotal: subtotalGeneralNeto,
      iva: ivaGeneral,
      total: totalPagarConIva,
      items: items,
      fecha: new Date().toISOString()
    };

    // La persistencia se realiza en Resumen.guardarCotizacionBD (incluye notas, asesor y diseñador).
    // Este PDF no vuelve a postear a /guardar para no sobrescribir esos campos con valores vacíos.

    const textoNotas = limpiarTextoTipografico((notas || observaciones || '').trim());

    const pdf = new jsPDF('p', 'mm', 'a4');
    const doc = pdf;

    // Interceptar text para sanitizar todos los caracteres tipográficos (evita Error 109 de Acrobat)
    const originalText = doc.text.bind(doc);
    doc.text = function(...args) {
      if (args.length > 0) {
        if (Array.isArray(args[0])) {
          args[0] = args[0].map(t => limpiarTextoTipografico(t));
        } else {
          args[0] = limpiarTextoTipografico(args[0]);
        }
      }
      try {
        return originalText(...args);
      } catch (e) {
        console.warn("⚠️ [PDF] Error capturado en doc.text:", e);
        return doc;
      }
    };

    // 1. Validación estricta de imágenes Base64 antes de insertar
    const validarImagenBase64 = (imageData) => {
      if (!imageData || typeof imageData !== 'string') return false;
      const trimmed = imageData.trim();
      if (trimmed.length < 100) return false;
      if (!trimmed.startsWith('data:image/png;base64,') && !trimmed.startsWith('data:image/jpeg;base64,')) {
        return false;
      }
      return true;
    };

    // Interceptar addImage para garantizar que ninguna imagen nula, vacía, <100 caracteres o corrupta dañe los streams XObject
    const originalAddImage = doc.addImage.bind(doc);
    doc.addImage = function(imageData, format, x, y, width, height, alias, compression, rotation) {
      if (!validarImagenBase64(imageData)) {
        console.warn("⚠️ [PDF] addImage omitido: imagen nula, vacía, <100 caracteres o formato no Base64 válido (previniendo Error 109 de Acrobat).");
        // Reemplazar por un recuadro gris o espacio en blanco para evitar corromper los streams XObject del PDF
        if (x !== undefined && y !== undefined && width !== undefined && height !== undefined) {
          try {
            doc.setFillColor(245, 247, 250);
            doc.setDrawColor(226, 232, 240);
            doc.rect(x, y, width, height, 'FD');
          } catch (e) {}
        }
        return doc;
      }

      try {
        return originalAddImage(imageData, format, x, y, width, height, alias, compression, rotation);
      } catch (err) {
        console.warn("⚠️ [PDF] Error capturado en addImage para evitar corrupción de streams XObject:", err);
        if (x !== undefined && y !== undefined && width !== undefined && height !== undefined) {
          try {
            doc.setFillColor(245, 247, 250);
            doc.setDrawColor(226, 232, 240);
            doc.rect(x, y, width, height, 'FD');
          } catch (e) {}
        }
        return doc;
      }
    };

    // Redirección segura de doc.save a descarga limpia mediante Blob Binario
    doc.save = function(nombreArchivo) {
      const blob = doc.output('blob');
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = nombreArchivo || `Cotizacion_${consecutivo || 'WG'}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    };

    const fechaActual = new Date();
    const fechaStr = fechaActual.toLocaleDateString('es-CO');
    const fechaVenc = new Date();
    fechaVenc.setDate(fechaActual.getDate() + 30);
    const fechaVencStr = fechaVenc.toLocaleDateString('es-CO');

    // Cálculo sugerido para fecha de entrega aproximada (días hábiles/calendario por defecto)
    const fechaEntregaAprox = new Date();
    fechaEntregaAprox.setDate(fechaActual.getDate() + 12);
    const fechaEntregaAproxStr = fechaEntregaAprox.toLocaleDateString('es-CO');

    // 1. CABECERA E INSTITUCIONAL (marca blanca: fábrica o distribuidor)
    const nombreEmpresaPdf = membrete ? (membrete.nombre || 'DISTRIBUIDOR') : "WG INGENIERÍA";

    // Inserta una imagen dentro de una caja, conservando la proporción
    const insertarLogoAjustado = (dataUrl, formato, x, yPos, maxAncho, maxAlto) => {
      let w = maxAncho;
      let h = maxAlto;
      try {
        const props = pdf.getImageProperties(dataUrl);
        const escala = Math.min(maxAncho / props.width, maxAlto / props.height);
        w = props.width * escala;
        h = props.height * escala;
      } catch (e) { /* usa la caja completa */ }
      originalAddImage(dataUrl, formato, x, yPos, w, h);
    };

    const textoLogoFallback = () => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(0, 51, 102);
      doc.text(nombreEmpresaPdf.length > 28 ? nombreEmpresaPdf.slice(0, 28) : nombreEmpresaPdf, 14, 18);
    };

    try {
      const cargarLogoBase64 = async () => {
        // Distribuidor: SOLO su propio logo (nunca el de la fábrica)
        if (membrete) return membrete.logo || null;
        try {
          const res = await fetch('/logo.png');
          if (!res.ok) return null;
          const blob = await res.blob();
          return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(blob);
          });
        } catch {
          return null;
        }
      };

      const logoDataUrl = await cargarLogoBase64();

      if (logoDataUrl && validarImagenBase64(logoDataUrl)) {
        const formatoLogo = logoDataUrl.startsWith('data:image/jpeg') ? 'JPEG' : 'PNG';
        insertarLogoAjustado(logoDataUrl, formatoLogo, 10, 8, 38, 16);
      } else {
        textoLogoFallback();
      }
    } catch (err) {
      console.warn("⚠️ [PDF] Error insertando logo corporativo:", err);
      textoLogoFallback();
    }

    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 0, 0);
    if (membrete) {
      pdf.text(String(membrete.nombre || '').toUpperCase(), 14, 28);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7);
      const lineasMembrete = [
        membrete.nit ? `NIT: ${membrete.nit}` : '',
        membrete.direccion || '',
        [membrete.telefono ? `Tel: ${membrete.telefono}` : '', membrete.correo || ''].filter(Boolean).join(' | ')
      ].filter(Boolean);
      lineasMembrete.forEach((linea, idx) => pdf.text(linea, 14, 32 + idx * 4));
    } else {
      pdf.text("WG INGENIERIA Y COMUNICACIONES EYH S.A.S", 14, 28);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7);
      pdf.text("NIT: 900.708.792-1 | Actividad Económica 4652", 14, 32);
      pdf.text("Carrera 22 No. 13-58 Bodega 3 - Bogotá / Colombia", 14, 36);
      pdf.text("Tel: 3107606149 / 3002908678 | wgingenieria@outlook.com", 14, 40);
    }

    // TÍTULO DEL DOCUMENTO
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    pdf.setTextColor(0, 51, 102);
    pdf.text(`SERVICIO DE FABRICACIÓN`, 130, 13);
    pdf.setTextColor(180, 0, 0);
    pdf.text(`No. ${consecutivo}`, 130, 18);

    // Caja de Fechas (Ampliada a 22mm para incluir F. Entrega Aprox)
    pdf.setDrawColor(200, 200, 200);
    pdf.setFillColor(245, 247, 250);
    pdf.rect(130, 20, 66, 22, 'FD');

    pdf.setFontSize(7.5);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 0, 0);
    pdf.text("Fecha Emisión:", 132, 25);
    pdf.text("Vencimiento:", 132, 31);
    pdf.text("F. Entrega Aprox:", 132, 37);

    pdf.setFont('helvetica', 'normal');
    pdf.text(fechaStr, 160, 25);
    pdf.text(fechaVencStr, 160, 31);
    pdf.text(fechaEntregaAproxStr, 160, 37);

    // 2. BLOQUE CLIENTE + RESPONSABLES (TEXTO ESTÁTICO)
    pdf.setDrawColor(200, 200, 200);
    pdf.rect(14, 44, 182, 22, 'S');

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7.5);
    pdf.text("Cliente:", 16, 49);
    pdf.text("NIT / CC:", 16, 55);
    pdf.text("Vendedor:", 16, 61);

    pdf.text("Dirección:", 110, 49);
    pdf.text("Teléfono:", 110, 55);
    pdf.text("Diseñador:", 110, 61);

    const vendedoresLista = (vendedoresListaProp && vendedoresListaProp.length > 0) ? vendedoresListaProp : (membrete ? [vendedor || ' '] : [
      "CORTES TORRES SANDRA PATRICIA - 0013",
      "DUARTE RODRIGUEZ GUILLERMO - 0011",
      "FARFAN CIFUENTES CRISTIAN FELIPE - 0008",
      "GARCIA RAYO JUAN FELIPE - 0006",
      "GARCIA CARRANZA WILFRED HERNANDO - 0002",
      "RAMIREZ CARRANZA NORA VIVIANA - 0016",
      "ZAPATA CARRANZA PAOLA KATHERINE - 0012"
    ]);
    const valorVendedor = vendedor && String(vendedor).trim()
      ? String(vendedor).trim()
      : (vendedoresLista[0] || '');

    const disenadoresLista = (disenadoresListaProp && disenadoresListaProp.length > 0) ? disenadoresListaProp : (membrete ? [disenador || ' '] : [
      "WILFRED GARCIA",
      "LINA PUELLO",
      "INGENIERÍA WG"
    ]);
    const valorDisenador = disenador && String(disenador).trim()
      ? String(disenador).trim()
      : (disenadoresLista[0] || '');

    pdf.setFont('helvetica', 'normal');
    pdf.text(clienteSeleccionado?.nombre || 'CLIENTE GENERAL / MOSTRADOR', 32, 49);
    pdf.text(obtenerNit(clienteSeleccionado) || '222222222222', 32, 55);
    pdf.text(valorVendedor, 32, 61, { maxWidth: 74 });
    pdf.text(clienteSeleccionado?.direccion || 'BOGOTÁ D.C.', 128, 49);
    pdf.text(clienteSeleccionado?.telefono || '3000000000', 128, 55);
    pdf.text(valorDisenador, 128, 61, { maxWidth: 64 });

    // 3. TABLA DE ÍTEMS DE FABRICACIÓN
    let y = 70;
    pdf.setFillColor(230, 235, 245);
    pdf.rect(14, y, 182, 6, 'F');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7.5);
    pdf.setTextColor(0, 51, 102);

    pdf.text("CÓDIGO", 16, y + 4);
    pdf.text("DESCRIPCIÓN TÉCNICA Y COMPONENTES", 40, y + 4);
    pdf.text("CANT", 138, y + 4, { align: 'right' });
    pdf.text("% IVA", 152, y + 4, { align: 'right' });
    pdf.text("VR UNITARIO", 174, y + 4, { align: 'right' });
    pdf.text("VALOR TOTAL", 194, y + 4, { align: 'right' });

    y += 8;
    pdf.setTextColor(0, 0, 0);

    const limpiarMaterialDuplicado = (texto) => {
      if (!texto) return '';
      return String(texto)
        .replace(/\b(l[áa]mina)\s+\1\b/gi, '$1')
        .replace(/\b(calibre)\s+\1\b/gi, '$1')
        .replace(/(\(\s*calibre\s+[^)]+\))\s*\1/gi, '$1')
        .replace(/\b(buje\s*:)\s*buje\b/gi, '$1')
        .replace(/\s+/g, ' ')
        .trim();
    };

    items.forEach((item, idx) => {
      const { cantItem, precioTotalItem } = obtenerValoresComerciales(item);
      const precioUnitarioItem = Math.round(precioTotalItem / cantItem);
      const rawAccesorios = item.accesoriosLista || item.accesorios_lista || item.detalles?.accesorios || [];
      const accesorios = (Array.isArray(rawAccesorios) ? rawAccesorios : []).filter(
        (acc) => acc && (acc.nombre || acc.descripcion) && Number(acc.cantidad ?? 1) > 0
      );
      const tramos = item.tramos || item.detalles?.tramos || [];
      const baseObj = obtenerObjetoBase(item);
      const codigoItem = `FAB-${(idx + 1).toString().padStart(3, '0')}`;
      const acabadoTxt = item.pintura || item.detalles?.pintura || item.acabado || 'Gris Poliéster';
      const categoria = (item.categoria || 'PRODUCTO').toLowerCase();

      if (y > 225) { pdf.addPage(); y = 20; }

      const tituloFormateado = limpiarMaterialDuplicado(formatoCalibreTexto(item));
      const tituloLinea = `[${(item.categoria || 'GABINETES').toUpperCase()}] ${tituloFormateado}`;
      const lineasTitulo = pdf.splitTextToSize(tituloLinea, 88);

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8);
      pdf.text(codigoItem, 16, y);
      pdf.text(lineasTitulo, 40, y);
      pdf.text(String(cantItem), 138, y, { align: 'right' });
      pdf.text("19%", 152, y, { align: 'right' });
      pdf.text(formatoMonedaSinSimbolo(precioUnitarioItem), 174, y, { align: 'right' });
      pdf.text(formatoMonedaSinSimbolo(precioTotalItem), 194, y, { align: 'right' });

      y += Math.max(5, lineasTitulo.length * 4 + 1);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(7);
      pdf.setTextColor(0, 51, 102);
      pdf.text("ESPECIFICACIONES DE MANUFACTURA:", 40, y);
      y += 4;

      const drawSpecRow = (etiqueta, valor) => {
        const valorLimpio = limpiarMaterialDuplicado(limpiarTextoTipografico(valor));
        const lineas = pdf.splitTextToSize(valorLimpio, 124);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(7);
        pdf.setTextColor(60, 60, 60);
        pdf.text(etiqueta, 42, y);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(0, 0, 0);
        lineas.forEach((linea) => {
          pdf.text(linea, 70, y);
          y += 3.8;
        });
      };

      if (categoria === 'gabinetes' || categoria === 'totems') {
        const alto = item.alto || item.detalles?.alto || 120;
        const ancho = item.ancho || item.detalles?.ancho || 60;
        const fondo = item.fondo || item.detalles?.fondo || 60;
        const laminaRaw = String(item.lamina || item.tipoLamina || 'CR').replace(/^l[áa]mina\s+/i, '').trim();
        const calibre = item.calibre;
        const esCofreExteriores =
          item.tipoGabinete === 'cofre_exteriores' ||
          item.params?.tipoGabinete === 'cofre_exteriores' ||
          item.configuracion?.tipoGabinete === 'cofre_exteriores';

        if (esCofreExteriores) {
          const calTxt = calibre
            ? (String(calibre).toLowerCase().includes('calibre') ? calibre : `Calibre ${calibre}`)
            : 'Calibre Estándar';
          const descCofre = `Cofre Metálico para Exteriores (Intemperie) en Lámina Cold Rolled ${calTxt}, con techo voladizo vierteaguas y puerta ciega con chapa de seguridad.`;
          drawSpecRow("• Descripción:", descCofre);
        }

        const calSolo = calibre
          ? (String(calibre).toLowerCase().includes('calibre') ? String(calibre) : `Calibre ${calibre}`)
          : '';
        const yaIncluyeCalibre = calSolo && laminaRaw.toLowerCase().includes(calSolo.toLowerCase());
        const textoLamina = `Lámina ${laminaRaw}${calSolo && !yaIncluyeCalibre ? ` (${calSolo})` : ''}`;
        drawSpecRow("• Dimensiones:", `${textoLamina} - ${alto} cm (Alto) x ${ancho} cm (Ancho) x ${fondo} cm (Fondo).`);
      } else if (categoria === 'brazos' || categoria.includes('brazo')) {
        const calBaseRaw = item.calibre || item.params?.calibre || '14';
        const calBaseTxt = String(calBaseRaw).toLowerCase().includes('calibre') ? calBaseRaw : `Calibre ${calBaseRaw}`;
        const rawTramo = tramos.length > 0
          ? obtenerDetalleTramo(tramos[0], item)
          : `Tubo Redondo ${calBaseTxt} Diam. ${item.diametro || 2}"`;
        const detTuboBase = limpiarMaterialDuplicado(limpiarTextoTipografico(rawTramo));

        const paramsItem = item.params || item.configuracion || {};
        const esBrazoT = paramsItem.tipoBrazo === 'T' || paramsItem.tipoBrazo === 'T_BILATERAL';
        const lonTravesanoCm = esBrazoT ? (parseFloat(paramsItem.longitudTravesanoT ?? 50) || 0) : 0;
        const desarrolloTramosCm = tramos.reduce((acc, tr) => acc + (parseFloat(tr.alto ?? tr.longitud ?? 0) || 0), 0);
        const desarrolloTotalCm = desarrolloTramosCm + lonTravesanoCm;
        const desarrolloTotalM = (desarrolloTotalCm / 100).toFixed(2);
        const cantidadDobleces = tramos.slice(1).filter(tr => Number(tr.angulo ?? 0) !== 0).length;

        drawSpecRow("• Tubo Base:", detTuboBase);

        const extrasBrazo = [
          esBrazoT ? `Brazo en T (Travesaño ${lonTravesanoCm} cm)` : null,
          paramsItem.conPieDeAmigo ? 'Con Pie de Amigo' : null
        ].filter(Boolean).join(' | ');
        const textoDesarrollo = `${desarrolloTotalCm} cm (${desarrolloTotalM} m) | ${cantidadDobleces} ${cantidadDobleces === 1 ? 'doblez' : 'dobleces'}${extrasBrazo ? ' | ' + extrasBrazo : ''}.`;
        drawSpecRow("• Desarrollo:", textoDesarrollo);

        if (tramos.length > 0) {
          const pasosSecuencia = tramos.map((tr, tIdx) => {
            const lonCm = parseFloat(tr.alto ?? tr.longitud ?? 0) || 0;
            const ang = tr.angulo !== undefined && tr.angulo !== '' ? Number(tr.angulo) : 0;
            const angTxt = ang === 0 ? '0° recto' : `${ang}°`;
            if (tIdx === 0) {
              return `Tramo 1: ${lonCm} cm (${angTxt})`;
            }
            if (ang !== 0) {
              return `Doblez a ${ang}° -> Tramo ${tIdx + 1}: ${lonCm} cm`;
            }
            return `Tramo ${tIdx + 1}: ${lonCm} cm (0° recto)`;
          });
          if (esBrazoT && lonTravesanoCm > 0) {
            pasosSecuencia.push(`Travesaño en T: ${lonTravesanoCm} cm`);
          }
          drawSpecRow("• Tramos/Dobleces:", pasosSecuencia.join(' -> '));
        }

        if (baseObj) {
          const detBase = limpiarTextoTipografico(obtenerDetalleBase(baseObj));
          if (detBase) {
            drawSpecRow("• Anclaje:", `${detBase}.`);
          }
        }
      } else {
        const largoTramo = tramos.length > 0 ? (parseFloat(tramos[0].alto || tramos[0].longitud || 300)) : 300;
        const largoCm = largoTramo < 10 ? largoTramo * 100 : largoTramo;
        const calRaw = item.calibre || 14;
        const calTxt = String(calRaw).toLowerCase().includes('calibre') ? calRaw : `Calibre ${calRaw}`;
        const rawTramo = tramos.length > 0 ? obtenerDetalleTramo(tramos[0], item) : `Tubo Redondo ${calTxt} Diam. ${item.diametro || 4}"`;
        const detTramo = limpiarMaterialDuplicado(limpiarTextoTipografico(rawTramo));

        drawSpecRow("• Estructura:", `${detTramo} x ${largoCm} cm.`);

        if (baseObj) {
          const detBase = limpiarTextoTipografico(obtenerDetalleBase(baseObj));
          if (detBase) {
            drawSpecRow("• Anclaje:", `${detBase}.`);
          }
        }
      }

      drawSpecRow("• Acabado:", `Pintura electrostática color ${acabadoTxt}.`);

      if (accesorios.length > 0) {
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(7);
        pdf.setTextColor(0, 51, 102);
        pdf.text("• ACCESORIOS INCLUIDOS:", 42, y);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(60, 60, 60);
        y += 3.8;

        accesorios.forEach((acc) => {
          const nombreAcc = limpiarMaterialDuplicado(acc.nombre || acc.descripcion);
          pdf.text(`  - ${nombreAcc} x${acc.cantidad || 1}`, 44, y);
          y += 3.8;
        });
      }

      pdf.setDrawColor(220, 220, 220);
      pdf.line(14, y, 196, y);
      y += 5;
    });

    y += 4;
    if (y + 54 > 282) { pdf.addPage(); y = 20; }

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7.5);
    pdf.setTextColor(0, 0, 0);
    const lineasSon = pdf.splitTextToSize(`SON: ${numeroALetrasCOP(totalPagarConIva)}`, 182);
    pdf.text(lineasSon, 14, y);
    y += lineasSon.length * 4;

    // 4. RESUMEN FINANCIERO Y CUADRO DE VALORES
    const totalBoxY = y + 2;
    const alturaCajas = 34;

    pdf.setDrawColor(200, 200, 200);
    pdf.rect(126, totalBoxY, 70, alturaCajas, 'S');

    pdf.setFontSize(7.5);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 0, 0);
    pdf.text("SUBTOTAL (Neto)", 128, totalBoxY + 6.5);
    pdf.text("IVA (19%)", 128, totalBoxY + 12.5);
    pdf.text("TOTAL FABRICACIÓN", 128, totalBoxY + 18.5);
    pdf.text(`ANTICIPO (${porcentajeAnticipo}%)`, 128, totalBoxY + 24.5);
    pdf.text(`SALDO ENTREGA (${porcentajeSaldo}%)`, 128, totalBoxY + 30.5);

    pdf.setFont('helvetica', 'normal');
    pdf.text(`$ ${formatoMonedaSinSimbolo(subtotalGeneralNeto)}`, 194, totalBoxY + 6.5, { align: 'right' });
    pdf.text(`$ ${formatoMonedaSinSimbolo(ivaGeneral)}`, 194, totalBoxY + 12.5, { align: 'right' });

    pdf.setFont('helvetica', 'bold');
    pdf.text(`$ ${formatoMonedaSinSimbolo(totalPagarConIva)}`, 194, totalBoxY + 18.5, { align: 'right' });
    pdf.setTextColor(0, 102, 0);
    pdf.text(`$ ${formatoMonedaSinSimbolo(montoAnticipo)}`, 194, totalBoxY + 24.5, { align: 'right' });
    pdf.setTextColor(180, 0, 0);
    pdf.text(`$ ${formatoMonedaSinSimbolo(montoSaldo)}`, 194, totalBoxY + 30.5, { align: 'right' });

    // 5. CAJA DE CONDICIONES Y DISCLAIMER VISUAL
    pdf.setFillColor(248, 250, 252);
    pdf.setDrawColor(203, 213, 225);
    pdf.rect(14, totalBoxY, 108, alturaCajas, 'FD');

    pdf.setFontSize(6.5);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 51, 102);
    pdf.text("CONDICIONES COMERCIALES Y TIEMPOS DE ENTREGA:", 16, totalBoxY + 5.5);

    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(40, 40, 40);
    pdf.text(`• Anticipo de ${porcentajeAnticipo}% para iniciar orden; saldo de ${porcentajeSaldo}% contra entrega.`, 16, totalBoxY + 10.5);
    pdf.text(`• Tiempo mínimo de entrega: ${tiempoEntregaDias} días hábiles tras confirmar anticipo.`, 16, totalBoxY + 14.5);

    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(100, 100, 100);
    pdf.text("EXENCIÓN DE RESPONSABILIDAD VISUAL (DISCLAIMER):", 16, totalBoxY + 20.5);
    pdf.setFont('helvetica', 'italic');
    pdf.setFontSize(6);
    pdf.text("Las imágenes, renders y modelos 3D son de carácter ilustrativo y referencial.", 16, totalBoxY + 24.5);
    pdf.text("El producto final puede presentar variaciones o diferencias técnicas menores", 16, totalBoxY + 27.8);
    pdf.text("derivadas de los procesos de manufactura y tolerancia de materiales.", 16, totalBoxY + 31.1);

    // NOTAS Y CONDICIONES COMERCIALES (observaciones capturadas por el usuario)
    let yNotasFin = totalBoxY + alturaCajas;
    if (textoNotas) {
      const anchoUtil = 178;
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7);
      const lineasNotas = pdf.splitTextToSize(textoNotas, anchoUtil);
      const altoNotas = 10 + lineasNotas.length * 3.6;
      let yNotas = totalBoxY + alturaCajas + 4;
      if (yNotas + altoNotas > 276) { pdf.addPage(); yNotas = 20; }
      pdf.setFillColor(248, 250, 252);
      pdf.setDrawColor(203, 213, 225);
      pdf.rect(14, yNotas, 182, altoNotas, 'FD');
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(7);
      pdf.setTextColor(0, 51, 102);
      pdf.text("NOTAS Y CONDICIONES COMERCIALES", 16, yNotas + 5);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(40, 40, 40);
      pdf.text(lineasNotas, 16, yNotas + 9.5);
      yNotasFin = yNotas + altoNotas;
    }

    // FIRMA DE CONFORMIDAD
    y = yNotasFin + 14;
    if (y + 12 > 285) { pdf.addPage(); y = 25; }
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);
    pdf.setTextColor(0, 0, 0);
    pdf.line(14, y, 82, y);
    pdf.text("ACEPTADO Y CONFORME (CLIENTE)", 14, y + 4);
    pdf.text("FECHA DE RECIBIDO:", 14, y + 8.5);

    for (let index = 0; index < items.length; index++) {
      const item = items[index];
      if (visorRef?.current?.cargarModeloItem) {
        try {
          await visorRef.current.cargarModeloItem(item);
          // Pausa controlada para asegurar que el pipeline de WebGL y el buffer de dibujo estén 100% listos
          await new Promise(r => setTimeout(r, 250));
        } catch (e) {
          console.warn("⚠️ [PDF] Error precargando modelo 3D para ítem:", e);
        }
      }
      await construirPaginaPlanoCAD(pdf, visorRef, item, index + 1, {
        nombre: membrete ? membrete.nombre : 'Fábrica WG',
        consecutivo
      });
    }

    // 2. Descarga segura mediante Blob Binario
    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Cotizacion_${consecutivo || 'WG'}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (error) {
    console.error("Error al generar el PDF:", error);
  } finally {
    if (setGenerandoPdf) setGenerandoPdf(false);
  }
};