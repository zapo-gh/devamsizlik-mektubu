import React, { forwardRef } from 'react';
import { PrintableDocument } from '../../../../components/ui/PrintableDocument';

interface StaffTransferPrintTemplateProps {
  transfer: any;
}

export const StaffTransferPrintTemplate = forwardRef<HTMLDivElement, StaffTransferPrintTemplateProps>(
  ({ transfer }, ref) => {
    if (!transfer) return null;

    let ex: any = {};
    try {
      if (transfer.extraData) ex = JSON.parse(transfer.extraData);
    } catch {}

    const pt = transfer;

    return (
      <PrintableDocument ref={ref}>
        <style>{`
          .nk-table { width: 99.5%; margin: 0 auto; border-collapse: collapse; margin-bottom: 2px; box-sizing: border-box; }
          .nk-table td, .nk-table th { border: 1px solid #000; padding: 4px; font-size: 11px; }
          .nk-title { text-align: center; font-weight: bold; font-size: 14px; padding: 6px; }
          .nk-label { font-weight: bold; width: 35%; }
          .nk-sub { font-weight: bold; text-align: center; }
          .nk-sig-table td { border: 1px solid #000; padding: 4px; text-align: center; font-size: 11px; }
          .nk-sig-head { font-weight: bold; height: 30px; vertical-align: top; }
          .nk-sig-box { height: 40px; vertical-align: bottom; font-weight: bold; }
          .nk-sig-unvan { font-weight: normal; font-size: 10px; }
          .nk-sig-imza { height: 50px; vertical-align: top; }
        `}</style>

        <table className="nk-table w-full mb-2">
          <tbody>
            <tr><td colSpan={4} className="nk-title">PERSONEL NAKİL BİLDİRİMİ</td></tr>
            <tr><td className="nk-label">ADI-SOYADI</td><td colSpan={3}>{pt.staffName}</td></tr>
            <tr><td className="nk-label">T.C. KİMLİK NO</td><td colSpan={3}>{pt.tcKimlikNo || '-'}</td></tr>
            <tr><td className="nk-label">EMEKLİ SİCİL NO</td><td colSpan={3}>{ex.emekliSicilNo || '-'}</td></tr>
            <tr><td className="nk-label">SAYMANLIK KİŞİ NO</td><td colSpan={3}>{ex.saymanlikKisiNo || '-'}</td></tr>
            <tr>
              <td className="nk-label" rowSpan={2}>GÖREVİ</td>
              <td className="nk-sub w-1/4">ESKİ GÖREVİ</td><td className="nk-sub" colSpan={2}>YENİ GÖREVİ</td>
            </tr>
            <tr>
              <td className="text-center">{ex.eskiGorevi || '-'}</td><td className="text-center" colSpan={2}>{ex.yeniGorevi || '-'}</td>
            </tr>
            <tr>
              <td className="nk-label" rowSpan={2}>MEMURİYETİ</td>
              <td className="nk-sub">ESKİ GÖREV YERİ</td><td className="nk-sub" colSpan={2}>YENİ GÖREV YERİ</td>
            </tr>
            <tr>
              <td className="text-center">{pt.currentSchool || '-'}</td><td className="text-center" colSpan={2}>{pt.newSchool || '-'}</td>
            </tr>
            <tr><td className="nk-label">GÖREVE İLK BAŞLAMA TARİHİ</td><td colSpan={3}>{ex.goreveBaslamaTarihi || '-'}</td></tr>
            <tr>
              <td className="nk-label">DERECE - KADEMESİ</td>
              <td>ESKİ: {ex.eskiDerece || '-'}</td><td colSpan={2}>YENİ: {ex.yeniDerece || '-'}</td>
            </tr>
            <tr><td className="nk-label">TERFİ TARİHİ</td><td colSpan={3}>{ex.terfiTarihi || '-'}</td></tr>
            <tr><td className="nk-label">ÖĞRENİM DURUMU</td><td colSpan={3}>{ex.ogrenimDurumu || '-'}</td></tr>
            <tr><td className="nk-label">AİLE DURUMU (EŞİNİN ÇALIŞIP ÇALIŞMADIĞI)</td><td colSpan={3}>{ex.aileDurumu || '-'}</td></tr>
            <tr><td className="nk-label">YILLIK İZİN DURUMU</td><td colSpan={3}>{ex.yillikIzinDurumu || '-'}</td></tr>
            <tr><td className="nk-label">KIDEM AYLIĞINA ESAS HİZMET SÜRESİ</td><td colSpan={3}>{ex.kidemHizmetSuresi || '-'}</td></tr>
            <tr>
              <td className="nk-label">ATAMA VE TEBLİĞ TARİHİ</td>
              <td>ATAMA: {ex.atamaTarihi || '-'}</td><td colSpan={2}>TEBLİĞ: {ex.tebligTarihi || '-'}</td>
            </tr>
            <tr><td className="nk-label">ESKİ MEMURİYETİNDEN AYRILIŞ TARİHİ</td><td colSpan={3}>{ex.ayrilisTarihi || pt.transferDate || '-'}</td></tr>
            <tr><td className="nk-label">YENİ GÖREV YERİNDE AYLIĞA HAK KAZANDIĞI TARİH</td><td colSpan={3}>{ex.ayligaHakKazanmaTarihi || '-'}</td></tr>
            <tr><td className="nk-label">15 GÜN İÇİNDE HAREKAT ETMEDİĞİ TAKTİRDE GECİKME NEDENİ</td><td colSpan={3}>{ex.gecikmeNedeni || '-'}</td></tr>
            <tr><td className="nk-label">ŞAHSİ VE AİLE YOLLUĞUNU ALIP ALMADIĞI (ALMIŞ İSE TUTARI)</td><td colSpan={3}>{ex.yollukDurumu === 'Almıştır' ? `ALMIŞTIR (${ex.yollukTutari})` : 'ALMAMIŞTIR'}</td></tr>
            <tr><td className="nk-label">GİYECEK YARDIMI ALIP, ALMADIĞI (ALMIŞ İSE TUTARI)</td><td colSpan={3}>{ex.giyecekYardimi === 'Almıştır' ? `ALMIŞTIR (${ex.giyecekTutari})` : 'YOKTUR'}</td></tr>
            <tr><td className="nk-label">BANKA PROMOSYONU ALIP ALMADIĞI (ALMIŞ İSE TARİH VE TUTARI)</td><td colSpan={3}>{ex.bankaPromosyonu === 'Almıştır' ? `ALMIŞTIR - ${ex.bankaPromosyonTarihTutar}` : 'YOKTUR'}</td></tr>
            <tr><td className="nk-label">EĞİTİME HAZIRLIK ÖDENEĞİNİ ALIP ALMADIĞI (ALMIŞ İSE TUTARI)</td><td colSpan={3}>{ex.egitimeHazirlikOdenegi === 'Almıştır' ? `ALMIŞTIR - ${ex.egitimeHazirlikTarihTutar}` : 'YOKTUR'}</td></tr>
            <tr><td className="nk-label">BORÇLU İSE BORÇLARINA AİT BİLGİLER</td><td colSpan={3}>{ex.borcDurumu === 'Yoktur' ? 'BİLİNEN BORCU YOKTUR' : ex.borcMetin}</td></tr>
            <tr><td className="nk-label">MAAŞI ÜZERİNDE İCRA VEYA NAFAKA KESİNTİSİ</td><td colSpan={3}>{ex.icraNafaka || 'Yoktur'}</td></tr>
            <tr><td className="nk-label">ALMIŞ OLDUĞU SAĞLIK RAPORLARI (HEYET / NORMAL)</td><td colSpan={3}>Heyet: {ex.saglikRaporuHeyet || 'Yok'} &nbsp;|&nbsp; Normal: {ex.saglikRaporuNormal || 'Yok'}</td></tr>
            <tr><td className="nk-label">SÜRE GELEN GELİR VERGİSİ MATRAHI (YIL İÇİNDEKİ TOPLAMI)</td><td colSpan={3}>{ex.gelirVergisiMatrahi}</td></tr>
            <tr><td className="nk-label">YABANCI DİL TAZMİNATINDAN YARARLANIP YARARLANMADIĞI</td><td colSpan={3}>{ex.yabanciDilTazminati}</td></tr>
            <tr><td className="nk-label">ÜZERİNDE ZİMMET KAYDININ BULUNUP BULUNMADIĞI</td><td colSpan={3}>{ex.zimmetDurumu === 'Yoktur' ? 'YOKTUR' : ex.zimmetMetin}</td></tr>
            <tr><td className="nk-label">SENDİKA BİLGİLERİ</td><td colSpan={3}>{ex.sendikaBilgisi || '-'}</td></tr>
          </tbody>
        </table>

        <table className="nk-table nk-sig-table w-full mt-2">
          <tbody>
            <tr>
              <td className="nk-sig-head" style={{ width: '25%' }}>Düzenleyen<br/>(Müdür Yardımcısı)</td>
              <td className="nk-sig-head" style={{ width: '25%' }}>Düzenleyen<br/>(Okul Müdürü)</td>
              <td className="nk-sig-head" style={{ width: '25%' }}>Tahakkuk Memuru<br/>(Gerçekleştirme Görevlisi)</td>
              <td className="nk-sig-head" style={{ width: '25%' }}>Personel Birim Yetkilisi</td>
            </tr>
            <tr>
              <td className="nk-sig-box">
                {ex.mudurYardimcisiAd || '................'}<br/>
                <span className="nk-sig-unvan">{ex.mudurYardimcisiUnvan}</span>
              </td>
              <td className="nk-sig-box">
                {ex.okulMuduruAd || '................'}<br/>
                <span className="nk-sig-unvan">Okul Müdürü</span>
              </td>
              <td className="nk-sig-box">
                {ex.tahakkukMemuruAd || '................'}<br/>
                <span className="nk-sig-unvan">{ex.tahakkukMemuruUnvan}</span>
              </td>
              <td className="nk-sig-box">
                {ex.personelBirimYetkilisiAd || '................'}<br/>
                <span className="nk-sig-unvan">{ex.personelBirimYetkilisiUnvan}</span>
              </td>
            </tr>
            <tr>
              <td className="nk-sig-imza">İmza</td>
              <td className="nk-sig-imza">İmza</td>
              <td className="nk-sig-imza">İmza</td>
              <td className="nk-sig-imza">İmza</td>
            </tr>
          </tbody>
        </table>
      </PrintableDocument>
    );
  }
);

StaffTransferPrintTemplate.displayName = 'StaffTransferPrintTemplate';
