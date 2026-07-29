import React, { useState } from 'react';

export default function App() {
  const [seccionAdmin, setSeccionAdmin] = useState('tubos');

  // Estado del Catálogo de la Base de Datos
  const [tubos, setTubos] = useState([
    { id: 1, forma: 'Cuadrado', material: 'Galvanizado', calibre: '18', tamano: '1" x 1"', precioTubo: 48000, costoMetro: 8000 },
    { id: 2, forma: 'Rectangular', material: 'HR', calibre: '20', tamano: '2" x 1"', precioTubo: 62000, costoMetro: 10333 }
  ]);

  const [laminas, setLaminas] = useState([
    { id: 1, tipo: 'Cold Rolled', calibre: '18', dimensiones: '1200x2400 mm', precioLamina: 140000, costoCm2: 4.86 },
    { id: 2, tipo: 'Galvanizada', calibre: '20', dimensiones: '1200x2400 mm', precioLamina: 115000, costoCm2: 3.99 }
  ]);

  const [accesorios, setAccesorios] = useState([
    { id: 1, categoria: 'Seguridad', descripcion: 'Chapa para gabinete doble pase', precio: 28000 },
    { id: 2, categoria: 'Soporte', descripcion: 'Par de refuerzos para piso', precio: 18000 }
  ]);

  // Formulario temporal
  const [nuevoTubo, setNuevoTubo] = useState({ forma: 'Cuadrado', material: 'Galvanizado', calibre: '18', tamano: '1x1', precioTubo: '' });
  const [nuevaLamina, setNuevaLamina] = useState({ tipo: 'Cold Rolled', calibre: '18', precioLamina: '' });
  const [nuevoAccesorio, setNuevoAccesorio] = useState({ categoria: 'Chapa', descripcion: '', precio: '' });

  // Funciones de Agregar
  const agregarTubo = () => {
    if (!nuevoTubo.precioTubo) return;
    const precio = parseFloat(nuevoTubo.precioTubo);
    const item = {
      id: Date.now(),
      ...nuevoTubo,
      precioTubo: precio,
      costoMetro: Math.round(precio / 6)
    };
    setTubos([...tubos, item]);
    setNuevoTubo({ forma: 'Cuadrado', material: 'Galvanizado', calibre: '18', tamano: '1x1', precioTubo: '' });
  };

  const agregarLamina = () => {
    if (!nuevaLamina.precioLamina) return;
    const precio = parseFloat(nuevaLamina.precioLamina);
    const item = {
      id: Date.now(),
      ...nuevaLamina,
      dimensiones: '1200x2400 mm',
      precioLamina: precio,
      costoCm2: (precio / 28800).toFixed(2)
    };
    setLaminas([...laminas, item]);
    setNuevaLamina({ tipo: 'Cold Rolled', calibre: '18', precioLamina: '' });
  };

  const agregarAccesorio = () => {
    if (!nuevoAccesorio.precio || !nuevoAccesorio.descripcion) return;
    const item = {
      id: Date.now(),
      ...nuevoAccesorio,
      precio: parseFloat(nuevoAccesorio.precio)
    };
    setAccesorios([...accesorios, item]);
    setNuevoAccesorio({ categoria: 'Chapa', descripcion: '', precio: '' });
  };

  // Funciones de Eliminar
  const eliminarItem = (id, tipo) => {
    if (tipo === 'tubos') setTubos(tubos.filter(t => t.id !== id));
    if (tipo === 'laminas') setLaminas(laminas.filter(l => l.id !== id));
    if (tipo === 'accesorios') setAccesorios(accesorios.filter(a => a.id !== id));
  };

  return (
    <div style={{ backgroundColor: '#f0f4f9', minHeight: '100vh', padding: '30px', fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
      
      {/* HEADER BENTO STYLE */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#ffffff', padding: '20px 30px', borderRadius: '24px', boxShadow: '0 10px 30px rgba(0,0,0,0.03)', marginBottom: '25px' }}>
        <div>
          <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#2563eb', textTransform: 'uppercase', letterSpacing: '1px' }}>ADMINISTRACIÓN CENTRAL</span>
          <h1 style={{ margin: 0, fontSize: '1.5rem', color: '#0f172a', fontWeight: '800' }}>Catálogo de Precios WG</h1>
        </div>
        <div style={{ display: 'flex', gap: '10px', backgroundColor: '#f8fafc', padding: '6px', borderRadius: '16px' }}>
          <button style={btnHeaderActive}>🛠️ Base de Datos</button>
          <button style={btnHeaderInactive}>📋 Cotizador (Próximamente)</button>
        </div>
      </header>

      {/* METRICAS RAPIDAS (BENTO CARDS) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '25px' }}>
        <div style={cardMetricStyle}>
          <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '600' }}>Tubos Registrados</span>
          <h2 style={{ margin: '8px 0 0 0', fontSize: '1.8rem', color: '#2563eb' }}>{tubos.length} Refs</h2>
        </div>
        <div style={cardMetricStyle}>
          <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '600' }}>Láminas Estándar</span>
          <h2 style={{ margin: '8px 0 0 0', fontSize: '1.8rem', color: '#0284c7' }}>{laminas.length} Tipos</h2>
        </div>
        <div style={cardMetricStyle}>
          <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '600' }}>Accesorios en Stock</span>
          <h2 style={{ margin: '8px 0 0 0', fontSize: '1.8rem', color: '#3b82f6' }}>{accesorios.length} Ítems</h2>
        </div>
      </div>

      {/* SECTOR PRINCIPAL: NAVEGACIÓN Y TABLAS */}
      <div style={{ backgroundColor: '#ffffff', padding: '28px', borderRadius: '24px', boxShadow: '0 10px 30px rgba(0,0,0,0.03)' }}>
        
        {/* PESTAÑAS AZULES */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '25px', borderBottom: '2px solid #f1f5f9', paddingBottom: '15px' }}>
          <button onClick={() => setSeccionAdmin('tubos')} style={seccionAdmin === 'tubos' ? tabActive : tabInactive}>📐 Tubos (Tiras 6m)</button>
          <button onClick={() => setSeccionAdmin('laminas')} style={seccionAdmin === 'laminas' ? tabActive : tabInactive}>🔲 Láminas (1200x2400 mm)</button>
          <button onClick={() => setSeccionAdmin('accesorios')} style={seccionAdmin === 'accesorios' ? tabActive : tabInactive}>🔩 Accesorios</button>
        </div>

        {/* CONTENIDO TUBOS */}
        {seccionAdmin === 'tubos' && (
          <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '25px' }}>
            {/* FORMULARIO AGREGAR */}
            <div style={formCardStyle}>
              <h3 style={{ margin: '0 0 15px 0', fontSize: '1.1rem', color: '#0f172a' }}>+ Nuevo Tubo</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>Forma</label>
                  <input type="text" value={nuevoTubo.forma} onChange={(e)=>setNuevoTubo({...nuevoTubo, forma: e.target.value})} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Material</label>
                  <input type="text" value={nuevoTubo.material} onChange={(e)=>setNuevoTubo({...nuevoTubo, material: e.target.value})} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Calibre</label>
                  <input type="text" value={nuevoTubo.calibre} onChange={(e)=>setNuevoTubo({...nuevoTubo, calibre: e.target.value})} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Tamaño / Dimensión</label>
                  <input type="text" value={nuevoTubo.tamano} onChange={(e)=>setNuevoTubo({...nuevoTubo, tamano: e.target.value})} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Precio por Tubo 6m ($)</label>
                  <input type="number" placeholder="Ej: 48000" value={nuevoTubo.precioTubo} onChange={(e)=>setNuevoTubo({...nuevoTubo, precioTubo: e.target.value})} style={inputStyle} />
                </div>
                <button onClick={agregarTubo} style={btnBlueStyle}>Guardar Tubo</button>
              </div>
            </div>

            {/* TABLA VER CATALOGO */}
            <div>
              <h3 style={{ margin: '0 0 15px 0', fontSize: '1.1rem', color: '#0f172a' }}>Catálogo Actual de Tubos</h3>
              <table style={tableStyle}>
                <thead>
                  <tr style={thGroupStyle}>
                    <th style={thStyle}>Detalle</th>
                    <th style={thStyle}>Calibre</th>
                    <th style={thStyle}>Precio 6m</th>
                    <th style={thStyle}>Costo/m Calculado</th>
                    <th style={{...thStyle, textAlign: 'center'}}>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {tubos.map((t) => (
                    <tr key={t.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={tdStyle}><strong>Tubo {t.forma} {t.tamano}</strong><br/><span style={{fontSize: '0.8rem', color: '#64748b'}}>{t.material}</span></td>
                      <td style={tdStyle}>Cal. {t.calibre}</td>
                      <td style={{...tdStyle, fontWeight: '700', color: '#0f172a'}}>${t.precioTubo.toLocaleString()}</td>
                      <td style={{...tdStyle, color: '#2563eb', fontWeight: '600'}}>${t.costoMetro.toLocaleString()} /m</td>
                      <td style={{...tdStyle, textAlign: 'center'}}>
                        <button onClick={() => eliminarItem(t.id, 'tubos')} style={btnDelete}>🗑️</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* CONTENIDO LÁMINAS */}
        {seccionAdmin === 'laminas' && (
          <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '25px' }}>
            <div style={formCardStyle}>
              <h3 style={{ margin: '0 0 15px 0', fontSize: '1.1rem', color: '#0f172a' }}>+ Nueva Lámina</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>Tipo de Lámina</label>
                  <input type="text" value={nuevaLamina.tipo} onChange={(e)=>setNuevaLamina({...nuevaLamina, tipo: e.target.value})} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Calibre</label>
                  <input type="text" value={nuevaLamina.calibre} onChange={(e)=>setNuevaLamina({...nuevaLamina, calibre: e.target.value})} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Precio Lámina 1200x2400 mm ($)</label>
                  <input type="number" placeholder="Ej: 140000" value={nuevaLamina.precioLamina} onChange={(e)=>setNuevaLamina({...nuevaLamina, precioLamina: e.target.value})} style={inputStyle} />
                </div>
                <button onClick={agregarLamina} style={btnBlueStyle}>Guardar Lámina</button>
              </div>
            </div>

            <div>
              <h3 style={{ margin: '0 0 15px 0', fontSize: '1.1rem', color: '#0f172a' }}>Catálogo Actual de Láminas</h3>
              <table style={tableStyle}>
                <thead>
                  <tr style={thGroupStyle}>
                    <th style={thStyle}>Tipo</th>
                    <th style={thStyle}>Medida Estándar</th>
                    <th style={thStyle}>Precio Lámina</th>
                    <th style={thStyle}>Costo/cm² Calculado</th>
                    <th style={{...thStyle, textAlign: 'center'}}>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {laminas.map((l) => (
                    <tr key={l.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={tdStyle}><strong>{l.tipo}</strong><br/><span style={{fontSize: '0.8rem', color: '#64748b'}}>Calibre {l.calibre}</span></td>
                      <td style={tdStyle}>{l.dimensiones}</td>
                      <td style={{...tdStyle, fontWeight: '700', color: '#0f172a'}}>${l.precioLamina.toLocaleString()}</td>
                      <td style={{...tdStyle, color: '#0284c7', fontWeight: '600'}}>${l.costoCm2} /cm²</td>
                      <td style={{...tdStyle, textAlign: 'center'}}>
                        <button onClick={() => eliminarItem(l.id, 'laminas')} style={btnDelete}>🗑️</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* CONTENIDO ACCESORIOS */}
        {seccionAdmin === 'accesorios' && (
          <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '25px' }}>
            <div style={formCardStyle}>
              <h3 style={{ margin: '0 0 15px 0', fontSize: '1.1rem', color: '#0f172a' }}>+ Nuevo Accesorio</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>Categoría</label>
                  <input type="text" value={nuevoAccesorio.categoria} onChange={(e)=>setNuevoAccesorio({...nuevoAccesorio, categoria: e.target.value})} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Descripción</label>
                  <input type="text" placeholder="Ej: Chapa doble pase" value={nuevoAccesorio.descripcion} onChange={(e)=>setNuevoAccesorio({...nuevoAccesorio, descripcion: e.target.value})} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Precio Unitario ($)</label>
                  <input type="number" placeholder="Ej: 28000" value={nuevoAccesorio.precio} onChange={(e)=>setNuevoAccesorio({...nuevoAccesorio, precio: e.target.value})} style={inputStyle} />
                </div>
                <button onClick={agregarAccesorio} style={btnBlueStyle}>Guardar Accesorio</button>
              </div>
            </div>

            <div>
              <h3 style={{ margin: '0 0 15px 0', fontSize: '1.1rem', color: '#0f172a' }}>Catálogo Actual de Accesorios</h3>
              <table style={tableStyle}>
                <thead>
                  <tr style={thGroupStyle}>
                    <th style={thStyle}>Categoría</th>
                    <th style={thStyle}>Descripción</th>
                    <th style={thStyle}>Precio Unitario</th>
                    <th style={{...thStyle, textAlign: 'center'}}>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {accesorios.map((a) => (
                    <tr key={a.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={tdStyle}><span style={{backgroundColor: '#eff6ff', color: '#2563eb', padding: '4px 10px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: '700'}}>{a.categoria}</span></td>
                      <td style={{...tdStyle, fontWeight: '600', color: '#0f172a'}}>{a.descripcion}</td>
                      <td style={{...tdStyle, fontWeight: '700', color: '#0f172a'}}>${a.precio.toLocaleString()}</td>
                      <td style={{...tdStyle, textAlign: 'center'}}>
                        <button onClick={() => eliminarItem(a.id, 'accesorios')} style={btnDelete}>🗑️</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

// ESTILOS DE DISEÑO DASHBOARD (BENTO AZUL)
const btnHeaderActive = { backgroundColor: '#2563eb', color: 'white', border: 'none', padding: '10px 18px', borderRadius: '12px', fontWeight: '700', fontSize: '0.85rem', cursor: 'pointer' };
const btnHeaderInactive = { backgroundColor: 'transparent', color: '#64748b', border: 'none', padding: '10px 18px', borderRadius: '12px', fontWeight: '600', fontSize: '0.85rem', cursor: 'default' };

const cardMetricStyle = { backgroundColor: '#ffffff', padding: '20px 24px', borderRadius: '20px', boxShadow: '0 10px 30px rgba(0,0,0,0.03)' };

const tabActive = { padding: '10px 20px', borderRadius: '12px', border: 'none', backgroundColor: '#2563eb', color: 'white', fontWeight: '700', cursor: 'pointer' };
const tabInactive = { padding: '10px 20px', borderRadius: '12px', border: 'none', backgroundColor: '#f1f5f9', color: '#64748b', fontWeight: '600', cursor: 'pointer' };

const formCardStyle = { backgroundColor: '#f8fafc', padding: '20px', borderRadius: '18px', border: '1px solid #e2e8f0' };
const labelStyle = { display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#475569', marginBottom: '4px', textTransform: 'uppercase' };
const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' };
const btnBlueStyle = { marginTop: '10px', width: '100%', padding: '12px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '12px', fontWeight: '700', cursor: 'pointer' };

const tableStyle = { width: '100%', borderCollapse: 'collapse' };
const thGroupStyle = { backgroundColor: '#f8fafc' };
const thStyle = { padding: '12px', textAlign: 'left', fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', fontWeight: '700' };
const tdStyle = { padding: '14px 12px', fontSize: '0.9rem', color: '#334155' };
const btnDelete = { backgroundColor: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '8px', padding: '6px 10px', cursor: 'pointer', fontWeight: 'bold' };