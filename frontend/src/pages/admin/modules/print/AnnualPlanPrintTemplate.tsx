import React, { forwardRef } from 'react';
import { PrintableDocument } from '../../../../components/ui/PrintableDocument';
import { useSettings } from '../../../../context/SettingsContext';

interface AnnualPlanItem {
  id: string;
  academicYear: string;
  month: number;
  title: string;
  description?: string;
  category: string;
  sortOrder: number;
}

const MONTHS = [
  { val: 9, label: 'Eylül' },
  { val: 10, label: 'Ekim' },
  { val: 11, label: 'Kasım' },
  { val: 12, label: 'Aralık' },
  { val: 1, label: 'Ocak' },
  { val: 2, label: 'Şubat' },
  { val: 3, label: 'Mart' },
  { val: 4, label: 'Nisan' },
  { val: 5, label: 'Mayıs' },
  { val: 6, label: 'Haziran' },
  { val: 7, label: 'Temmuz' },
  { val: 8, label: 'Ağustos' },
];

const CATEGORIES = [
  { val: 'IDARI', label: 'İdari İşler' },
  { val: 'EGITIM', label: 'Eğitim Öğretim' },
  { val: 'SOSYAL', label: 'Sosyal & Kültürel' },
  { val: 'DIGER', label: 'Diğer' },
];

interface AnnualPlanPrintTemplateProps {
  items: AnnualPlanItem[];
  academicYear: string;
}

export const AnnualPlanPrintTemplate = forwardRef<HTMLDivElement, AnnualPlanPrintTemplateProps>(
  ({ items, academicYear }, ref) => {
    const { settings } = useSettings();

    return (
      <PrintableDocument ref={ref} landscape={false}>
        <style>{`
          .nk-table { width: 100%; border-collapse: collapse; font-size: 13px; }
          .nk-table th, .nk-table td { border: 1px solid #000; padding: 6px; }
          .nk-table th { background-color: #f3f4f6 !important; -webkit-print-color-adjust: exact; text-align: left; }
        `}</style>

        <div className="text-center font-bold text-lg mb-8 leading-tight">
          T.C.<br/>
          MİLLİ EĞİTİM BAKANLIĞI<br/>
          {settings?.schoolName || '................ LİSESİ MÜDÜRLÜĞÜ'}<br/>
          {academicYear} EĞİTİM ÖĞRETİM YILI<br/>
          YILLIK ÇALIŞMA PLANI
        </div>

        {MONTHS.map(monthObj => {
          const monthItems = items.filter(i => i.month === monthObj.val);
          if (monthItems.length === 0) return null;

          return (
            <div key={monthObj.val} className="mb-6 break-inside-avoid">
              <h3 className="font-bold text-base mb-2 underline">{monthObj.label} Ayı Çalışmaları</h3>
              <table className="nk-table">
                <thead>
                  <tr>
                    <th style={{ width: '40px', textAlign: 'center' }}>Sıra</th>
                    <th style={{ width: '120px' }}>Kategori</th>
                    <th>Faaliyet / Çalışma Konusu</th>
                  </tr>
                </thead>
                <tbody>
                  {monthItems.map((item, idx) => (
                    <tr key={item.id}>
                      <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                      <td>{CATEGORIES.find(c => c.val === item.category)?.label || item.category}</td>
                      <td>
                        <div className="font-bold">{item.title}</div>
                        {item.description && <div className="text-xs mt-1 text-gray-700">{item.description}</div>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}

        <div className="mt-16 text-center break-inside-avoid">
           <p className="font-bold">UYGUNDUR</p>
           <p className="mt-1 font-bold">{settings?.principalName || '....................'}</p>
           <p>Okul Müdürü</p>
        </div>
      </PrintableDocument>
    );
  }
);

AnnualPlanPrintTemplate.displayName = 'AnnualPlanPrintTemplate';
