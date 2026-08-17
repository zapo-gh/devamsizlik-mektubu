import React, { forwardRef } from 'react';
import { PrintableDocument } from '../../../../components/ui/PrintableDocument';
import { useSettings } from '../../../../context/SettingsContext';

interface ParentAssociationPrintTemplateProps {
  formData: any;
}

export const ParentAssociationPrintTemplate = forwardRef<HTMLDivElement, ParentAssociationPrintTemplateProps>(
  ({ formData }, ref) => {
    const { settings } = useSettings();

    if (!formData || !formData.agendaItems) return null;

    return (
      <PrintableDocument ref={ref} landscape={false}>
        <div className="font-serif bg-white text-black" style={{ boxSizing: 'border-box' }}>
          
          <div className="text-center font-bold text-lg mb-8 leading-tight break-inside-avoid">
            T.C.<br/>
            MİLLİ EĞİTİM BAKANLIĞI<br/>
            {settings?.schoolName || '................ LİSESİ MÜDÜRLÜĞÜ'}<br/>
            OKUL AİLE BİRLİĞİ BAŞKANLIĞI
          </div>

          <h2 className="text-center font-bold text-xl underline mb-6 uppercase break-inside-avoid">YÖNETİM KURULU KARAR TUTANAĞI</h2>

          <table className="w-full mb-8 border-collapse break-inside-avoid">
            <tbody>
              <tr><td className="w-1/3 py-2 font-bold">Toplantı Türü</td><td className="w-2/3 py-2">: {formData.type}</td></tr>
              <tr><td className="py-2 font-bold">Karar No</td><td className="py-2">: {formData.meetingNumber}</td></tr>
              <tr><td className="py-2 font-bold">Tarih</td><td className="py-2">: {formData.date ? new Date(formData.date).toLocaleDateString('tr-TR') : ''}</td></tr>
            </tbody>
          </table>

          <div className="mb-8 break-inside-avoid">
            <h3 className="font-bold text-lg mb-4">GÜNDEM MADDELERİ:</h3>
            <ol className="list-decimal pl-6 space-y-2">
              {formData.agendaItems.map((item: any) => (
                <li key={item.id}>{item.topic}</li>
              ))}
            </ol>
          </div>

          <div className="mb-12">
            <h3 className="font-bold text-lg mb-4">GÖRÜŞÜLEN KONULAR VE ALINAN KARARLAR:</h3>
            {formData.agendaItems.map((item: any, idx: number) => (
              <div key={item.id} className="mb-4 break-inside-avoid">
                <p className="font-bold mb-1">Karar Madde {idx + 1}:</p>
                <p className="pl-4 text-justify leading-relaxed">{item.decision || 'Bu madde hakkında herhangi bir karar veya görüş belirtilmemiştir.'}</p>
              </div>
            ))}
          </div>

          <div className="mt-20 break-inside-avoid">
             <div className="text-center mb-10">
               <p>Yukarıda belirtilen gündem maddeleri görüşülerek belirtilen kararlar oy birliği / oy çokluğu ile alınmıştır.</p>
             </div>
             
             <div className="grid grid-cols-5 gap-y-16 text-center mt-10 text-sm">
                <div>
                   <p className="font-bold mb-16">OAB Başkanı</p>
                   <p>....................</p>
                </div>
                <div>
                   <p className="font-bold mb-16">Bşk. Yrd.</p>
                   <p>....................</p>
                </div>
                <div>
                   <p className="font-bold mb-16">Muhasip Üye</p>
                   <p>....................</p>
                </div>
                <div>
                   <p className="font-bold mb-16">Yazman</p>
                   <p>....................</p>
                </div>
                <div>
                   <p className="font-bold mb-16">Üye</p>
                   <p>....................</p>
                </div>
             </div>

             <div className="text-center mt-24 break-inside-avoid">
                <p>UYGUNDUR</p>
                <p className="mt-2 font-bold mb-16">Okul Müdürü</p>
                <p>{settings?.principalName || '....................'}</p>
             </div>
          </div>
        </div>
      </PrintableDocument>
    );
  }
);

ParentAssociationPrintTemplate.displayName = 'ParentAssociationPrintTemplate';
