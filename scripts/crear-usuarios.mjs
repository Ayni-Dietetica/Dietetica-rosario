// Script de un solo uso: crea (o actualiza) los usuarios del sistema en el
// proyecto Supabase "Ayni" y sus filas en public.perfiles.
//
// Uso:  npm run crear-usuarios   (lee las variables de .env)
//
// No imprime contraseñas ni la service_role key.

import { createClient } from '@supabase/supabase-js';

const DOMINIO_INTERNO = 'dietetica.local';

function requerida(nombre) {
  const valor = process.env[nombre]?.trim();
  if (!valor) {
    console.error(`Falta la variable ${nombre} en .env`);
    process.exit(1);
  }
  return valor;
}

const supabase = createClient(
  requerida('SUPABASE_URL'),
  requerida('SUPABASE_SERVICE_ROLE_KEY'),
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const migrarEmailExistente = process.env.MIGRAR_EMAIL_EXISTENTE === '1';

const usuarios = [
  {
    usuario: requerida('USUARIO_MANAGER'),
    nombre: requerida('NOMBRE_MANAGER'),
    rol: 'manager',
    password: requerida('PASS_MANAGER'),
  },
  {
    usuario: requerida('USUARIO_EMPLEADA'),
    nombre: requerida('NOMBRE_EMPLEADA'),
    rol: 'empleada',
    password: requerida('PASS_EMPLEADA'),
  },
].map((u) => ({ ...u, usuario: u.usuario.trim().toLowerCase() }));

const emailInterno = (usuario) => `${usuario}@${DOMINIO_INTERNO}`;

async function listarTodosLosUsuarios() {
  const todos = [];
  for (let page = 1; ; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(`No se pudieron listar los usuarios: ${error.message}`);
    todos.push(...data.users);
    if (data.users.length < 1000) return todos;
  }
}

async function upsertUsuario(u, existentes) {
  const email = emailInterno(u.usuario);
  const atributos = { email, password: u.password, email_confirm: true };

  let existente = existentes.find((x) => x.email?.toLowerCase() === email);

  if (!existente) {
    const previo = existentes.find(
      (x) => x.email?.toLowerCase().split('@')[0] === u.usuario,
    );
    if (previo) {
      if (!migrarEmailExistente) {
        throw new Error(
          `Ya existe una cuenta "${u.usuario}" con otro dominio. ` +
            'Poné MIGRAR_EMAIL_EXISTENTE=1 en .env para pasarla al email interno.',
        );
      }
      existente = previo;
    }
  }

  let id;
  if (existente) {
    const { error } = await supabase.auth.admin.updateUserById(existente.id, atributos);
    if (error) throw new Error(`No se pudo actualizar "${u.usuario}": ${error.message}`);
    id = existente.id;
    console.log(`Usuario "${u.usuario}": actualizado.`);
  } else {
    const { data, error } = await supabase.auth.admin.createUser(atributos);
    if (error) throw new Error(`No se pudo crear "${u.usuario}": ${error.message}`);
    id = data.user.id;
    console.log(`Usuario "${u.usuario}": creado.`);
  }

  const { error } = await supabase
    .from('perfiles')
    .upsert({ id, nombre: u.nombre, rol: u.rol, activo: true }, { onConflict: 'id' });
  if (error) throw new Error(`No se pudo guardar el perfil de "${u.usuario}": ${error.message}`);
}

async function verificar() {
  const existentes = await listarTodosLosUsuarios();
  const emailPorId = new Map(existentes.map((x) => [x.id, x.email]));

  const { data, error } = await supabase
    .from('perfiles')
    .select('id, nombre, rol')
    .in('id', existentes.filter((x) => x.email?.endsWith(`@${DOMINIO_INTERNO}`)).map((x) => x.id));
  if (error) throw new Error(`No se pudo verificar perfiles: ${error.message}`);

  const filas = data.map((p) => ({
    usuario: emailPorId.get(p.id).split('@')[0],
    nombre: p.nombre,
    rol: p.rol,
  }));
  console.table(filas);

  for (const u of usuarios) {
    const fila = filas.find((f) => f.usuario === u.usuario);
    if (!fila || fila.rol !== u.rol) {
      throw new Error(`Verificación fallida para "${u.usuario}".`);
    }
  }
  console.log('Verificación OK: los 2 perfiles existen con el rol correcto.');
}

try {
  const existentes = await listarTodosLosUsuarios();
  for (const u of usuarios) await upsertUsuario(u, existentes);
  await verificar();
} catch (e) {
  console.error(e.message);
  process.exit(1);
}
