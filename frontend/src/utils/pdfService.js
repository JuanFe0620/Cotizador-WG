import jsPDF from 'jspdf';
import { construirPaginaPlanoCAD } from '/src/components/Visor3D/visor/builders/generadorPlanoCAD.js';

export const exportarPdfTecnico = async ({
  items,
  totalCotizacion,
  consecutivo,
  clienteSeleccionado,
  vendedor = "ZAPATA CARRANZA PAOLA KATHERINE - 0012",
  disenador = "WILFRED GARCIA",
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
  setGenerandoPdf
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

    fetch('http://127.0.0.1:8000/api/cotizaciones/guardar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payloadCotizacion)
    }).catch(e => console.error("Error guardando historial:", e));

    const pdf = new jsPDF('p', 'mm', 'a4');
    const fechaActual = new Date();
    const fechaStr = fechaActual.toLocaleDateString('es-CO');
    const fechaVenc = new Date();
    fechaVenc.setDate(fechaActual.getDate() + 30);
    const fechaVencStr = fechaVenc.toLocaleDateString('es-CO');

    // Cálculo sugerido para fecha de entrega aproximada (días hábiles/calendario por defecto)
    const fechaEntregaAprox = new Date();
    fechaEntregaAprox.setDate(fechaActual.getDate() + 12);
    const fechaEntregaAproxStr = fechaEntregaAprox.toLocaleDateString('es-CO');

    // 1. CABECERA E INSTITUCIONAL
    try {
      pdf.addImage('/logo.png', 'PNG', 14, 8, 28, 22);
    } catch (err) {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(12);
      pdf.setTextColor(0, 51, 102);
      pdf.text("WG INGENIERÍA", 14, 18);
    }

    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 0, 0);
    pdf.text("WG INGENIERIA Y COMUNICACIONES EYH S.A.S", 14, 28);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);
    pdf.text("NIT: 900.708.792-1 | Actividad Económica 4652", 14, 32);
    pdf.text("Carrera 22 No. 13-58 Bodega 3 - Bogotá / Colombia", 14, 36);
    pdf.text("Tel: 3107606149 / 3002908678 | wgingenieria@outlook.com", 14, 40);

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

    // Campo Texto Editable para Fecha Aproximada de Entrega
    const campoFechaEntrega = new pdf.AcroFormTextField();
    campoFechaEntrega.Rect = [159, 33.5, 35, 4.5];
    campoFechaEntrega.value = fechaEntregaAproxStr;
    campoFechaEntrega.fontSize = 6.5;
    pdf.addField(campoFechaEntrega);

    // 2. BLOQUE CLIENTE + DESPLEGABLES
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

    pdf.setFont('helvetica', 'normal');
    pdf.text(clienteSeleccionado?.nombre || 'CLIENTE GENERAL / MOSTRADOR', 32, 49);
    pdf.text(obtenerNit(clienteSeleccionado) || '222222222222', 32, 55);
    pdf.text(clienteSeleccionado?.direccion || 'BOGOTÁ D.C.', 128, 49);
    pdf.text(clienteSeleccionado?.telefono || '3000000000', 128, 55);

    // --- LISTA DESPLEGABLE (COMBOBOX) DE VENDEDORES ---
    const comboVendedor = new pdf.AcroFormComboBox();
    comboVendedor.Rect = [32, 57, 75, 5];
    comboVendedor.fontSize = 6.5;
    
    const vendedoresLista = [
      "CORTES TORRES SANDRA PATRICIA - 0013",
      "DUARTE RODRIGUEZ GUILLERMO - 0011",
      "FARFAN CIFUENTES CRISTIAN FELIPE - 0008",
      "GARCIA RAYO JUAN FELIPE - 0006",
      "GARCIA CARRANZA WILFRED HERNANDO - 0002",
      "RAMIREZ CARRANZA NORA VIVIANA - 0016",
      "ZAPATA CARRANZA PAOLA KATHERINE - 0012"
    ];

    comboVendedor.setOptions(vendedoresLista);
    const valorInicialVendedor = vendedoresLista.includes(vendedor) ? vendedor : vendedoresLista[0];
    comboVendedor.value = valorInicialVendedor;
    pdf.addField(comboVendedor);

    // --- LISTA DESPLEGABLE (COMBOBOX) DE DISEÑADORES ---
    const comboDisenador = new pdf.AcroFormComboBox();
    comboDisenador.Rect = [128, 57, 65, 5];
    comboDisenador.fontSize = 6.5;

    const disenadoresLista = [
      "WILFRED GARCIA",
      "LINA PUELLO"
    ];

    comboDisenador.setOptions(disenadoresLista);
    const valorInicialDisenador = disenadoresLista.includes(disenador) ? disenador : disenadoresLista[0];
    comboDisenador.value = valorInicialDisenador;
    pdf.addField(comboDisenador);

    // 3. TABLA DE ÍTEMS DE FABRICACIÓN
    let y = 70;
    pdf.setFillColor(230, 235, 245);
    pdf.rect(14, y, 182, 6, 'F');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7.5);
    pdf.setTextColor(0, 51, 102);

    pdf.text("CÓDIGO", 16, y + 4);
    pdf.text("DESCRIPCIÓN TÉCNICA Y COMPONENTES", 42, y + 4);
    pdf.text("CANT", 132, y + 4);
    pdf.text("% IVA", 146, y + 4);
    pdf.text("VR UNITARIO", 160, y + 4);
    pdf.text("VALOR TOTAL", 180, y + 4);

    y += 8;
    pdf.setTextColor(0, 0, 0);

    items.forEach((item, idx) => {
      const { cantItem, precioTotalItem } = obtenerValoresComerciales(item);
      const precioUnitarioItem = Math.round(precioTotalItem / cantItem);
      const accesorios = item.accesoriosLista || item.accesorios_lista || item.detalles?.accesorios || [];
      const tramos = item.tramos || item.detalles?.tramos || [];
      const baseObj = obtenerObjetoBase(item);
      const codigoItem = `FAB-${(idx + 1).toString().padStart(3, '0')}`;
      const acabadoTxt = item.pintura || item.detalles?.pintura || item.acabado || 'Gris Poliéster';
      const categoria = (item.categoria || 'PRODUCTO').toLowerCase();

      if (y > 210) { pdf.addPage(); y = 20; }

      const tituloFormateado = formatoCalibreTexto(item).replace(/Lámina\s+Lámina/gi, 'Lámina');

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8);
      pdf.text(codigoItem, 16, y);
      pdf.text(`[${(item.categoria || 'GABINETES').toUpperCase()}] ${tituloFormateado}`, 42, y);
      pdf.text(String(cantItem), 134, y);
      pdf.text("19%", 148, y);
      pdf.text(formatoMonedaSinSimbolo(precioUnitarioItem), 160, y);
      pdf.text(formatoMonedaSinSimbolo(precioTotalItem), 180, y);

      y += 5;
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(7);
      pdf.setTextColor(0, 51, 102);
      pdf.text("ESPECIFICACIONES DE MANUFACTURA:", 42, y);
      y += 4;

      if (categoria === 'gabinetes' || categoria === 'totems') {
        const alto = item.alto || item.detalles?.alto || 120;
        const ancho = item.ancho || item.detalles?.ancho || 60;
        const fondo = item.fondo || item.detalles?.fondo || 60;
        const lamina = item.lamina || item.tipoLamina || 'CR';
        const calibre = item.calibre || 20;

        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(60, 60, 60);
        pdf.text("• Dimensiones:", 44, y);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(0, 0, 0);
        pdf.text(`Lámina ${lamina} Calibre ${calibre} - ${alto}cm (Alto) x ${ancho}cm (Ancho) x ${fondo}cm (Fondo).`, 68, y);
        y += 4;
      } else {
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(60, 60, 60);
        pdf.text("• Estructura:", 44, y);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(0, 0, 0);

        const largoTramo = tramos.length > 0 ? (parseFloat(tramos[0].alto || tramos[0].longitud || 300)) : 300;
        const largoCm = largoTramo < 10 ? largoTramo * 100 : largoTramo;
        const detTramo = tramos.length > 0 ? obtenerDetalleTramo(tramos[0], item) : `Tubo Redondo Calibre ${item.calibre || 14} Ø ${item.diametro || 4}"`;

        pdf.text(`${detTramo} x ${largoCm} cm.`, 68, y);
        y += 4;

        if (baseObj) {
          const detBase = obtenerDetalleBase(baseObj);
          if (detBase) {
            pdf.setFont('helvetica', 'bold');
            pdf.setTextColor(60, 60, 60);
            pdf.text("• Anclaje:", 44, y);
            pdf.setFont('helvetica', 'normal');
            pdf.setTextColor(0, 0, 0);
            pdf.text(`${detBase}.`, 68, y);
            y += 4;
          }
        }
      }

      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(60, 60, 60);
      pdf.text("• Acabado:", 44, y);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(0, 0, 0);
      pdf.text(`Pintura electrostática color ${acabadoTxt}.`, 68, y);
      y += 4;

      if (accesorios.length > 0) {
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(0, 51, 102);
        pdf.text("• ACCESORIOS INCLUIDOS:", 44, y);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(60, 60, 60);
        y += 4;

        accesorios.forEach((acc) => {
          pdf.text(`  - ${acc.nombre || acc.descripcion} x${acc.cantidad || 1}`, 46, y);
          y += 4;
        });
      }

      pdf.setDrawColor(220, 220, 220);
      pdf.line(14, y, 196, y);
      y += 5;
    });

    y = Math.max(y + 2, 195);

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7.5);
    pdf.setTextColor(0, 0, 0);
    pdf.text(`SON: ${numeroALetrasCOP(totalPagarConIva)}`, 14, y);

    // 4. RESUMEN FINANCIERO Y CUADRO DE VALORES
    const totalBoxY = y + 3;
    pdf.setDrawColor(200, 200, 200);
    pdf.rect(125, totalBoxY, 71, 32, 'S');

    pdf.setFontSize(7.5);
    pdf.setFont('helvetica', 'bold');
    pdf.text("SUBTOTAL (Neto)", 127, totalBoxY + 6);
    pdf.text("IVA (19%)", 127, totalBoxY + 12);
    pdf.text("TOTAL FABRICACIÓN", 127, totalBoxY + 18);
    pdf.text(`ANTICIPO (${porcentajeAnticipo}%)`, 127, totalBoxY + 24);
    pdf.text(`SALDO ENTREGA (${porcentajeSaldo}%)`, 127, totalBoxY + 29);

    pdf.setFont('helvetica', 'normal');
    pdf.text(`$ ${formatoMonedaSinSimbolo(subtotalGeneralNeto)}`, 164, totalBoxY + 6);
    pdf.text(`$ ${formatoMonedaSinSimbolo(ivaGeneral)}`, 164, totalBoxY + 12);
    
    pdf.setFont('helvetica', 'bold');
    pdf.text(`$ ${formatoMonedaSinSimbolo(totalPagarConIva)}`, 164, totalBoxY + 18);
    pdf.setTextColor(0, 102, 0);
    pdf.text(`$ ${formatoMonedaSinSimbolo(montoAnticipo)}`, 164, totalBoxY + 24);
    pdf.setTextColor(180, 0, 0);
    pdf.text(`$ ${formatoMonedaSinSimbolo(montoSaldo)}`, 164, totalBoxY + 29);

    // 5. CAJA DE CONDICIONES Y DISCLAIMER VISUAL
    pdf.setFillColor(248, 250, 252);
    pdf.setDrawColor(203, 213, 225);
    pdf.rect(14, totalBoxY, 106, 32, 'FD');

    pdf.setFontSize(6.5);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 51, 102);
    pdf.text("CONDICIONES COMERCIALES Y TIEMPOS DE ENTREGA:", 16, totalBoxY + 5);
    
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(40, 40, 40);
    pdf.text(`• Anticipo de ${porcentajeAnticipo}% para iniciar orden; saldo de ${porcentajeSaldo}% contra entrega.`, 16, totalBoxY + 10);
    pdf.text(`• Tiempo minimo de entrega : ${tiempoEntregaDias} días hábiles tras confirmar anticipo.`, 16, totalBoxY + 14);

    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(100, 100, 100);
    pdf.text("EXENCIÓN DE RESPONSABILIDAD VISUAL (DISCLAIMER):", 16, totalBoxY + 20);
    pdf.setFont('helvetica', 'italic');
    pdf.setFontSize(6);
    pdf.text("Las imágenes, renders y modelos 3D son de carácter ilustrativo y referencial.", 16, totalBoxY + 24);
    pdf.text("El producto final puede presentar variaciones o diferencias técnicas menores", 16, totalBoxY + 27);
    pdf.text("derivadas de los procesos de manufactura y tolerancia de materiales.", 16, totalBoxY + 30);

    // FIRMA DE CONFORMIDAD
    y = totalBoxY + 55;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);
    pdf.setTextColor(0, 0, 0);
    pdf.line(14, y, 80, y);
    pdf.text("ACEPTADO Y CONFORME (CLIENTE)", 14, y + 4);
    pdf.text("FECHA DE RECIBIDO:", 14, y + 8);

    for (let index = 0; index < items.length; index++) {
      await construirPaginaPlanoCAD(pdf, visorRef, items[index], index + 1);
    }

    pdf.save(`Servicio_Fabricacion_${consecutivo}.pdf`);
  } catch (error) {
    console.error("Error al generar el PDF:", error);
  } finally {
    if (setGenerandoPdf) setGenerandoPdf(false);
  }
};