import { useMemo, useState } from 'react';
import { exportarExcel } from '../lib/excel';
import { formatoCantidad } from '../lib/formato';

const VARIANTES = {
  primario: 'bg-emerald-700 text-white active:bg-emerald-800 disabled:bg-emerald-300',
  secundario: 'bg-white text-stone-800 border-2 border-stone-300 active:bg-stone-100 disabled:opacity-50',
  peligro: 'bg-red-600 text-white active:bg-red-700 disabled:bg-red-300',
};

export function Boton({ variante = 'primario', className = '', ...props }) {
  return (
    <button
      type="button"
      className={`min-h-14 rounded-xl px-5 text-lg font-semibold ${VARIANTES[variante]} ${className}`}
      {...props}
    />
  );
}

export function Campo({ etiqueta, ayuda, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-base font-medium text-stone-700">{etiqueta}</span>
      {children}
      {ayuda && <span className="mt-1 block text-sm text-stone-500">{ayuda}</span>}
    </label>
  );
}

const claseInput =
  'w-full min-h-14 rounded-xl border-2 border-stone-300 bg-white px-4 text-lg focus:border-emerald-600 focus:outline-none';

export function Input({ className = '', ...props }) {
  return <input className={`${claseInput} ${className}`} {...props} />;
}

export function Select({ className = '', children, ...props }) {
  return (
    <select className={`${claseInput} ${className}`} {...props}>
      {children}
    </select>
  );
}

export function Tarjeta({ titulo, acciones, children, className = '' }) {
  return (
    <section className={`rounded-2xl bg-white p-4 shadow-sm ${className}`}>
      {(titulo || acciones) && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          {titulo && <h2 className="text-xl font-bold text-stone-800">{titulo}</h2>}
          {acciones}
        </div>
      )}
      {children}
    </section>
  );
}

export function Mensaje({ tipo = 'error', children, onCerrar }) {
  if (!children) return null;
  const estilos =
    tipo === 'ok'
      ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
      : 'bg-red-50 text-red-900 border-red-300';
  return (
    <div className={`flex items-start justify-between gap-3 rounded-xl border-2 p-3 text-base ${estilos}`}>
      <span>{children}</span>
      {onCerrar && (
        <button type="button" onClick={onCerrar} className="px-2 text-xl leading-none" aria-label="Cerrar">
          ×
        </button>
      )}
    </div>
  );
}

// Tabla simple con scroll horizontal. columnas: [{ titulo, valor, render?, alinear? }]
export function Tabla({ columnas, filas, vacio = 'No hay datos.', clave = 'id' }) {
  if (!filas.length) return <p className="py-4 text-center text-stone-500">{vacio}</p>;
  return (
    <div className="-mx-4 overflow-x-auto px-4">
      <table className="w-full min-w-max text-base">
        <thead>
          <tr className="border-b-2 border-stone-200 text-left text-stone-600">
            {columnas.map((c) => (
              <th key={c.titulo} className={`px-2 py-2 font-semibold ${c.alinear === 'der' ? 'text-right' : ''}`}>
                {c.titulo}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filas.map((f, i) => (
            <tr key={f[clave] ?? i} className="border-b border-stone-100">
              {columnas.map((c) => (
                <td key={c.titulo} className={`px-2 py-2 ${c.alinear === 'der' ? 'text-right tabular-nums' : ''}`}>
                  {c.render ? c.render(f) : c.valor(f)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function BotonExcel({ nombre, columnas, filas }) {
  const [exportando, setExportando] = useState(false);
  return (
    <Boton
      variante="secundario"
      className="min-h-11 text-base"
      disabled={!filas.length || exportando}
      onClick={async () => {
        setExportando(true);
        try {
          await exportarExcel(nombre, columnas, filas);
        } finally {
          setExportando(false);
        }
      }}
    >
      {exportando ? 'Exportando…' : 'Exportar a Excel'}
    </Boton>
  );
}

// Buscador de productos: muestra resultados como botones y devuelve el elegido.
export function SelectorProducto({ productos, seleccionado, onElegir }) {
  const [texto, setTexto] = useState('');
  const resultados = useMemo(() => {
    const t = texto.trim().toLowerCase();
    if (!t) return [];
    return productos
      .filter((p) => p.nombre.toLowerCase().includes(t) || (p.codigo ?? '').toLowerCase().includes(t))
      .slice(0, 8);
  }, [texto, productos]);

  if (seleccionado) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-xl border-2 border-emerald-600 bg-emerald-50 p-3">
        <div>
          <div className="text-lg font-semibold">{seleccionado.nombre}</div>
          <div className="text-sm text-stone-600">
            Stock: {formatoCantidad(seleccionado.stock, seleccionado.unidad)} · por {seleccionado.unidad}
          </div>
        </div>
        <Boton variante="secundario" className="min-h-11 text-base" onClick={() => onElegir(null)}>
          Cambiar
        </Boton>
      </div>
    );
  }

  return (
    <div>
      <Input placeholder="Buscar producto por nombre o código" value={texto} onChange={(e) => setTexto(e.target.value)} />
      {resultados.length > 0 && (
        <div className="mt-2 grid gap-2">
          {resultados.map((p) => (
            <button
              type="button"
              key={p.id}
              onClick={() => {
                onElegir(p);
                setTexto('');
              }}
              className="min-h-12 rounded-xl border-2 border-stone-200 bg-white px-4 py-2 text-left text-lg active:bg-stone-100"
            >
              {p.nombre}
              <span className="ml-2 text-sm text-stone-500">({formatoCantidad(p.stock, p.unidad)})</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
