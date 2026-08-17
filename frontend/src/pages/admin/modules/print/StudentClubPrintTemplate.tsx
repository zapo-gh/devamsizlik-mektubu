import React, { forwardRef } from 'react';
import { PrintableDocument } from '../../../../components/ui/PrintableDocument';
import { useSettings } from '../../../../context/SettingsContext';

interface StudentClubPrintTemplateProps {
  formData: any;
  clubMembers: any[];
}

export const StudentClubPrintTemplate = forwardRef<HTMLDivElement, StudentClubPrintTemplateProps>(
  ({ formData, clubMembers }, ref) => {
    const { settings } = useSettings();

    if (!formData) return null;

    return (
      <PrintableDocument ref={ref} landscape={false}>
        <style>{`
          .nk-table { width: 100%; border-collapse: collapse; font-size: 13px; text-align: center; }
          .nk-table th, .nk-table td { border: 1px solid #000; padding: 6px; }
          .nk-table th { background-color: #f3f4f6 !important; -webkit-print-color-adjust: exact; }
        `}</style>
        
        <div className="text-center font-bold text-lg mb-8 leading-tight">
          T.C.<br/>
          MİLLİ EĞİTİM BAKANLIĞI<br/>
          {settings?.schoolName || '................ LİSESİ MÜDÜRLÜĞÜ'}<br/>
          {formData.academicYear} EĞİTİM ÖĞRETİM YILI
        </div>

        <h2 className="text-center font-bold text-xl mb-6 uppercase break-words px-4">
          "{formData.name}" KULÜBÜ FAALİYET RAPORU VE ÖĞRENCİ LİSTESİ
        </h2>

        <table className="w-full mb-6 border-none text-sm">
          <tbody>
            <tr><td className="w-1/3 py-1 font-bold border-none">Danışman Öğretmen</td><td className="w-2/3 py-1 border-none">: {formData.assignedStaffName}</td></tr>
            <tr><td className="py-1 font-bold border-none">Toplantı Gün/Saati</td><td className="py-1 border-none">: {formData.meetingDay} - {formData.meetingTime}</td></tr>
            <tr><td className="py-1 font-bold border-none align-top">Kulübün Amacı</td><td className="py-1 border-none">: {formData.description}</td></tr>
          </tbody>
        </table>

        <div className="mb-8 break-inside-avoid">
          <h3 className="font-bold text-base mb-2 underline">FAALİYET PLANI</h3>
          <table className="nk-table">
            <thead>
              <tr>
                <th className="w-1/4">Aylar / Dönem</th>
                <th>Faaliyet Konusu</th>
              </tr>
            </thead>
            <tbody>
              {formData.activities?.map((item: any, idx: number) => (
                <tr key={item.id || idx}>
                  <td>{item.month}</td>
                  <td className="text-left px-4">{item.description}</td>
                </tr>
              ))}
              {(!formData.activities || formData.activities.length === 0) && (
                <tr><td colSpan={2} className="p-4 text-center">Faaliyet planı bulunmamaktadır.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mb-10">
          <h3 className="font-bold text-base mb-2 underline">ÜYE ÖĞRENCİ LİSTESİ</h3>
          <table className="nk-table">
            <thead>
              <tr>
                <th className="w-12">S.No</th>
                <th className="w-24">Sınıfı</th>
                <th className="w-24">Okul No</th>
                <th>Adı Soyadı</th>
                <th className="w-24">Görevi</th>
              </tr>
            </thead>
            <tbody>
              {clubMembers?.map((member: any, idx: number) => (
                <tr key={member.id || idx}>
                  <td>{idx + 1}</td>
                  <td>{member.student?.className}</td>
                  <td>{member.student?.schoolNumber}</td>
                  <td className="text-left px-4">{member.student?.fullName}</td>
                  <td>{member.role}</td>
                </tr>
              ))}
              {(!clubMembers || clubMembers.length === 0) && (
                <tr><td colSpan={5} className="p-4 text-center">Kayıtlı öğrenci bulunmamaktadır.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-16 break-inside-avoid">
           <table className="w-full text-center border-none mt-8 text-sm break-inside-avoid">
            <tbody>
              <tr>
                <td className="border-none w-1/2 align-bottom h-24">
                  <p className="font-bold">Danışman Öğretmen</p>
                  <p className="mt-1 mb-8">{formData.assignedStaffName || '....................................'}</p>
                  <p>....................................</p>
                </td>
                <td className="border-none w-1/2 align-bottom h-24">
                  <p className="font-bold">Okul Müdürü</p>
                  <p className="mt-1 mb-8">Tasdik Olunur</p>
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

StudentClubPrintTemplate.displayName = 'StudentClubPrintTemplate';
