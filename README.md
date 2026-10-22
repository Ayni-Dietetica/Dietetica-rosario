# Ayni — Dietética (Rosario)

Proyecto Supabase: `https://rxgcpqyruqpxqsjluzqc.supabase.co`

## Usuarios del sistema

La app no usa mails reales. Cada persona tiene un **usuario** y una
**contraseña**; internamente Supabase Auth guarda el email
`<usuario>@dietetica.local`.

Roles (columna `rol` de `public.perfiles`): `manager` o `empleada`.

### Convención de login (para la app)

- El formulario pide **"Usuario"** y **"Contraseña"**. No hay campo de mail.
- Internamente se hace:

```js
const email = usuario.trim().toLowerCase() + '@dietetica.local';
const { data, error } = await supabase.auth.signInWithPassword({ email, password });
```

- Después del login, el rol se lee de `public.perfiles` con el `id` del usuario.

### Crear / actualizar los usuarios (script de un solo uso)

Requiere Node 20.6+ (usa `node --env-file`).

1. `cp .env.example .env` y completar los valores. `.env` está en `.gitignore`
   y no debe commitearse nunca.
2. `npm install`
3. `npm run crear-usuarios`

El script (`scripts/crear-usuarios.mjs`):

- crea cada usuario con `auth.admin.createUser` (email interno,
  `email_confirm: true`, contraseña tomada de `PASS_MANAGER` / `PASS_EMPLEADA`);
- si el usuario ya existe, lo actualiza (contraseña y email confirmado) en vez
  de fallar;
- hace upsert de la fila en `public.perfiles` con el mismo `id`, nombre y rol;
- al final verifica y muestra solo usuario, nombre y rol.

Nunca imprime contraseñas ni la service_role key.

Si ya hay una cuenta con el mismo usuario pero en otro dominio de email, el
script se detiene. Con `MIGRAR_EMAIL_EXISTENTE=1` le cambia el email al
interno conservando el mismo `id` (y por lo tanto su perfil y su historial).
