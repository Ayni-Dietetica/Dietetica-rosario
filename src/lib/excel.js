import writeExcelFile from 'write-excel-file/browser';

// columnas: [{ titulo, valor: (fila) => string | number | null, ancho? }]
export async function exportarExcel(nombreArchivo, columnas, filas) {
  const encabezado = columnas.map((c) => ({ value: c.titulo, fontWeight: 'bold' }));
  const datos = filas.map((fila) =>
    columnas.map((c) => {
      const v = c.valor(fila);
      return { value: v === undefined ? null : v };
    }),
  );
  const hoy = new Date().toISOString().slice(0, 10);
  await writeExcelFile([encabezado, ...datos], {
    columns: columnas.map((c) => ({ width: c.ancho ?? 18 })),
  }).toFile(`${nombreArchivo}-${hoy}.xlsx`);
}
