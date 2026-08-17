import React from 'react';

interface StatusBadgeProps {
  status: boolean | number | string;
  trueText?: string;
  falseText?: string;
  customText?: string;
  colorMap?: Record<string, 'green' | 'red' | 'yellow' | 'blue' | 'gray'>;
}

export function StatusBadge({ 
  status, 
  trueText = 'Aktif', 
  falseText = 'Pasif',
  customText,
  colorMap
}: StatusBadgeProps) {
  
  // Custom string statüleri (örn: BEKLIYOR, ONAYLANDI vs)
  if (typeof status === 'string' && colorMap) {
    const color = colorMap[status] || 'gray';
    const classes = {
      green: 'bg-green-100 text-green-700 border-green-200',
      red: 'bg-red-100 text-red-700 border-red-200',
      yellow: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      blue: 'bg-blue-100 text-blue-700 border-blue-200',
      gray: 'bg-gray-100 text-gray-700 border-gray-200'
    }[color];
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${classes}`}>
        {customText || status}
      </span>
    );
  }

  // ACTIVE, INACTIVE stringleri için özel fallback
  if (status === 'ACTIVE' || status === 'INACTIVE') {
    const isTrue = status === 'ACTIVE';
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
        isTrue ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'
      }`}>
        <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${isTrue ? 'bg-green-500' : 'bg-red-500'}`}></span>
        {customText || (isTrue ? trueText : falseText)}
      </span>
    );
  }

  // Boolean mantığı
  const isTrue = status === true || status === 1;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
      isTrue ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${isTrue ? 'bg-green-500' : 'bg-red-500'}`}></span>
      {customText || (isTrue ? trueText : falseText)}
    </span>
  );
}
