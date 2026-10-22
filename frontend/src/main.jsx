import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import Login from './components/Auth/Login.jsx'
import { AuthProvider, useAuth } from './context/AuthContext.jsx'
import { instalarInterceptores } from './services/apiClient.js'
import './index.css'

// Debe instalarse antes de que cualquier componente haga fetch
instalarInterceptores()

function AuthGate() {
  const { token, cargando } = useAuth()
  if (cargando) {
    return <div className="w-screen h-screen flex items-center justify-center bg-slate-100 text-slate-500 text-sm">Cargando…</div>
  }
  return token ? <App /> : <Login />
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  </React.StrictMode>,
)
