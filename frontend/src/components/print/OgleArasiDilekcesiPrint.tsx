import React from 'react';

interface OgleArasiDilekcesiProps {
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

export const OgleArasiDilekcesiPrint: React.FC<OgleArasiDilekcesiProps> = ({ schoolName, student }) => {
  
  // Öğle arası dilekçesinde 2 adet dilekçe kısmı var (üst ve alt) kesilip verilmek için muhtemelen
  const DilekceKismi = () => (
    <div style={{ padding: '20px', border: '1px dashed #ccc', marginBottom: '20px' }}>
      <h3 style={{ textAlign: 'center', fontWeight: 'bold', marginBottom: '30px', fontSize: '16px' }}>
        {(schoolName || '').toLocaleUpperCase('tr-TR')} MÜDÜRLÜĞÜNE
      </h3>
      
      <p style={{ textIndent: '40px', textAlign: 'justify', marginBottom: '15px' }}>
        Velisi bulunduğum okulunuz <strong>{student?.className || '..................'}</strong> sınıfı, <strong>{student?.schoolNumber || '............'}</strong> numaralı öğrencisi <strong>{student ? student.fullName : '...................................................'}</strong>'nin öğle arası dinlenme tatilinde okul dışına çıkmasına ve öğle yemeğini okul dışında yemesine izin veriyorum. Öğle arası tatilinde okul dışında bulunduğu saatlerde öğrencimin karşılaşabileceği her türlü olumsuzlukta sorumluluğun tarafıma ait olduğunu kabul ve taahhüt ediyorum.
      </p>

      <p style={{ textAlign: 'left', marginBottom: '40px' }}>
        Gereğini arz ederim.
      </p>

      <table style={{ width: '100%' }}>
        <tbody>
          <tr>
            <td style={{ width: '60%', verticalAlign: 'top' }}>
              <strong>Telefon:</strong> ______________________________________________________________<br /><br />
              <strong>Adres:</strong> ________________________________________________________________<br />
              ____________________________________________________________________________________
            </td>
            <td style={{ width: '40%', textAlign: 'center', verticalAlign: 'top' }}>
              <p style={{ margin: '0 0 40px 0' }}><strong>Veli Adı Soyadı:</strong><br />{student?.parents?.[0] ? student.parents[0].fullName : '________________________________________________'}</p>
              <p style={{ margin: 0 }}>İmza</p>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="print-document" style={{ fontFamily: '"Times New Roman", Times, serif', fontSize: '15px', color: 'black', padding: '10px' }}>
      <DilekceKismi />
      <div style={{ textAlign: 'center', margin: '20px 0', borderBottom: '1px dashed black' }}>
        <span style={{ backgroundColor: 'white', padding: '0 10px', color: '#666' }}>✂ KESİNİZ ✂</span>
      </div>
      <DilekceKismi />
    </div>
  );
};
