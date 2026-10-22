import { useEffect, useState } from 'react';
import { Boton, BotonExcel, Campo, Input, Mensaje, Select, Tabla, Tarjeta } from '../components/ui';
import { aNumero, formatoNumero, formatoPesos } from '../lib/formato';
import { mensajeDeError, supabase } from '../lib/supabase';

// Aumento masivo de costos: primero vista previa (p_aplicar = false) y después confirmar.
export default function Aumento() {
  const [categorias, setCategorias] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [pct, setPct] = useState('');
  const [proveedorId, setProveedorId] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [vista, setVista] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');

  useEffect(() => {
    Promise.all([
      supabase.from('categorias').select('id, nombre').order('nombre'),
      supabase.from('proveedores').select('id, nombre').eq('activo', true).order('nombre'),
    ]).then(([c, v]) => {
      const err = c.error || v.error;
      if (err) setError(mensajeDeError(err));
      setCategorias(c.data ?? []);
      setProveedores(v.data ?? []);
    });
  }, []);

  function parametros(aplicar) {
    return {
      p_pct: aNumero(pct),
      p_proveedor: proveedorId || null,
      p_categoria: categoriaId || null,
      p_aplicar: aplicar,
    };
  }

  async function verPrevia() {
    const n = aNumero(pct);
    if (n === null || n === 0) {
      setError('Poné el porcentaje de aumento (puede ser negativo para bajar).');
      return;
    }
    setError('');
    setOk('');
    setCargando(true);
    const { data, error } = await supabase.rpc('aumento_masivo', parametros(false));
    setCargando(false);
    if (error) setError(mensajeDeError(error));
    else setVista({ filas: data, params: parametros(true) });
  }

  async function aplicar() {
    if (!window.confirm(`¿Aplicar ${formatoNumero(vista.params.p_pct)}% a ${vista.filas.length} producto(s)?`)) return;
    setCargando(true);
    const { error } = await supabase.rpc('aumento_masivo', vista.params);
    setCargando(false);
    if (error) {
      setError(mensajeDeError(error));
      return;
    }
    setOk(`Listo: se actualizaron ${vista.filas.length} producto(s).`);
    setVista(null);
    setPct('');
  }

  // Cualquier cambio en los filtros invalida la vista previa.
  const cambiar = (setter) => (e) => {
    setter(e.target.value);
    setVista(null);
  };

  const columnas = [
    { titulo: 'Producto', valor: (f) => f.nombre },
    { titulo: 'Costo antes', valor: (f) => Number(f.costo_antes), render: (f) => formatoPesos(f.costo_antes), alinear: 'der' },
    { titulo: 'Costo nuevo', valor: (f) => Number(f.costo_despues), render: (f) => formatoPesos(f.costo_despues), alinear: 'der' },
    { titulo: 'Precio antes', valor: (f) => Number(f.precio_antes), render: (f) => formatoPesos(f.precio_antes), alinear: 'der' },
    {
      titulo: 'Precio nuevo',
      valor: (f) => Number(f.precio_despues),
      render: (f) => <b>{formatoPesos(f.precio_despues)}</b>,
      alinear: 'der',
    },
  ];

  return (
    <div className="space-y-4">
      <Tarjeta titulo="Aumento masivo de costos">
        <div className="grid gap-3 sm:grid-cols-3">
          <Campo etiqueta="Aumento %">
            <Input inputMode="decimal" value={pct} onChange={cambiar(setPct)} placeholder="Ej: 8" />
          </Campo>
          <Campo etiqueta="Proveedor">
            <Select value={proveedorId} onChange={cambiar(setProveedorId)}>
              <option value="">Todos</option>
              {proveedores.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </Select>
          </Campo>
          <Campo etiqueta="Categoría">
            <Select value={categoriaId} onChange={cambiar(setCategoriaId)}>
              <option value="">Todas</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </Select>
          </Campo>
        </div>
        <div className="mt-4 space-y-3">
          <Mensaje onCerrar={() => setError('')}>{error}</Mensaje>
          <Mensaje tipo="ok">{ok}</Mensaje>
          <Boton variante="secundario" className="w-full" disabled={cargando} onClick={verPrevia}>
            {cargando && !vista ? 'Calculando…' : 'Ver vista previa'}
          </Boton>
        </div>
      </Tarjeta>

      {vista && (
        <Tarjeta
          titulo={`Vista previa: ${vista.filas.length} producto(s)`}
          acciones={<BotonExcel nombre="aumento-vista-previa" columnas={columnas} filas={vista.filas} />}
        >
          <Tabla columnas={columnas} filas={vista.filas} clave="producto_id" vacio="Ningún producto coincide." />
          {vista.filas.length > 0 && (
            <Boton className="mt-4 w-full" disabled={cargando} onClick={aplicar}>
              {cargando ? 'Aplicando…' : 'Confirmar y aplicar'}
            </Boton>
          )}
        </Tarjeta>
      )}
    </div>
  );
}
