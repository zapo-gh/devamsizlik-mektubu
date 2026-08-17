import React from 'react';

interface SecmeliDersDilekcesiProps {
  schoolName: string;
  student?: {
    fullName: string;
    schoolNumber: string;
    tcNo?: string;
    className?: string;
    parents?: Array<{ fullName: string }>;
  } | null;
  principalName?: string;
  assistantPrincipalName?: string;
}

export const SecmeliDersDilekcesiPrint: React.FC<SecmeliDersDilekcesiProps> = ({ schoolName, student }) => {
  return (
    <div className="print-document" style={{ fontFamily: '"Times New Roman", Times, serif', fontSize: '11px', lineHeight: '1.4', color: 'black', padding: '10px 20px' }}>
      
      <h3 style={{ textAlign: 'center', fontWeight: 'bold', marginBottom: '20px', fontSize: '14px' }}>
        {(schoolName || '').toLocaleUpperCase('tr-TR')} MÜDÜRLÜĞÜNE
      </h3>
      
      <p style={{ textAlign: 'justify', marginBottom: '15px' }}>
        Velisi bulunduğum okulunuz <strong>{student?.className || '......'}</strong> sınıfı <strong>{student?.schoolNumber || '......'}</strong> numaralı öğrencisi <strong>{student ? student.fullName : '...................................................'}</strong>'nin 2026-2027 eğitim öğretim yılında aşağıda seçtiğim seçmeli dersleri almasını istiyorum.
      </p>

      <p style={{ textAlign: 'left', marginBottom: '20px' }}>
        Gereğini arz ederim.
      </p>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
        <div style={{ textAlign: 'center', minWidth: '200px' }}>
          <p style={{ margin: '0 0 20px 0' }}>İmza</p>
          <p style={{ margin: 0, fontWeight: 'bold' }}>
            {student?.parents?.[0] ? student.parents[0].fullName : 'Velinin Adı Soyadı'}
          </p>
        </div>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '15px' }}>
        <thead>
          <tr style={{ backgroundColor: '#f3f4f6' }}>
            <th style={{ padding: '4px', width: '30%', border: '1px solid black' }}>GRUP</th>
            <th style={{ padding: '4px', width: '50%', border: '1px solid black' }}>DERS ADI</th>
            <th style={{ padding: '4px', width: '20%', border: '1px solid black' }}>TERCİH EDİLEN DERS</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td rowSpan={8} style={{ padding: '4px', border: '1px solid black', fontWeight: 'bold' }}>İNSAN, TOPLUM VE BİLİM</td>
            <td style={{ padding: '4px', border: '1px solid black' }}>ASTRONOMİ VE UZAY BİLİMLERİ</td>
            <td style={{ padding: '4px', border: '1px solid black' }}></td>
          </tr>
          <tr>
            <td style={{ padding: '4px', border: '1px solid black' }}>SOSYAL BİLİM ÇALIŞMALARI</td>
            <td style={{ padding: '4px', border: '1px solid black' }}></td>
          </tr>
          <tr>
            <td style={{ padding: '4px', border: '1px solid black' }}>BİLİŞİM TEKNOLOJİLERİ VE YAZILIM</td>
            <td style={{ padding: '4px', border: '1px solid black' }}></td>
          </tr>
          <tr>
            <td style={{ padding: '4px', border: '1px solid black' }}>PROJE TASARIMI VE UYGULAMALARI</td>
            <td style={{ padding: '4px', border: '1px solid black' }}></td>
          </tr>
          <tr>
            <td style={{ padding: '4px', border: '1px solid black' }}>DÜŞÜNME EĞİTİMİ</td>
            <td style={{ padding: '4px', border: '1px solid black' }}></td>
          </tr>
          <tr>
            <td style={{ padding: '4px', border: '1px solid black' }}>DEMOKRASİ VE İNSAN HAKLARI</td>
            <td style={{ padding: '4px', border: '1px solid black' }}></td>
          </tr>
          <tr>
            <td style={{ padding: '4px', border: '1px solid black' }}>METİN TAHLİLLERİ</td>
            <td style={{ padding: '4px', border: '1px solid black' }}></td>
          </tr>
          <tr>
            <td style={{ padding: '4px', border: '1px solid black' }}>SEÇMELİ İKİNCİ YABANCI DİL</td>
            <td style={{ padding: '4px', border: '1px solid black' }}></td>
          </tr>

          <tr style={{ backgroundColor: '#e5e7eb', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
            <td rowSpan={3} style={{ padding: '4px', border: '1px solid black', fontWeight: 'bold' }}>DİN, AHLÂK VE DEĞER</td>
            <td style={{ padding: '4px', border: '1px solid black' }}>KUR’AN-I KERİM</td>
            <td style={{ padding: '4px', border: '1px solid black' }}></td>
          </tr>
          <tr style={{ backgroundColor: '#e5e7eb', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
            <td style={{ padding: '4px', border: '1px solid black' }}>PEYGAMBERİMİZİN HAYATI</td>
            <td style={{ padding: '4px', border: '1px solid black' }}></td>
          </tr>
          <tr style={{ backgroundColor: '#e5e7eb', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
            <td style={{ padding: '4px', border: '1px solid black' }}>TEMEL DİNÎ BİLGİLER</td>
            <td style={{ padding: '4px', border: '1px solid black' }}></td>
          </tr>

          <tr>
            <td rowSpan={4} style={{ padding: '4px', border: '1px solid black', fontWeight: 'bold' }}>KÜLTÜR, SANAT VE SPOR</td>
            <td style={{ padding: '4px', border: '1px solid black' }}>TÜRK SOSYAL HAYATINDA AİLE</td>
            <td style={{ padding: '4px', border: '1px solid black' }}></td>
          </tr>
          <tr>
            <td style={{ padding: '4px', border: '1px solid black' }}>İSLAM BİLİM TARİHİ</td>
            <td style={{ padding: '4px', border: '1px solid black' }}></td>
          </tr>
          <tr>
            <td style={{ padding: '4px', border: '1px solid black' }}>SPOR EĞİTİMİ</td>
            <td style={{ padding: '4px', border: '1px solid black' }}></td>
          </tr>
          <tr>
            <td style={{ padding: '4px', border: '1px solid black' }}>SANAT EĞİTİMİ</td>
            <td style={{ padding: '4px', border: '1px solid black' }}></td>
          </tr>
        </tbody>
      </table>

      <div style={{ marginTop: '10px', padding: '10px', border: '1px solid black' }}>
        <strong>NOTLAR:</strong>
        <ul style={{ paddingLeft: '20px', margin: '5px 0 0 0' }}>
          <li>3 Ders seçilmelidir.</li>
          <li>3 gruptan da en az bir ders seçilmek zorundadır.</li>
        </ul>
      </div>
    </div>
  );
};
