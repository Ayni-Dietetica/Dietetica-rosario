import { useCallback, useEffect, useState } from 'react';
import { Boton, Campo, Input, Mensaje, Select, SelectorProducto, Tarjeta } from '../components/ui';
import { aNumero, formatoPesos } from '../lib/formato';
import { mensajeDeError, supabase } from '../lib/supabase';

// Ingreso de mercadería: siempre por la RPC registrar_compra (crea compra, lotes y suma stock).
export default function Compras() {
  const [productos, setProductos] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [proveedorId, setProveedorId] = useState('');
  const [remito, setRemito] = useState('');
  const [actualizarCosto, setActualizarCosto] = useState(true);
  const [items, setItems] = useState([]);
  const [nuevo, setNuevo] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');

  const cargar = useCallback(async () => {
    const [p, v] = await Promise.all([
      supabase.from('productos').select('id, codigo, nombre, unidad, stock, costo').eq('activo', true).order('nombre'),
      supabase.from('proveedores').select('id, nombre').eq('activo', true).order('nombre'),
    ]);
    const err = p.error || v.error;
    if (err) {
      setError(mensajeDeError(err));
      return;
    }
    setProductos(p.data);
    setProveedores(v.data);
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  function elegirProducto(p) {
    setNuevo(p ? { producto: p, cantidad: '', costo: String(p.costo ?? ''), vencimiento: '' } : null);
  }

  function agregarItem() {
    const cantidad = aNumero(nuevo.cantidad);
    const costo = aNumero(nuevo.costo);
    if (!(cantidad > 0)) {
      setError('Poné una cantidad mayor a cero.');
      return;
    }
    if (costo === null || costo < 0) {
      setError('Poné el costo unitario.');
      return;
    }
    setError('');
    setItems([...items, { ...nuevo, cantidad, costo }]);
    setNuevo(null);
  }

  const total = items.reduce((s, it) => s + it.cantidad * it.costo, 0);

  async function registrar() {
    setError('');
    setOk('');
    setGuardando(true);
    const { error } = await supabase.rpc('registrar_compra', {
      p_proveedor: proveedorId || null,
      p_items: items.map((it) => ({
        producto_id: it.producto.id,
        cantidad: it.cantidad,
        costo_unitario: it.costo,
        vencimiento: it.vencimiento || null,
      })),
      p_remito: remito.trim() || null,
      p_actualizar_costo: actualizarCosto,
    });
    setGuardando(false);
    if (error) {
      setError(mensajeDeError(error));
      return;
    }
    setOk(`Mercadería ingresada: ${items.length} producto(s), total ${formatoPesos(total)}.`);
    setItems([]);
    setRemito('');
    cargar();
  }

  const unidadNuevo = nuevo?.producto.unidad === 'kg' ? 'kg' : 'unidades';

  return (
    <div className="space-y-4">
      <Tarjeta titulo="Ingreso de mercadería">
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo etiqueta="Proveedor">
            <Select value={proveedorId} onChange={(e) => setProveedorId(e.target.value)}>
              <option value="">Sin proveedor</option>
              {proveedores.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </Select>
          </Campo>
          <Campo etiqueta="N° de remito o factura (opcional)">
            <Input value={remito} onChange={(e) => setRemito(e.target.value)} />
          </Campo>
          <label className="flex items-center gap-3 text-lg sm:col-span-2">
            <input
              type="checkbox"
              className="size-6"
              checked={actualizarCosto}
              onChange={(e) => setActualizarCosto(e.target.checked)}
            />
            Actualizar el costo del producto con este precio (recalcula el precio de venta)
          </label>
        </div>
      </Tarjeta>

      <Tarjeta titulo="Agregar producto">
        <SelectorProducto productos={productos} seleccionado={nuevo?.producto} onElegir={elegirProducto} />
        {nuevo && (
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <Campo etiqueta={`Cantidad (${unidadNuevo})`}>
              <Input
                inputMode="decimal"
                value={nuevo.cantidad}
                onChange={(e) => setNuevo({ ...nuevo, cantidad: e.target.value })}
              />
            </Campo>
            <Campo etiqueta={`Costo por ${nuevo.producto.unidad === 'kg' ? 'kg' : 'unidad'} ($)`}>
              <Input
                inputMode="decimal"
                value={nuevo.costo}
                onChange={(e) => setNuevo({ ...nuevo, costo: e.target.value })}
              />
            </Campo>
            <Campo etiqueta="Vencimiento (opcional)">
              <Input
                type="date"
                value={nuevo.vencimiento}
                onChange={(e) => setNuevo({ ...nuevo, vencimiento: e.target.value })}
              />
            </Campo>
            <Boton className="sm:col-span-3" onClick={agregarItem}>
              Agregar a la lista
            </Boton>
          </div>
        )}
      </Tarjeta>

      <Tarjeta titulo={`Lista a ingresar (${items.length})`}>
        {items.length === 0 && <p className="text-stone-500">Todavía no agregaste productos.</p>}
        <div className="space-y-2">
          {items.map((it, i) => (
            <div key={i} className="flex items-center justify-between gap-2 rounded-xl bg-stone-50 p-3">
              <div>
                <div className="text-lg font-semibold">{it.producto.nombre}</div>
                <div className="text-sm text-stone-600">
                  {it.cantidad} {it.producto.unidad === 'kg' ? 'kg' : 'u.'} × {formatoPesos(it.costo)}
                  {it.vencimiento && ` · vence ${it.vencimiento.split('-').reverse().join('/')}`}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold tabular-nums">{formatoPesos(it.cantidad * it.costo)}</span>
                <button
                  type="button"
                  onClick={() => setItems(items.filter((_, j) => j !== i))}
                  className="min-h-11 min-w-11 rounded-lg text-2xl text-red-600 active:bg-red-50"
                  aria-label="Quitar"
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-between border-t-2 border-stone-200 pt-4">
          <span className="text-xl font-semibold">Total</span>
          <span className="text-2xl font-bold tabular-nums">{formatoPesos(total)}</span>
        </div>
        <div className="mt-4 space-y-3">
          <Mensaje onCerrar={() => setError('')}>{error}</Mensaje>
          <Mensaje tipo="ok">{ok}</Mensaje>
          <Boton className="w-full" disabled={!items.length || guardando} onClick={registrar}>
            {guardando ? 'Guardando…' : 'Registrar ingreso'}
          </Boton>
        </div>
      </Tarjeta>
    </div>
  );
}
