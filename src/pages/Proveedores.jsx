import { useCallback, useEffect, useState } from 'react';
import { Boton, BotonExcel, Campo, Input, Mensaje, Tabla, Tarjeta } from '../components/ui';
import { mensajeDeError, supabase } from '../lib/supabase';

const VACIO = { nombre: '', telefono: '', notas: '', activo: true };

export default function Proveedores() {
  const [proveedores, setProveedores] = useState([]);
  const [editando, setEditando] = useState(null);
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    const { data, error } = await supabase.from('proveedores').select('*').order('nombre');
    if (error) setError(mensajeDeError(error));
    else setProveedores(data);
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function guardar() {
    if (!editando.nombre.trim()) {
      setError('Poné un nombre.');
      return;
    }
    const fila = {
      nombre: editando.nombre.trim(),
      telefono: editando.telefono?.trim() || null,
      notas: editando.notas?.trim() || null,
      activo: editando.activo,
    };
    const { error } = editando.id
      ? await supabase.from('proveedores').update(fila).eq('id', editando.id)
      : await supabase.from('proveedores').insert(fila);
    if (error) {
      setError(mensajeDeError(error));
      return;
    }
    setError('');
    setEditando(null);
    cargar();
  }

  const columnas = [
    {
      titulo: 'Proveedor',
      valor: (p) => p.nombre,
      render: (p) => <span className={p.activo ? '' : 'text-stone-400 line-through'}>{p.nombre}</span>,
    },
    {
      titulo: 'Teléfono',
      valor: (p) => p.telefono ?? '',
      render: (p) =>
        p.telefono ? (
          <a className="text-emerald-800 underline" href={`tel:${p.telefono}`}>
            {p.telefono}
          </a>
        ) : (
          ''
        ),
    },
    { titulo: 'Notas', valor: (p) => p.notas ?? '' },
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

  return (
    <Tarjeta
      titulo="Proveedores"
      acciones={
        <div className="flex gap-2">
          <BotonExcel nombre="proveedores" columnas={columnas.filter((c) => c.titulo)} filas={proveedores} />
          <Boton className="min-h-11 text-base" onClick={() => setEditando(VACIO)}>
            + Nuevo
          </Boton>
        </div>
      }
    >
      <Mensaje onCerrar={() => setError('')}>{error}</Mensaje>
      {editando && (
        <div className="mb-4 grid gap-3 rounded-xl bg-stone-50 p-3 sm:grid-cols-2">
          <Campo etiqueta="Nombre">
            <Input value={editando.nombre} onChange={(e) => setEditando({ ...editando, nombre: e.target.value })} />
          </Campo>
          <Campo etiqueta="Teléfono">
            <Input
              type="tel"
              value={editando.telefono ?? ''}
              onChange={(e) => setEditando({ ...editando, telefono: e.target.value })}
            />
          </Campo>
          <Campo etiqueta="Notas">
            <Input value={editando.notas ?? ''} onChange={(e) => setEditando({ ...editando, notas: e.target.value })} />
          </Campo>
          <label className="flex items-center gap-3 text-lg">
            <input
              type="checkbox"
              className="size-6"
              checked={editando.activo}
              onChange={(e) => setEditando({ ...editando, activo: e.target.checked })}
            />
            Activo
          </label>
          <div className="flex gap-2 sm:col-span-2">
            <Boton onClick={guardar} className="flex-1">
              Guardar
            </Boton>
            <Boton variante="secundario" onClick={() => setEditando(null)}>
              Cancelar
            </Boton>
          </div>
        </div>
      )}
      <Tabla columnas={columnas} filas={proveedores} vacio="No hay proveedores cargados." />
    </Tarjeta>
  );
}
