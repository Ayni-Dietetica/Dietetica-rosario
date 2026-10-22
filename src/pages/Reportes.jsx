import { useEffect, useState } from 'react';
import { BotonExcel, Mensaje, Tabla, Tarjeta } from '../components/ui';
import { formatoFecha, formatoNumero, formatoPesos } from '../lib/formato';
import { mensajeDeError, supabase } from '../lib/supabase';

const REPORTES = [
  {
    id: 'reponer',
    titulo: 'Para reponer',
    vista: 'v_reponer',
    orden: 'nombre',
    columnas: [
      { titulo: 'Producto', valor: (f) => f.nombre },
      { titulo: 'Proveedor', valor: (f) => f.proveedor ?? '' },
      { titulo: 'Stock', valor: (f) => Number(f.stock), render: (f) => formatoNumero(f.stock), alinear: 'der' },
      {
        titulo: 'Mínimo',
        valor: (f) => Number(f.stock_minimo),
        render: (f) => formatoNumero(f.stock_minimo),
        alinear: 'der',
      },
    ],
  },
  {
    id: 'vencer',
    titulo: 'Por vencer',
    vista: 'v_por_vencer',
    orden: 'vencimiento',
    columnas: [
      { titulo: 'Producto', valor: (f) => f.nombre },
      { titulo: 'Vence', valor: (f) => formatoFecha(f.vencimiento) },
      {
        titulo: 'Días',
        valor: (f) => f.dias,
        render: (f) => <span className={f.dias <= 7 ? 'font-bold text-red-700' : ''}>{f.dias}</span>,
        alinear: 'der',
      },
      {
        titulo: 'Cantidad',
        valor: (f) => Number(f.cantidad_restante),
        render: (f) => formatoNumero(f.cantidad_restante),
        alinear: 'der',
      },
    ],
  },
  {
    id: 'diarias',
    titulo: 'Ventas por día',
    vista: 'v_ventas_diarias',
    orden: 'dia',
    descendente: true,
    columnas: [
      { titulo: 'Día', valor: (f) => formatoFecha(f.dia) },
      { titulo: 'Ventas', valor: (f) => Number(f.ventas), alinear: 'der' },
      {
        titulo: 'Facturado',
        valor: (f) => Number(f.facturado),
        render: (f) => formatoPesos(f.facturado),
        alinear: 'der',
      },
      {
        titulo: 'Ganancia',
        valor: (f) => Number(f.ganancia),
        render: (f) => formatoPesos(f.ganancia),
        alinear: 'der',
      },
    ],
  },
];

export default function Reportes() {
  const [actual, setActual] = useState(REPORTES[0].id);
  const [filas, setFilas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const reporte = REPORTES.find((r) => r.id === actual);

  useEffect(() => {
    let cancelado = false;
    setCargando(true);
    setError('');
    supabase
      .from(reporte.vista)
      .select('*')
      .order(reporte.orden, { ascending: !reporte.descendente })
      .then(({ data, error }) => {
        if (cancelado) return;
        setCargando(false);
        if (error) {
          setError(mensajeDeError(error));
          setFilas([]);
        } else setFilas(data);
      });
    return () => {
      cancelado = true;
    };
  }, [reporte]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        {REPORTES.map((r) => (
          <button
            type="button"
            key={r.id}
            onClick={() => setActual(r.id)}
            className={`min-h-12 rounded-xl border-2 text-base font-semibold ${
              r.id === actual ? 'border-emerald-700 bg-emerald-700 text-white' : 'border-stone-300 bg-white'
            }`}
          >
            {r.titulo}
          </button>
        ))}
      </div>
      <Tarjeta
        titulo={reporte.titulo}
        acciones={<BotonExcel nombre={reporte.vista.replace('v_', '')} columnas={reporte.columnas} filas={filas} />}
      >
        <Mensaje>{error}</Mensaje>
        {cargando ? (
          <p className="py-4 text-center text-stone-500">Cargando…</p>
        ) : (
          <Tabla columnas={reporte.columnas} filas={filas} clave={null} vacio="Nada para mostrar." />
        )}
      </Tarjeta>
    </div>
  );
}
