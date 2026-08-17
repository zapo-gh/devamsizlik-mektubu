import React, { forwardRef } from 'react';
import { PrintableDocument } from '../../../../components/ui/PrintableDocument';
import { useSettings } from '../../../../context/SettingsContext';

interface GuidanceReportPrintTemplateProps {
  data: any;
}

export const GuidanceReportPrintTemplate = forwardRef<HTMLDivElement, GuidanceReportPrintTemplateProps>(
  ({ data }, ref) => {
    const { settings } = useSettings();
    if (!data) return null;

    return (
      <PrintableDocument ref={ref} landscape={false}>
        <div className="text-center font-bold text-lg mb-8 leading-tight">
          T.C.<br/>
          MİLLİ EĞİTİM BAKANLIĞI<br/>
          {settings?.schoolName || '................ LİSESİ MÜDÜRLÜĞÜ'}<br/>
          {data.academicYear || '2025-2026'} EĞİTİM ÖĞRETİM YILI
        </div>

        <h2 className="text-center font-bold text-xl mb-8 uppercase px-4 underline">
          SINIF REHBERLİK AYLIK FAALİYET RAPORU
        </h2>

        <table className="w-full text-sm border border-black border-collapse mb-8">
          <tbody>
            <tr>
              <td className="border border-black p-3 font-bold w-1/3 bg-gray-100">Sınıfı</td>
              <td className="border border-black p-3">{data.className}</td>
            </tr>
            <tr>
              <td className="border border-black p-3 font-bold w-1/3 bg-gray-100">Sınıf Rehber Öğretmeni</td>
              <td className="border border-black p-3">{data.staffName}</td>
            </tr>
            <tr>
              <td className="border border-black p-3 font-bold w-1/3 bg-gray-100">Ait Olduğu Ay</td>
              <td className="border border-black p-3">{data.month}</td>
            </tr>
          </tbody>
        </table>

        <div className="mb-8">
          <h4 className="font-bold text-base mb-4 underline">YAPILAN ÇALIŞMALAR VE FAALİYET ÖZETİ</h4>
          <div className="min-h-[300px] border border-black p-4 whitespace-pre-wrap text-justify leading-relaxed">
            {data.activities || 'Bu ay içerisinde planlanan rehberlik faaliyetleri gerçekleştirilmiş olup, öğrencilerin akademik ve sosyal gelişimleri takip edilmiştir.'}
          </div>
        </div>

        <div className="mt-24 text-center break-inside-avoid">
           <table className="w-full text-center border-none mt-8 text-sm break-inside-avoid">
            <tbody>
              <tr>
                <td className="border-none w-1/2 align-bottom h-24">
                  <p className="font-bold">Sınıf Rehber Öğretmeni</p>
                  <p className="mt-1 mb-10">{data.staffName}</p>
                  <p>....................................</p>
                </td>
                <td className="border-none w-1/2 align-bottom h-24">
                  <p className="font-bold">Okul Müdürü</p>
                  <p className="mt-1 mb-10">Tasdik Olunur</p>
                  <p className="font-bold">{settings?.principalName || '....................................'}</p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </PrintableDocument>
    );
  }
);

GuidanceReportPrintTemplate.displayName = 'GuidanceReportPrintTemplate';
