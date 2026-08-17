import React, { forwardRef } from 'react';
import { PrintableDocument } from '../../../../components/ui/PrintableDocument';
import { useSettings } from '../../../../context/SettingsContext';

interface TravelAllowancePrintTemplateProps {
  data: any;
}

export const TravelAllowancePrintTemplate = forwardRef<HTMLDivElement, TravelAllowancePrintTemplateProps>(
  ({ data }, ref) => {
    const { settings } = useSettings();

    const title = data.purpose?.toLowerCase().includes('sürekli') 
      ? 'SÜREKLİ GÖREV YOLLUĞU BİLDİRİMİ' 
      : 'GEÇİCİ GÖREV YOLLUĞU BİLDİRİMİ';

    // Parse extraData if exists
    let extra = { gradeStep: '- / -', familyStatus: 'Bekar', childrenCount: 0, distanceKm: 0, bankIban: '' };
    try {
      if (data.extraData) extra = JSON.parse(data.extraData);
    } catch {}

    // Calculation constants & assumptions
    const baseDaily = parseFloat(data.dailyAllowance) || 0;
    const baseTransport = parseFloat(data.transportCost) || 0;
    const accommodation = parseFloat(data.accommodationCost) || 0;
    const isMarried = extra.familyStatus?.includes('Evli (Eş Çalışmıyor)');
    const children = Number(extra.childrenCount) || 0;
    
    // Yevmiye Carpanlari
    const multiplierSelf = 1; // 1 yevmiye + yol + 20 yevmiye sabit (Sürekli görevde kendisi için 20) -- simplified here for print
    // For GEÇİCİ görev it's just daily * days
    
    // We will just do a generic table for print since calculation logic can be complex
    const isSurekli = data.purpose?.toLowerCase().includes('sürekli');
    
    // Simplified table logic
    const rows = [
      { name: data.staffName, relation: 'Kendisi', daily: baseDaily, transport: baseTransport, total: baseDaily + baseTransport }
    ];
    
    if (isMarried) {
      rows.push({ name: 'Eşi', relation: 'Eşi', daily: baseDaily, transport: baseTransport, total: baseDaily + baseTransport });
    }
    for (let i = 0; i < children; i++) {
      // Çocuklar için yarım yevmiye
      rows.push({ name: `Çocuk ${i+1}`, relation: 'Çocuğu', daily: baseDaily / 2, transport: baseTransport, total: (baseDaily / 2) + baseTransport });
    }

    // Aile Yardım / Yer değiştirme masrafı (Sürekli görev)
    let extraRelocation = 0;
    if (isSurekli) {
       extraRelocation = (baseDaily * 20) + (isMarried ? baseDaily * 10 : 0) + (children * baseDaily * 10);
    }

    const totalGrand = rows.reduce((acc, row) => acc + row.total, 0) + accommodation + extraRelocation;

    return (
      <PrintableDocument ref={ref} landscape={false}>
        <div className="text-center mb-6">
          <h2 className="text-xl font-bold uppercase underline">{title}</h2>
        </div>

        <table className="w-full text-sm border border-black border-collapse mb-6">
          <tbody>
            <tr>
              <td className="border border-black p-2 font-bold w-1/3 bg-gray-100">Adı Soyadı</td>
              <td className="border border-black p-2">{data.staffName}</td>
            </tr>
            <tr>
              <td className="border border-black p-2 font-bold bg-gray-100">Unvanı / Kadro Derecesi</td>
              <td className="border border-black p-2">{data.title || '-'} / {extra.gradeStep}</td>
            </tr>
            <tr>
              <td className="border border-black p-2 font-bold bg-gray-100">Aile Durumu</td>
              <td className="border border-black p-2">{extra.familyStatus} - {extra.childrenCount} Çocuk</td>
            </tr>
            <tr>
              <td className="border border-black p-2 font-bold bg-gray-100">Memuriyet Mahalli</td>
              <td className="border border-black p-2">{data.departurePlace}</td>
            </tr>
            <tr>
              <td className="border border-black p-2 font-bold bg-gray-100">Gideceği Yer (Mesafe)</td>
              <td className="border border-black p-2">{data.arrivalPlace} ({extra.distanceKm} KM)</td>
            </tr>
            <tr>
              <td className="border border-black p-2 font-bold bg-gray-100">Hareket Tarihi</td>
              <td className="border border-black p-2">{data.departureDate}</td>
            </tr>
            <tr>
              <td className="border border-black p-2 font-bold bg-gray-100">Taşıt Aracı</td>
              <td className="border border-black p-2">{data.transportType}</td>
            </tr>
            <tr>
              <td className="border border-black p-2 font-bold bg-gray-100">Banka IBAN</td>
              <td className="border border-black p-2">{extra.bankIban || 'TR........................'}</td>
            </tr>
          </tbody>
        </table>

        <h3 className="font-bold text-md mb-2">Harcama Detayları</h3>
        <table className="w-full text-sm border border-black border-collapse mb-6 text-center">
          <thead className="bg-gray-100">
            <tr>
              <th className="border border-black p-2">Adı Soyadı</th>
              <th className="border border-black p-2">Yakınlık</th>
              <th className="border border-black p-2">Yevmiye (TL)</th>
              <th className="border border-black p-2">Yol Gideri (TL)</th>
              <th className="border border-black p-2">Toplam (TL)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td className="border border-black p-2 text-left">{r.name}</td>
                <td className="border border-black p-2">{r.relation}</td>
                <td className="border border-black p-2">{r.daily.toFixed(2)}</td>
                <td className="border border-black p-2">{r.transport.toFixed(2)}</td>
                <td className="border border-black p-2 font-bold">{r.total.toFixed(2)}</td>
              </tr>
            ))}
            {isSurekli && (
              <tr>
                <td className="border border-black p-2 text-left" colSpan={4}>Yer Değiştirme Masrafı (Sabit ve Değişken Unsur)</td>
                <td className="border border-black p-2 font-bold">{extraRelocation.toFixed(2)}</td>
              </tr>
            )}
            <tr>
              <td className="border border-black p-2 text-right font-bold" colSpan={4}>Konaklama Gideri : </td>
              <td className="border border-black p-2 font-bold">{accommodation.toFixed(2)}</td>
            </tr>
            <tr className="bg-gray-100">
              <td className="border border-black p-2 text-right font-bold" colSpan={4}>GENEL TOPLAM : </td>
              <td className="border border-black p-2 font-bold text-lg">{totalGrand.toFixed(2)} TL</td>
            </tr>
          </tbody>
        </table>

        <div className="mt-8 text-sm text-justify mb-16">
          <p>
            Yukarıdaki bilgilerin doğruluğunu, yolluk bildirimi ve eklerine uygunluğunu beyan ederim. Aksi sabit olduğu takdirde 657 sayılı Kanunun ilgili maddelerine göre işlem yapılmasını kabul ediyorum.
          </p>
        </div>

        <table className="w-full text-center border-none mt-8 text-sm">
          <tbody>
            <tr>
              <td className="border-none w-1/2 align-bottom h-24">
                <p className="mb-4">B E Y A N  E D E R İ M</p>
                <p>.../.../20...</p>
                <p className="font-bold mt-4">{data.staffName}</p>
                <p>{data.title || 'Personel'}</p>
              </td>
              <td className="border-none w-1/2 align-bottom h-24">
                <p className="mb-4">T A S D İ K  O L U N U R</p>
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

TravelAllowancePrintTemplate.displayName = 'TravelAllowancePrintTemplate';
