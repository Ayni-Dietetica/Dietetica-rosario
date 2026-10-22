import { useCallback, useEffect, useState } from 'react';
import { Boton, Campo, Input, Mensaje, SelectorProducto, Tarjeta } from '../components/ui';
import { aNumero, formatoCantidad } from '../lib/formato';
import { mensajeDeError, supabase } from '../lib/supabase';

// Ajustes de stock: siempre por la RPC ajustar_stock (cantidad con signo).
const TIPOS = [
  { valor: 'ajuste', etiqueta: 'Ajuste / conteo', signo: null },
  { valor: 'merma', etiqueta: 'Merma', signo: -1 },
  { valor: 'rotura', etiqueta: 'Rotura', signo: -1 },
  { valor: 'vencimiento', etiqueta: 'Vencimiento', signo: -1 },
  { valor: 'devolucion', etiqueta: 'Devolución', signo: 1 },
];

export default function Ajustes() {
  const [productos, setProductos] = useState([]);
  const [producto, setProducto] = useState(null);
  const [tipo, setTipo] = useState('merma');
  const [sentido, setSentido] = useState(-1);
  const [cantidad, setCantidad] = useState('');
  const [motivo, setMotivo] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');

  const cargar = useCallback(async () => {
    const { data, error } = await supabase
      .from('productos')
      .select('id, codigo, nombre, unidad, stock')
      .eq('activo', true)
      .order('nombre');
    if (error) setError(mensajeDeError(error));
    else setProductos(data);
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  function elegirTipo(t) {
    setTipo(t.valor);
    if (t.signo) setSentido(t.signo);
  }

  const esKg = producto?.unidad === 'kg';

  async function guardar() {
    const n = aNumero(cantidad);
    if (!(n > 0)) {
      setError('Poné una cantidad mayor a cero.');
      return;
    }
    // En kg se carga en gramos, igual que en la venta.
    const delta = sentido * (esKg ? n / 1000 : n);
    setError('');
    setOk('');
    setGuardando(true);
    const { error } = await supabase.rpc('ajustar_stock', {
      p_producto: producto.id,
      p_cantidad: delta,
      p_tipo: tipo,
      p_motivo: motivo.trim() || null,
    });
    setGuardando(false);
    if (error) {
      setError(mensajeDeError(error));
      return;
    }
    setOk(
      `Stock de ${producto.nombre}: ${sentido > 0 ? 'sumado' : 'restado'} ${formatoCantidad(Math.abs(delta), producto.unidad)}. ` +
        `Queda ${formatoCantidad(Number(producto.stock) + delta, producto.unidad)}.`,
    );
    setProducto(null);
    setCantidad('');
    setMotivo('');
    cargar();
  }

  return (
    <Tarjeta titulo="Ajuste de stock">
      <div className="space-y-4">
        <SelectorProducto
          productos={productos}
          seleccionado={producto}
          onElegir={(p) => {
            setProducto(p);
            setOk('');
          }}
        />

        {producto && (
          <>
            <div>
              <span className="mb-2 block text-base font-medium text-stone-700">Tipo</span>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                {TIPOS.map((t) => (
                  <button
                    type="button"
                    key={t.valor}
                    onClick={() => elegirTipo(t)}
                    className={`min-h-12 rounded-xl border-2 text-base font-semibold ${
                      tipo === t.valor ? 'border-emerald-700 bg-emerald-700 text-white' : 'border-stone-300 bg-white'
                    }`}
                  >
                    {t.etiqueta}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {[
                { valor: -1, etiqueta: '− Restar' },
                { valor: 1, etiqueta: '+ Sumar' },
              ].map((s) => (
                <button
                  type="button"
                  key={s.valor}
                  onClick={() => setSentido(s.valor)}
                  className={`min-h-14 rounded-xl border-2 text-lg font-semibold ${
                    sentido === s.valor
                      ? s.valor < 0
                        ? 'border-red-600 bg-red-600 text-white'
                        : 'border-emerald-700 bg-emerald-700 text-white'
                      : 'border-stone-300 bg-white'
                  }`}
                >
                  {s.etiqueta}
                </button>
              ))}
            </div>

            <Campo etiqueta={`Cantidad (${esKg ? 'gramos' : 'unidades'})`}>
              <Input inputMode="decimal" value={cantidad} onChange={(e) => setCantidad(e.target.value)} />
            </Campo>
            <Campo etiqueta="Motivo (opcional)">
              <Input value={motivo} onChange={(e) => setMotivo(e.target.value)} />
            </Campo>
          </>
        )}

        <Mensaje onCerrar={() => setError('')}>{error}</Mensaje>
        <Mensaje tipo="ok">{ok}</Mensaje>
        {producto && (
          <Boton className="w-full" disabled={guardando} onClick={guardar}>
            {guardando ? 'Guardando…' : 'Guardar ajuste'}
          </Boton>
        )}
      </div>
    </Tarjeta>
  );
}
