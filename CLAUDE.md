# CLAUDE.md — Ayni Dietética (Rosario)

Guía para trabajar en este repo. Leela antes de hacer cualquier cambio.

## Aislamiento

- Proyecto **completamente aislado** de cualquier otro proyecto o cliente: no
  los toques, no los referencies, no copies código ni datos de otros proyectos.
- Único proyecto Supabase permitido: **`rxgcpqyruqpxqsjluzqc`**
  (`https://rxgcpqyruqpxqsjluzqc.supabase.co`).
- El esquema real de la base es la fuente de verdad (no hay `.sql` en el repo).
  Consultalo antes de asumir columnas, funciones o vistas.

## Reglas de base de datos

- **No modificar la base** (tablas, funciones, vistas, políticas, migraciones)
  sin confirmación previa explícita. Si algo hace falta, proponerlo primero.
- **No crear usuarios ni tocar `auth.users` ni `public.perfiles`.** Los usuarios
  ya existen.
- **Nunca usar la service_role key.** La app usa solo la URL y la anon /
  publishable key. Están como valores por defecto en `src/lib/supabase.js`
  (son públicas) y se pueden reemplazar con `VITE_SUPABASE_URL` y
  `VITE_SUPABASE_ANON_KEY`. Ninguna otra clave va en el código.
- Ventas, compras y stock **siempre por RPC**, nunca escribiendo directo en
  `ventas`, `venta_items`, `compras`, `lotes` ni `movimientos_stock`:
  - `registrar_venta(p_items jsonb, p_medio text, p_nota text)` — items
    `[{producto_id, cantidad}]`.
  - `registrar_compra(p_proveedor uuid, p_items jsonb, p_remito text, p_actualizar_costo bool)`
    — items `[{producto_id, cantidad, costo_unitario, vencimiento}]`.
  - `ajustar_stock(p_producto uuid, p_cantidad numeric, p_tipo text, p_motivo text)`
    — cantidad con signo; tipo `ajuste|merma|rotura|vencimiento|devolucion`.
  - `aumento_masivo(p_pct, p_proveedor, p_categoria, p_aplicar)` — con
    `p_aplicar=false` devuelve la vista previa; con `true` aplica.
  - `recalcular_precios()` — después de cambiar `config`.
- Escritura directa permitida (la RLS solo deja al manager): `productos`,
  `categorias`, `proveedores`, `config`. **Nunca editar `productos.stock`**
  (ni `precio`, que lo calcula un trigger) desde el formulario de producto.
- Vistas: `v_mostrador` (security definer, la usan empleada y manager);
  `v_reponer`, `v_por_vencer`, `v_ventas_diarias` (security invoker, solo manager).

## Usuarios y login

- El formulario pide **Usuario** y **Contraseña** (sin campo de mail).
- Internamente: `email = usuario.trim().toLowerCase() + "@aynidietetica.com"`
  y `supabase.auth.signInWithPassword({ email, password })`.
- El rol sale de `public.perfiles.rol`: `manager` o `empleada`. Si `activo` es
  false, se cierra la sesión.

## Reglas de la app

- Español rioplatense (vos, "tocá", "poné"), pesos argentinos (`es-AR`, `ARS`).
- Mobile-first, botones grandes (mínimo ~44–56 px de alto).
- La **empleada** nunca ve costos, márgenes ni ganancias.
- Productos por kg: en la venta y en los ajustes de stock se cargan en
  **gramos** y se mandan a la base en kg (`g / 1000`). En el ingreso de
  mercadería se cargan en kg (costo por kg).
- "Ventas de hoy" = suma de `ventas.total` con estado `pagada` o `retirada`
  desde las 00:00 de hoy en `America/Argentina/Buenos_Aires`.

## Stack y comandos

- Vite + React 18 + Tailwind 4 + `@supabase/supabase-js` 2.
- Excel: `write-excel-file` (solo escritura).
- `npm install`, `npm run dev`, `npm run build`.
- `.env` está en `.gitignore`; `.env.example` va sin valores. Nunca commitear
  claves ni contraseñas.

## Git

- La dueña del proyecto no usa GitHub: los cambios aprobados van directo a `main`.
