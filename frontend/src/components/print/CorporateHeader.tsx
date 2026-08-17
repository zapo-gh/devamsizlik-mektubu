import React from 'react';

interface CorporateHeaderProps {
  schoolName: string;
}

export const CorporateHeader: React.FC<CorporateHeaderProps> = ({ schoolName }) => {
  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center', 
      borderBottom: '2px solid #1e293b', 
      paddingBottom: '8px', 
      marginBottom: '10px' 
    }}>
      {/* MEB Logo */}
      <div style={{ width: '50px', height: '50px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <img src="/meb-logo.png" alt="MEB Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
      </div>
      
      {/* Kurumsal Metin */}
      <div style={{ flex: 1, textAlign: 'center', padding: '0 10px' }}>
        <h2 style={{ margin: 0, fontSize: '14px', fontWeight: 'bold', color: '#1e293b', textTransform: 'uppercase', fontFamily: '"Times New Roman", Times, serif' }}>
          T.C.
        </h2>
        <h2 style={{ margin: '2px 0', fontSize: '14px', fontWeight: 'bold', color: '#1e293b', textTransform: 'uppercase', fontFamily: '"Times New Roman", Times, serif' }}>
          MİLLÎ EĞİTİM BAKANLIĞI
        </h2>
        <h1 style={{ margin: '4px 0 0 0', fontSize: '16px', fontWeight: 'bold', color: '#0f172a', textTransform: 'uppercase', fontFamily: '"Times New Roman", Times, serif' }}>
          {schoolName ? schoolName.toLocaleUpperCase('tr-TR') : 'ALİYA İZZETBEGOVİÇ MESLEKİ VE TEKNİK ANADOLU LİSESİ'}
        </h1>
      </div>
      
      {/* Okul Logo */}
      <div style={{ width: '50px', height: '50px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <img src="/meb-logo.png" alt="Okul Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
      </div>
    </div>
  );
};
