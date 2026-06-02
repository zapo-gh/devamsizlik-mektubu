import { useState, useEffect } from 'react';
import api from '../../services/api';

export default function ParentMeetingPage() {
  const [classes,         setClasses]         = useState<string[]>([]);
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [meetingDate,     setMeetingDate]      = useState(new Date().toISOString().slice(0, 10));
  const [schoolYear,      setSchoolYear]       = useState('2025-2026');
  const [term,            setTerm]             = useState('2. DÖNEM');
  const [includeParent,   setIncludeParent]    = useState(true);
  const [loading,         setLoading]          = useState(false);
  const [loadingClasses,  setLoadingClasses]   = useState(true);
  const [error,           setError]            = useState('');
  const [success,         setSuccess]          = useState('');

  useEffect(() => {
    api.get<{ success: boolean; data: string[] }>('/parent-meeting/classes')
      .then(res => {
        const sorted = [...res.data.data].sort((a, b) =>
          a.localeCompare(b, 'tr', { numeric: true })
        );
        setClasses(sorted);
      })
      .catch(() => setError('Sınıf listesi alınamadı.'))
      .finally(() => setLoadingClasses(false));
  }, []);

  const toggleClass = (c: string) =>
    setSelectedClasses(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]);

  const selectAll = () => setSelectedClasses([...classes]);
  const clearAll  = () => setSelectedClasses([]);

  const handleGenerate = async () => {
    if (selectedClasses.length === 0) { setError('Lütfen en az bir sınıf seçin.'); return; }
    setError(''); setSuccess(''); setLoading(true);
    try {
      const res = await api.post('/parent-meeting/generate-pdf', {
        classNames: selectedClasses, meetingDate, schoolYear, term, includeParentName: includeParent,
      }, { responseType: 'blob' });
      const url  = URL.createObjectURL(res.data);
      const a    = document.createElement('a');
      a.href     = url;
      const fileLabel = selectedClasses.length === 1 ? selectedClasses[0].replace(/[^a-zA-Z0-9]/g, '_') : `${selectedClasses.length}-sinif`;
      a.download = `veli-imza-sirkusu-${fileLabel}.pdf`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setSuccess(selectedClasses.length === 1
        ? `${selectedClasses[0]} sınıfı için imza sirküsü oluşturuldu.`
        : `${selectedClasses.length} sınıf için imza sirküsü oluşturuldu.`);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Bilinmeyen hata');
    } finally {
      setLoading(false);
    }
  };

  // Sınıf gruplama: seviyeye göre (9, 10, 11, 12, diğer)
  const grouped: Record<string, string[]> = {};
  for (const c of classes) {
    const match = c.match(/^(\d+)/);
    const key = match ? match[1] + '. Sınıf' : 'Diğer';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(c);
  }

  const allSelected  = selectedClasses.length === classes.length && classes.length > 0;
  const someSelected = selectedClasses.length > 0;

  return (
    <div>
      {/* Başlık */}
      <div className="page-header">
        <div>
          <h1 className="page-title">📋 Veli Toplantısı İmza Sirküsü</h1>
          <p className="page-subtitle">Sınıf seçin, ayarları yapın ve PDF'i indirin</p>
        </div>
      </div>

      {error   && <div className="alert alert-error"   style={{ marginBottom: 16 }}>{error}</div>}
      {success && <div className="alert alert-success" style={{ marginBottom: 16 }}>{success}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20, alignItems: 'start' }}>

        {/* SOL: Sınıf Seçimi */}
        <div className="card" style={{ padding: '20px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Sınıf Seçimi</h2>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-outline btn-sm" onClick={allSelected ? clearAll : selectAll} disabled={loadingClasses || classes.length === 0}>
                {allSelected ? 'Seçimi Kaldır' : 'Tümünü Seç'}
              </button>
              {someSelected && !allSelected && (
                <button className="btn btn-outline btn-sm" onClick={clearAll}>Temizle</button>
              )}
            </div>
          </div>

          {loadingClasses ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: '#9ca3af' }}>
              <div className="spinner spinner-dark" style={{ marginBottom: 8 }} />
              <p style={{ margin: 0, fontSize: 13 }}>Sınıflar yükleniyor…</p>
            </div>
          ) : classes.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: '#9ca3af', fontSize: 14 }}>
              Kayıtlı sınıf bulunamadı.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {Object.entries(grouped).map(([grade, gradeClasses]) => {
                const allGradeSelected = gradeClasses.every(c => selectedClasses.includes(c));
                return (
                  <div key={grade}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{grade}</span>
                      <button
                        className="btn btn-sm"
                        style={{ fontSize: 11, padding: '4px 10px', background: allGradeSelected ? '#f3f4f6' : '#eff6ff', color: allGradeSelected ? 'var(--text-muted)' : 'var(--primary)', border: `1px solid ${allGradeSelected ? 'var(--border)' : '#bfdbfe'}` }}
                        onClick={() => {
                          if (allGradeSelected) {
                            setSelectedClasses(prev => prev.filter(c => !gradeClasses.includes(c)));
                          } else {
                            setSelectedClasses(prev => [...new Set([...prev, ...gradeClasses])]);
                          }
                        }}
                      >
                        {allGradeSelected ? 'Kaldır' : 'Tümünü Seç'}
                      </button>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {gradeClasses.map(c => {
                        const selected = selectedClasses.includes(c);
                        return (
                          <button
                            key={c}
                            onClick={() => toggleClass(c)}
                            style={{
                              padding: '7px 16px',
                              borderRadius: 8,
                              fontSize: 13,
                              fontWeight: 500,
                              cursor: 'pointer',
                              border: '1.5px solid #e5e7eb',
                              outline: selected ? '2px solid #2563eb' : 'none',
                              outlineOffset: '-1px',
                              background: selected ? '#eff6ff' : '#f9fafb',
                              color: selected ? '#1d4ed8' : '#374151',
                              transition: 'background 0.15s, color 0.15s, outline 0.15s',
                            }}
                          >
                            {selected && <span style={{ marginRight: 4 }}>✓</span>}{c}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* SAĞ: Ayarlar + Oluştur */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Ayarlar kartı */}
          <div className="card" style={{ padding: '20px 24px' }}>
            <h2 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700 }}>Toplantı Bilgileri</h2>

            <div className="form-group" style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: 6 }}>Toplantı Tarihi</label>
              <input type="date" className="form-control" value={meetingDate} onChange={e => setMeetingDate(e.target.value)} />
            </div>

            <div className="form-group" style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: 6 }}>Dönem</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {['1. DÖNEM', '2. DÖNEM'].map(d => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setTerm(d)}
                    style={{
                      flex: 1, padding: '8px 0', borderRadius: 8, fontSize: 13, fontWeight: term === d ? 700 : 500, cursor: 'pointer',
                      border: term === d ? '2px solid var(--primary)' : '1.5px solid var(--border)',
                      background: term === d ? '#eff6ff' : '#f9fafb',
                      color: term === d ? 'var(--primary-dark)' : 'var(--text)',
                    }}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: 6 }}>Eğitim-Öğretim Yılı</label>
              <input type="text" className="form-control" placeholder="2025-2026" value={schoolYear} onChange={e => setSchoolYear(e.target.value)} />
            </div>

            <div
              onClick={() => setIncludeParent(p => !p)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 8,
                border: `1.5px solid ${includeParent ? '#bfdbfe' : '#e5e7eb'}`,
                background: includeParent ? '#eff6ff' : '#f9fafb',
                cursor: 'pointer', userSelect: 'none', marginBottom: 4,
              }}
            >
              <div style={{
                width: 18, height: 18, borderRadius: 4, border: `2px solid ${includeParent ? '#2563eb' : '#d1d5db'}`,
                background: includeParent ? '#2563eb' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                {includeParent && <span style={{ color: 'white', fontSize: 11, fontWeight: 700 }}>✓</span>}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>Veli adını PDF'e ekle</div>
                <div style={{ fontSize: 11, color: '#6b7280', marginTop: 1 }}>
                  {includeParent ? 'Kayıtlı veli adı otomatik dolar' : 'Ad sütunu boş bırakılır'}
                </div>
              </div>
            </div>
          </div>

          {/* Özet + Oluştur */}
          <div className="card" style={{ padding: '20px 24px' }}>
            {someSelected && (
              <div style={{ marginBottom: 14, padding: '10px 14px', background: '#f0fdf4', borderRadius: 8, border: '1px solid #86efac' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#16a34a', marginBottom: 4 }}>Oluşturulacak:</div>
                <div style={{ fontSize: 13, color: '#15803d', lineHeight: 1.7 }}>
                  {selectedClasses.join(' · ')}
                </div>
                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
                  {selectedClasses.length} sayfa · {term} · {schoolYear}
                </div>
              </div>
            )}

            <button
              className="btn btn-primary"
              style={{ width: '100%', padding: '13px 0', fontSize: 15, fontWeight: 700, boxShadow: someSelected ? '0 4px 14px rgba(37,99,235,0.35)' : 'none' }}
              onClick={handleGenerate}
              disabled={loading || loadingClasses || !someSelected}
            >
              {loading ? '⏳ PDF oluşturuluyor…' : `📥 PDF Oluştur ve İndir${someSelected ? ` (${selectedClasses.length} sınıf)` : ''}`}
            </button>
          </div>


        </div>
      </div>
    </div>
  );
}
