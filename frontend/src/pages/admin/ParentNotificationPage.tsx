import { useState, useEffect } from 'react';
import api from '../../services/api';

interface Student {
  id: string;
  fullName: string;
  className: string;
  schoolNumber: string;
  status: string;
}

interface Parent {
  id: string;
  fullName: string;
  phone: string;
}

export default function ParentNotificationPage() {
  const [students,        setStudents]        = useState<Student[]>([]);
  const [classes,         setClasses]         = useState<string[]>([]);
  const [selectedClass,   setSelectedClass]   = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [absenceDay,      setAbsenceDay]      = useState<5 | 15 | 25>(5);
  const [meetingDate,     setMeetingDate]      = useState(new Date().toISOString().slice(0, 10));
  const [excusedDays,     setExcusedDays]     = useState('');
  const [unexcusedDays,   setUnexcusedDays]   = useState('');
  const [includeParent,   setIncludeParent]   = useState(false);
  const [selectedParentId,setSelectedParentId]= useState('');
  const [customParentName,setCustomParentName]= useState('');
  const [studentParents,  setStudentParents]  = useState<Parent[]>([]);
  const [loading,         setLoading]         = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [error,           setError]           = useState('');
  const [success,         setSuccess]         = useState('');

  useEffect(() => {
    api.get<{ success: boolean; data: { students: Student[] } }>('/students?limit=1000&status=ACTIVE')
      .then(res => {
        const list = res.data.data?.students || [];
        setStudents(list);
        const uniqueClasses = Array.from(new Set(list.map(s => s.className))).sort((a, b) =>
          a.localeCompare(b, 'tr', { numeric: true }),
        );
        setClasses(uniqueClasses);
        if (uniqueClasses.length > 0) setSelectedClass(uniqueClasses[0]);
      })
      .catch(() => setError('Öğrenci listesi alınamadı.'))
      .finally(() => setLoadingStudents(false));
  }, []);

  useEffect(() => {
    setStudentParents([]);
    setSelectedParentId('');
    setCustomParentName('');
    if (!selectedStudent) return;
    api.get<{ success: boolean; data: Student & { parents: Parent[] } }>(`/students/${selectedStudent.id}`)
      .then(res => {
        const parents = res.data.data?.parents || [];
        setStudentParents(parents);
        if (parents.length > 0) setSelectedParentId(parents[0].id);
      })
      .catch(() => {});
  }, [selectedStudent]);

  const filteredStudents = students.filter(s => s.className === selectedClass);
  const totalDays = (parseInt(excusedDays) || 0) + (parseInt(unexcusedDays) || 0);

  const selectStudent = (s: Student) => {
    setSelectedStudent(s);
    setError('');
    setSuccess('');
  };

  const handleGenerate = async () => {
    if (!selectedStudent) { setError('Lütfen bir öğrenci seçin.'); return; }
    if (excusedDays === '') { setError('Özürlü devamsızlık günü zorunludur.'); return; }
    if (unexcusedDays === '') { setError('Özürsüz devamsızlık günü zorunludur.'); return; }
    if (includeParent && studentParents.length === 0 && !customParentName.trim()) {
      setError('Lütfen veli adını girin.'); return;
    }
    if (includeParent && selectedParentId === '__other__' && !customParentName.trim()) {
      setError('Lütfen veli adını girin.'); return;
    }

    setError(''); setSuccess(''); setLoading(true);

    const parentName = includeParent
      ? (studentParents.length === 0 || selectedParentId === '__other__'
          ? customParentName.trim()
          : (studentParents.find(p => p.id === selectedParentId)?.fullName ?? ''))
      : '';

    try {
      const res = await api.post('/parent-notification/generate-pdf', {
        studentId: selectedStudent.id,
        absenceDay,
        meetingDate,
        parentName,
        absenceData: { excusedDays, unexcusedDays, totalDays: String(totalDays) },
      }, { responseType: 'blob' });

      const url      = URL.createObjectURL(res.data);
      const a        = document.createElement('a');
      a.href         = url;
      const safeName = selectedStudent.fullName.replace(/\s+/g, '-').toLocaleLowerCase('tr-TR');
      a.download     = `veli-bildirim-tutanagi-${safeName}-${absenceDay}.pdf`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setSuccess(`${selectedStudent.fullName} için ${absenceDay}. gün Veli Bildirim Tutanağı oluşturuldu.`);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Bilinmeyen hata');
    } finally {
      setLoading(false);
    }
  };

  const absenceDayOptions: { value: 5 | 15 | 25; label: string; desc: string }[] = [
    { value: 5,  label: '5. Gün',  desc: '1. tebligat' },
    { value: 15, label: '15. Gün', desc: '2. tebligat + Komisyon' },
    { value: 25, label: '25. Gün', desc: '3. tebligat + Komisyon' },
  ];

  const canGenerate = !!selectedStudent && excusedDays !== '' && unexcusedDays !== '';

  return (
    <div>
      {/* Başlık */}
      <div className="page-header">
        <div>
          <h1 className="page-title">📄 ÖMYK Veli Devamsızlık Bildirimi</h1>
          <p className="page-subtitle">Öğrenci seçin, devamsızlık bilgilerini girin ve PDF'i indirin</p>
        </div>
      </div>

      {error   && <div className="alert alert-error"   style={{ marginBottom: 16 }}>{error}</div>}
      {success && <div className="alert alert-success" style={{ marginBottom: 16 }}>{success}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20, alignItems: 'start' }}>

        {/* SOL: Sınıf + Öğrenci Seçimi */}
        <div className="card" style={{ padding: '20px 24px' }}>
          <h2 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700 }}>Öğrenci Seçimi</h2>

          {/* Sınıf chip'leri */}
          {loadingStudents ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: '#9ca3af', fontSize: 13 }}>Yükleniyor…</div>
          ) : (
            <>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
                {classes.map(c => {
                  return (
                    <button
                      key={c}
                      onClick={() => { setSelectedClass(c); setSelectedStudent(null); }}
                      className={`class-tab ${selectedClass === c ? 'class-tab-active' : ''}`}
                    >
                      {c}
                    </button>
                  );
                })}
              </div>

              {/* Öğrenci listesi */}
              {filteredStudents.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px 0', color: '#9ca3af', fontSize: 13 }}>
                  Bu sınıfta aktif öğrenci bulunamadı.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {filteredStudents.map(s => {
                    const selected = selectedStudent?.id === s.id;
                    return (
                      <button
                        key={s.id}
                        onClick={() => selectStudent(s)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          padding: '9px 14px', borderRadius: 8, textAlign: 'left',
                          cursor: 'pointer', border: '1.5px solid',
                          borderColor: selected ? 'var(--primary)' : 'var(--border)',
                          background: selected ? '#eff6ff' : '#fafafa',
                          color: selected ? 'var(--primary-dark)' : 'var(--text)',
                          transition: 'background 0.15s, border-color 0.15s, color 0.15s',
                        }}
                      >
                        <span style={{
                          width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                          background: selected ? 'var(--primary)' : '#e5e7eb',
                          color: selected ? '#fff' : 'var(--text-muted)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 11, fontWeight: 700,
                        }}>
                          {s.fullName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                        </span>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: selected ? 700 : 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {s.fullName}
                          </div>
                            <div style={{ fontSize: 11, color: selected ? '#3b82f6' : 'var(--text-muted)', marginTop: 1 }}>
                            No: {s.schoolNumber}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {/* SAĞ: Ayarlar + Oluştur */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Seçili öğrenci özeti */}
          {selectedStudent ? (
            <div style={{
              padding: '12px 16px', borderRadius: 10,
              background: '#eff6ff', border: '1.5px solid #bfdbfe',
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <span style={{
                width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                background: '#2563eb', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 700,
              }}>
                {selectedStudent.fullName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
              </span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#1d4ed8' }}>{selectedStudent.fullName}</div>
                <div style={{ fontSize: 12, color: '#3b82f6' }}>{selectedStudent.className} · No: {selectedStudent.schoolNumber}</div>
              </div>
            </div>
          ) : (
            <div style={{
              padding: '12px 16px', borderRadius: 10,
              background: '#f9fafb', border: '1.5px solid #e5e7eb',
              fontSize: 13, color: '#9ca3af', textAlign: 'center',
            }}>
              Sol taraftan öğrenci seçin
            </div>
          )}

          {/* Ayarlar kartı */}
          <div className="card" style={{ padding: '20px 24px' }}>
            <h2 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700 }}>Tutanak Bilgileri</h2>

            {/* Devamsızlık günü */}
            <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: 8 }}>Devamsızlık Günü</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {absenceDayOptions.map(opt => {
                  const active = absenceDay === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setAbsenceDay(opt.value)}
                      style={{
                        flex: 1, padding: '8px 4px', borderRadius: 8, cursor: 'pointer',
                        border: '1.5px solid', borderColor: active ? '#2563eb' : '#e5e7eb',
                        background: active ? '#eff6ff' : '#f9fafb',
                        color: active ? '#1d4ed8' : '#374151',
                        transition: 'background 0.15s, color 0.15s, border-color 0.15s',
                        textAlign: 'center',
                      }}
                    >
                      <div style={{ fontSize: 13, fontWeight: active ? 700 : 600 }}>{opt.label}</div>
                      <div style={{ fontSize: 10, color: active ? '#3b82f6' : '#9ca3af', marginTop: 2 }}>{opt.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tarih */}
            <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: 6 }}>Tutanak Tarihi</label>
              <input type="date" className="form-control" value={meetingDate} onChange={e => setMeetingDate(e.target.value)} />
            </div>

            {/* Devamsızlık gün sayıları */}
            <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: 8 }}>Devamsızlık Bilgileri</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 11, color: '#6b7280', display: 'block', marginBottom: 4 }}>Özürlü (gün)</label>
                  <input
                    type="number" min="0" placeholder="0" className="form-control"
                    value={excusedDays} onChange={e => setExcusedDays(e.target.value)}
                    style={{ textAlign: 'center' }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 11, color: '#6b7280', display: 'block', marginBottom: 4 }}>Özürsüz (gün)</label>
                  <input
                    type="number" min="0" placeholder="0" className="form-control"
                    value={unexcusedDays} onChange={e => setUnexcusedDays(e.target.value)}
                    style={{ textAlign: 'center' }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 11, color: '#6b7280', display: 'block', marginBottom: 4 }}>Toplam</label>
                  <div style={{
                    height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 6,
                    fontSize: 14, fontWeight: 700, color: totalDays > 0 ? '#111827' : '#d1d5db',
                  }}>
                    {totalDays > 0 ? totalDays : '—'}
                  </div>
                </div>
              </div>
            </div>

            {/* Veli bilgisi */}
            <div
              onClick={() => setIncludeParent(p => !p)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 8,
                border: `1.5px solid ${includeParent ? '#bfdbfe' : '#e5e7eb'}`,
                background: includeParent ? '#eff6ff' : '#f9fafb',
                cursor: 'pointer', userSelect: 'none', marginBottom: includeParent ? 10 : 0,
              }}
            >
              <div style={{
                width: 18, height: 18, borderRadius: 4, border: `2px solid ${includeParent ? '#2563eb' : '#d1d5db'}`,
                background: includeParent ? '#2563eb' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                {includeParent && <span style={{ color: 'white', fontSize: 11, fontWeight: 700 }}>✓</span>}
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>Veli bilgisini PDF'e ekle</div>
            </div>

            {includeParent && (
              <div onClick={e => e.stopPropagation()}>
                {selectedStudent && studentParents.length > 0 ? (
                  <>
                    <select
                      className="form-control"
                      value={selectedParentId}
                      onChange={e => { setSelectedParentId(e.target.value); setCustomParentName(''); }}
                      style={{ marginBottom: selectedParentId === '__other__' ? 8 : 0 }}
                    >
                      {studentParents.map(p => (
                        <option key={p.id} value={p.id}>{p.fullName}</option>
                      ))}
                      <option value="__other__">Diğer (manuel giriş)</option>
                    </select>
                    {selectedParentId === '__other__' && (
                      <input
                        type="text" className="form-control"
                        placeholder="Veli adı soyadı girin"
                        value={customParentName}
                        onChange={e => setCustomParentName(e.target.value)}
                      />
                    )}
                  </>
                ) : (
                  <input
                    type="text" className="form-control"
                    placeholder={selectedStudent ? 'Kayıtlı veli yok — manuel girin' : 'Öğrenci seçince otomatik dolar'}
                    value={customParentName}
                    onChange={e => setCustomParentName(e.target.value)}
                    disabled={!selectedStudent}
                  />
                )}
              </div>
            )}
          </div>

          {/* Oluştur butonu */}
          <button
            className="btn btn-primary"
            style={{ width: '100%', padding: '11px 0', fontSize: 14, fontWeight: 700 }}
            onClick={handleGenerate}
            disabled={loading || loadingStudents || !canGenerate}
          >
            {loading ? '⏳ PDF oluşturuluyor…' : '📄 PDF Oluştur ve İndir'}
          </button>

          {/* Bilgi notu */}
          <div style={{ padding: '12px 16px', background: '#f9fafb', borderRadius: 'var(--radius)', border: '1px solid var(--border)', fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.8 }}>
            <strong style={{ color: 'var(--text)' }}>Otomatik doldurulanlar:</strong><br />
            · Sınıf Rehber Öğretmeni<br />
            · Okul Rehber Öğretmeni<br />
            · Müdür Yardımcısı
          </div>
        </div>
      </div>
    </div>
  );
}
