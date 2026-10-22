import React, { useCallback, useEffect, useState } from 'react';
import { Plus, X, RefreshCw, Loader2, AlertCircle, CheckCircle2, Copy, Wand2, Building2 } from 'lucide-react';
import { API_BASE_URL as API_DEFECTO } from '../../services/apiClient';

const input = 'w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-800';
const FORM_VACIO = {
  nombre_comercial: '', nit: '', telefono: '', correo: '', direccion: '',
  prefijo_consecutivo: '', margen_comercial_default: 20, username: '', password: '',
};

const mensajeError = async (res, defecto) => {
  const err = await res.json().catch(() => ({}));
  if (Array.isArray(err.detail)) return err.detail.map((d) => `${(d.loc || []).slice(-1)[0]}: ${d.msg}`).join('; ');
  return err.detail || defecto;
};

const generarPassword = () => {
  const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const bytes = crypto.getRandomValues(new Uint32Array(12));
  return Array.from(bytes, (b) => abc[b % abc.length]).join('');
};

function ModalNuevoDistribuidor({ api, onClose, onCreado }) {
  const [form, setForm] = useState(FORM_VACIO);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);
  const [distribuidorCreado, setDistribuidorCreado] = useState(null); // si el usuario falla, se reintenta sin duplicar el distribuidor
  const [credenciales, setCredenciales] = useState(null);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const guardar = async (e) => {
    e.preventDefault();
    setError(null);
    const prefijo = form.prefijo_consecutivo.trim();
    if (!/^[A-Za-z0-9_-]{1,10}$/.test(prefijo)) return setError('El prefijo solo admite letras, números, "-" o "_" (máx. 10).');
    if (!/^[A-Za-z0-9_.@-]{3,60}$/.test(form.username.trim())) return setError('El usuario debe tener 3 a 60 caracteres (letras, números, . _ - @).');
    if (form.password.length < 8) return setError('La contraseña temporal debe tener al menos 8 caracteres.');
    const margen = Number(form.margen_comercial_default);
    if (!Number.isFinite(margen) || margen < 0 || margen > 1000) return setError('El margen debe estar entre 0 y 1000 %.');

    setEnviando(true);
    try {
      let dist = distribuidorCreado;
      if (!dist) {
        const res = await fetch(`${api}/api/admin/distribuidores`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nombre_comercial: form.nombre_comercial.trim(),
            nit: form.nit.trim() || null,
            telefono: form.telefono.trim() || null,
            correo: form.correo.trim() || null,
            direccion: form.direccion.trim() || null,
            prefijo_consecutivo: prefijo,
            margen_comercial_default: margen,
            activo: true,
          }),
        });
        if (!res.ok) throw new Error(await mensajeError(res, 'No se pudo crear el distribuidor'));
        dist = await res.json();
        setDistribuidorCreado(dist);
        onCreado();
      }

      const resU = await fetch(`${api}/api/admin/usuarios`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: form.username.trim(), password: form.password, rol: 'DISTRIBUIDOR', distribuidor_id: dist.id,
        }),
      });
      if (!resU.ok) {
        const msg = await mensajeError(resU, 'No se pudo crear el usuario');
        throw new Error(`El distribuidor "${dist.nombre_comercial}" ya fue creado, pero el usuario falló: ${msg}. Corrige el usuario y vuelve a guardar.`);
      }
      setCredenciales({ username: form.username.trim(), password: form.password, nombre: dist.nombre_comercial });
      onCreado();
    } catch (err) {
      setError(err.message === 'Failed to fetch' ? 'No hay conexión con el servidor.' : err.message);
    } finally {
      setEnviando(false);
    }
  };

  const copiar = () => navigator.clipboard?.writeText(`Usuario: ${credenciales.username}\nContraseña temporal: ${credenciales.password}`);

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Nuevo distribuidor">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden">
        <header className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
          <h3 className="text-sm font-bold text-gray-900">Crear nuevo distribuidor</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700" aria-label="Cerrar"><X size={18} /></button>
        </header>

        {credenciales ? (
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm"><CheckCircle2 size={18} /> Distribuidor creado</div>
            <p className="text-xs text-gray-600">
              Entrega estas credenciales a <b>{credenciales.nombre}</b>. La contraseña no se volverá a mostrar.
            </p>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 font-mono text-xs space-y-1">
              <div>Usuario: <b>{credenciales.username}</b></div>
              <div>Contraseña temporal: <b>{credenciales.password}</b></div>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={copiar} className="border border-gray-300 rounded-lg px-3 py-1.5 text-xs font-semibold flex items-center gap-1 hover:bg-gray-50"><Copy size={13} /> Copiar</button>
              <button onClick={onClose} className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-1.5 text-xs font-bold">Listo</button>
            </div>
          </div>
        ) : (
          <form onSubmit={guardar} className="flex flex-col overflow-hidden">
            <div className="overflow-y-auto p-5 grid grid-cols-2 gap-3">
              <p className="col-span-2 text-[11px] font-bold uppercase tracking-wider text-gray-500">Datos comerciales</p>
              <label className="col-span-2 flex flex-col gap-1 font-semibold text-gray-600">Nombre comercial
                <input className={input} value={form.nombre_comercial} onChange={set('nombre_comercial')} required disabled={!!distribuidorCreado} />
              </label>
              <label className="flex flex-col gap-1 font-semibold text-gray-600">NIT
                <input className={input} value={form.nit} onChange={set('nit')} disabled={!!distribuidorCreado} />
              </label>
              <label className="flex flex-col gap-1 font-semibold text-gray-600">Teléfono
                <input className={input} value={form.telefono} onChange={set('telefono')} disabled={!!distribuidorCreado} />
              </label>
              <label className="flex flex-col gap-1 font-semibold text-gray-600">Correo
                <input className={input} type="email" value={form.correo} onChange={set('correo')} disabled={!!distribuidorCreado} />
              </label>
              <label className="flex flex-col gap-1 font-semibold text-gray-600">Dirección
                <input className={input} value={form.direccion} onChange={set('direccion')} disabled={!!distribuidorCreado} />
              </label>
              <label className="flex flex-col gap-1 font-semibold text-gray-600">Prefijo consecutivo
                <input className={input} value={form.prefijo_consecutivo} maxLength={10} placeholder="CALI-" onChange={set('prefijo_consecutivo')} required disabled={!!distribuidorCreado} />
              </label>
              <label className="flex flex-col gap-1 font-semibold text-gray-600">Margen comercial base (%)
                <input className={input} type="number" min={0} max={1000} step={0.5} value={form.margen_comercial_default} onChange={set('margen_comercial_default')} required disabled={!!distribuidorCreado} />
              </label>

              <p className="col-span-2 mt-2 text-[11px] font-bold uppercase tracking-wider text-gray-500">Usuario principal</p>
              <label className="flex flex-col gap-1 font-semibold text-gray-600">Usuario
                <input className={input} value={form.username} onChange={set('username')} autoComplete="off" required />
              </label>
              <label className="flex flex-col gap-1 font-semibold text-gray-600">Contraseña temporal
                <span className="flex gap-1">
                  <input className={`${input} font-mono`} value={form.password} onChange={set('password')} autoComplete="new-password" required />
                  <button type="button" title="Generar contraseña segura" onClick={() => setForm((f) => ({ ...f, password: generarPassword() }))}
                    className="border border-gray-300 rounded-lg px-2 hover:bg-gray-50"><Wand2 size={14} /></button>
                </span>
              </label>
            </div>
            <footer className="px-5 py-3 border-t border-gray-200 flex items-center gap-3">
              <div className="flex-1 text-[11px] text-red-700 flex items-start gap-1" role="alert">
                {error && <><AlertCircle size={13} className="shrink-0 mt-0.5" /> {error}</>}
              </div>
              <button type="button" onClick={onClose} className="text-xs text-gray-600 px-3 py-2">Cancelar</button>
              <button type="submit" disabled={enviando}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-lg px-4 py-2 flex items-center gap-1.5">
                {enviando && <Loader2 size={13} className="animate-spin" />} Crear distribuidor
              </button>
            </footer>
          </form>
        )}
      </div>
    </div>
  );
}

export default function TabDistribuidores({ API_BASE_URL }) {
  const api = API_BASE_URL || API_DEFECTO;
  const [lista, setLista] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [cambiandoId, setCambiandoId] = useState(null);
  const [modal, setModal] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const res = await fetch(`${api}/api/admin/distribuidores`);
      if (!res.ok) throw new Error(await mensajeError(res, 'No se pudo cargar la lista'));
      setLista(await res.json());
    } catch (e) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  }, [api]);

  useEffect(() => { cargar(); }, [cargar]);

  const alternarActivo = async (d) => {
    setCambiandoId(d.id);
    setError(null);
    try {
      const res = await fetch(`${api}/api/admin/distribuidores/${d.id}/activo`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activo: !d.activo }),
      });
      if (!res.ok) throw new Error(await mensajeError(res, 'No se pudo cambiar el estado'));
      const actualizado = await res.json();
      setLista((l) => l.map((x) => (x.id === actualizado.id ? actualizado : x)));
    } catch (e) {
      setError(e.message);
    } finally {
      setCambiandoId(null);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-bold text-sm text-gray-900 flex items-center gap-2"><Building2 size={15} className="text-blue-600" /> Distribuidores ({lista.length})</h3>
        <div className="flex gap-2">
          <button onClick={cargar} className="border border-gray-300 rounded-lg px-2.5 py-1.5 hover:bg-gray-50 flex items-center gap-1 font-semibold" title="Actualizar">
            <RefreshCw size={13} className={cargando ? 'animate-spin' : ''} />
          </button>
          <button onClick={() => setModal(true)} className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-3 py-1.5 font-bold flex items-center gap-1">
            <Plus size={14} /> Crear nuevo distribuidor
          </button>
        </div>
      </div>

      {error && <div role="alert" className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 flex items-center gap-2"><AlertCircle size={14} /> {error}</div>}

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="text-[10px] uppercase tracking-wider text-gray-500 border-b border-gray-200">
              <th className="py-2 pr-3">Nombre comercial</th>
              <th className="py-2 pr-3">NIT</th>
              <th className="py-2 pr-3">Prefijo</th>
              <th className="py-2 pr-3">Próx. consecutivo</th>
              <th className="py-2 pr-3 text-right">Margen</th>
              <th className="py-2 text-center">Estado</th>
            </tr>
          </thead>
          <tbody>
            {lista.map((d) => (
              <tr key={d.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-2 pr-3 font-semibold text-gray-900">
                  {d.nombre_comercial}
                  {d.es_fabrica && <span className="ml-2 text-[9px] uppercase bg-blue-50 text-blue-700 border border-blue-200 rounded px-1.5 py-0.5">Fábrica</span>}
                </td>
                <td className="py-2 pr-3 text-gray-600">{d.nit || '—'}</td>
                <td className="py-2 pr-3 font-mono">{d.prefijo_consecutivo}</td>
                <td className="py-2 pr-3 font-mono text-gray-600">{d.siguiente_consecutivo}</td>
                <td className="py-2 pr-3 text-right font-semibold">{Number(d.margen_comercial_default).toLocaleString('es-CO')} %</td>
                <td className="py-2 text-center">
                  <button
                    role="switch" aria-checked={d.activo}
                    aria-label={`${d.activo ? 'Desactivar' : 'Activar'} ${d.nombre_comercial}`}
                    disabled={d.es_fabrica || cambiandoId === d.id}
                    onClick={() => alternarActivo(d)}
                    title={d.es_fabrica ? 'La fábrica no se puede desactivar' : (d.activo ? 'Desactivar' : 'Activar')}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition disabled:opacity-50 ${d.activo ? 'bg-emerald-500' : 'bg-gray-300'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${d.activo ? 'translate-x-4' : 'translate-x-0.5'}`} />
                  </button>
                  <span className={`ml-2 text-[10px] font-bold ${d.activo ? 'text-emerald-700' : 'text-gray-500'}`}>{d.activo ? 'Activo' : 'Inactivo'}</span>
                </td>
              </tr>
            ))}
            {!cargando && lista.length === 0 && !error && (
              <tr><td colSpan={6} className="py-6 text-center text-gray-400">No hay distribuidores registrados.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {modal && <ModalNuevoDistribuidor api={api} onClose={() => setModal(false)} onCreado={cargar} />}
    </div>
  );
}

