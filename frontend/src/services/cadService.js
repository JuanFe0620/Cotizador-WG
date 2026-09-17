const API_BASE = 'http://127.0.0.1:8000';

export async function generarPlano(payload) {
  const response = await fetch(`${API_BASE}/api/planos/generar`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Error al generar plano: ${response.status} ${errorText}`);
  }

  return await response.json();
}
