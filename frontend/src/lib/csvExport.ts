/**
 * Utility to export data to CSV and trigger download
 */
export const exportToCsv = (filename: string, headers: string[], rows: any[][]) => {
  const content = [
    headers.join(','),
    ...rows.map(row => 
      row.map(cell => {
        const str = String(cell ?? '');
        // Escape quotes and wrap in quotes if contains comma
        if (str.includes(',') || str.includes('"')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      }).join(',')
    )
  ].join('\n');

  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
