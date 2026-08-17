import React, { forwardRef } from 'react';
import { PrintableDocument } from '../../../../components/ui/PrintableDocument';
import { useSettings } from '../../../../context/SettingsContext';

interface ExtracurricularPrintTemplateProps {
  printingItem: any;
}

export const ExtracurricularPrintTemplate = forwardRef<HTMLDivElement, ExtracurricularPrintTemplateProps>(
  ({ printingItem }, ref) => {
    const { settings } = useSettings();

    if (!printingItem) return null;

    return (
      <PrintableDocument ref={ref} landscape={false}>
        <style>{`
          .nk-table { width: 100%; margin: 0 auto; border-collapse: collapse; table-layout: fixed; border: 2px solid #000; font-size: 13px; }
          .nk-table th, .nk-table td { border: 1px solid #000; padding: 6px; vertical-align: top; }
          .nk-table th { background-color: #f3f4f6 !important; -webkit-print-color-adjust: exact; }
          .nk-header { text-align: center; font-weight: bold; font-size: 16px; padding-bottom: 20px; }
        `}</style>

        <div className="text-center font-bold text-lg mb-8 leading-tight">
          T.C.<br/>
          MİLLİ EĞİTİM BAKANLIĞI<br/>
          {settings?.schoolName || '................ LİSESİ MÜDÜRLÜĞÜ'}<br/>
        </div>

        <div className="nk-header uppercase">DERS DIŞI EĞİTİM (EGZERSİZ) ÇALIŞMA PLANI / ÖĞRENCİ LİSTESİ</div>
        
        <table className="nk-table mb-8">
          <tbody>
            <tr><td style={{ width: '30%', fontWeight: 'bold' }}>Egzersiz Adı / Konusu</td><td>{printingItem.name}</td></tr>
            <tr><td style={{ fontWeight: 'bold' }}>Türü / Alanı</td><td>{printingItem.type}</td></tr>
            <tr>
              <td style={{ fontWeight: 'bold' }}>Başlama ve Bitiş Tarihleri</td>
              <td>
                Başlama: {printingItem.startDate ? new Date(printingItem.startDate).toLocaleDateString('tr-TR') : ''} 
                &nbsp; - &nbsp; Bitiş: {printingItem.endDate ? new Date(printingItem.endDate).toLocaleDateString('tr-TR') : ''}
              </td>
            </tr>
            <tr><td style={{ fontWeight: 'bold' }}>Çalışma Günleri ve Saatleri</td><td>{printingItem.extra?.calismaGunleri} | {printingItem.extra?.calismaSaatleri}</td></tr>
            <tr><td style={{ fontWeight: 'bold' }}>Haftalık / Toplam Saat</td><td>{printingItem.hoursPerWeek} Saat/Hafta | Toplam {printingItem.extra?.planlananToplamSaat} Saat</td></tr>
            <tr><td style={{ fontWeight: 'bold' }}>Çalışma Yeri</td><td>{printingItem.extra?.egzersizYeri}</td></tr>
            <tr><td style={{ fontWeight: 'bold' }}>Görevli Öğretmen</td><td>{printingItem.assignedStaffName}</td></tr>
          </tbody>
        </table>

        <div className="font-bold underline mb-4 text-base break-inside-avoid">Öğrenci Listesi ({printingItem.extra?.ogrenciler?.length || 0} Kişi)</div>
        <table className="nk-table break-inside-avoid">
          <thead>
            <tr>
              <th style={{ width: '8%' }}>S.N</th>
              <th style={{ width: '15%' }}>Sınıf/No</th>
              <th style={{ width: '37%' }}>Öğrenci Adı Soyadı</th>
              <th style={{ width: '15%' }}>Cinsiyet</th>
              <th style={{ width: '25%' }}>Veli Tel</th>
            </tr>
          </thead>
          <tbody>
            {printingItem.extra?.ogrenciler?.map((ogr: any, idx: number) => (
              <tr key={idx}>
                <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                <td>{ogr.sClass} - {ogr.no}</td>
                <td className="text-left px-2">{ogr.name}</td>
                <td style={{ textAlign: 'center' }}>{ogr.gender}</td>
                <td>{ogr.veliTel}</td>
              </tr>
            ))}
            {(!printingItem.extra?.ogrenciler || printingItem.extra.ogrenciler.length === 0) && (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: '15px' }}>Kayıtlı öğrenci bulunamadı.</td></tr>
            )}
          </tbody>
        </table>

        <div className="mt-16 flex justify-between text-center break-inside-avoid px-8">
          <div>
            <p className="font-bold mb-10">Görevli Öğretmen</p>
            <p>{printingItem.assignedStaffName}</p>
          </div>
          <div>
            <p className="font-bold mb-2">UYGUNDUR</p>
            <p className="mb-8">{printingItem.extra?.onayTarihi ? new Date(printingItem.extra.onayTarihi).toLocaleDateString('tr-TR') : '..../..../20...'}</p>
            <p className="font-bold">Okul Müdürü</p>
            <p>{settings?.principalName || '....................'}</p>
          </div>
          {(printingItem.extra?.subeMuduru || printingItem.extra?.ilceMemMuduru) && (
            <div>
              <p className="font-bold mb-2">OLUR</p>
              <p className="mb-8">{printingItem.extra?.onayTarihi ? new Date(printingItem.extra.onayTarihi).toLocaleDateString('tr-TR') : '..../..../20...'}</p>
              <p className="font-bold">{printingItem.extra?.ilceMemMuduru ? 'İl/İlçe MEM Müdürü' : 'Şube Müdürü'}</p>
              <p>{printingItem.extra?.ilceMemMuduru || printingItem.extra?.subeMuduru}</p>
            </div>
          )}
        </div>
      </PrintableDocument>
    );
  }
);

ExtracurricularPrintTemplate.displayName = 'ExtracurricularPrintTemplate';
