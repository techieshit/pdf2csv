import React, { useState } from 'react';
import { Document, Page } from 'react-pdf';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

interface PDFViewerProps {
  file: File | null;
  onLoadSuccess?: (pdf: any) => void;
  onLoadError?: (error: Error) => void;
}

export function PDFViewer({ file, onLoadSuccess, onLoadError }: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);

  const handleLoadSuccess = (pdf: any) => {
    setNumPages(pdf.numPages);
    onLoadSuccess?.(pdf);
  };

  const changePage = (offset: number) => {
    setPageNumber(prevPageNumber => {
      const newPageNumber = prevPageNumber + offset;
      return Math.min(Math.max(1, newPageNumber), numPages);
    });
  };

  const previousPage = () => changePage(-1);
  const nextPage = () => changePage(1);

  const zoomIn = () => setScale(prev => Math.min(prev + 0.1, 2.0));
  const zoomOut = () => setScale(prev => Math.max(prev - 0.1, 0.5));

  if (!file) return null;

  return (
    <div className="flex flex-col items-center bg-white rounded-lg shadow-sm p-4">
      <div className="flex gap-4 mb-4">
        <button
          onClick={zoomOut}
          className="px-3 py-1 bg-gray-100 rounded hover:bg-gray-200"
          disabled={scale <= 0.5}
        >
          Zoom Out
        </button>
        <span className="px-3 py-1 bg-gray-50 rounded">
          {Math.round(scale * 100)}%
        </span>
        <button
          onClick={zoomIn}
          className="px-3 py-1 bg-gray-100 rounded hover:bg-gray-200"
          disabled={scale >= 2.0}
        >
          Zoom In
        </button>
      </div>

      <div className="relative border rounded-lg overflow-auto max-h-[600px]">
        <Document
          file={file}
          onLoadSuccess={handleLoadSuccess}
          onLoadError={onLoadError}
          className="flex justify-center"
        >
          <Page
            pageNumber={pageNumber}
            scale={scale}
            className="max-w-full"
            renderTextLayer={true}
            renderAnnotationLayer={true}
          />
        </Document>
      </div>

      <div className="flex items-center gap-4 mt-4">
        <button
          onClick={previousPage}
          disabled={pageNumber <= 1}
          className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-50"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <p className="text-sm">
          Page {pageNumber} of {numPages}
        </p>
        <button
          onClick={nextPage}
          disabled={pageNumber >= numPages}
          className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-50"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}