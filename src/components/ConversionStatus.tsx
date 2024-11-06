import React from 'react';
import { CheckCircle, AlertCircle, Loader } from 'lucide-react';

interface ConversionStatusProps {
  status: 'idle' | 'processing' | 'success' | 'error';
  message: string;
}

export function ConversionStatus({ status, message }: ConversionStatusProps) {
  const statusConfig = {
    processing: {
      icon: Loader,
      className: 'text-blue-500 animate-spin',
    },
    success: {
      icon: CheckCircle,
      className: 'text-green-500',
    },
    error: {
      icon: AlertCircle,
      className: 'text-red-500',
    },
    idle: {
      icon: () => null,
      className: '',
    },
  };

  const StatusIcon = statusConfig[status].icon;

  return (
    <div className="flex items-center justify-center gap-2 p-4 bg-white rounded-lg shadow-sm">
      <StatusIcon className={`w-5 h-5 ${statusConfig[status].className}`} />
      <span className={status === 'error' ? 'text-red-600' : 'text-gray-700'}>
        {message}
      </span>
    </div>
  );
}