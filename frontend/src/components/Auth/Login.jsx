import React, { useState } from 'react';
import { Lock, User, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (enviando) return;
    setEnviando(true);
    setError(null);
    try {
      await login(username.trim(), password);
    } catch (err) {
      setError(err.message === 'Failed to fetch' ? 'No hay conexión con el servidor.' : err.message);
      setEnviando(false);
    }
  };

  return (
    <div className="w-screen h-screen bg-slate-100 flex items-center justify-center p-4 font-sans">
      <form onSubmit={onSubmit} className="w-full max-w-sm bg-white rounded-2xl shadow-lg border border-slate-200 p-8 flex flex-col gap-4">
        <div className="flex flex-col items-center gap-2 mb-2">
          <img src="/logo.png" alt="Logo" className="h-14 object-contain" />
          <h1 className="text-lg font-bold text-slate-900">Cotizador</h1>
          <p className="text-xs text-slate-500">Ingresa con tu usuario y contraseña</p>
        </div>

        <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
          Usuario
          <span className="flex items-center gap-2 border border-slate-300 rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-blue-500 bg-white">
            <User size={15} className="text-slate-400" />
            <input
              type="text" autoFocus autoComplete="username" required
              value={username} onChange={(e) => setUsername(e.target.value)}
              className="flex-1 outline-none text-sm text-slate-800 bg-transparent"
            />
          </span>
        </label>

        <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
          Contraseña
          <span className="flex items-center gap-2 border border-slate-300 rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-blue-500 bg-white">
            <Lock size={15} className="text-slate-400" />
            <input
              type="password" autoComplete="current-password" required
              value={password} onChange={(e) => setPassword(e.target.value)}
              className="flex-1 outline-none text-sm text-slate-800 bg-transparent"
            />
          </span>
        </label>

        {error && (
          <div role="alert" className="flex items-center gap-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            <AlertCircle size={14} /> {error}
          </div>
        )}

        <button
          type="submit" disabled={enviando || !username || !password}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-sm rounded-lg py-2.5 transition flex items-center justify-center gap-2"
        >
          {enviando && <Loader2 size={15} className="animate-spin" />}
          {enviando ? 'Ingresando…' : 'Ingresar'}
        </button>
      </form>
    </div>
  );
}

