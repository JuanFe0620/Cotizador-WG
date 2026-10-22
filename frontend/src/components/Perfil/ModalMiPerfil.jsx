import React, { useMemo, useRef, useState } from 'react';
import { X, Upload, Trash2, Plus, Loader2, CheckCircle2, AlertCircle, ImageIcon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const LOGO_MAX_LADO = 400; // px: suficiente para encabezado de PDF y mantiene el base64 liviano

// Lee una imagen, la reduce y la convierte a PNG base64 (formato soportado por el PDF)
function archivoALogoBase64(archivo) {
  return new Promise((resolve, reject) => {
    if (!archivo.type.startsWith('image/')) return reject(new Error('El archivo debe ser una imagen (PNG, JPG…).'));
    if (archivo.size > 8 * 1024 * 1024) return reject(new Error('La imagen es demasiado grande (máx. 8 MB).'));
    const url = URL.createObjectURL(archivo);
    const img = new Image();
    img.onload = () => {
      const escala = Math.min(1, LOGO_MAX_LADO / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(img.width * escala));
      canvas.height = Math.max(1, Math.round(img.height * escala));
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('No se pudo leer la imagen.')); };
    img.src = url;
  });
}

function ListaNombres({ titulo, ayuda, items, setItems, placeholder }) {
  const [nuevo, setNuevo] = useState('');
  const agregar = () => {
    const n = nuevo.trim();
    if (!n) return;
    setItems([...items, { nombre: n }]);
    setNuevo('');
  };
  return (
    <div className="flex flex-col gap-2">
      <div>
        <h4 className="text-xs font-bold text-slate-700">{titulo}</h4>
        <p className="text-[11px] text-slate-500">{ayuda}</p>
      </div>
      <ul className="flex flex-col gap-1">
        {items.length === 0 && <li className="text-[11px] text-slate-400 italic">Aún no has agregado a nadie.</li>}
        {items.map((it, i) => (
          <li key={it.id ?? `n${i}`} className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1">
            <input
              value={it.nombre}
              onChange={(e) => setItems(items.map((x, j) => (j === i ? { ...x, nombre: e.target.value } : x)))}
              className="flex-1 bg-transparent text-xs outline-none text-slate-800"
              aria-label={`${titulo} ${i + 1}`}
            />
            <button type="button" onClick={() => setItems(items.filter((_, j) => j !== i))}
              className="text-slate-400 hover:text-red-600" title="Quitar">
              <Trash2 size={14} />
            </button>
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <input
          value={nuevo} placeholder={placeholder}
          onChange={(e) => setNuevo(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); agregar(); } }}
          className="flex-1 border border-slate-300 rounded-lg px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button type="button" onClick={agregar}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-3 text-xs font-semibold flex items-center gap-1">
          <Plus size={13} /> Agregar
        </button>
      </div>
    </div>
  );
}

const campo = 'border border-slate-300 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-800 w-full';

export default function ModalMiPerfil({ onClose }) {
  const { perfil, actualizarPerfil } = useAuth();
  const inputArchivo = useRef(null);

  const [form, setForm] = useState(() => ({
    nombre_comercial: perfil?.nombre_comercial || '',
    nit: perfil?.nit || '',
    telefono: perfil?.telefono || '',
    correo: perfil?.correo || '',
    direccion: perfil?.direccion || '',
    prefijo_consecutivo: perfil?.prefijo_consecutivo || 'COT-',
    margen_comercial_default: perfil?.margen_comercial_default ?? 0,
    logo_url: perfil?.logo_url || '',
  }));
  const [asesores, setAsesores] = useState(() => (perfil?.personal || []).filter((p) => p.tipo === 'ASESOR'));
  const [disenadores, setDisenadores] = useState(() => (perfil?.personal || []).filter((p) => p.tipo === 'DISENADOR'));
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);
  const [ok, setOk] = useState(false);

  const set = (k) => (e) => { setOk(false); setForm((f) => ({ ...f, [k]: e.target.value })); };

  const siguiente = useMemo(() => {
    const num = (perfil?.ultimo_numero_consecutivo ?? 1000) + 1;
    return `${form.prefijo_consecutivo}${num}`;
  }, [form.prefijo_consecutivo, perfil]);

  const onLogo = async (e) => {
    const archivo = e.target.files?.[0];
    e.target.value = '';
    if (!archivo) return;
    try {
      setError(null); setOk(false);
      setForm((f) => ({ ...f, logo_url: '' }));
      const b64 = await archivoALogoBase64(archivo);
      setForm((f) => ({ ...f, logo_url: b64 }));
    } catch (err) {
      setError(err.message);
    }
  };

  const guardar = async (e) => {
    e.preventDefault();
    setError(null); setOk(false);
    if (!form.nombre_comercial.trim()) return setError('La razón social / nombre comercial es obligatorio.');
    if (!/^[A-Za-z0-9_-]{1,10}$/.test(form.prefijo_consecutivo)) {
      return setError('El prefijo solo puede tener letras, números, guion (-) o guion bajo (_), hasta 10 caracteres.');
    }
    const margen = Number(form.margen_comercial_default);
    if (!Number.isFinite(margen) || margen < 0 || margen > 1000) return setError('El margen debe estar entre 0 y 1000 %.');

    const limpiar = (lista, tipo) => lista
      .map((p) => ({ ...p, nombre: p.nombre.trim(), tipo }))
      .filter((p) => p.nombre);

    setGuardando(true);
    try {
      await actualizarPerfil({
        nombre_comercial: form.nombre_comercial.trim(),
        nit: form.nit.trim(),
        telefono: form.telefono.trim(),
        correo: form.correo.trim(),
        direccion: form.direccion.trim(),
        prefijo_consecutivo: form.prefijo_consecutivo.trim(),
        margen_comercial_default: margen,
        logo_url: form.logo_url || '',
        personal: [...limpiar(asesores, 'ASESOR'), ...limpiar(disenadores, 'DISENADOR')]
          .map(({ id, tipo, nombre }) => (id ? { id, tipo, nombre } : { tipo, nombre })),
      });
      setOk(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Mi empresa">
      <form onSubmit={guardar} className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">
        <header className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h2 className="text-base font-bold text-slate-900">Mi Perfil / Mi Empresa</h2>
            <p className="text-xs text-slate-500">Esta información aparece en tus cotizaciones y en el PDF.</p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700" aria-label="Cerrar"><X size={20} /></button>
        </header>

        <div className="overflow-y-auto px-6 py-5 flex flex-col gap-6">
          {/* LOGO */}
          <section className="flex items-center gap-4">
            <div className="w-28 h-20 border-2 border-dashed border-slate-300 rounded-xl flex items-center justify-center bg-slate-50 overflow-hidden shrink-0">
              {form.logo_url
                ? <img src={form.logo_url} alt="Logo de la empresa" className="max-w-full max-h-full object-contain" />
                : <ImageIcon size={28} className="text-slate-300" />}
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-xs font-bold text-slate-700">Logo de tu empresa</span>
              <div className="flex gap-2">
                <button type="button" onClick={() => inputArchivo.current?.click()}
                  className="bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg px-3 py-1.5 flex items-center gap-1">
                  <Upload size={13} /> {form.logo_url ? 'Cambiar logo' : 'Subir logo'}
                </button>
                {form.logo_url && (
                  <button type="button" onClick={() => { setForm((f) => ({ ...f, logo_url: '' })); setOk(false); }}
                    className="text-xs text-slate-600 hover:text-red-600 border border-slate-300 rounded-lg px-3 py-1.5">
                    Quitar
                  </button>
                )}
              </div>
              <p className="text-[11px] text-slate-500">PNG o JPG, fondo transparente o blanco.</p>
              <input ref={inputArchivo} type="file" accept="image/*" className="hidden" onChange={onLogo} />
            </div>
          </section>

          {/* DATOS */}
          <section className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600 sm:col-span-2">
              Razón social / Nombre comercial
              <input className={campo} value={form.nombre_comercial} onChange={set('nombre_comercial')} required />
            </label>
            <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
              NIT
              <input className={campo} value={form.nit} onChange={set('nit')} placeholder="900.123.456-7" />
            </label>
            <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
              Teléfono
              <input className={campo} value={form.telefono} onChange={set('telefono')} />
            </label>
            <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
              Correo
              <input className={campo} type="email" value={form.correo} onChange={set('correo')} />
            </label>
            <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
              Dirección
              <input className={campo} value={form.direccion} onChange={set('direccion')} />
            </label>
          </section>

          {/* CONSECUTIVO + MARGEN */}
          <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-600" htmlFor="prefijo">Prefijo de tus cotizaciones</label>
              <input id="prefijo" className={campo} value={form.prefijo_consecutivo} maxLength={10} onChange={set('prefijo_consecutivo')} />
              <p className="text-[11px] text-slate-500">Tu próxima cotización será: <b className="font-mono text-blue-700">{siguiente}</b></p>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-600" htmlFor="margen">Margen de Ganancia Comercial (%)</label>
              <div className="flex items-center gap-3">
                <input type="range" min={0} max={100} step={1}
                  value={Math.min(100, Number(form.margen_comercial_default) || 0)}
                  onChange={set('margen_comercial_default')} className="flex-1 accent-blue-600" aria-label="Margen deslizador" />
                <input id="margen" type="number" min={0} max={1000} step={0.5} className={`${campo} !w-20 text-right`}
                  value={form.margen_comercial_default} onChange={set('margen_comercial_default')} />
              </div>
              <p className="text-[11px] text-slate-500">Se suma automáticamente al precio de fabricación en todos tus ítems.</p>
            </div>
          </section>

          {/* EQUIPO */}
          <section className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <ListaNombres titulo="Mis asesores / vendedores" ayuda="Aparecen en la lista “Vendedor” del cotizador."
              items={asesores} setItems={(l) => { setAsesores(l); setOk(false); }} placeholder="Ej. Carlos Gómez" />
            <ListaNombres titulo="Mis diseñadores" ayuda="Aparecen en la lista “Diseñador” del cotizador."
              items={disenadores} setItems={(l) => { setDisenadores(l); setOk(false); }} placeholder="Ej. Ana Pérez" />
          </section>
        </div>

        <footer className="px-6 py-4 border-t border-slate-200 flex items-center gap-3">
          <div className="flex-1 text-xs min-h-[1rem]">
            {error && <span role="alert" className="text-red-700 flex items-center gap-1"><AlertCircle size={14} /> {error}</span>}
            {ok && !error && <span className="text-emerald-700 flex items-center gap-1"><CheckCircle2 size={14} /> Cambios guardados.</span>}
          </div>
          <button type="button" onClick={onClose} className="text-sm text-slate-600 hover:text-slate-900 px-3 py-2">Cerrar</button>
          <button type="submit" disabled={guardando}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-sm rounded-lg px-5 py-2 flex items-center gap-2">
            {guardando && <Loader2 size={14} className="animate-spin" />} Guardar
          </button>
        </footer>
      </form>
    </div>
  );
}

