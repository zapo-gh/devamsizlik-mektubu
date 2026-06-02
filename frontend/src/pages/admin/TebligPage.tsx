import { useState, useEffect } from 'react';
import api from '../../services/api';

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}.${mm}.${d.getFullYear()}`;
}

export default function TebligPage() {
  const [schoolName,               setSchoolName]               = useState('');
  const [adiSoyadi,                setAdiSoyadi]                = useState('');
  const [tcKimlikNo,               setTcKimlikNo]               = useState('');
  const [unvani,                   setUnvani]                   = useState('');
  const [gorevYeri,                setGorevYeri]                = useState('');
  const [tebligTarihSayi,          setTebligTarihSayi]          = useState('');
  const [tebligatinKonusu,         setTebligatinKonusu]         = useState('');
  const [evrakYaziKarar,           setEvrakYaziKarar]           = useState(false);
  const [evrakSertifika,           setEvrakSertifika]           = useState(false);
  const [evrakBasariBelgesi,       setEvrakBasariBelgesi]       = useState(false);
  const [evrakAtamaGorevlendirme,  setEvrakAtamaGorevlendirme]  = useState(false);
  const [evrakDiger,               setEvrakDiger]               = useState('');
  const [tebligatTarihi,           setTebligatTarihi]           = useState(new Date().toISOString().slice(0, 10));
  const [tebligatSaati,            setTebligatSaati]            = useState('');
  const [tebligEdenAdSoyad,        setTebligEdenAdSoyad]        = useState('');
  const [tebligEdenUnvani,         setTebligEdenUnvani]         = useState('');
  const [tebligEdenTarih,          setTebligEdenTarih]          = useState(new Date().toISOString().slice(0, 10));
  const [tebellugEdenAdSoyad,      setTebellugEdenAdSoyad]      = useState('');
  const [tebellugEdenUnvani,       setTebellugEdenUnvani]       = useState('');
  const [tebellugEdenTarih,        setTebellugEdenTarih]        = useState(new Date().toISOString().slice(0, 10));

  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    api.get('/settings').then((res: any) => {
      const d = res.data?.data || res.data;
      if (d?.schoolName) setSchoolName(d.schoolName);
    }).catch(() => {});
  }, []);

  const handleGenerate = async () => {
    if (!adiSoyadi.trim()) {
      setError('Adı Soyadı zorunludur.');
      return;
    }
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const res = await api.post('/teblig/generate-pdf', {
        schoolName,
        adiSoyadi,
        tcKimlikNo,
        unvani,
        gorevYeri,
        tebligTarihSayi,
        tebligatinKonusu,
        evrakYaziKarar,
        evrakSertifika,
        evrakBasariBelgesi,
        evrakAtamaGorevlendirme,
        evrakDiger,
        tebligatTarihi: formatDate(tebligatTarihi),
        tebligatSaati,
        tebligEdenAdSoyad,
        tebligEdenUnvani,
        tebligEdenTarih:   formatDate(tebligEdenTarih),
        tebellugEdenAdSoyad,
        tebellugEdenUnvani,
        tebellugEdenTarih: formatDate(tebellugEdenTarih),
      }, { responseType: 'blob' });

      const url = URL.createObjectURL(res.data);
      const a   = document.createElement('a');
      a.href    = url;
      const safeName = adiSoyadi.replace(/[^a-zA-Z0-9\s]/g, '').trim().replace(/\s+/g, '-');
      a.download = `teblig-tebellug-${safeName}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setSuccess('Belge başarıyla oluşturuldu ve indirildi.');
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Bilinmeyen hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Tebliğ – Tebellüğ Belgesi</h1>
          <p className="page-subtitle">Personele yapılan tebligatı belgeleyen resmi form (PDF)</p>
        </div>
      </div>

      {error   && <div className="alert alert-error"   style={{ marginBottom: 16 }}>{error}</div>}
      {success && <div className="alert alert-success" style={{ marginBottom: 16 }}>{success}</div>}

      {/* Okul Bilgisi */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Okul / Kurum Adı</label>
          <input
            className="form-control"
            value={schoolName}
            onChange={e => setSchoolName(e.target.value)}
            placeholder="Ör: Farabi Mesleki ve Teknik Anadolu Lisesi Müdürlüğü"
          />
        </div>
      </div>

      {/* Personel Bilgileri */}
      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ fontWeight: 700, fontSize: 14, marginBottom: 16, color: 'var(--text)' }}>
          Personel Bilgileri
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
          <div className="form-group">
            <label className="form-label">
              Adı Soyadı <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <input
              className="form-control"
              value={adiSoyadi}
              onChange={e => setAdiSoyadi(e.target.value)}
              placeholder="Personelin adı ve soyadı"
            />
          </div>
          <div className="form-group">
            <label className="form-label">T.C. Kimlik No</label>
            <input
              className="form-control"
              value={tcKimlikNo}
              onChange={e => setTcKimlikNo(e.target.value.replace(/\D/g, '').slice(0, 11))}
              placeholder="00000000000"
              maxLength={11}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Unvanı / Branşı</label>
            <input
              className="form-control"
              value={unvani}
              onChange={e => setUnvani(e.target.value)}
              placeholder="Ör: Öğretmen / Matematik"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Görev Yeri</label>
            <input
              className="form-control"
              value={gorevYeri}
              onChange={e => setGorevYeri(e.target.value)}
              placeholder="Ör: Okul adı"
            />
          </div>
        </div>
      </div>

      {/* Belge Bilgileri */}
      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ fontWeight: 700, fontSize: 14, marginBottom: 16, color: 'var(--text)' }}>
          Belge Bilgileri
        </h3>

        <div className="form-group">
          <label className="form-label">
            Tebliğ Edilen Yazı, Onay veya Kararın Tarih ve Sayısı
          </label>
          <input
            className="form-control"
            value={tebligTarihSayi}
            onChange={e => setTebligTarihSayi(e.target.value)}
            placeholder="Ör: 01.05.2026 tarih, 2026/123 sayılı yazı"
          />
        </div>

        <div className="form-group">
          <label className="form-label">Tebligatın Konusu</label>
          <input
            className="form-control"
            value={tebligatinKonusu}
            onChange={e => setTebligatinKonusu(e.target.value)}
            placeholder="Ör: Disiplin soruşturması başlatılması hk."
          />
        </div>

        <div className="form-group">
          <label className="form-label">Tebliğ Edilen Evrak</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 24px', marginTop: 8 }}>
            {([
              ['evrakYaziKarar',          evrakYaziKarar,          setEvrakYaziKarar,          'Yazı/Karar'],
              ['evrakSertifika',          evrakSertifika,          setEvrakSertifika,          'Sertifika'],
              ['evrakBasariBelgesi',      evrakBasariBelgesi,      setEvrakBasariBelgesi,      'Başarı Belgesi'],
              ['evrakAtamaGorevlendirme', evrakAtamaGorevlendirme, setEvrakAtamaGorevlendirme, 'Atama/Görevlendirme'],
            ] as [string, boolean, (v: boolean) => void, string][]).map(([, val, setter, label]) => (
              <label key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 14, color: 'var(--text)' }}>
                <input
                  type="checkbox"
                  checked={val}
                  onChange={e => setter(e.target.checked)}
                  style={{ accentColor: 'var(--primary)', width: 15, height: 15 }}
                />
                {label}
              </label>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 14, color: 'var(--text)', flexShrink: 0 }}>
              <input
                type="checkbox"
                checked={!!evrakDiger}
                onChange={e => { if (!e.target.checked) setEvrakDiger(''); }}
                style={{ accentColor: 'var(--primary)', width: 15, height: 15 }}
              />
              Diğer:
            </label>
            <input
              className="form-control"
              value={evrakDiger}
              onChange={e => setEvrakDiger(e.target.value)}
              placeholder="Belge adını yazın..."
              style={{ maxWidth: 280 }}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Tebligat Tarihi</label>
            <input
              type="date"
              className="form-control"
              value={tebligatTarihi}
              onChange={e => setTebligatTarihi(e.target.value)}
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Tebligat Saati</label>
            <input
              type="time"
              className="form-control"
              value={tebligatSaati}
              onChange={e => setTebligatSaati(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* İmza Bölümü */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        <div className="card">
          <h3 style={{ fontWeight: 700, fontSize: 14, marginBottom: 16, color: 'var(--text)' }}>
            Tebliğ Eden
          </h3>
          <div className="form-group">
            <label className="form-label">Ad Soyad</label>
            <input className="form-control" value={tebligEdenAdSoyad} onChange={e => setTebligEdenAdSoyad(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Unvanı</label>
            <input className="form-control" value={tebligEdenUnvani} onChange={e => setTebligEdenUnvani(e.target.value)} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Tarih</label>
            <input type="date" className="form-control" value={tebligEdenTarih} onChange={e => setTebligEdenTarih(e.target.value)} />
          </div>
        </div>

        <div className="card">
          <h3 style={{ fontWeight: 700, fontSize: 14, marginBottom: 16, color: 'var(--text)' }}>
            Tebellüğ Eden
          </h3>
          <div className="form-group">
            <label className="form-label">Ad Soyad</label>
            <input className="form-control" value={tebellugEdenAdSoyad} onChange={e => setTebellugEdenAdSoyad(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Unvanı</label>
            <input className="form-control" value={tebellugEdenUnvani} onChange={e => setTebellugEdenUnvani(e.target.value)} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Tarih</label>
            <input type="date" className="form-control" value={tebellugEdenTarih} onChange={e => setTebellugEdenTarih(e.target.value)} />
          </div>
        </div>
      </div>

      <button
        className="btn btn-primary"
        onClick={handleGenerate}
        disabled={loading}
        style={{ fontSize: 15, padding: '10px 32px' }}
      >
        {loading ? '⏳ Oluşturuluyor...' : '📄 Belge Oluştur (PDF)'}
      </button>
    </div>
  );
}
