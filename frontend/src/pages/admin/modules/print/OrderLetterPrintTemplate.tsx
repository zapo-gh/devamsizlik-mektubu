import React, { forwardRef } from 'react';
import { PrintableDocument } from '../../../../components/ui/PrintableDocument';
import { useSettings } from '../../../../context/SettingsContext';

interface OrderLetterPrintTemplateProps {
  form: any;
}

export const OrderLetterPrintTemplate = forwardRef<HTMLDivElement, OrderLetterPrintTemplateProps>(
  ({ form }, ref) => {
    const { settings } = useSettings();

    if (!form || !form.supplierName) return null;

    let items = [];
    try {
      if (typeof form.items === 'string') items = JSON.parse(form.items);
      else items = form.items || [];
    } catch {
      items = [];
    }

    const totalCost = items.reduce((sum: number, item: any) => sum + (Number(item.quantity) * Number(item.unitPrice)), 0);

    return (
      <PrintableDocument ref={ref} landscape={false}>
        <style>{`
          .nk-table { width: 100%; border-collapse: collapse; font-size: 13px; text-align: center; }
          .nk-table th, .nk-table td { border: 1px solid #000; padding: 6px; }
          .nk-table th { background-color: #f3f4f6 !important; -webkit-print-color-adjust: exact; }
          .nk-print-body { font-size: 14px; line-height: 1.6; }
        `}</style>

        <div className="text-center font-bold text-lg mb-12 leading-tight nk-print-body">
          T.C.<br/>
          MİLLİ EĞİTİM BAKANLIĞI<br/>
          {settings?.schoolName || '................ LİSESİ MÜDÜRLÜĞÜ'}<br/>
        </div>

        <div className="flex justify-between mb-8 font-bold nk-print-body">
          <div>
            Sayı: ..........................
          </div>
          <div>
            Tarih: {form.date ? new Date(form.date).toLocaleDateString('tr-TR') : '.../.../20...'}
          </div>
        </div>

        <div className="mb-8 font-bold nk-print-body">
          Konu: {form.subject}
        </div>

        <div className="mb-12 font-bold nk-print-body mt-12 text-center uppercase">
          SAYIN: {form.supplierName}<br/>
          <span className="font-normal text-sm capitalize">{form.supplierAddress || ''}</span>
        </div>

        <div className="text-justify mb-8 nk-print-body indent-8 px-4">
           Müdürlüğümüzün ihtiyacı olan ve aşağıda cinsi, miktarı ve özellikleri yazılı mal/hizmet/yapım işinin, 
           belirtilen fiyatlar üzerinden ve ekteki teknik şartnameye/numunesine uygun olarak, 
           <strong> {form.deliveryDate ? new Date(form.deliveryDate).toLocaleDateString('tr-TR') : '.../.../20...'}</strong> tarihine kadar 
           müdürlüğümüze teslim edilmesi hususunda;
        </div>
        <div className="text-justify mb-12 nk-print-body indent-8 px-4">
           Gereğini rica ederim.
        </div>

        <div className="flex justify-end mt-12 mb-16 px-4 nk-print-body">
           <div className="text-center w-1/3">
              <p className="font-bold mb-10">Okul Müdürü</p>
              <p className="font-bold">{settings?.principalName || '....................'}</p>
           </div>
        </div>

        <div className="mb-8 px-4 break-inside-avoid">
          <h3 className="font-bold mb-2">SİPARİŞ LİSTESİ</h3>
          <table className="nk-table">
            <thead>
              <tr>
                <th className="w-12">S.No</th>
                <th>Mal/Hizmetin Cinsi</th>
                <th className="w-20">Miktarı</th>
                <th className="w-24">Birimi</th>
                <th className="w-24">Birim Fiyatı</th>
                <th className="w-32">Tutarı (TL)</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item: any, idx: number) => {
                const rowTotal = Number(item.quantity) * Number(item.unitPrice);
                return (
                  <tr key={idx}>
                    <td>{idx + 1}</td>
                    <td className="text-left px-2">{item.name}</td>
                    <td>{item.quantity}</td>
                    <td>{item.unit}</td>
                    <td>{Number(item.unitPrice).toLocaleString('tr-TR')}</td>
                    <td>{rowTotal.toLocaleString('tr-TR')}</td>
                  </tr>
                );
              })}
              <tr className="font-bold">
                <td colSpan={5} className="text-right pr-4">GENEL TOPLAM (KDV Hariç)</td>
                <td>{totalCost.toLocaleString('tr-TR')} TL</td>
              </tr>
            </tbody>
          </table>
        </div>
        
        {form.notes && (
          <div className="px-4 break-inside-avoid text-sm">
            <strong>Not:</strong> {form.notes}
          </div>
        )}
      </PrintableDocument>
    );
  }
);

OrderLetterPrintTemplate.displayName = 'OrderLetterPrintTemplate';
