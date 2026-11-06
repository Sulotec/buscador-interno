import type { Archivo } from '@/lib/api';

export async function combinarExcels(archivos: Archivo[]): Promise<Archivo> {
  if (!archivos.length) throw new Error('No hay bloques de Excel para consolidar.');
  if (archivos.length === 1) return archivos[0];

  const { default: ExcelJS } = await import('exceljs');
  const cargarLibro = async (archivo: Archivo, numeroBloque: number) => {
    const bytes = await archivo.blob.arrayBuffer();
    const encabezado = new Uint8Array(bytes, 0, Math.min(bytes.byteLength, 2));
    if (encabezado[0] !== 0x50 || encabezado[1] !== 0x4b) {
      throw new Error(`El bloque ${numeroBloque} no devolvió un archivo Excel válido.`);
    }

    const libro = new ExcelJS.Workbook();
    try {
      const { default: JSZip } = await import('jszip');
      const zip = await JSZip.loadAsync(bytes);
      for (const [nombre, entrada] of Object.entries(zip.files)) {
        if (entrada.dir || !nombre.endsWith('.xml')) continue;
        const xml = await entrada.async('string');
        let xmlNormalizado = xml;
        if (nombre === 'docProps/app.xml') {
          xmlNormalizado = xml.replace(/<(\/?)([\w.-]+):([\w.-]+)(?=[\s/>])/g, '<$1$3');
        } else {
          const namespace = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
          const namespaceRegex = namespace.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const declaracion = xml.match(new RegExp(`\\sxmlns:([\\w.-]+)=(["'])${namespaceRegex}\\2`));
          if (declaracion) {
            const prefijo = declaracion[1].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            xmlNormalizado = xml
              .replace(new RegExp(`<(/?)${prefijo}:`, 'g'), '<$1')
              .replace(new RegExp(`\\sxmlns:${prefijo}=(["'])${namespaceRegex}\\1`), ` xmlns="${namespace}"`);
          }
        }
        if (xmlNormalizado !== xml) zip.file(nombre, xmlNormalizado);
      }
      await libro.xlsx.load(await zip.generateAsync({ type: 'arraybuffer' }));
    } catch (error) {
      // El detalle técnico (en inglés, de la librería) va a la consola; al usuario solo el mensaje claro
      console.error(`Excel del bloque ${numeroBloque}:`, error);
      throw new Error(`No se pudo leer el Excel del bloque ${numeroBloque}. Vuelve a procesar la carga; si se repite, avisa al administrador.`);
    }
    if (!libro.worksheets.length) {
      throw new Error(`El Excel del bloque ${numeroBloque} no contiene hojas de cálculo.`);
    }
    return libro;
  };

  const principal = await cargarLibro(archivos[0], 1);

  for (const [indice, archivo] of archivos.slice(1).entries()) {
    const parcial = await cargarLibro(archivo, indice + 2);

    for (const hojaParcial of parcial.worksheets) {
      const hojaFinal = principal.getWorksheet(hojaParcial.name);
      if (!hojaFinal) {
        throw new Error(`No se encontró la hoja «${hojaParcial.name}» al consolidar los bloques.`);
      }

      if (hojaParcial.name === 'Resumen') {
        for (let numeroFila = 3; numeroFila <= hojaParcial.rowCount; numeroFila++) {
          const celdaFinal = hojaFinal.getCell(numeroFila, 2);
          const valorFinal = typeof celdaFinal.value === 'number' ? celdaFinal.value : 0;
          const valorParcial = hojaParcial.getCell(numeroFila, 2).value;
          if (typeof valorParcial === 'number') celdaFinal.value = valorFinal + valorParcial;
        }
        continue;
      }

      for (let numeroFila = 2; numeroFila <= hojaParcial.rowCount; numeroFila++) {
        const filaParcial = hojaParcial.getRow(numeroFila);
        const filaFinal = hojaFinal.addRow([]);
        filaFinal.height = filaParcial.height;
        filaParcial.eachCell({ includeEmpty: true }, (celdaParcial, columna) => {
          const celdaFinal = filaFinal.getCell(columna);
          celdaFinal.value = celdaParcial.value;
          celdaFinal.style = structuredClone(celdaParcial.style);
        });
      }
    }
  }

  const contenido = await principal.xlsx.writeBuffer();
  return {
    blob: new Blob([new Uint8Array(contenido)], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
    nombre: archivos[0].nombre,
  };
}
