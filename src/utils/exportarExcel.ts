import ExcelJS from 'exceljs';
import type { LecturaFertirriego, PreguntaFormulario } from '../types/lectura';

const obtenerValorPregunta = (
  item: LecturaFertirriego,
  pregunta: PreguntaFormulario
): string | number | null | undefined => {
  if (pregunta.es_base) {
    const valor = item[pregunta.clave as keyof LecturaFertirriego];
    if (typeof valor === 'object') return null;
    return valor;
  }
  return item.respuestas_extra?.[pregunta.clave];
};

const formatearFechaExcel = (valor: unknown): string => {
  if (!valor) return '';
  const fecha = new Date(String(valor));
  if (Number.isNaN(fecha.getTime())) return String(valor);
  return fecha.toLocaleString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const calcularAnchoColumna = (pregunta: PreguntaFormulario): number => {
  if (pregunta.tipo === 'datetime' || pregunta.tipo === 'file') return 22;
  if (pregunta.clave === 'variedad_arandano') return 22;
  if (pregunta.clave === 'temperatura_ambiente' || pregunta.clave === 'estado_riego') return 18;
  return Math.max(16, Math.min(28, pregunta.etiqueta.length + 4));
};

export async function exportarExcelProfesional(
  datos: LecturaFertirriego[],
  preguntas: PreguntaFormulario[]
) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Agro Control';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Lecturas y Fertirriego', {
    views: [{ state: 'frozen', ySplit: 4 }],
  });

  const preguntasActivas = [...preguntas].filter((p) => p.activa);
  const basePreguntas = preguntasActivas
    .filter((p) => p.es_base)
    .sort((a, b) => a.orden - b.orden);
  const extraPreguntas = preguntasActivas
    .filter((p) => !p.es_base)
    .sort((a, b) => a.orden - b.orden);
  const columnasPreguntas = [...basePreguntas, ...extraPreguntas];
  const totalColumnas = 1 + columnasPreguntas.length;

  sheet.mergeCells(1, 1, 1, totalColumnas);
  const tituloCell = sheet.getCell('A1');
  tituloCell.value = 'REPORTE DE MONITOREO DE HUMEDAD Y FERTIRRIEGO - CULTIVO DE ARÁNDANOS';
  tituloCell.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  tituloCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E1B4B' } };
  tituloCell.alignment = { vertical: 'middle', horizontal: 'center' };
  sheet.getRow(1).height = 32;

  sheet.mergeCells(2, 1, 2, totalColumnas);
  const subCell = sheet.getCell('A2');
  subCell.value = `Generado el: ${new Date().toLocaleString('es-PE')} | Total de registros: ${datos.length}`;
  subCell.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF334155' } };
  subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
  subCell.alignment = { vertical: 'middle', horizontal: 'center' };
  sheet.getRow(2).height = 20;

  sheet.getRow(3).height = 10;

  const encabezados = ['ID', ...columnasPreguntas.map((p) => p.etiqueta)];

  const headerRow = sheet.getRow(4);
  headerRow.values = encabezados;
  headerRow.height = 28;

  headerRow.eachCell((cell) => {
    cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF312E81' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF1E1B4B' } },
      left: { style: 'thin', color: { argb: 'FF1E1B4B' } },
      bottom: { style: 'medium', color: { argb: 'FF1E1B4B' } },
      right: { style: 'thin', color: { argb: 'FF1E1B4B' } },
    };
  });

  datos.forEach((item, index) => {
    const rowNumber = index + 5;
    const row = sheet.getRow(rowNumber);
    row.height = 24;

    const valoresFila = columnasPreguntas.map((pregunta) => {
      const raw = obtenerValorPregunta(item, pregunta);

      if (pregunta.tipo === 'file' || pregunta.clave === 'foto_evidencia_url') {
        return typeof raw === 'string' && raw ? 'Ver Evidencia' : 'Sin foto';
      }
      if (pregunta.tipo === 'datetime') {
        return formatearFechaExcel(raw);
      }
      if (pregunta.clave === 'lectura_humedad' || pregunta.tipo === 'number') {
        if (raw === null || raw === undefined || raw === '') return '';
        const numero = Number(raw);
        return Number.isNaN(numero) ? String(raw) : numero;
      }
      return raw ?? '';
    });

    row.values = [item.id ?? '', ...valoresFila];

    const fondoAlterno = index % 2 === 1 ? 'FFF8FAFC' : 'FFFFFFFF';

    row.eachCell((cell, colNumber) => {
      const pregunta = colNumber > 1 ? columnasPreguntas[colNumber - 2] : undefined;
      const esIzquierda =
        pregunta &&
        (pregunta.clave === 'variedad_arandano' ||
          pregunta.clave === 'temperatura_ambiente' ||
          (!pregunta.es_base && pregunta.tipo === 'text'));

      cell.font = { name: 'Calibri', size: 10.5, color: { argb: 'FF1E293B' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fondoAlterno } };
      cell.alignment = {
        vertical: 'middle',
        horizontal: esIzquierda ? 'left' : 'center',
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      };

      if (!pregunta) return;

      const raw = obtenerValorPregunta(item, pregunta);

      if (pregunta.clave === 'lectura_humedad') {
        cell.numFmt = '0.00" %"';
        cell.font = { name: 'Calibri', size: 10.5, bold: true, color: { argb: 'FF0F172A' } };
      }

      if (pregunta.clave === 'estado_equipo') {
        const esActivo = raw === 'Activo';
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: esActivo ? 'FFD1FAE5' : 'FFE2E8F0' },
        };
        cell.font = {
          name: 'Calibri',
          size: 10,
          bold: true,
          color: { argb: esActivo ? 'FF065F46' : 'FF475569' },
        };
      }

      if (pregunta.clave === 'estado_riego') {
        const colores =
          raw === 'Óptimo'
            ? { bg: 'FFD1FAE5', text: 'FF065F46' }
            : raw === 'Alerta'
            ? { bg: 'FFFEF3C7', text: 'FF92400E' }
            : raw === 'Estrés hídrico'
            ? { bg: 'FFFFE4E6', text: 'FF9F1239' }
            : { bg: 'FFE2E8F0', text: 'FF334155' };

        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colores.bg } };
        cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: colores.text } };
      }

      if (
        (pregunta.tipo === 'file' || pregunta.clave === 'foto_evidencia_url') &&
        typeof raw === 'string' &&
        raw
      ) {
        cell.value = {
          text: 'Ver Evidencia',
          hyperlink: raw,
          tooltip: 'Clic para abrir la fotografía en el navegador',
        };
        cell.font = {
          name: 'Calibri',
          size: 10.5,
          bold: true,
          underline: true,
          color: { argb: 'FF2563EB' },
        };
      }
    });
  });

  const anchos = [8, ...columnasPreguntas.map(calcularAnchoColumna)];
  anchos.forEach((width, i) => {
    sheet.getColumn(i + 1).width = width;
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Reporte_Arandanos_${new Date().toISOString().slice(0, 10)}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
