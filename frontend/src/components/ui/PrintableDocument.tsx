import React, { forwardRef, ReactNode } from 'react';
import { useSettings } from '../../context/SettingsContext';

interface PrintableDocumentProps {
  children: ReactNode;
  title?: string;
  documentNumber?: string;
  landscape?: boolean;
}

export const PrintableDocument = forwardRef<HTMLDivElement, PrintableDocumentProps>(
  ({ children, title, documentNumber, landscape = false }, ref) => {
    const { settings } = useSettings();

    return (
      <div 
        ref={ref} 
        className={`bg-white text-black p-8 print:p-0 w-full ${landscape ? 'print:landscape' : 'print:portrait'}`}
        style={{ fontFamily: "'Times New Roman', serif" }}
      >
        <style type="text/css" media="print">
          {`
            @page { size: A4 ${landscape ? 'landscape' : 'portrait'}; margin: 15mm; }
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          `}
        </style>
        
        {/* Opsiyonel Antet / Başlık */}
        {title && (
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold uppercase underline mb-2">{title}</h2>
            {documentNumber && <div className="text-sm text-right">Sayı: {documentNumber}</div>}
          </div>
        )}

        {/* Ana İçerik */}
        <div className="text-[13px] leading-relaxed">
          {children}
        </div>
      </div>
    );
  }
);

PrintableDocument.displayName = 'PrintableDocument';
