import { useCallback, useEffect, useMemo, useState } from 'react';
import { Boton, Input, Mensaje, Tarjeta } from '../components/ui';
import { MEDIOS_PAGO, aNumero, formatoCantidad, formatoPesos } from '../lib/formato';
import { inicioDeHoyArgentina, mensajeDeError, supabase } from '../lib/supabase';

const ATAJOS_GRAMOS = [100, 250, 500, 1000];

// En el carrito, los productos por kg se cargan en gramos y los demás en unidades.
// Al cobrar, los gramos se pasan a kg porque el stock y el precio están por kg.
function cantidadEnUnidadDeStock(item) {
  return item.producto.unidad === 'kg' ? item.cantidad / 1000 : item.cantidad;
}

function subtotal(item) {
  return Math.round(Number(item.producto.precio) * cantidadEnUnidadDeStock(item) * 100) / 100;
}

export default function Venta() {
  const [productos, setProductos] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [carrito, setCarrito] = useState([]);
  const [medio, setMedio] = useState('efectivo');
  const [ventasHoy, setVentasHoy] = useState(null);
  const [cobrando, setCobrando] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');

  const cargarProductos = useCallback(async () => {
    const { data, error } = await supabase.from('v_mostrador').select('*').order('nombre');
    if (error) setError(mensajeDeError(error));
    else setProductos(data);
  }, []);

  const cargarVentasHoy = useCallback(async () => {
    const { data, error } = await supabase
      .from('ventas')
      .select('total')
      .in('estado', ['pagada', 'retirada'])
      .gte('fecha', inicioDeHoyArgentina());
    if (error) setError(mensajeDeError(error));
    else setVentasHoy(data.reduce((s, v) => s + Number(v.total), 0));
  }, []);

  useEffect(() => {
    cargarProductos();
    cargarVentasHoy();
  }, [cargarProductos, cargarVentasHoy]);

  const filtrados = useMemo(() => {
    const t = busqueda.trim().toLowerCase();
    if (!t) return productos;
    return productos.filter(
      (p) =>
        p.nombre.toLowerCase().includes(t) ||
        (p.codigo ?? '').toLowerCase().includes(t) ||
        (p.categoria ?? '').toLowerCase().includes(t),
    );
  }, [busqueda, productos]);

  const total = carrito.reduce((s, it) => s + subtotal(it), 0);

  function agregar(producto) {
    setOk('');
    setCarrito((c) => {
      const existente = c.find((it) => it.producto.id === producto.id);
      if (existente) {
        if (producto.unidad === 'kg') return c;
        return c.map((it) => (it === existente ? { ...it, cantidad: it.cantidad + 1 } : it));
      }
      return [...c, { producto, cantidad: producto.unidad === 'kg' ? 100 : 1 }];
    });
    setBusqueda('');
  }

  function cambiarCantidad(id, cantidad) {
    setCarrito((c) => c.map((it) => (it.producto.id === id ? { ...it, cantidad } : it)));
  }

  function quitar(id) {
    setCarrito((c) => c.filter((it) => it.producto.id !== id));
  }

  const problema = carrito
    .map((it) => {
      const cant = cantidadEnUnidadDeStock(it);
      if (!(cant > 0)) return `Revisá la cantidad de ${it.producto.nombre}.`;
      if (cant > Number(it.producto.disponible)) {
        return `No alcanza el stock de ${it.producto.nombre} (hay ${formatoCantidad(it.producto.disponible, it.producto.unidad)}).`;
      }
      return null;
    })
    .find(Boolean);

  async function cobrar() {
    setError('');
    setOk('');
    setCobrando(true);
    const items = carrito.map((it) => ({ producto_id: it.producto.id, cantidad: cantidadEnUnidadDeStock(it) }));
    const { error } = await supabase.rpc('registrar_venta', { p_items: items, p_medio: medio });
    setCobrando(false);
    if (error) {
      setError(mensajeDeError(error));
      return;
    }
    setOk(`Venta registrada: ${formatoPesos(total)} (${MEDIOS_PAGO.find((m) => m.valor === medio).etiqueta}).`);
    setCarrito([]);
    setMedio('efectivo');
    cargarProductos();
    cargarVentasHoy();
  }

  return (
    <div className={`grid gap-4 lg:grid-cols-[1fr_380px] ${carrito.length ? 'pb-24 lg:pb-0' : ''}`}>
      <div className="space-y-4">
        <div className="flex items-center justify-between rounded-2xl bg-emerald-700 px-4 py-3 text-white">
          <span className="text-lg">Ventas de hoy</span>
          <span className="text-2xl font-bold tabular-nums">{ventasHoy === null ? '…' : formatoPesos(ventasHoy)}</span>
        </div>

        <Input
          type="search"
          placeholder="Buscar producto…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="min-h-16 text-xl"
        />

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {filtrados.map((p) => {
            const sinStock = Number(p.disponible) <= 0;
            return (
              <button
                type="button"
                key={p.id}
                disabled={sinStock}
                onClick={() => agregar(p)}
                className="flex min-h-24 flex-col justify-between rounded-xl border-2 border-stone-200 bg-white p-3 text-left active:bg-emerald-50 disabled:opacity-40"
              >
                <span className="text-lg font-semibold leading-tight">{p.nombre}</span>
                <span className="mt-1 text-base">
                  <span className="font-bold text-emerald-800">{formatoPesos(p.precio)}</span>
                  {p.unidad === 'kg' && <span className="text-stone-500"> /kg</span>}
                </span>
                <span className="text-sm text-stone-500">
                  {sinStock ? 'Sin stock' : `Hay ${formatoCantidad(p.disponible, p.unidad)}`}
                </span>
              </button>
            );
          })}
        </div>
        {filtrados.length === 0 && <p className="text-center text-stone-500">No se encontraron productos.</p>}
      </div>

      <Tarjeta titulo="Carrito" className="h-fit lg:sticky lg:top-32">
        <div id="carrito" className="scroll-mt-36" />
        {carrito.length === 0 && <p className="text-stone-500">Tocá un producto para agregarlo.</p>}
        <div className="space-y-3">
          {carrito.map((it) => (
            <ItemCarrito key={it.producto.id} item={it} onCantidad={cambiarCantidad} onQuitar={quitar} />
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between border-t-2 border-stone-200 pt-4">
          <span className="text-xl font-semibold">Total</span>
          <span className="text-3xl font-bold tabular-nums">{formatoPesos(total)}</span>
        </div>

        <div className="mt-4">
          <span className="mb-2 block text-base font-medium text-stone-700">Medio de pago</span>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {MEDIOS_PAGO.map((m) => (
              <button
                type="button"
                key={m.valor}
                onClick={() => setMedio(m.valor)}
                className={`min-h-12 rounded-xl border-2 text-base font-semibold ${
                  medio === m.valor ? 'border-emerald-700 bg-emerald-700 text-white' : 'border-stone-300 bg-white'
                }`}
              >
                {m.etiqueta}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <Mensaje>{error || problema}</Mensaje>
          <Mensaje tipo="ok">{ok}</Mensaje>
          <Boton
            className="min-h-16 w-full text-2xl"
            disabled={!carrito.length || !!problema || cobrando}
            onClick={cobrar}
          >
            {cobrando ? 'Cobrando…' : `Cobrar ${carrito.length ? formatoPesos(total) : ''}`}
          </Boton>
          {carrito.length > 0 && (
            <Boton variante="secundario" className="w-full" onClick={() => setCarrito([])}>
              Vaciar carrito
            </Boton>
          )}
        </div>
      </Tarjeta>

      {carrito.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-10 border-t-2 border-stone-200 bg-white p-3 shadow-lg lg:hidden">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
            <div>
              <div className="text-sm text-stone-500">{carrito.length} producto(s)</div>
              <div className="text-2xl font-bold tabular-nums">{formatoPesos(total)}</div>
            </div>
            <Boton onClick={() => document.getElementById('carrito').scrollIntoView({ behavior: 'smooth' })}>
              Ir a cobrar
            </Boton>
          </div>
        </div>
      )}
    </div>
  );
}

function ItemCarrito({ item, onCantidad, onQuitar }) {
  const { producto, cantidad } = item;
  const esKg = producto.unidad === 'kg';
  return (
    <div className="rounded-xl bg-stone-50 p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-lg font-semibold leading-tight">{producto.nombre}</div>
          <div className="text-sm text-stone-500">
            {formatoPesos(producto.precio)} {esKg ? '/kg' : 'c/u'}
          </div>
        </div>
        <button
          type="button"
          onClick={() => onQuitar(producto.id)}
          className="min-h-11 min-w-11 rounded-lg text-2xl text-red-600 active:bg-red-50"
          aria-label={`Quitar ${producto.nombre}`}
        >
          ×
        </button>
      </div>

      <div className="mt-2 flex items-center justify-between gap-2">
        {esKg ? (
          <div className="flex items-center gap-2">
            <Input
              type="number"
              inputMode="numeric"
              min="1"
              className="w-28 text-center"
              value={cantidad || ''}
              onChange={(e) => onCantidad(producto.id, aNumero(e.target.value) ?? 0)}
            />
            <span className="text-lg">g</span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Boton
              variante="secundario"
              className="min-w-14 px-0 text-2xl"
              onClick={() => onCantidad(producto.id, Math.max(1, cantidad - 1))}
            >
              −
            </Boton>
            <span className="w-10 text-center text-xl font-semibold tabular-nums">{cantidad}</span>
            <Boton
              variante="secundario"
              className="min-w-14 px-0 text-2xl"
              onClick={() => onCantidad(producto.id, cantidad + 1)}
            >
              +
            </Boton>
          </div>
        )}
        <span className="text-lg font-bold tabular-nums">{formatoPesos(subtotal(item))}</span>
      </div>

      {esKg && (
        <div className="mt-2 grid grid-cols-4 gap-1">
          {ATAJOS_GRAMOS.map((g) => (
            <button
              type="button"
              key={g}
              onClick={() => onCantidad(producto.id, g)}
              className={`min-h-11 rounded-lg border-2 text-base font-semibold ${
                cantidad === g ? 'border-emerald-700 bg-emerald-50' : 'border-stone-300 bg-white'
              }`}
            >
              {g === 1000 ? '1 kg' : `${g} g`}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
