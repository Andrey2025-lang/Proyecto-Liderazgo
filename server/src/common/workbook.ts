import { Workbook, CellValue } from 'exceljs';

export type ExportColumn = { key: string; title: string; width?: number; format?: string };
export const CRC_FORMAT = '"₡"#,##0.00;[Red]-"₡"#,##0.00';
export const DATE_FORMAT = 'dd/mm/yyyy';
export const DATETIME_FORMAT = 'dd/mm/yyyy hh:mm';

export function localExcelDate(value?: string | Date | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Costa_Rica', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).format(date);
  return new Date(parts.replace(' ', 'T') + 'Z');
}

export function createWorkbook() {
  const workbook = new Workbook();
  workbook.creator = 'Préstamos J&C · JyC Digital';
  workbook.created = new Date();
  workbook.subject = 'Reporte de gestión de créditos';
  return workbook;
}

export function addReportSheet(workbook: Workbook, options: {
  name: string;
  title: string;
  description?: string;
  columns: ExportColumn[];
  rows: Record<string, CellValue>[];
  totals?: Record<string, number | string>;
}) {
  const { columns, rows } = options;
  const sheet = workbook.addWorksheet(options.name, { views: [{ state: 'frozen', ySplit: 7 }], pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0, printTitlesRow: '1:7', margins: { left: 0.25, right: 0.25, top: 0.4, bottom: 0.4, header: 0.15, footer: 0.15 } } });
  sheet.columns = columns.map((column) => ({ key: column.key, width: column.width || 22 }));
  const banner = (row: number, text: string) => {
    sheet.mergeCells(row, 1, row, columns.length);
    sheet.getCell(row, 1).value = text;
  };
  banner(1, 'PRÉSTAMOS J&C  |  JYC DIGITAL');
  sheet.getRow(1).height = 32;
  sheet.getCell(1, 1).font = { name: 'Calibri', size: 17, bold: true, color: { argb: 'FFFFFFFF' } };
  sheet.getCell(1, 1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF123B2E' } };
  sheet.getCell(1, 1).alignment = { vertical: 'middle', indent: 1 };
  banner(2, options.title);
  sheet.getRow(2).height = 28;
  sheet.getCell(2, 1).font = { name: 'Calibri', size: 15, bold: true, color: { argb: 'FF123B2E' } };
  banner(3, `Generado: ${new Intl.DateTimeFormat('es-CR', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Costa_Rica' }).format(new Date())} · Hora de Costa Rica · Moneda: CRC`);
  banner(4, options.description || 'Información consolidada.');
  sheet.getRow(4).height = 30;
  sheet.getCell(4, 1).alignment = { wrapText: true, vertical: 'middle' };
  banner(5, `${rows.length} registros.`);
  for (const row of [3, 4, 5]) sheet.getRow(row).font = { name: 'Calibri', size: 10, color: { argb: 'FF52645A' } };
  sheet.getRow(7).values = columns.map((column) => column.title);
  sheet.getRow(7).height = 28;
  sheet.getRow(7).eachCell((cell) => {
    cell.font = { name: 'Calibri', bold: true, size: 10, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF31664C' } };
    cell.alignment = { vertical: 'middle', wrapText: true };
  });
  rows.forEach((data, index) => {
    const row = sheet.addRow(columns.map((column) => data[column.key] ?? null));
    row.height = 26;
    row.eachCell({ includeEmpty: true }, (cell, position) => {
      cell.font = { name: 'Calibri', size: 11, color: { argb: 'FF203620' } };
      cell.alignment = { vertical: 'middle', horizontal: columns[position - 1].format === CRC_FORMAT ? 'right' : 'left', wrapText: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: index % 2 === 0 ? 'FFF2F6F1' : 'FFFFFFFF' } };
      cell.border = { bottom: { style: 'hair', color: { argb: 'FFDDE5DA' } } };
      if (columns[position - 1].format) cell.numFmt = columns[position - 1].format!;
    });
  });
  sheet.autoFilter = { from: { row: 7, column: 1 }, to: { row: Math.max(7, 7 + rows.length), column: columns.length } };
  if (options.totals) {
    const row = sheet.addRow(columns.map((column, index) => options.totals?.[column.key] ?? (index === 0 ? 'TOTAL' : null)));
    row.height = 28;
    row.eachCell({ includeEmpty: true }, (cell, position) => {
      cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF123B2E' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2E6BA' } };
      cell.border = { top: { style: 'thin', color: { argb: 'FFC9A227' } } };
      if (columns[position - 1].format) cell.numFmt = columns[position - 1].format!;
    });
  }
  sheet.headerFooter.oddFooter = '&LJyC Digital&RPágina &P de &N';
  return sheet;
}
