import React, { useCallback } from 'react';
import { Upload } from 'lucide-react';

interface DropzoneProps {
  onFileSelect: (file: File) => void;
  error?: string;
  isProcessing: boolean;
}

export function Dropzone({ onFileSelect, error, isProcessing }: DropzoneProps) {
  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file?.type === 'application/pdf') {
        onFileSelect(file);
      }
    },
    [onFileSelect]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file?.type === 'application/pdf') {
        onFileSelect(file);
      }
    },
    [onFileSelect]
  );

  const borderColor = error ? 'border-red-300' : 'border-gray-300';
  const hoverBorderColor = error ? 'hover:border-red-400' : 'hover:border-blue-400';

  return (
    <div
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      className={`relative border-2 border-dashed ${borderColor} ${
        !isProcessing && hoverBorderColor
      } rounded-lg p-8 text-center transition-colors`}
    >
      <input
        type="file"
        accept=".pdf"
        onChange={handleFileInput}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        disabled={isProcessing}
      />
      <div className="flex flex-col items-center justify-center">
        <Upload className="w-12 h-12 text-gray-400 mb-4" />
        <p className="text-lg font-medium text-gray-700 mb-1">
          {isProcessing ? 'Processing...' : 'Drop your PDF file here'}
        </p>
        <p className="text-sm text-gray-500">or click to browse</p>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </div>
    </div>
  );
}