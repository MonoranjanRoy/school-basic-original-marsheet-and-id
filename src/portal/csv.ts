/** Quote a CSV cell; neutralise values a spreadsheet might run as a formula. */
function cell(v: string): string {
  const safe = /^[=+\-@]/.test(v) ? `'${v}` : v;
  return `"${safe.replace(/"/g, '""')}"`;
}

export function downloadCsv(filename: string, rows: string[][]) {
  // The BOM makes Excel read Bengali names correctly.
  const text = '﻿' + rows.map((r) => r.map(cell).join(',')).join('\r\n') + '\r\n';
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export const safeFilename = (name: string) => name.replace(/[^\w-]+/g, '_');
