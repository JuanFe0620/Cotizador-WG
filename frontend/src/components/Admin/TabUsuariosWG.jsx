import React, { useCallback, useEffect, useState } from 'react';
import {
  Plus, X, RefreshCw, Loader2, AlertCircle, CheckCircle2,
  Wand2, Users, Edit3, UserPlus, ShieldCheck,
} from 'lucide-react';
import { API_BASE_URL as API_DEFECTO } from '../../services/apiClient';

const inputCls =
  'w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-800';

const MODULOS_CONFIG = [
  { key: 'gabinetes', label: 'Gabinetes', grupo: 'Cotizador' },
  { key: 'totems', label: 'Tótems', grupo: 'Cotizador' },
  { key: 'postes', label: 'Postes', grupo: 'Cotizador' },
  { key: 'brazos', label: 'Brazos', grupo: 'Cotizador' },
  { key: 'videoportero', label: 'Videoportero', grupo: 'Cotizador' },
  { key: 'historial', label: 'Historial WG', grupo: 'Administración' },
  { key: 'admin_precios', label: 'Admin Costos Base', grupo: 'Administración' },
];

const PERMISOS_INICIALES = {
  gabinetes: true,
  totems: true,
  postes: true,
  brazos: true,
  videoportero: true,
  historial: true,
  admin_precios: false,
};

const mensajeError = async (res, defecto) => {
  const err = await res.json().catch(() => ({}));
  if (Array.isArray(err.detail)) {
    return err.detail.map((d) => `${(d.loc || []).slice(-1)[0]}: ${d.msg}`).join('; ');
  }
  return err.detail || defecto;
};

const generarPassword = () => {
  const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const bytes = crypto.getRandomValues(new Uint32Array(12));
  return Array.from(bytes, (b) => abc[b % abc.length]).join('');
};

function ModalUsuarioWG({ api, asesores, usuarioEditar, onClose, onGuardado, onAsesorCreado }) {
  const esEdicion = Boolean(usuarioEditar);
  const [username, setUsername] = useState(usuarioEditar?.username || '');
  const [password, setPassword] = useState('');
  const [personalId, setPersonalId] = useState(usuarioEditar?.personal_id ? String(usuarioEditar.personal_id) : '');
  const [permisos, setPermisos] = useState(
    usuarioEditar?.permisos_modulos
      ? { ...PERMISOS_INICIALES, ...usuarioEditar.permisos_modulos }
      : { ...PERMISOS_INICIALES }
  );
  const [nuevoAsesorNombre, setNuevoAsesorNombre] = useState('');
  const [creandoAsesor, setCreandoAsesor] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);

  const togglePermiso = (key) => {
    setPermisos((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const agregarAsesorRapido = async () => {
    const nombre = nuevoAsesorNombre.trim();
    if (!nombre) return;
    setCreandoAsesor(true);
    setError(null);
    try {
      const resPerfil = await fetch(`${api}/api/distribuidor/mi-perfil`);
      if (!resPerfil.ok) throw new Error('No se pudo leer el personal de fábrica');
      const perfil = await resPerfil.json();
      const personalActual = Array.isArray(perfil.personal) ? perfil.personal : [];
      const resPut = await fetch(`${api}/api/distribuidor/mi-perfil`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personal: [
            ...personalActual.map((p) => ({ id: p.id, tipo: p.tipo, nombre: p.nombre })),
            { tipo: 'ASESOR', nombre },
          ],
        }),
      });
      if (!resPut.ok) throw new Error(await mensajeError(resPut, 'No se pudo crear el asesor'));
      const actualizado = await resPut.json();
      const creado = (actualizado.personal || []).find(
        (p) => p.tipo === 'ASESOR' && p.nombre.toLowerCase() === nombre.toLowerCase()
      );
      if (onAsesorCreado) onAsesorCreado(actualizado.personal || []);
      if (creado) setPersonalId(String(creado.id));
      setNuevoAsesorNombre('');
    } catch (e) {
      setError(e.message);
    } finally {
      setCreandoAsesor(false);
    }
  };

  const guardar = async (e) => {
    e.preventDefault();
    setError(null);

    if (!esEdicion) {
      if (!/^[A-Za-z0-9_.@-]{3,60}$/.test(username.trim())) {
        return setError('El usuario debe tener 3 a 60 caracteres (letras, números, . _ - @).');
      }
      if (password.length < 8) {
        return setError('La contraseña debe tener al menos 8 caracteres.');
      }
    } else if (password && password.length < 8) {
      return setError('Si cambias la contraseña, debe tener al menos 8 caracteres.');
    }

    setEnviando(true);
    try {
      const url = esEdicion
        ? `${api}/api/admin/usuarios/${usuarioEditar.id}`
        : `${api}/api/admin/usuarios`;
      const method = esEdicion ? 'PUT' : 'POST';
      const body = esEdicion
        ? {
            personal_id: personalId ? Number(personalId) : null,
            permisos_modulos: permisos,
            ...(password ? { password } : {}),
          }
        : {
            username: username.trim(),
            password,
            rol: 'VENDEDOR_WG',
            personal_id: personalId ? Number(personalId) : null,
            permisos_modulos: permisos,
          };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await mensajeError(res, 'No se pudo guardar el usuario'));
      const guardado = await res.json();
      onGuardado(guardado, esEdicion);
      onClose();
    } catch (err) {
      setError(err.message === 'Failed to fetch' ? 'No hay conexión con el servidor.' : err.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden">
        <header className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
          <h3 className="text-sm font-bold text-gray-900">
            {esEdicion ? `Editar vendedor WG: ${usuarioEditar.username}` : 'Crear usuario interno WG'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700" aria-label="Cerrar">
            <X size={18} />
          </button>
        </header>

        <form onSubmit={guardar} className="flex flex-col overflow-hidden">
          <div className="overflow-y-auto p-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1 font-semibold text-gray-600 text-xs">
                Usuario (login)
                <input
                  className={inputCls}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={esEdicion}
                  placeholder="ej. paola.zapata"
                  autoComplete="off"
                  required
                />
              </label>

              <label className="flex flex-col gap-1 font-semibold text-gray-600 text-xs">
                {esEdicion ? 'Nueva contraseña (opcional)' : 'Contraseña temporal'}
                <span className="flex gap-1">
                  <input
                    className={`${inputCls} font-mono`}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={esEdicion ? 'Dejar vacío para conservar' : 'Mín. 8 caracteres'}
                    autoComplete="new-password"
                    required={!esEdicion}
                  />
                  <button
                    type="button"
                    title="Generar contraseña segura"
                    onClick={() => setPassword(generarPassword())}
                    className="border border-gray-300 rounded-lg px-2 hover:bg-gray-50"
                  >
                    <Wand2 size={14} />
                  </button>
                </span>
              </label>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
              <label className="flex flex-col gap-1 font-semibold text-gray-700 text-xs">
                Asesor / Vendedor vinculado (Fábrica WG)
                <select
                  className={inputCls}
                  value={personalId}
                  onChange={(e) => setPersonalId(e.target.value)}
                >
                  <option value="">-- Sin vinculación fija --</option>
                  {asesores.map((a) => (
                    <option key={a.id} value={String(a.id)}>
                      {a.nombre}
                    </option>
                  ))}
                </select>
              </label>
              <p className="text-[11px] text-gray-500">
                Al iniciar sesión, este vendedor quedará preseleccionado y bloqueado en sus cotizaciones.
              </p>

              <div className="flex gap-2 pt-1">
                <input
                  type="text"
                  className={inputCls}
                  value={nuevoAsesorNombre}
                  onChange={(e) => setNuevoAsesorNombre(e.target.value)}
                  placeholder="¿Falta el asesor? Escribe su nombre completo aquí..."
                />
                <button
                  type="button"
                  onClick={agregarAsesorRapido}
                  disabled={creandoAsesor || !nuevoAsesorNombre.trim()}
                  className="shrink-0 bg-slate-700 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1"
                >
                  {creandoAsesor ? <Loader2 size={13} className="animate-spin" /> : <UserPlus size={13} />}
                  Añadir asesor
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                <ShieldCheck size={13} className="text-blue-600" /> Permisos por módulo
              </p>
              <div className="grid grid-cols-2 gap-2">
                {MODULOS_CONFIG.map((m) => (
                  <label
                    key={m.key}
                    className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg border text-xs cursor-pointer transition ${
                      permisos[m.key]
                        ? 'bg-blue-50/70 border-blue-300 text-gray-900 font-semibold'
                        : 'bg-gray-50 border-gray-200 text-gray-500'
                    }`}
                  >
                    <span>
                      {m.label}
                      <span className="block text-[10px] font-normal text-gray-400">{m.grupo}</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={Boolean(permisos[m.key])}
                      onChange={() => togglePermiso(m.key)}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                  </label>
                ))}
              </div>
            </div>
          </div>

          <footer className="px-5 py-3 border-t border-gray-200 flex items-center gap-3">
            <div className="flex-1 text-[11px] text-red-700 flex items-start gap-1" role="alert">
              {error && (
                <>
                  <AlertCircle size={13} className="shrink-0 mt-0.5" /> {error}
                </>
              )}
            </div>
            <button type="button" onClick={onClose} className="text-xs text-gray-600 px-3 py-2">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={enviando}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-lg px-4 py-2 flex items-center gap-1.5"
            >
              {enviando && <Loader2 size={13} className="animate-spin" />}
              {esEdicion ? 'Guardar cambios' : 'Crear usuario WG'}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}

export default function TabUsuariosWG({ API_BASE_URL }) {
  const api = API_BASE_URL || API_DEFECTO;
  const [usuarios, setUsuarios] = useState([]);
  const [asesores, setAsesores] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [cambiandoId, setCambiandoId] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [usuarioEditar, setUsuarioEditar] = useState(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const [resU, resPerfil] = await Promise.all([
        fetch(`${api}/api/admin/usuarios?rol=VENDEDOR_WG`),
        fetch(`${api}/api/distribuidor/mi-perfil`),
      ]);
      if (!resU.ok) throw new Error(await mensajeError(resU, 'No se pudo cargar la lista de usuarios'));
      const dataU = await resU.json();
      setUsuarios(Array.isArray(dataU) ? dataU : []);

      if (resPerfil.ok) {
        const perfil = await resPerfil.json();
        setAsesores((perfil.personal || []).filter((p) => p.tipo === 'ASESOR'));
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  }, [api]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const alternarActivo = async (u) => {
    setCambiandoId(u.id);
    setError(null);
    try {
      const res = await fetch(`${api}/api/admin/usuarios/${u.id}/activo`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activo: !u.activo }),
      });
      if (!res.ok) throw new Error(await mensajeError(res, 'No se pudo cambiar el estado'));
      const actualizado = await res.json();
      setUsuarios((prev) => prev.map((x) => (x.id === actualizado.id ? actualizado : x)));
    } catch (e) {
      setError(e.message);
    } finally {
      setCambiandoId(null);
    }
  };

  const abrirNuevo = () => {
    setUsuarioEditar(null);
    setModalOpen(true);
  };

  const abrirEditar = (u) => {
    setUsuarioEditar(u);
    setModalOpen(true);
  };

  const handleGuardado = (guardado, esEdicion) => {
    if (esEdicion) {
      setUsuarios((prev) => prev.map((x) => (x.id === guardado.id ? guardado : x)));
    } else {
      setUsuarios((prev) => [...prev, guardado]);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="font-bold text-sm text-gray-900 flex items-center gap-2">
            <Users size={15} className="text-blue-600" /> Usuarios / Equipo WG ({usuarios.length})
          </h3>
          <p className="text-[11px] text-gray-500">
            Vendedores internos de Fábrica WG con permisos granulares y asesor vinculado automáticamente.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={cargar}
            className="border border-gray-300 rounded-lg px-2.5 py-1.5 hover:bg-gray-50 flex items-center gap-1 font-semibold"
            title="Actualizar"
          >
            <RefreshCw size={13} className={cargando ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={abrirNuevo}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-3 py-1.5 font-bold flex items-center gap-1 text-xs"
          >
            <Plus size={14} /> Nuevo vendedor WG
          </button>
        </div>
      </div>

      {error && (
        <div role="alert" className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 flex items-center gap-2 text-xs">
          <AlertCircle size={14} /> {error}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="text-[10px] uppercase tracking-wider text-gray-500 border-b border-gray-200">
              <th className="py-2 pr-3">Usuario</th>
              <th className="py-2 pr-3">Asesor / Vendedor Vinculado</th>
              <th className="py-2 pr-3">Módulos Habilitados</th>
              <th className="py-2 pr-3 text-center">Estado</th>
              <th className="py-2 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.length === 0 && !cargando ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-gray-400">
                  No hay vendedores internos WG registrados aún. Crea el primero con “Nuevo vendedor WG”.
                </td>
              </tr>
            ) : (
              usuarios.map((u) => {
                const activos = MODULOS_CONFIG.filter((m) => u.permisos_modulos?.[m.key]);
                return (
                  <tr key={u.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2.5 pr-3 font-semibold text-gray-900 font-mono">{u.username}</td>
                    <td className="py-2.5 pr-3 text-gray-700">
                      {u.personal_nombre ? (
                        <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded px-2 py-0.5 text-[11px] font-medium">
                          <CheckCircle2 size={11} /> {u.personal_nombre}
                        </span>
                      ) : (
                        <span className="text-gray-400 italic">Sin vincular</span>
                      )}
                    </td>
                    <td className="py-2.5 pr-3">
                      <div className="flex flex-wrap gap-1">
                        {activos.map((m) => (
                          <span
                            key={m.key}
                            className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${
                              m.key === 'admin_precios'
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : 'bg-blue-50 text-blue-700 border-blue-200'
                            }`}
                          >
                            {m.label}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-2.5 pr-3 text-center">
                      <button
                        role="switch"
                        aria-checked={u.activo}
                        disabled={cambiandoId === u.id}
                        onClick={() => alternarActivo(u)}
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold transition ${
                          u.activo
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                            : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                        }`}
                      >
                        {u.activo ? 'Activo' : 'Inactivo'}
                      </button>
                    </td>
                    <td className="py-2.5 text-right">
                      <button
                        onClick={() => abrirEditar(u)}
                        className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-semibold px-2 py-1 rounded hover:bg-blue-50"
                      >
                        <Edit3 size={13} /> Editar
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <ModalUsuarioWG
          api={api}
          asesores={asesores}
          usuarioEditar={usuarioEditar}
          onClose={() => setModalOpen(false)}
          onGuardado={handleGuardado}
          onAsesorCreado={(personal) => setAsesores(personal.filter((p) => p.tipo === 'ASESOR'))}
        />
      )}
    </div>
  );
}
