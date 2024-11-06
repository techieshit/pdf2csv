import React, { useState } from 'react';
import { FileDown } from 'lucide-react';
import { Document } from 'react-pdf';
import { Dropzone } from './components/Dropzone';
import { ConversionStatus } from './components/ConversionStatus';
import { PDFViewer } from './components/PDFViewer';
import { extractTablesFromPage, convertToCSV, downloadCSV } from './utils/tableExtractor';

function App() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [status, setStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string>('');
  const [csvData, setCsvData] = useState<string | null>(null);
  const [tableCount, setTableCount] = useState<number>(0);

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setStatus('processing');
    setError('');
    setCsvData(null);
    setTableCount(0);
  };

  const handlePDFLoadSuccess = async (pdf: any) => {
    try {
      const allTables: string[][] = [];
      let tablesFound = 0;
      
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const tables = extractTablesFromPage(textContent);
        if (tables.length > 0) {
          allTables.push(...tables);
          tablesFound += tables.length;
        }
      }

      if (allTables.length === 0) {
        throw new Error('No tables found in the PDF file. Please ensure the PDF contains properly formatted tables.');
      }

      setTableCount(tablesFound);
      const csv = convertToCSV(allTables);
      setCsvData(csv);
      setStatus('success');
    } catch (err) {
      console.error('Error processing PDF:', err);
      setError(err instanceof Error ? err.message : 'Failed to process PDF file.');
      setStatus('error');
    }
  };

  const handleDownload = () => {
    if (csvData && selectedFile) {
      const filename = selectedFile.name.replace('.pdf', '.csv');
      downloadCSV(csvData, filename);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            PDF Table Extractor
          </h1>
          <p className="text-gray-600">
            Extract tables from PDF documents and convert them to CSV format
          </p>
        </div>

        <div className="space-y-6">
          <Dropzone 
            onFileSelect={handleFileSelect}
            error={status === 'error' ? error : undefined}
            isProcessing={status === 'processing'}
          />

          {selectedFile && (
            <PDFViewer
              file={selectedFile}
              onLoadSuccess={handlePDFLoadSuccess}
              onLoadError={(error) => {
                setError(error.message);
                setStatus('error');
              }}
            />
          )}

          {status !== 'idle' && (
            <ConversionStatus
              status={status}
              message={
                status === 'processing' ? 'Extracting tables from PDF...' :
                status === 'success' ? `Successfully extracted ${tableCount} table${tableCount !== 1 ? 's' : ''}!` :
                error
              }
            />
          )}

          {status === 'success' && (
            <div className="flex justify-center">
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <FileDown className="w-5 h-5" />
                Download CSV
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;