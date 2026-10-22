# Ayni — Dietética (Rosario)

App web de la Fase 1: punto de venta para la empleada y gestión completa para
el manager. Vite + React + Tailwind + Supabase.

## Puesta en marcha

1. La URL y la publishable key del proyecto ya vienen por defecto en
   `src/lib/supabase.js` (son públicas). Para usar otras, copiar
   `.env.example` a `.env` y completarlo. **Nunca la service_role.**
2. `npm install`
3. `npm run dev` para probar, o `npm run build` para generar `dist/`.

Producción: https://dietetica-rosario.vercel.app (Vercel, se publica solo con
cada cambio en `main`).

## Login

El formulario pide **Usuario** y **Contraseña**, sin mail. Internamente se hace
`signInWithPassword` con `email = usuario.trim().toLowerCase() + "@aynidietetica.com"`.

## Qué ve cada rol

**Empleada**: pantalla de venta.
- Buscador grande y botones de producto (desde `v_mostrador`).
- Carrito: los productos por kg se cargan en gramos (atajos de 100/250/500 g y 1 kg).
- Total, medio de pago y **Cobrar** (RPC `registrar_venta`).
- "Ventas de hoy": suma en pesos de las ventas pagadas/retiradas del día.
- No ve costos ni márgenes.

**Manager**: todo lo anterior, más:
- **Productos** y **categorías** (alta/edición; el stock no se edita acá).
- **Proveedores**.
- **Mercadería**: ingreso de compras (RPC `registrar_compra`).
- **Stock**: ajustes, mermas, roturas, vencimientos, devoluciones (RPC `ajustar_stock`).
- **Aumentos**: aumento masivo de costos con vista previa (RPC `aumento_masivo`).
- **Precios**: margen global y redondeo, y recálculo (RPC `recalcular_precios`).
- **Reportes**: para reponer, por vencer y ventas por día, con exportación a Excel.

Ver `CLAUDE.md` para las reglas del proyecto.
