import ExcelJS from 'exceljs';
import type { LecturaFertirriego } from '../types/lectura';

export async function exportarExcelProfesional(datos: LecturaFertirriego[]) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'BlueBerryRiego';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Lecturas y Fertirriego', {
    views: [{ state: 'frozen', ySplit: 4 }],
  });

  // Título principal (Fila 1)
  sheet.mergeCells('A1:K1');
  const tituloCell = sheet.getCell('A1');
  tituloCell.value = 'REPORTE DE MONITOREO DE HUMEDAD Y FERTIRRIEGO - CULTIVO DE ARÁNDANOS';
  tituloCell.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  tituloCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E1B4B' } };
  tituloCell.alignment = { vertical: 'middle', horizontal: 'center' };
  sheet.getRow(1).height = 32;

  // Subtítulo con fecha de exportación (Fila 2)
  sheet.mergeCells('A2:K2');
  const subCell = sheet.getCell('A2');
  subCell.value = `Generado el: ${new Date().toLocaleString('es-PE')} | Total de registros: ${datos.length}`;
  subCell.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF334155' } };
  subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
  subCell.alignment = { vertical: 'middle', horizontal: 'center' };
  sheet.getRow(2).height = 20;

  // Fila 3 vacía de separación
  sheet.getRow(3).height = 10;

  // Encabezados de tabla (Fila 4)
  const encabezados = [
    'ID',
    'Fecha y Hora Lectura',
    'Parcela',
    'Variedad de Arándano',
    'Temp. Ambiente',
    'Código Sensor',
    'Estado Equipo',
    'Fecha y Hora Fertirriego',
    'Humedad (%)',
    'Estado de Riego',
    'Evidencia Fotográfica',
  ];

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

  // Filas de datos (desde Fila 5)
  datos.forEach((item, index) => {
    const rowNumber = index + 5;
    const row = sheet.getRow(rowNumber);
    row.height = 24;

    row.values = [
      item.id ?? '',
      new Date(item.fecha_hora_lectura).toLocaleString('es-PE', {
        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
      }),
      item.nombre_parcela,
      item.variedad_arandano,
      item.temperatura_ambiente,
      item.codigo_sensor,
      item.estado_equipo,
      new Date(item.fecha_hora_fertirriego).toLocaleString('es-PE', {
        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
      }),
      Number(item.lectura_humedad),
      item.estado_riego,
      item.foto_evidencia_url ? 'Ver Evidencia' : 'Sin foto',
    ];

    const fondoAlterno = index % 2 === 1 ? 'FFF8FAFC' : 'FFFFFFFF';

    row.eachCell((cell, colNumber) => {
      cell.font = { name: 'Calibri', size: 10.5, color: { argb: 'FF1E293B' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fondoAlterno } };
      cell.alignment = {
        vertical: 'middle',
        horizontal: [1, 2, 3, 6, 7, 8, 9, 10, 11].includes(colNumber) ? 'center' : 'left',
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      };

      // Formato numérico de Humedad (Columna 9)
      if (colNumber === 9) {
        cell.numFmt = '0.00" %"';
        cell.font = { name: 'Calibri', size: 10.5, bold: true, color: { argb: 'FF0F172A' } };
      }

      // Semáforo visual en Estado Equipo (Columna 7)
      if (colNumber === 7) {
        const esActivo = item.estado_equipo === 'Activo';
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

      // Semáforo visual en Estado de Riego (Columna 10)
      if (colNumber === 10) {
        const colores =
          item.estado_riego === 'Óptimo'
            ? { bg: 'FFD1FAE5', text: 'FF065F46' }
            : item.estado_riego === 'Alerta'
            ? { bg: 'FFFEF3C7', text: 'FF92400E' }
            : { bg: 'FFFFE4E6', text: 'FF9F1239' };

        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colores.bg } };
        cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: colores.text } };
      }

      // Hipervínculo clicable "Ver Evidencia" (Columna 11)
      if (colNumber === 11 && item.foto_evidencia_url) {
        cell.value = {
          text: 'Ver Evidencia',
          hyperlink: item.foto_evidencia_url,
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

  // Ajuste automático de ancho de cada columna con margen extra
  const anchos = [8, 22, 15, 22, 18, 16, 16, 22, 15, 18, 22];
  anchos.forEach((width, i) => {
    sheet.getColumn(i + 1).width = width;
  });

  // Descargar archivo .xlsx real
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