import React, { forwardRef } from 'react';
import { PrintableDocument } from '../../../../components/ui/PrintableDocument';
import { useSettings } from '../../../../context/SettingsContext';

interface DutySchedulePrintTemplateProps {
  stations: any[];
  staffList: any[];
  assignments: any[];
  monthName?: string;
}

const DAYS = [
  { val: 1, label: 'Pazartesi' },
  { val: 2, label: 'Salı' },
  { val: 3, label: 'Çarşamba' },
  { val: 4, label: 'Perşembe' },
  { val: 5, label: 'Cuma' },
];

export const DutySchedulePrintTemplate = forwardRef<HTMLDivElement, DutySchedulePrintTemplateProps>(
  ({ stations, staffList, assignments, monthName = 'Aylık' }, ref) => {
    const { settings } = useSettings();

    const getStaffName = (stationId: string, dayVal: number) => {
      const assignment = assignments.find(a => a.stationId === stationId && a.dayOfWeek === dayVal);
      if (!assignment || !assignment.staffId) return '';
      const staff = staffList.find(s => s.id === assignment.staffId);
      return staff ? staff.name : '';
    };

    return (
      <PrintableDocument ref={ref} landscape={true}>
        <div className="text-center mb-6">
          <h2 className="text-lg font-bold uppercase">{settings?.schoolName || 'Okul Adı'}</h2>
          <h3 className="text-base font-bold underline mt-1">{monthName} Nöbet Çizelgesi</h3>
        </div>

        <table className="w-full border-collapse border border-black text-sm text-center">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-black p-3 w-48 uppercase">Nöbet Yeri</th>
              {DAYS.map(d => (
                <th key={d.val} className="border border-black p-3 uppercase">{d.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {stations.map(station => (
              <tr key={station.id}>
                <td className="border border-black p-3 font-bold text-left">{station.name}</td>
                {DAYS.map(day => (
                  <td key={day.val} className="border border-black p-3">
                    {getStaffName(station.id, day.val)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-8 text-xs text-justify mb-16">
          <p>
            <strong>Nöbetçi Öğretmenlerin Görevleri:</strong><br/>
            1. Nöbet görevi, ilk dersten 15 dakika önce başlar, son ders bitiminden 15 dakika sonra biter.<br/>
            2. Nöbetçi öğretmenler, boş geçen dersleri doldurmakla ve okul idaresinin vereceği eğitim-öğretimle ilgili diğer görevleri yapmakla yükümlüdür.<br/>
            3. Nöbet mahallerinde öğrencilerin güvenliğini sağlamak, teneffüslerde öğrencileri bahçeye yönlendirmek ve okul kurallarına uymalarını kontrol etmek esastır.
          </p>
        </div>

        <table className="w-full text-center border-none mt-8">
          <tbody>
            <tr>
              <td className="border-none w-1/2 align-bottom h-24">
                <p className="font-bold">....................................</p>
                <p>Müdür Yardımcısı</p>
              </td>
              <td className="border-none w-1/2 align-bottom h-24">
                <p className="mb-4">Uygundur.</p>
                <p>.../.../20...</p>
                <p className="font-bold mt-4">{settings?.principalName || '....................................'}</p>
                <p>Okul Müdürü</p>
              </td>
            </tr>
          </tbody>
        </table>
      </PrintableDocument>
    );
  }
);

DutySchedulePrintTemplate.displayName = 'DutySchedulePrintTemplate';
