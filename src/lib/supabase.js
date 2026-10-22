import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const configFaltante = !url || !anonKey;

export const supabase = configFaltante ? null : createClient(url, anonKey);

export const DOMINIO_LOGIN = 'aynidietetica.com';

export function emailDeUsuario(usuario) {
  return `${usuario.trim().toLowerCase()}@${DOMINIO_LOGIN}`;
}

// Traduce los errores de Supabase/Postgres a un mensaje para mostrar.
export function mensajeDeError(error) {
  if (!error) return '';
  const msg = error.message || String(error);
  if (/Invalid login credentials/i.test(msg)) return 'Usuario o contraseña incorrectos.';
  if (/Failed to fetch|NetworkError/i.test(msg)) return 'Sin conexión. Revisá internet y probá de nuevo.';
  if (/duplicate key/i.test(msg)) return 'Ya existe un registro con ese nombre o código.';
  if (/violates foreign key/i.test(msg)) return 'No se puede borrar: está en uso.';
  if (/row-level security|permission denied/i.test(msg)) return 'No tenés permiso para hacer esto.';
  return msg;
}

// Inicio del día de hoy en Argentina (UTC-3, sin horario de verano), en ISO.
export function inicioDeHoyArgentina() {
  const ahoraAR = new Date(Date.now() - 3 * 60 * 60 * 1000);
  return `${ahoraAR.toISOString().slice(0, 10)}T00:00:00-03:00`;
}
