/**
 * Export data to CSV and download
 */
export function exportToCSV(data: any[], filename: string = "export") {
  if (!data || data.length === 0) {
    alert("No data to export");
    return;
  }

  // Get headers from first object
  const headers = Object.keys(data[0]);

  // Create CSV content
  const csvContent = [
    headers.join(","), // Header row
    ...data.map((row) =>
      headers
        .map((header) => {
          const value = row[header];
          // Handle values with commas, quotes, or newlines
          if (
            value === null ||
            value === undefined ||
            value === ""
          ) {
            return "";
          }
          const stringValue = String(value);
          if (
            stringValue.includes(",") ||
            stringValue.includes('"') ||
            stringValue.includes("\n")
          ) {
            return `"${stringValue.replace(/"/g, '""')}"`;
          }
          return stringValue;
        })
        .join(",")
    ),
  ].join("\n");

  // Create blob and download
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}_${new Date().toISOString().split("T")[0]}.csv`);
  link.style.visibility = "hidden";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Format data for export with custom headers
 */
export function formatForExport<T extends Record<string, any>>(
  data: T[],
  headerMap?: Partial<Record<keyof T, string>>
): any[] {
  if (!headerMap) return data;

  return data.map((item) => {
    const formatted: Record<string, any> = {};
    Object.entries(headerMap).forEach(([key, label]) => {
      formatted[label as string] = item[key];
    });
    return formatted;
  });
}
