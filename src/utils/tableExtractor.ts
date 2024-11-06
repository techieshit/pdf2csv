interface TextItem {
  str: string;
  transform: number[];
  width?: number;
  height?: number;
}

function getItemBounds(item: TextItem) {
  return {
    left: item.transform[4],
    right: item.transform[4] + (item.width || 0),
    top: item.transform[5],
    bottom: item.transform[5] - (item.height || 12),
  };
}

function detectColumns(items: TextItem[]): number[] {
  const positions = items.map(item => item.transform[4]).sort((a, b) => a - b);
  const columns: number[] = [];
  let lastPosition = -1;

  for (const position of positions) {
    if (lastPosition === -1 || position - lastPosition > 10) {
      columns.push(position);
      lastPosition = position;
    }
  }

  return columns;
}

function isAligned(value: number, reference: number, tolerance: number = 5): boolean {
  return Math.abs(value - reference) <= tolerance;
}

function findTableStructure(items: TextItem[]): { columns: number[]; rowHeight: number } {
  // Group items by vertical position
  const rowPositions = new Map<number, TextItem[]>();
  items.forEach(item => {
    const roundedY = Math.round(item.transform[5]);
    if (!rowPositions.has(roundedY)) {
      rowPositions.set(roundedY, []);
    }
    rowPositions.get(roundedY)?.push(item);
  });

  // Find rows with the most consistent column alignment
  let bestColumns: number[] = [];
  let bestRowHeight = 0;
  let maxConsistency = 0;

  rowPositions.forEach((rowItems, y) => {
    if (rowItems.length >= 3) { // Consider rows with at least 3 items
      const columns = detectColumns(rowItems);
      let consistency = 0;

      // Check how many other rows align with these columns
      rowPositions.forEach((otherItems, otherY) => {
        if (y !== otherY) {
          const alignedItems = otherItems.filter(item =>
            columns.some(col => isAligned(item.transform[4], col))
          );
          if (alignedItems.length >= columns.length * 0.7) { // 70% alignment threshold
            consistency++;
          }
        }
      });

      if (consistency > maxConsistency) {
        maxConsistency = consistency;
        bestColumns = columns;
        bestRowHeight = 12; // Default row height
      }
    }
  });

  return { columns: bestColumns, rowHeight: bestRowHeight };
}

function assignItemsToColumns(items: TextItem[], columns: number[]): (TextItem | null)[] {
  const result: (TextItem | null)[] = new Array(columns.length).fill(null);
  
  items.forEach(item => {
    const itemLeft = item.transform[4];
    let bestColumnIndex = -1;
    let minDistance = Infinity;

    columns.forEach((colX, index) => {
      const distance = Math.abs(itemLeft - colX);
      if (distance < minDistance && distance < 20) { // 20 pixels tolerance
        minDistance = distance;
        bestColumnIndex = index;
      }
    });

    if (bestColumnIndex !== -1) {
      result[bestColumnIndex] = item;
    }
  });

  return result;
}

export function extractTablesFromPage(textContent: { items: TextItem[] }): string[][] {
  const items = textContent.items.filter(item => item.str.trim().length > 0);
  if (items.length < 6) return []; // Require at least 6 items for a table

  const { columns, rowHeight } = findTableStructure(items);
  if (columns.length < 3) return []; // Require at least 3 columns

  // Group items by rows
  const rows = new Map<number, TextItem[]>();
  items.forEach(item => {
    const roundedY = Math.round(item.transform[5] / rowHeight) * rowHeight;
    if (!rows.has(roundedY)) {
      rows.set(roundedY, []);
    }
    rows.get(roundedY)?.push(item);
  });

  // Convert rows to table data
  const tableData: string[][] = [];
  rows.forEach(rowItems => {
    const columnItems = assignItemsToColumns(rowItems, columns);
    if (columnItems.some(item => item !== null)) { // Only include rows with at least one item
      const row = columnItems.map(item => item?.str.trim() || '');
      if (row.some(cell => cell.length > 0)) { // Only include rows with at least one non-empty cell
        tableData.push(row);
      }
    }
  });

  // Sort rows by vertical position (top to bottom)
  tableData.sort((a, b) => {
    const aY = Math.max(...rows.get(Array.from(rows.keys())[tableData.indexOf(a)])?.map(item => item.transform[5]) || [0]);
    const bY = Math.max(...rows.get(Array.from(rows.keys())[tableData.indexOf(b)])?.map(item => item.transform[5]) || [0]);
    return bY - aY;
  });

  return tableData;
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