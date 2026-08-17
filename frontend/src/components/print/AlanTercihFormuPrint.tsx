import React from 'react';
import { CorporateHeader } from './CorporateHeader';

interface AlanTercihFormuProps {
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

export const AlanTercihFormuPrint: React.FC<AlanTercihFormuProps> = ({ schoolName, student, assistantPrincipalName }) => {
  return (
    <div className="print-document" style={{ fontFamily: '"Times New Roman", Times, serif', fontSize: '11px', lineHeight: '1.2', color: 'black', padding: '10px 20px' }}>
      <CorporateHeader schoolName={schoolName} />
      
      <h3 style={{ textAlign: 'center', fontWeight: 'bold', textDecoration: 'underline', marginBottom: '10px', fontSize: '12px' }}>
        ANADOLU MESLEK PROGRAMI 9 UNCU SINIFA YEREL YERLEŞTİRME İLE KAYIT OLAN ÖĞRENCİLERİN ALANA GEÇİŞ TERCİH BİLDİRİM FORMU
      </h3>
      <p style={{ textAlign: 'center', fontStyle: 'italic', marginBottom: '10px' }}>
        (Bu form internet üzerinden tercih yapamayan veliler için tasarlanmıştır)
      </p>

      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '10px' }}>
        <tbody>
          <tr>
            <th colSpan={2} style={{ padding: '4px', backgroundColor: '#f3f4f6', textAlign: 'left', border: '1px solid black' }}>ÖĞRENCİ BİLGİLERİ</th>
          </tr>
          <tr>
            <td style={{ padding: '4px', width: '30%', fontWeight: 'bold', border: '1px solid black' }}>T.C. Kimlik No</td>
            <td style={{ padding: '4px', border: '1px solid black' }}>{student?.tcNo || ''}</td>
          </tr>
          <tr>
            <td style={{ padding: '4px', fontWeight: 'bold', border: '1px solid black' }}>Sınıfı ve Şubesi</td>
            <td style={{ padding: '4px', border: '1px solid black' }}>{student?.className || '9. Sınıf'}</td>
          </tr>
          <tr>
            <td style={{ padding: '4px', fontWeight: 'bold', border: '1px solid black' }}>Adı Soyadı</td>
            <td style={{ padding: '4px', border: '1px solid black' }}>{student ? student.fullName : ''}</td>
          </tr>
          <tr>
            <td style={{ padding: '4px', fontWeight: 'bold', border: '1px solid black' }}>Okul No</td>
            <td style={{ padding: '4px', border: '1px solid black' }}>{student?.schoolNumber || ''}</td>
          </tr>
        </tbody>
      </table>

      <h4 style={{ fontWeight: 'bold', marginBottom: '5px', fontSize: '11px' }}>ALAN TERCİHLERİ (Kendi Okulunda ve Diğer Okullarda Bulunan Alanlar)</h4>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '10px' }}>
        <thead>
          <tr>
            <th style={{ padding: '4px', width: '5%', border: '1px solid black' }}>SIRA</th>
            <th style={{ padding: '4px', width: '10%', border: '1px solid black' }}>TERCİH KODU</th>
            <th style={{ padding: '4px', width: '35%', border: '1px solid black' }}>OKUL ADI</th>
            <th style={{ padding: '4px', width: '50%', border: '1px solid black' }}>ALAN ADI</th>
          </tr>
        </thead>
        <tbody>
          {[...Array(15)].map((_, i) => (
            <tr key={i}>
              <td style={{ padding: '4px', textAlign: 'center', border: '1px solid black' }}>{i + 1}.</td>
              <td style={{ padding: '4px', border: '1px solid black' }}></td>
              <td style={{ padding: '4px', border: '1px solid black' }}></td>
              <td style={{ padding: '4px', border: '1px solid black' }}></td>
            </tr>
          ))}
        </tbody>
      </table>

      <p style={{ fontWeight: 'bold', marginBottom: '10px' }}>*Sağlık durumum seçtiğim meslek alanlarında öğrenim görmem için uygundur.</p>
      
      <div style={{ fontSize: '10px', lineHeight: '1.2' }}>
        <strong>Açıklamalar:</strong>
        <ul style={{ paddingLeft: '15px', margin: '5px 0', listStyleType: 'none' }}>
          <li>Alana yerleştirme işlemi bu Kılavuzdaki açıklamalar doğrultusunda OBP ve tercih sıralamasına göre yapılacaktır.</li>
          <li>Denizcilik alanına ön yerleştirmesi yapılan öğrencinin “Gemiadamı Olur Sağlık Raporu”nu alması ve yerleştirildiği okul yönetimine teslim etmesi halinde ilgili alana kesin olarak yerleştirilmesi yapılacaktır.</li>
          <li>Anne ve/veya babasına ait çalışır durumda bir işyeri bulunduğunu ve işyeri ile ilgili mesleğini, meslek kuruluşlarından belgelendiremeyenler değerlendirmeye alınmayacaktır.</li>
          <li>Öğrenciler, kayıtlı olduğu okul ve diğer okullardaki alanlardan en fazla 15 tercih yapabilecektir.</li>
        </ul>
      </div>

      <p style={{ textAlign: 'right', marginTop: '10px' }}>
        Tercihler tarafımızdan kontrol edilerek e-Okul sistemine girilmiştir.
        <br />
        ..../.... / 2026
      </p>

      <table style={{ width: '100%', marginTop: '20px', textAlign: 'center' }}>
        <tbody>
          <tr>
            <td style={{ width: '33%' }}>
              <strong>Öğrenci</strong><br />
              {student ? student.fullName : 'Adı Soyadı'}<br />
              İmza
            </td>
            <td style={{ width: '33%' }}>
              <strong>Veli</strong><br />
              {student?.parents?.[0] ? student.parents[0].fullName : 'Adı Soyadı'}<br />
              İmza
            </td>
            <td style={{ width: '33%' }}>
              <strong>Müdür Yardımcısı</strong><br />
              {assistantPrincipalName || 'Adı Soyadı'}<br />
              İmza
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};
