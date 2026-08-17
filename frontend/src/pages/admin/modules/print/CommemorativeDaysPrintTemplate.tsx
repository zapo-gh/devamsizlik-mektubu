import React, { forwardRef } from 'react';
import { PrintableDocument } from '../../../../components/ui/PrintableDocument';
import { useSettings } from '../../../../context/SettingsContext';

interface CommemorativeDaysPrintTemplateProps {
  form: any;
}

export const CommemorativeDaysPrintTemplate = forwardRef<HTMLDivElement, CommemorativeDaysPrintTemplateProps>(
  ({ form }, ref) => {
    const { settings } = useSettings();

    if (!form || !form.name) return null;

    return (
      <PrintableDocument ref={ref} landscape={false}>
        <style>{`
          .nk-print-body { font-size: 15px; }
        `}</style>

        <div className="text-center font-bold text-lg mb-16 leading-tight nk-print-body">
          T.C.<br/>
          MİLLİ EĞİTİM BAKANLIĞI<br/>
          {settings?.schoolName || '................ LİSESİ MÜDÜRLÜĞÜ'}<br/>
        </div>

        <table className="w-full mb-10 border-none font-bold nk-print-body">
          <tbody>
            <tr><td className="w-24 pb-2 border-none">Sayı</td><td className="border-none">: ..........................</td></tr>
            <tr><td className="border-none">Konu</td><td className="border-none">: Görevlendirme ({form.name})</td></tr>
          </tbody>
        </table>

        <div className="mb-8 font-bold nk-print-body px-4">
          SAYIN: {form.assignedStaffName || '........................................'}
        </div>

        <div className="text-justify leading-loose mb-16 nk-print-body px-4">
          <p className="indent-10">
             İlgi mevzuat ve Milli Eğitim Bakanlığı Eğitim Kurumları Sosyal Etkinlikler Yönetmeliği esasları doğrultusunda, 
             <strong> {form.name}</strong> ile ilgili kutlama/anma programını hazırlamak ve okulumuzdaki panoları düzenlemek üzere görevlendirilmiş bulunmaktasınız.
          </p>
          <p className="indent-10 mt-4">
             Program kapsamında yapılacak olan <em>"{form.description || 'gerekli hazırlıklar'}"</em> çalışmalarının günün anlam ve önemine uygun olarak hazırlanıp belirtilen tarihler 
             (<strong>{form.startDate ? new Date(form.startDate).toLocaleDateString('tr-TR') : '.../.../....'}</strong> - <strong>{form.endDate ? new Date(form.endDate).toLocaleDateString('tr-TR') : '.../.../....'}</strong>) arasında idareye sunulması ve uygulanması hususunda;
          </p>
          <p className="indent-10 mt-4">
             Gereğini rica ederim.
          </p>
        </div>

        <div className="flex justify-end mt-20 nk-print-body px-4 break-inside-avoid">
           <div className="text-center w-1/3">
              <p className="mb-10 font-bold">Okul Müdürü</p>
              <p className="font-bold">{settings?.principalName || '....................'}</p>
           </div>
        </div>
        
        <div className="mt-24 border-t border-black pt-4 nk-print-body px-4 break-inside-avoid">
          <p className="font-bold mb-2">TEBELLÜĞ BELGESİ</p>
          <p>Yukarıdaki görevlendirme yazısını okudum ve tebellüğ ettim.</p>
          <div className="mt-8 flex justify-between w-2/3">
             <span>Tarih: ... / ... / 20...</span>
             <span>İmza: ....................</span>
          </div>
        </div>
      </PrintableDocument>
    );
  }
);

CommemorativeDaysPrintTemplate.displayName = 'CommemorativeDaysPrintTemplate';
