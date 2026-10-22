import { useEffect, useState } from 'react';
import { Boton, Campo, Input, Mensaje, Tarjeta } from '../components/ui';
import { aNumero, formatoNumero, formatoPesos } from '../lib/formato';
import { mensajeDeError, supabase } from '../lib/supabase';

// Margen global y redondeo (tabla config) + recalcular_precios para aplicarlos.
export default function Configuracion() {
  const [margen, setMargen] = useState('');
  const [redondeo, setRedondeo] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');

  useEffect(() => {
    supabase
      .from('config')
      .select('clave, valor')
      .in('clave', ['margen_global_pct', 'redondeo'])
      .then(({ data, error }) => {
        if (error) {
          setError(mensajeDeError(error));
          return;
        }
        const valor = (clave) => String(data.find((c) => c.clave === clave)?.valor ?? '');
        setMargen(valor('margen_global_pct'));
        setRedondeo(valor('redondeo'));
      });
  }, []);

  async function guardar() {
    const m = aNumero(margen);
    const r = aNumero(redondeo);
    if (m === null || m < 0 || r === null || r < 0) {
      setError('Revisá los valores: tienen que ser números iguales o mayores a cero.');
      return;
    }
    setError('');
    setOk('');
    setGuardando(true);
    const res = await Promise.all([
      supabase.from('config').update({ valor: m }).eq('clave', 'margen_global_pct'),
      supabase.from('config').update({ valor: r }).eq('clave', 'redondeo'),
    ]);
    const err = res.find((x) => x.error)?.error;
    if (err) {
      setGuardando(false);
      setError(mensajeDeError(err));
      return;
    }
    const { error } = await supabase.rpc('recalcular_precios');
    setGuardando(false);
    if (error) setError(`Se guardó la configuración pero no se pudieron recalcular los precios: ${mensajeDeError(error)}`);
    else setOk('Configuración guardada y precios recalculados.');
  }

  const m = aNumero(margen) ?? 0;
  const r = aNumero(redondeo) ?? 0;
  const ejemplo = 1000 * (1 + m / 100);
  const ejemploRedondeado = r > 0 ? Math.ceil(ejemplo / r) * r : ejemplo;

  return (
    <Tarjeta titulo="Margen y redondeo de precios">
      <div className="grid gap-3 sm:grid-cols-2">
        <Campo etiqueta="Margen global (%)" ayuda="Se usa cuando el producto y su categoría no tienen margen propio.">
          <Input inputMode="decimal" value={margen} onChange={(e) => setMargen(e.target.value)} />
        </Campo>
        <Campo etiqueta="Redondear precios a múltiplos de ($)" ayuda="Siempre para arriba. 0 = sin redondeo.">
          <Input inputMode="decimal" value={redondeo} onChange={(e) => setRedondeo(e.target.value)} />
        </Campo>
      </div>
      <p className="mt-3 rounded-xl bg-stone-50 p-3 text-base text-stone-700">
        Ejemplo: un producto que cuesta {formatoPesos(1000)} con {formatoNumero(m)}% de margen se vende a{' '}
        <b>{formatoPesos(ejemploRedondeado)}</b>.
      </p>
      <div className="mt-4 space-y-3">
        <Mensaje onCerrar={() => setError('')}>{error}</Mensaje>
        <Mensaje tipo="ok">{ok}</Mensaje>
        <Boton className="w-full" disabled={guardando} onClick={guardar}>
          {guardando ? 'Guardando…' : 'Guardar y recalcular precios'}
        </Boton>
      </div>
    </Tarjeta>
  );
}
