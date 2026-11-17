import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  API_BASE_URL, EVENTO_NO_AUTORIZADO, clearSession, decodificarJwt, getToken, setToken, tokenVigente,
} from '../services/apiClient';

const AuthContext = createContext(null);

const PERMISOS_DEFAULT = {
  gabinetes: true,
  totems: true,
  postes: true,
  brazos: true,
  videoportero: true,
  historial: true,
  admin_precios: false,
};

const normalizarPermisos = (raw, rol) => {
  if (rol === 'SUPERADMIN') {
    return {
      gabinetes: true,
      totems: true,
      postes: true,
      brazos: true,
      videoportero: true,
      historial: true,
      admin_precios: true,
    };
  }
  if (rol === 'DISTRIBUIDOR') {
    return { ...PERMISOS_DEFAULT };
  }
  return { ...PERMISOS_DEFAULT, ...(raw && typeof raw === 'object' ? raw : {}) };
};

const usuarioDesdeToken = (token) => {
  const p = decodificarJwt(token);
  if (!p) return null;
  return {
    id: p.user_id,
    username: p.username,
    rol: p.rol,
    distribuidor_id: p.distribuidor_id ?? null,
    personal_id: p.personal_id ?? null,
    personal_nombre: p.personal_nombre ?? null,
    permisos_modulos: normalizarPermisos(p.permisos_modulos, p.rol),
  };
};

export function AuthProvider({ children }) {
  const [token, setTokenState] = useState(() => (tokenVigente(getToken()) ? getToken() : null));
  const [user, setUser] = useState(() => (token ? usuarioDesdeToken(token) : null));
  const [perfil, setPerfil] = useState(null);
  // true mientras se valida la sesión guardada al abrir la app
  const [cargando, setCargando] = useState(Boolean(token));

  const logout = useCallback(() => {
    clearSession();
    setTokenState(null);
    setUser(null);
    setPerfil(null);
  }, []);

  const cargarPerfil = useCallback(async () => {
    const [resPerfil, resMe] = await Promise.all([
      fetch(`${API_BASE_URL}/api/distribuidor/mi-perfil`),
      fetch(`${API_BASE_URL}/api/auth/me`),
    ]);
    if (!resPerfil.ok) throw new Error('No se pudo cargar el perfil');
    const data = await resPerfil.json();
    setPerfil(data);
    if (resMe.ok) {
      const me = await resMe.json();
      setUser({
        id: me.id,
        username: me.username,
        rol: me.rol,
        distribuidor_id: me.distribuidor_id ?? null,
        personal_id: me.personal_id ?? null,
        personal_nombre: me.personal_nombre ?? null,
        permisos_modulos: normalizarPermisos(me.permisos_modulos, me.rol),
      });
    }
    return data;
  }, []);

  const login = useCallback(async (username, password) => {
    const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(typeof err.detail === 'string' ? err.detail : 'No se pudo iniciar sesión');
    }
    const data = await res.json();
    setToken(data.access_token);
    setTokenState(data.access_token);
    setUser(usuarioDesdeToken(data.access_token));
    try { await cargarPerfil(); } catch (e) { console.warn(e); }
    return data;
  }, [cargarPerfil]);

  // Valida la sesión guardada y carga el perfil al abrir la app
  useEffect(() => {
    if (!token) { setCargando(false); return; }
    let activo = true;
    cargarPerfil()
      .catch(() => { /* un 401 ya dispara el evento de cierre de sesión */ })
      .finally(() => activo && setCargando(false));
    return () => { activo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 401 desde cualquier petición => volver al login
  useEffect(() => {
    window.addEventListener(EVENTO_NO_AUTORIZADO, logout);
    return () => window.removeEventListener(EVENTO_NO_AUTORIZADO, logout);
  }, [logout]);

  // Expiración natural del token
  useEffect(() => {
    if (!token) return undefined;
    const exp = decodificarJwt(token)?.exp;
    if (!exp) return undefined;
    const ms = exp * 1000 - Date.now();
    if (ms <= 0) { logout(); return undefined; }
    const t = setTimeout(logout, Math.min(ms, 2 ** 31 - 1));
    return () => clearTimeout(t);
  }, [token, logout]);

  const actualizarPerfil = useCallback(async (cambios) => {
    const res = await fetch(`${API_BASE_URL}/api/distribuidor/mi-perfil`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cambios),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const detalle = Array.isArray(err.detail) ? err.detail.map((d) => d.msg).join('; ') : err.detail;
      throw new Error(detalle || 'No se pudo guardar el perfil');
    }
    const data = await res.json();
    setPerfil(data);
    return data;
  }, []);

  const value = useMemo(() => ({
    user, token, perfil, cargando,
    esSuperAdmin: user?.rol === 'SUPERADMIN',
    esDistribuidor: user?.rol === 'DISTRIBUIDOR',
    esVendedorWG: user?.rol === 'VENDEDOR_WG',
    permisosModulos: normalizarPermisos(user?.permisos_modulos, user?.rol),
    login, logout, actualizarPerfil,
  }), [user, token, perfil, cargando, login, logout, actualizarPerfil]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}

