const pesosEnteros = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
const pesosConCentavos = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2 });

const numero = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 3 });

export function formatoPesos(valor) {
  const n = Math.round((Number(valor) || 0) * 100) / 100;
  return (Number.isInteger(n) ? pesosEnteros : pesosConCentavos).format(n);
}

export function formatoNumero(valor) {
  return numero.format(Number(valor) || 0);
}

// Cantidad en la unidad del producto: kg se muestra en g si es menos de 1 kg.
export function formatoCantidad(cantidad, unidad) {
  const n = Number(cantidad) || 0;
  if (unidad === 'kg') {
    return Math.abs(n) < 1 ? `${numero.format(Math.round(n * 1000))} g` : `${numero.format(n)} kg`;
  }
  return `${numero.format(n)} u.`;
}

export function formatoFecha(fecha) {
  if (!fecha) return '';
  const [a, m, d] = String(fecha).slice(0, 10).split('-');
  return `${d}/${m}/${a}`;
}

// Convierte el texto de un input numérico (acepta coma decimal) a número.
export function aNumero(texto) {
  if (texto === null || texto === undefined || texto === '') return null;
  const n = Number(String(texto).trim().replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

export const MEDIOS_PAGO = [
  { valor: 'efectivo', etiqueta: 'Efectivo' },
  { valor: 'transferencia', etiqueta: 'Transferencia' },
  { valor: 'debito', etiqueta: 'Débito' },
  { valor: 'credito', etiqueta: 'Crédito' },
  { valor: 'qr', etiqueta: 'QR' },
  { valor: 'otro', etiqueta: 'Otro' },
];
