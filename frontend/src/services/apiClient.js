// Cliente HTTP autenticado: inyecta el Bearer token en todas las peticiones a la API
// (fetch y axios) y centraliza el manejo de 401 (sesión expirada/inválida).
import axios from 'axios';

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

const TOKEN_KEY = 'wg_token';
export const EVENTO_NO_AUTORIZADO = 'auth:unauthorized';

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t) => localStorage.setItem(TOKEN_KEY, t);

// Cachés de catálogos del cotizador: se limpian al cerrar sesión para no mezclar datos entre usuarios
const limpiarCachesLocales = () => {
  Object.keys(localStorage)
    .filter((k) => k.startsWith('m3_'))
    .forEach((k) => localStorage.removeItem(k));
};

export const clearSession = () => {
  localStorage.removeItem(TOKEN_KEY);
  limpiarCachesLocales();
};

// Los componentes usan varias variantes de host (localhost / 127.0.0.1 / VITE_API_URL): todas son "la API".
const ORIGENES_API = new Set(['http://localhost:8000', 'http://127.0.0.1:8000']);
try { ORIGENES_API.add(new URL(API_BASE_URL).origin); } catch { /* URL relativa */ }

const esUrlApi = (url) => {
  try {
    const u = new URL(url, window.location.origin);
    return ORIGENES_API.has(u.origin) || (u.origin === window.location.origin && u.pathname.startsWith('/api/'));
  } catch {
    return false;
  }
};

const esLogin = (url) => String(url).includes('/api/auth/login');

const notificarNoAutorizado = () => {
  clearSession();
  window.dispatchEvent(new Event(EVENTO_NO_AUTORIZADO));
};

let instalado = false;

/** Parchea window.fetch una única vez (llamar antes de renderizar la app). */
export function instalarInterceptores() {
  if (instalado) return;
  instalado = true;

  const fetchOriginal = window.fetch.bind(window);
  window.fetch = async (input, init = {}) => {
    const url = typeof input === 'string' ? input : input?.url;
    if (!esUrlApi(url)) return fetchOriginal(input, init);

    const token = getToken();
    const headers = new Headers(init.headers || (typeof input !== 'string' ? input.headers : undefined));
    if (token && !headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`);

    const respuesta = await fetchOriginal(input, { ...init, headers });
    if (respuesta.status === 401 && !esLogin(url)) notificarNoAutorizado();
    return respuesta;
  };

  axios.interceptors.request.use((config) => {
    const token = getToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });
  axios.interceptors.response.use(
    (r) => r,
    (error) => {
      if (error?.response?.status === 401 && !esLogin(error.config?.url)) notificarNoAutorizado();
      return Promise.reject(error);
    }
  );
}

/** Decodifica el payload de un JWT (sin verificar firma: la verificación la hace el backend). */
export function decodificarJwt(token) {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(base64).split('').map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0')).join('')
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export const tokenVigente = (token) => {
  const p = token ? decodificarJwt(token) : null;
  return !!p && (!p.exp || p.exp * 1000 > Date.now());
};

/** Descarga autenticada de un archivo (reemplaza window.open, que no puede enviar el header Authorization). */
export async function descargarArchivoAutenticado(url, nombreArchivo) {
  const res = await fetch(url); // el interceptor agrega el token
  if (!res.ok) throw new Error(`No se pudo descargar el archivo (${res.status})`);
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = objectUrl;
  a.download = nombreArchivo || url.split('/').pop() || 'archivo';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

