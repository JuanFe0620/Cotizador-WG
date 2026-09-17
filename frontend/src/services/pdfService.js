// Aquí a futuro importarás jsPDF. Por ahora es la estructura base.
export const generarCotizacionPDF = (cliente, items, total, consecutivo) => {
  if (items.length === 0) {
    alert("No hay ítems para generar el PDF.");
    return;
  }
  
  // Aquí irá la lógica de jsPDF con el Logo de M3
  console.log("Generando PDF para:", cliente.razonSocial);
  console.log("Ítems:", items);
  
  alert(`📄 PDF Generado con logo M3\nConsecutivo: ${consecutivo}\nCliente: ${cliente.razonSocial || 'General'}\nTotal: $${total.toLocaleString()}`);
};