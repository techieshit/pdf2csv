import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import type { PDFDocumentProxy } from 'pdfjs-dist';

// Set worker source using CDN with matching version
GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.js`;

interface TextItem {
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
}

function isTableRow(items: TextItem[]): boolean {
  if (items.length < 2) return false;

  const sortedItems = [...items].sort((a, b) => a.x - b.x);
  
  const spacings: number[] = [];
  for (let i = 1; i < sortedItems.length; i++) {
    const spacing = sortedItems[i].x - (sortedItems[i-1].x + sortedItems[i-1].width);
    spacings.push(spacing);
  }

  const avgSpacing = spacings.reduce((a, b) => a + b, 0) / spacings.length;
  const spacingConsistency = spacings.every(spacing => 
    Math.abs(spacing - avgSpacing) < avgSpacing * 0.5
  );

  const yPositions = items.map(item => item.y);
  const maxYDiff = Math.max(...yPositions) - Math.min(...yPositions);
  const verticalAlignment = maxYDiff < items[0].height;

  return spacingConsistency && verticalAlignment;
}

function findTableBoundaries(items: TextItem[]): { start: number; end: number } | null {
  let tableStart = -1;
  let tableEnd = -1;
  let consecutiveTableRows = 0;
  
  const rowGroups = new Map<number, TextItem[]>();
  items.forEach(item => {
    const roundedY = Math.round(item.y);
    if (!rowGroups.has(roundedY)) {
      rowGroups.set(roundedY, []);
    }
    rowGroups.get(roundedY)?.push(item);
  });

  const rows = Array.from(rowGroups.entries())
    .sort(([y1], [y2]) => y2 - y1)
    .map(([_, items]) => items);

  for (let i = 0; i < rows.length; i++) {
    if (isTableRow(rows[i])) {
      if (tableStart === -1) tableStart = i;
      consecutiveTableRows++;
    } else {
      if (consecutiveTableRows >= 2) {
        tableEnd = i;
        break;
      }
      tableStart = -1;
      consecutiveTableRows = 0;
    }
  }

  if (tableStart !== -1 && tableEnd === -1 && consecutiveTableRows >= 2) {
    tableEnd = rows.length;
  }

  return (tableStart !== -1 && tableEnd !== -1) 
    ? { start: tableStart, end: tableEnd }
    : null;
}

export async function extractTablesFromPDF(file: File): Promise<string[][]> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await getDocument({ data: arrayBuffer }).promise;
    const allTables: string[][] = [];

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      const items: TextItem[] = textContent.items.map((item: any) => ({
        x: item.transform[4],
        y: item.transform[5],
        width: item.width || 0,
        height: item.height || 12,
        text: item.str.trim()
      }));

      const boundaries = findTableBoundaries(items);
      if (!boundaries) continue;

      const rowGroups = new Map<number, TextItem[]>();
      items.forEach(item => {
        const roundedY = Math.round(item.y);
        if (!rowGroups.has(roundedY)) {
          rowGroups.set(roundedY, []);
        }
        rowGroups.get(roundedY)?.push(item);
      });

      const rows = Array.from(rowGroups.entries())
        .sort(([y1], [y2]) => y2 - y1)
        .slice(boundaries.start, boundaries.end)
        .map(([_, items]) => 
          items
            .sort((a, b) => a.x - b.x)
            .map(item => item.text)
            .filter(text => text.length > 0)
        )
        .filter(row => row.length > 0);

      if (rows.length > 0) {
        allTables.push(...rows);
      }
    }

    if (allTables.length === 0) {
      throw new Error('No tables found in the PDF file.');
    }

    return allTables;
  } catch (error) {
    console.error('Error processing PDF:', error);
    throw error instanceof Error 
      ? error 
      : new Error('Failed to extract tables from PDF. Please ensure the file contains properly formatted tables.');
  }
}

export function convertToCSV(data: string[][]): string {
  return data
    .map(row => 
      row.map(cell => {
        const escaped = cell.replace(/"/g, '""');
        return `"${escaped}"`;
      }).join(',')
    )
    .join('\n');
}

export function downloadCSV(csvContent: string, filename: string) {
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  
  link.click();
  
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}