import React, { forwardRef } from 'react';
import { PrintableDocument } from '../../../../components/ui/PrintableDocument';

interface ProcurementPrintTemplateProps {
  formData: any;
  suppliers: any[];
  type: 'onay_belgesi' | 'piyasa_arastirma' | 'muayene_kabul';
}

export const ProcurementPrintTemplate = forwardRef<HTMLDivElement, ProcurementPrintTemplateProps>(
  ({ formData, suppliers, type }, ref) => {
    
    if (type === 'onay_belgesi') {
      return (
        <PrintableDocument ref={ref} title="ONAY BELGESİ">
          <table className="w-full mb-6">
            <tbody>
              <tr><td className="w-2/5 font-bold p-1 align-top">İşin Cinsi ve Niteliği</td><td className="p-1 align-top">: {formData.title}</td></tr>
              <tr><td className="w-2/5 font-bold p-1 align-top">Alım Usulü</td><td className="p-1 align-top">: 4734 Sayılı Kanun 22/d (Doğrudan Temin)</td></tr>
              <tr><td className="w-2/5 font-bold p-1 align-top">Yaklaşık Maliyeti</td><td className="p-1 align-top">: İhtiyaç Listesi ve Piyasa Araştırması Ektedir.</td></tr>
              <tr><td className="w-2/5 font-bold p-1 align-top">Kullanılabilir Ödenek Tutarı</td><td className="p-1 align-top">: ..........................</td></tr>
            </tbody>
          </table>
          <p className="mb-4">
            Yukarıda belirtilen işin 4734 Sayılı Kamu İhale Kanununun 22. maddesinin (d) bendi gereğince Doğrudan Temin Usulü ile yaptırılması / alınması ve piyasa fiyat araştırması yapmak üzere aşağıda isimleri belirtilen personelin görevlendirilmesi hususunu;
          </p>
          <p className="mb-10">Makamlarınızın Olur'larına arz ederim.</p>
          
          <div className="text-right mb-10 pr-10">
             <p className="font-bold">{formData.commissionMembers[1]?.name || '................'}</p>
             <p>{formData.commissionMembers[1]?.title || 'Başkan'}</p>
          </div>
          
          <div className="text-center mt-12">
             <h3 className="font-bold text-lg mb-4">O L U R</h3>
             <p className="mb-8">{formData.date ? new Date(formData.date).toLocaleDateString('tr-TR') : '.../.../20...' }</p>
             <p className="font-bold">{formData.commissionMembers[0]?.name || '................'}</p>
             <p>{formData.commissionMembers[0]?.title || 'Harcama Yetkilisi'}</p>
          </div>
        </PrintableDocument>
      );
    }

    if (type === 'piyasa_arastirma') {
      const getWinnerSupplierNameForPrint = (itemId: string) => {
        const winner = formData.offers?.find((o:any) => o.tempItemId === itemId && o.isWinner);
        if(!winner) return '-';
        const sup = suppliers.find(s => s.id === winner.supplierId);
        return sup ? sup.name : '-';
      };
      
      const getWinnerPriceForPrint = (itemId: string) => {
        const winner = formData.offers?.find((o:any) => o.tempItemId === itemId && o.isWinner);
        if(!winner) return 0;
        return Number(winner.offeredPrice) || 0;
      };

      return (
        <PrintableDocument ref={ref} title="PİYASA FİYAT ARAŞTIRMASI TUTANAĞI">
          <p className="mb-2"><strong>İşin Adı:</strong> {formData.title}</p>
          <p className="mb-6">4734 Sayılı Kamu İhale Kanununun 22/d maddesi gereğince yapılan piyasa fiyat araştırması sonucunda uygun görülen fiyatlar aşağıya çıkarılmıştır.</p>
          
          <table className="w-full border-collapse text-center text-xs mb-10">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-black p-2 w-10">S.No</th>
                <th className="border border-black p-2">Malın / İşin Adı</th>
                <th className="border border-black p-2 w-16">Miktarı</th>
                <th className="border border-black p-2 w-16">Birimi</th>
                <th className="border border-black p-2">Uygun Görülen Firma</th>
                <th className="border border-black p-2 w-24">Birim Fiyatı (TL)</th>
                <th className="border border-black p-2 w-24">Toplam Tutarı (TL)</th>
              </tr>
            </thead>
            <tbody>
              {formData.items?.map((item: any, idx: number) => {
                const winnerSup = getWinnerSupplierNameForPrint(item.tempId);
                const winnerPrice = getWinnerPriceForPrint(item.tempId);
                const total = winnerPrice * Number(item.quantity);
                return (
                  <tr key={item.tempId || idx}>
                    <td className="border border-black p-2">{idx + 1}</td>
                    <td className="border border-black p-2 text-left">{item.name}</td>
                    <td className="border border-black p-2">{item.quantity}</td>
                    <td className="border border-black p-2">{item.unit}</td>
                    <td className="border border-black p-2 text-left font-bold">{winnerSup}</td>
                    <td className="border border-black p-2 text-right">{winnerPrice.toFixed(2)}</td>
                    <td className="border border-black p-2 text-right font-bold">{total.toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <table className="w-full text-center mt-12 border-none">
            <tbody>
              <tr>
                <td className="border-none w-1/3">
                  <p className="font-bold">{formData.commissionMembers[1]?.name || '................'}</p>
                  <p>{formData.commissionMembers[1]?.title || 'Başkan'}</p>
                </td>
                <td className="border-none w-1/3">
                  <p className="font-bold">{formData.commissionMembers[2]?.name || '................'}</p>
                  <p>{formData.commissionMembers[2]?.title || 'Üye'}</p>
                </td>
                <td className="border-none w-1/3">
                  <p className="font-bold">{formData.commissionMembers[3]?.name || '................'}</p>
                  <p>{formData.commissionMembers[3]?.title || 'Üye'}</p>
                </td>
              </tr>
            </tbody>
          </table>
        </PrintableDocument>
      );
    }

    if (type === 'muayene_kabul') {
      const getWinnerSupplierNameForPrint = (itemId: string) => {
        const winner = formData.offers?.find((o:any) => o.tempItemId === itemId && o.isWinner);
        if(!winner) return '-';
        const sup = suppliers.find(s => s.id === winner.supplierId);
        return sup ? sup.name : '-';
      };

      const winnerSuppliers = Array.from(new Set(
        formData.items?.map((item: any) => getWinnerSupplierNameForPrint(item.tempId))
      )).filter(s => s !== '-').join(', ');

      return (
        <PrintableDocument ref={ref} title="MUAYENE VE KABUL KOMİSYONU TUTANAĞI">
          <table className="w-full mb-6 border-collapse border border-black text-sm">
            <tbody>
              <tr><td className="w-1/3 font-bold p-2 border border-black align-top">İşin Adı</td><td className="p-2 border border-black align-top">{formData.title}</td></tr>
              <tr><td className="w-1/3 font-bold p-2 border border-black align-top">Yüklenici (Firma)</td><td className="p-2 border border-black align-top">{winnerSuppliers || '.........................'}</td></tr>
              <tr><td className="w-1/3 font-bold p-2 border border-black align-top">Sözleşme / Sipariş Tarihi</td><td className="p-2 border border-black align-top">{formData.date ? new Date(formData.date).toLocaleDateString('tr-TR') : '.../.../20...'}</td></tr>
              <tr><td className="w-1/3 font-bold p-2 border border-black align-top">Muayene ve Kabul Tarihi</td><td className="p-2 border border-black align-top">.../.../20...</td></tr>
            </tbody>
          </table>
          <p className="mb-4 text-justify">
            Yukarıda yazılı işin / malın / hizmetin, Muayene ve Kabul Komisyonumuz tarafından yapılan fiziki muayenesi ve kontrolü sonucunda; sipariş / sözleşme şartlarına, teknik şartnameye ve numunesine uygun olduğu / olmadığı tespit edilmiş olup, iş bu tutanak komisyonumuzca müştereken tanzim ve imza edilmiştir.
          </p>
          <p className="mb-12">Karar: İşin/Malın/Hizmetin <strong>KABULÜNE / REDDİNE</strong> karar verilmiştir.</p>
          
          <table className="w-full text-center mt-12 border-none">
            <tbody>
              <tr>
                <td className="border-none w-1/3">
                  <p className="font-bold">{formData.commissionMembers[1]?.name || '................'}</p>
                  <p>{formData.commissionMembers[1]?.title || 'Komisyon Başkanı'}</p>
                </td>
                <td className="border-none w-1/3">
                  <p className="font-bold">{formData.commissionMembers[2]?.name || '................'}</p>
                  <p>{formData.commissionMembers[2]?.title || 'Üye'}</p>
                </td>
                <td className="border-none w-1/3">
                  <p className="font-bold">{formData.commissionMembers[3]?.name || '................'}</p>
                  <p>{formData.commissionMembers[3]?.title || 'Üye (Uzman)'}</p>
                </td>
              </tr>
            </tbody>
          </table>
        </PrintableDocument>
      );
    }

    return null;
  }
);

ProcurementPrintTemplate.displayName = 'ProcurementPrintTemplate';
