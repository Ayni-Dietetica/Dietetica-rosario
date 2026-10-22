import { useCallback, useEffect, useMemo, useState } from 'react';
import { Boton, BotonExcel, Campo, Input, Mensaje, Select, Tabla, Tarjeta } from '../components/ui';
import { aNumero, formatoCantidad, formatoNumero, formatoPesos } from '../lib/formato';
import { mensajeDeError, supabase } from '../lib/supabase';

// Nunca se edita stock desde acá: el stock se mueve solo con compras, ventas y ajustes (RPC).
const PRODUCTO_VACIO = {
  codigo: '',
  nombre: '',
  categoria_id: '',
  proveedor_id: '',
  unidad: 'unidad',
  costo: '',
  margen_pct: '',
  precio_manual: '',
  stock_minimo: '',
  visible_tienda: false,
  descripcion: '',
  activo: true,
};

const aTexto = (v) => (v === null || v === undefined ? '' : String(v));

export default function Productos() {
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [editando, setEditando] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [verInactivos, setVerInactivos] = useState(false);
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    const [p, c, v] = await Promise.all([
      supabase.from('productos').select('*, categorias(nombre), proveedores(nombre)').order('nombre'),
      supabase.from('categorias').select('*').order('orden').order('nombre'),
      supabase.from('proveedores').select('id, nombre').eq('activo', true).order('nombre'),
    ]);
    const err = p.error || c.error || v.error;
    if (err) {
      setError(mensajeDeError(err));
      return;
    }
    setProductos(p.data);
    setCategorias(c.data);
    setProveedores(v.data);
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const filtrados = useMemo(() => {
    const t = busqueda.trim().toLowerCase();
    return productos.filter(
      (p) =>
        (verInactivos || p.activo) &&
        (!t || p.nombre.toLowerCase().includes(t) || (p.codigo ?? '').toLowerCase().includes(t)),
    );
  }, [productos, busqueda, verInactivos]);

  const columnas = [
    { titulo: 'Código', valor: (p) => p.codigo ?? '' },
    {
      titulo: 'Producto',
      valor: (p) => p.nombre,
      render: (p) => (
        <span className={p.activo ? '' : 'text-stone-400 line-through'}>{p.nombre}</span>
      ),
    },
    { titulo: 'Categoría', valor: (p) => p.categorias?.nombre ?? '' },
    { titulo: 'Proveedor', valor: (p) => p.proveedores?.nombre ?? '' },
    { titulo: 'Unidad', valor: (p) => p.unidad },
    { titulo: 'Costo', valor: (p) => Number(p.costo), render: (p) => formatoPesos(p.costo), alinear: 'der' },
    {
      titulo: 'Margen %',
      valor: (p) => (p.margen_pct === null ? '' : Number(p.margen_pct)),
      render: (p) => (p.margen_pct === null ? '—' : formatoNumero(p.margen_pct)),
      alinear: 'der',
    },
    { titulo: 'Precio', valor: (p) => Number(p.precio), render: (p) => formatoPesos(p.precio), alinear: 'der' },
    {
      titulo: 'Stock',
      valor: (p) => Number(p.stock),
      render: (p) => formatoCantidad(p.stock, p.unidad),
      alinear: 'der',
    },
    {
      titulo: '',
      valor: () => '',
      render: (p) => (
        <Boton variante="secundario" className="min-h-11 text-base" onClick={() => setEditando(p)}>
          Editar
        </Boton>
      ),
    },
  ];
  const columnasExcel = columnas.filter((c) => c.titulo);

  return (
    <div className="space-y-4">
      {editando && (
        <FormProducto
          key={editando.id ?? 'nuevo'}
          producto={editando}
          categorias={categorias}
          proveedores={proveedores}
          onCerrar={() => setEditando(null)}
          onGuardado={() => {
            setEditando(null);
            cargar();
          }}
        />
      )}

      <Tarjeta
        titulo="Productos"
        acciones={
          <div className="flex gap-2">
            <BotonExcel nombre="productos" columnas={columnasExcel} filas={filtrados} />
            <Boton className="min-h-11 text-base" onClick={() => setEditando(PRODUCTO_VACIO)}>
              + Nuevo
            </Boton>
          </div>
        }
      >
        <Mensaje onCerrar={() => setError('')}>{error}</Mensaje>
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <Input
            type="search"
            placeholder="Buscar…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="flex-1"
          />
          <label className="flex items-center gap-2 text-base">
            <input
              type="checkbox"
              className="size-6"
              checked={verInactivos}
              onChange={(e) => setVerInactivos(e.target.checked)}
            />
            Ver inactivos
          </label>
        </div>
        <Tabla columnas={columnas} filas={filtrados} vacio="No hay productos cargados." />
      </Tarjeta>

      <Categorias categorias={categorias} onCambio={cargar} />
    </div>
  );
}

function FormProducto({ producto, categorias, proveedores, onCerrar, onGuardado }) {
  const [f, setF] = useState(() => {
    const base = { ...PRODUCTO_VACIO };
    for (const k of Object.keys(base)) {
      base[k] = typeof base[k] === 'boolean' ? producto[k] ?? base[k] : aTexto(producto[k]);
    }
    return base;
  });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  async function guardar() {
    if (!f.nombre.trim()) {
      setError('Poné un nombre.');
      return;
    }
    const costo = aNumero(f.costo) ?? 0;
    if (costo < 0) {
      setError('El costo no puede ser negativo.');
      return;
    }
    const fila = {
      codigo: f.codigo.trim() || null,
      nombre: f.nombre.trim(),
      categoria_id: f.categoria_id || null,
      proveedor_id: f.proveedor_id || null,
      unidad: f.unidad,
      costo,
      margen_pct: aNumero(f.margen_pct),
      precio_manual: aNumero(f.precio_manual),
      stock_minimo: aNumero(f.stock_minimo) ?? 0,
      visible_tienda: f.visible_tienda,
      descripcion: f.descripcion.trim() || null,
      activo: f.activo,
    };
    setGuardando(true);
    const { error } = producto.id
      ? await supabase.from('productos').update(fila).eq('id', producto.id)
      : await supabase.from('productos').insert(fila);
    setGuardando(false);
    if (error) setError(mensajeDeError(error));
    else onGuardado();
  }

  return (
    <Tarjeta titulo={producto.id ? `Editar: ${producto.nombre}` : 'Nuevo producto'}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Campo etiqueta="Nombre">
          <Input value={f.nombre} onChange={set('nombre')} />
        </Campo>
        <Campo etiqueta="Código (opcional)">
          <Input value={f.codigo} onChange={set('codigo')} />
        </Campo>
        <Campo etiqueta="Categoría">
          <Select value={f.categoria_id} onChange={set('categoria_id')}>
            <option value="">Sin categoría</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </Select>
        </Campo>
        <Campo etiqueta="Proveedor">
          <Select value={f.proveedor_id} onChange={set('proveedor_id')}>
            <option value="">Sin proveedor</option>
            {proveedores.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </Select>
        </Campo>
        <Campo etiqueta="Se vende por">
          <Select value={f.unidad} onChange={set('unidad')}>
            <option value="unidad">Unidad</option>
            <option value="kg">Kilo (se vende en gramos)</option>
          </Select>
        </Campo>
        <Campo etiqueta={f.unidad === 'kg' ? 'Costo por kg ($)' : 'Costo por unidad ($)'}>
          <Input inputMode="decimal" value={f.costo} onChange={set('costo')} />
        </Campo>
        <Campo etiqueta="Margen % (opcional)" ayuda="Vacío: usa el margen de la categoría o el global.">
          <Input inputMode="decimal" value={f.margen_pct} onChange={set('margen_pct')} />
        </Campo>
        <Campo etiqueta="Precio fijo ($, opcional)" ayuda="Si lo completás, ignora costo y margen.">
          <Input inputMode="decimal" value={f.precio_manual} onChange={set('precio_manual')} />
        </Campo>
        <Campo etiqueta={f.unidad === 'kg' ? 'Stock mínimo (kg)' : 'Stock mínimo (unidades)'}>
          <Input inputMode="decimal" value={f.stock_minimo} onChange={set('stock_minimo')} />
        </Campo>
        <Campo etiqueta="Descripción (opcional)">
          <Input value={f.descripcion} onChange={set('descripcion')} />
        </Campo>
        <label className="flex items-center gap-3 text-lg">
          <input type="checkbox" className="size-6" checked={f.visible_tienda} onChange={set('visible_tienda')} />
          Visible en la tienda online
        </label>
        <label className="flex items-center gap-3 text-lg">
          <input type="checkbox" className="size-6" checked={f.activo} onChange={set('activo')} />
          Activo (se puede vender)
        </label>
      </div>
      {producto.id && (
        <p className="mt-3 text-base text-stone-600">
          Precio actual: <b>{formatoPesos(producto.precio)}</b> · Stock: <b>{formatoCantidad(producto.stock, producto.unidad)}</b>{' '}
          (el stock se cambia desde Mercadería o Stock).
        </p>
      )}
      <div className="mt-4 space-y-3">
        <Mensaje>{error}</Mensaje>
        <div className="flex gap-2">
          <Boton onClick={guardar} disabled={guardando} className="flex-1">
            {guardando ? 'Guardando…' : 'Guardar'}
          </Boton>
          <Boton variante="secundario" onClick={onCerrar}>
            Cancelar
          </Boton>
        </div>
      </div>
    </Tarjeta>
  );
}

function Categorias({ categorias, onCambio }) {
  const [editando, setEditando] = useState(null);
  const [error, setError] = useState('');

  async function guardar() {
    if (!editando.nombre.trim()) {
      setError('Poné un nombre.');
      return;
    }
    const fila = {
      nombre: editando.nombre.trim(),
      margen_pct: aNumero(editando.margen_pct),
      orden: aNumero(editando.orden) ?? 0,
    };
    const { error } = editando.id
      ? await supabase.from('categorias').update(fila).eq('id', editando.id)
      : await supabase.from('categorias').insert(fila);
    if (error) {
      setError(mensajeDeError(error));
      return;
    }
    setError('');
    setEditando(null);
    onCambio();
  }

  async function borrar(c) {
    if (!window.confirm(`¿Borrar la categoría "${c.nombre}"?`)) return;
    const { error } = await supabase.from('categorias').delete().eq('id', c.id);
    if (error) setError(mensajeDeError(error));
    else onCambio();
  }

  return (
    <Tarjeta
      titulo="Categorías"
      acciones={
        <Boton
          className="min-h-11 text-base"
          onClick={() => setEditando({ nombre: '', margen_pct: '', orden: '' })}
        >
          + Nueva
        </Boton>
      }
    >
      <Mensaje onCerrar={() => setError('')}>{error}</Mensaje>
      {editando && (
        <div className="mb-4 grid gap-3 rounded-xl bg-stone-50 p-3 sm:grid-cols-3">
          <Campo etiqueta="Nombre">
            <Input value={editando.nombre} onChange={(e) => setEditando({ ...editando, nombre: e.target.value })} />
          </Campo>
          <Campo etiqueta="Margen % (opcional)" ayuda="Vacío: usa el global.">
            <Input
              inputMode="decimal"
              value={aTexto(editando.margen_pct)}
              onChange={(e) => setEditando({ ...editando, margen_pct: e.target.value })}
            />
          </Campo>
          <Campo etiqueta="Orden">
            <Input
              inputMode="numeric"
              value={aTexto(editando.orden)}
              onChange={(e) => setEditando({ ...editando, orden: e.target.value })}
            />
          </Campo>
          <div className="flex gap-2 sm:col-span-3">
            <Boton onClick={guardar} className="flex-1">
              Guardar
            </Boton>
            <Boton variante="secundario" onClick={() => setEditando(null)}>
              Cancelar
            </Boton>
          </div>
        </div>
      )}
      <Tabla
        filas={categorias}
        vacio="No hay categorías."
        columnas={[
          { titulo: 'Categoría', valor: (c) => c.nombre },
          {
            titulo: 'Margen %',
            valor: (c) => c.margen_pct,
            render: (c) => (c.margen_pct === null ? 'Global' : formatoNumero(c.margen_pct)),
            alinear: 'der',
          },
          {
            titulo: '',
            valor: () => '',
            render: (c) => (
              <div className="flex justify-end gap-2">
                <Boton variante="secundario" className="min-h-11 text-base" onClick={() => setEditando(c)}>
                  Editar
                </Boton>
                <Boton variante="peligro" className="min-h-11 text-base" onClick={() => borrar(c)}>
                  Borrar
                </Boton>
              </div>
            ),
          },
        ]}
      />
    </Tarjeta>
  );
}
