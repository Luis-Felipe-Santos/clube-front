export type ExportRow = Record<string, unknown>;

export type ExportColumn = {
  header: string;
  key: string;
  format?: (value: unknown, row: ExportRow) => string | number;
};

type ExportPdfOptions = {
  landscape?: boolean;
  title?: string;
};

function getCellValue(row: ExportRow, column: ExportColumn) {
  const value = row[column.key];
  return column.format ? column.format(value, row) : String(value ?? "");
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function useExport() {
  async function exportToExcel(
    rows: ExportRow[],
    columns: ExportColumn[],
    filename: string,
  ) {
    const XLSX = await import("xlsx");
    const data = rows.map((row) =>
      Object.fromEntries(
        columns.map((column) => [column.header, getCellValue(row, column)]),
      ),
    );
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, "Dados");
    XLSX.writeFile(workbook, filename);
  }

  async function exportToPdf(
    rows: ExportRow[],
    columns: ExportColumn[],
    filename: string,
    options: ExportPdfOptions = {},
  ) {
    const [{ default: JsPDF }, { default: autoTable }] = await Promise.all([
      import("jspdf"),
      import("jspdf-autotable"),
    ]);
    const pdf = new JsPDF({
      orientation: options.landscape ? "landscape" : "portrait",
      unit: "mm",
      format: "a4",
    });

    if (options.title) {
      pdf.text(options.title, 14, 15);
    }

    autoTable(pdf, {
      head: [columns.map((column) => column.header)],
      body: rows.map((row) =>
        columns.map((column) => String(getCellValue(row, column))),
      ),
      startY: options.title ? 22 : 14,
      styles: { fontSize: options.landscape ? 7 : 8 },
      headStyles: { fillColor: [37, 99, 235] },
    });

    pdf.save(filename);
  }

  return { exportToExcel, exportToPdf };
}
