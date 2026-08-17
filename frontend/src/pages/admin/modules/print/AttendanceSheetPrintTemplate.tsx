import React, { forwardRef } from 'react';
import { PrintableDocument } from '../../../../components/ui/PrintableDocument';

interface AttendanceSheetPrintTemplateProps {
  documentSubject: string;
  documentDateNumber: string;
  staffList: any[];
  selectedUnvans: string[];
  selectedVicePrincipal: string;
  selectedPrincipal: string;
}

export const AttendanceSheetPrintTemplate = forwardRef<HTMLDivElement, AttendanceSheetPrintTemplateProps>(
  ({ documentSubject, documentDateNumber, staffList, selectedUnvans, selectedVicePrincipal, selectedPrincipal }, ref) => {
    
    const filteredStaff = staffList.filter(person => selectedUnvans.includes(person.unvan || 'Belirtilmemiş'));

    return (
      <PrintableDocument ref={ref} landscape={false}>
        <div className="font-serif bg-white text-black" style={{ boxSizing: 'border-box' }}>
          
          <div className="mb-8 break-inside-avoid">
            <h2 className="text-xl font-bold uppercase underline text-center mb-6">İMZA SİRKÜSÜ</h2>
            
            <div className="text-left mb-6 space-y-3">
              <p className="text-sm">
                <span className="font-bold">İlgi / Konu:</span> {documentSubject || '....................................................................................................................'}
              </p>
              <p className="text-sm">
                <span className="font-bold">Tarih ve Sayı:</span> {documentDateNumber || '............................................................'}
              </p>
              <p className="text-sm mt-4 text-justify font-medium">
                Yukarıda tarih, sayı ve konusu belirtilen resmi yazı/karar tarafımızca okunmuş, incelenmiş ve tebellüğ edilmiştir.
              </p>
            </div>
          </div>

          <table className="w-full border-collapse border border-black text-[12px]">
            <thead>
              <tr>
                <th className="border border-black p-2 text-center w-12 bg-gray-50 !bg-gray-50 print:!bg-gray-50" style={{ WebkitPrintColorAdjust: 'exact' }}>S.N</th>
                <th className="border border-black p-2 text-left w-1/3 bg-gray-50 !bg-gray-50 print:!bg-gray-50" style={{ WebkitPrintColorAdjust: 'exact' }}>ADI SOYADI</th>
                <th className="border border-black p-2 text-left w-1/3 bg-gray-50 !bg-gray-50 print:!bg-gray-50" style={{ WebkitPrintColorAdjust: 'exact' }}>BRANŞI</th>
                <th className="border border-black p-2 text-center w-1/4 bg-gray-50 !bg-gray-50 print:!bg-gray-50" style={{ WebkitPrintColorAdjust: 'exact' }}>İMZA</th>
              </tr>
            </thead>
            <tbody>
              {filteredStaff.map((person, index) => {
                const unvanStr = person.brans || '-';

                return (
                  <tr key={person.id} className="break-inside-avoid">
                    <td className="border border-black p-1.5 text-center font-medium">{index + 1}</td>
                    <td className="border border-black p-1.5 font-semibold px-2 uppercase">{person.name}</td>
                    <td className="border border-black p-1.5 text-gray-800 px-2">{unvanStr}</td>
                    <td className="border border-black p-1.5 h-10"></td>
                  </tr>
                );
              })}
              {filteredStaff.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-gray-500">
                    Sisteme kayıtlı personel bulunmuyor.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          
          <div className="flex justify-between mt-8 px-12 break-inside-avoid print:break-before-avoid">
            <div className="text-center">
              <p className="font-bold">{selectedVicePrincipal || '..................................'}</p>
              <p className="text-sm mt-1">Müdür Yardımcısı</p>
              <p className="mt-6 border-t border-black pt-2 w-48 mx-auto">İmza</p>
            </div>
            <div className="text-center">
              <p className="font-bold">{selectedPrincipal || '..................................'}</p>
              <p className="text-sm mt-1">Okul Müdürü</p>
              <p className="mt-6 border-t border-black pt-2 w-48 mx-auto">İmza / Mühür</p>
            </div>
          </div>
        </div>
      </PrintableDocument>
    );
  }
);

AttendanceSheetPrintTemplate.displayName = 'AttendanceSheetPrintTemplate';
