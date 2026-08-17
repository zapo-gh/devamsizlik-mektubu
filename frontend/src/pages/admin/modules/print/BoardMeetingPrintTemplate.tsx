import React, { forwardRef } from 'react';
import { PrintableDocument } from '../../../../components/ui/PrintableDocument';
import { useSettings } from '../../../../context/SettingsContext';

interface BoardMeetingPrintTemplateProps {
  meeting: any;
}

export const BoardMeetingPrintTemplate = forwardRef<HTMLDivElement, BoardMeetingPrintTemplateProps>(
  ({ meeting }, ref) => {
    const { settings } = useSettings();
    if (!meeting) return null;

    return (
      <PrintableDocument ref={ref} landscape={false}>
        <div className="text-center mb-8">
          <h2 className="text-xl font-bold uppercase">{settings?.schoolName || 'Okul Adı'}</h2>
          <h3 className="text-lg font-bold underline mt-2">{meeting.title || meeting.type || 'Toplantı Tutanağı'}</h3>
        </div>

        <table className="w-full text-sm border border-black border-collapse mb-8">
          <tbody>
            <tr>
              <td className="border border-black p-2 font-bold w-1/4 bg-gray-100">Toplantı Tarihi</td>
              <td className="border border-black p-2">{meeting.date ? new Date(meeting.date).toLocaleDateString('tr-TR') : ''}</td>
            </tr>
            <tr>
              <td className="border border-black p-2 font-bold bg-gray-100">Toplantı Saati</td>
              <td className="border border-black p-2">{meeting.time || ''}</td>
            </tr>
            <tr>
              <td className="border border-black p-2 font-bold bg-gray-100">Toplantı Yeri</td>
              <td className="border border-black p-2">{meeting.location || 'Öğretmenler Odası'}</td>
            </tr>
          </tbody>
        </table>

        <div className="mb-8">
          <h4 className="font-bold text-md mb-4 underline">GÜNDEM MADDELERİ VE ALINAN KARARLAR</h4>
          {meeting.agendaItems?.map((item: any, idx: number) => (
            <div key={item.id} className="mb-6 break-inside-avoid text-justify">
              <p className="font-bold text-sm mb-2">Gündem Madde {idx + 1}: {item.topic}</p>
              <p className="text-sm pl-4 border-l-2 border-slate-300 whitespace-pre-wrap">{item.decision}</p>
            </div>
          ))}
          {(!meeting.agendaItems || meeting.agendaItems.length === 0) && (
            <p className="text-sm italic text-gray-500">Gündem maddesi eklenmemiştir.</p>
          )}
        </div>

        <div className="mt-16 text-sm text-justify mb-24">
          <p>
            Yukarıda belirtilen gündem maddeleri görüşülmüş olup, toplantı sonucunda ilgili kararlar imza altına alınarak kabul edilmiştir.
          </p>
        </div>

        <table className="w-full text-center border-none mt-8 text-sm break-inside-avoid">
          <tbody>
            <tr>
              <td className="border-none w-1/2 align-bottom h-24">
                <p className="font-bold mt-4">....................................</p>
                <p>Kurul / Zümre Başkanı</p>
              </td>
              <td className="border-none w-1/2 align-bottom h-24">
                <p className="mb-4">Uygundur.</p>
                <p>{meeting.date ? new Date(meeting.date).toLocaleDateString('tr-TR') : '.../.../20...'}</p>
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

BoardMeetingPrintTemplate.displayName = 'BoardMeetingPrintTemplate';
