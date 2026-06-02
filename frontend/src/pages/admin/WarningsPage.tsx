import { useState, useEffect, useRef, FormEvent } from 'react';
import api from '../../services/api';
import { useConfirm } from '../../hooks/useConfirm';

interface StaffMember {
  id: string;
  name: string;
  role: string;
  className?: string | null;
}

interface Student {
  id: string;
  schoolNumber: string;
  fullName: string;
  className: string;
}

interface WarningBehavior {
  code: string;
  category: string;
  text: string;
  article: string;
}

interface WarningRecord {
  id: string;
  studentId: string;
  warningNumber: number;
  behaviorCode: string;
  behaviorText: string;
  description: string | null;
  guidanceNote: string | null;
  issuedBy: string;
  issuedAt: string;
  createdAt: string;
  waSentAt?: string | null;
  student: { fullName: string; className: string; schoolNumber: string };
}

export default function WarningsPage() {
  const { confirm, alert, confirmModal } = useConfirm();
  const [records, setRecords] = useState<WarningRecord[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [behaviors, setBehaviors] = useState<Record<string, WarningBehavior[]>>({});
  const [allBehaviors, setAllBehaviors] = useState<WarningBehavior[]>([]);
  const [loading, setLoading] = useState(true);

  // Staff
  const [assistantPrincipals, setAssistantPrincipals] = useState<StaffMember[]>([]);
  const [counselors, setCounselors] = useState<StaffMember[]>([]);
  const [classTeachers, setClassTeachers] = useState<StaffMember[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<WarningRecord | null>(null);

  // Create form state
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [showStudentDropdown, setShowStudentDropdown] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedBehaviorCode, setSelectedBehaviorCode] = useState('');
  const [description, setDescription] = useState('');
  const [guidanceNote, setGuidanceNote] = useState('');
  const [issuedBy, setIssuedBy] = useState('');
  const [classTeacherName, setClassTeacherName] = useState('');
  const [schoolCounselorName, setSchoolCounselorName] = useState('');
  const [warningCount, setWarningCount] = useState(0);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');

  // List search + pagination
  const [listSearch, setListSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<{ total: number; totalPages: number } | null>(null);
  const prevSearchRef = useRef('');
  useEffect(() => {
    if (listSearch !== prevSearchRef.current) {
      prevSearchRef.current = listSearch;
      setPage(1);
    }
  }, [listSearch]);

  // Delete
  const [deleteId, setDeleteId] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [waConnected, setWaConnected] = useState(false);
  const [waSendLoading, setWaSendLoading] = useState('');

  // WhatsApp önizleme modal
  const [showWaModal, setShowWaModal] = useState(false);
  const [waRecord, setWaRecord] = useState<WarningRecord | null>(null);
  const [waPreviewData, setWaPreviewData] = useState<{
    messages: { parent: string; phone: string; message: string }[];
    studentName: string;
  } | null>(null);
  const [waPreviewLoading, setWaPreviewLoading] = useState(false);
  const [waPreviewError, setWaPreviewError] = useState('');
  const [waSelectedPhones, setWaSelectedPhones] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadData();
    // WhatsApp bağlantı durumunu kontrol et
    api.get('/whatsapp/status').then(r => setWaConnected(r.data.data.status === 'connected')).catch(() => {});
  }, [page, listSearch]);

  const loadData = async () => {
    try {
      const isSearch = !!listSearch.trim();
      const searchParam = isSearch
        ? `&search=${encodeURIComponent(listSearch.trim())}&limit=1000`
        : `&limit=20&page=${page}`;
      const [recordsRes, studentsRes, behaviorsRes, staffRes] = await Promise.all([
        api.get(`/warnings?${searchParam}`),
        api.get('/students?limit=2000'),
        api.get('/warnings/behaviors'),
        api.get('/staff'),
      ]);
      setRecords(recordsRes.data.data.records);
      if (isSearch) {
        setPagination(null);
      } else {
        setPagination(recordsRes.data.data.pagination);
      }
      setStudents(studentsRes.data.data.students);
      setBehaviors(behaviorsRes.data.data.byCategory);
      setAllBehaviors(behaviorsRes.data.data.all);
      const allStaff: StaffMember[] = staffRes.data.data.staff;
      setAssistantPrincipals(allStaff.filter((s) => s.role === 'MUDUR_YARDIMCISI'));
      setCounselors(allStaff.filter((s) => s.role === 'REHBER_OGRETMEN'));
      setClassTeachers(allStaff.filter((s) => s.role === 'SINIF_REHBER_OGRETMEN'));
    } catch (error) {
      console.error('Veri yükleme hatası:', error);
    } finally {
      setLoading(false);
    }
  };

  // Student search & select
  const filteredStudents = students.filter(
    (s) =>
      s.fullName.toLocaleLowerCase('tr-TR').includes(studentSearch.toLocaleLowerCase('tr-TR')) ||
      s.schoolNumber.includes(studentSearch) ||
      s.className.toLocaleLowerCase('tr-TR').includes(studentSearch.toLocaleLowerCase('tr-TR'))
  );

  const handleStudentSelect = async (student: Student) => {
    setSelectedStudentId(student.id);
    setStudentSearch(`${student.fullName} - ${student.className} (${student.schoolNumber})`);
    setShowStudentDropdown(false);

    // Auto-select class teacher based on student's class
    const ct = classTeachers.find(
      (t) => t.className?.toLocaleLowerCase('tr-TR').trim() === student.className?.toLocaleLowerCase('tr-TR').trim()
    );
    setClassTeacherName(ct ? ct.name : '');

    // Auto-select school counselor if only one registered
    if (counselors.length === 1) {
      setSchoolCounselorName(counselors[0].name);
    }

    // Fetch warning count
    try {
      const res = await api.get(`/warnings/warning-count/${student.id}`);
      setWarningCount(res.data.data.count);
    } catch {
      setWarningCount(0);
    }
  };

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId || !selectedBehaviorCode) return;

    setCreateError('');
    setCreateLoading(true);

    try {
      await api.post('/warnings', {
        studentId: selectedStudentId,
        behaviorCode: selectedBehaviorCode,
        description: description || undefined,
        guidanceNote: guidanceNote || undefined,
        issuedBy: issuedBy || undefined,
        classTeacherName: classTeacherName || undefined,
        schoolCounselorName: schoolCounselorName || undefined,
      });

      setShowCreateModal(false);
      resetCreateForm();
      loadData();
    } catch (err: any) {
      setCreateError(err.response?.data?.message || 'Uyarı oluşturma başarısız.');
    } finally {
      setCreateLoading(false);
    }
  };

  const resetCreateForm = () => {
    setSelectedStudentId('');
    setStudentSearch('');
    setSelectedCategory('');
    setSelectedBehaviorCode('');
    setDescription('');
    setGuidanceNote('');
    setIssuedBy('');
    setClassTeacherName('');
    setSchoolCounselorName('');
    setWarningCount(0);
    setCreateError('');
  };

  const handleDelete = async (id: string) => {
    if (!await confirm('Bu yazılı uyarı kaydını silmek istediğinize emin misiniz?')) return;
    setDeleteId(id);
    setDeleteLoading(true);
    try {
      await api.delete(`/warnings/${id}`);
      loadData();
    } catch (err: any) {
      await alert(err.response?.data?.message || 'Silme işlemi başarısız.');
    } finally {
      setDeleteLoading(false);
      setDeleteId('');
    }
  };

  const handleViewPdf = async (id: string) => {
    try {
      const response = await api.get(`/warnings/${id}/pdf`, { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      // Electron'da yeni pencere açılmasını sağla; popup engelleyici varsa aynı sekmede aç
      const newWin = window.open(url, '_blank');
      if (!newWin) {
        window.location.href = url;
      }
    } catch {
      await alert('PDF görüntüleme başarısız.');
    }
  };

  const handleDownloadPdf = async (id: string) => {
    try {
      const response = await api.get(`/warnings/${id}/pdf/download`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'yazili-uyari.pdf');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      await alert('PDF indirme başarısız.');
    }
  };

  const handleWaPreviewOpen = async (record: WarningRecord) => {
    setWaRecord(record);
    setWaPreviewData(null);
    setWaPreviewError('');
    setShowWaModal(true);
    setWaPreviewLoading(true);
    try {
      const res = await api.post(`/whatsapp/preview/warning/${record.id}`);
      setWaPreviewData(res.data.data);
      // Tüm velileri varsayılan seçili yap
      setWaSelectedPhones(new Set((res.data.data.messages as { phone: string }[]).map(m => m.phone)));
    } catch (err: any) {
      setWaPreviewError(err.response?.data?.message || 'Önizleme yüklenemedi.');
    } finally {
      setWaPreviewLoading(false);
    }
  };

  const handleWaSend = async () => {
    if (!waRecord) return;
    if (waSelectedPhones.size === 0) return;
    setWaSendLoading(waRecord.id);
    try {
      const res = await api.post(`/whatsapp/send/warning/${waRecord.id}`, {
        selectedPhones: Array.from(waSelectedPhones),
      });
      const results = res.data.data.results as { parent: string; phone: string; ok: boolean; error?: string }[];
      const failed = results.filter(r => !r.ok);
      if (results.some(r => r.ok)) {
        setRecords(prev => prev.map(rec =>
          rec.id === waRecord.id ? { ...rec, waSentAt: new Date().toISOString() } : rec
        ));
      }
      setShowWaModal(false);
      if (failed.length === 0) {
        await alert(`✅ Mesaj ${results.length} veliye başarıyla gönderildi.`);
      } else {
        const msg = failed.map(r => `${r.parent}: ${r.error}`).join('\n');
        await alert(`⚠️ ${results.length - failed.length} gönderildi, ${failed.length} başarısız:\n${msg}`);
      }
    } catch (err: any) {
      await alert(err.response?.data?.message || 'Gönderim başarısız.');
    } finally {
      setWaSendLoading('');
    }
  };

  const handleShowDetail = (record: WarningRecord) => {    setSelectedRecord(record);
    setShowDetailModal(true);
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1)
      .toString()
      .padStart(2, '0')}.${d.getFullYear()}`;
  };

  const categories = Object.keys(behaviors);
  const categoryBehaviors = selectedCategory ? (behaviors[selectedCategory] || []) : [];

  // Madde numarasına göre gruplanmış davranışlar
  const behaviorsByArticle = allBehaviors.reduce<Record<string, WarningBehavior[]>>((acc, b) => {
    const key = b.article || 'Diğer';
    if (!acc[key]) acc[key] = [];
    acc[key].push(b);
    return acc;
  }, {});
  // Madde sıralama (164/1-a, 164/1-b, ... 164/1-ç, 164/1-d, ...)
  const articleKeys = Object.keys(behaviorsByArticle).sort((a, b) => {
    const order = 'aAbBcCçÇdDeEfFgGğĞhHıIiİjJkKlLmMnNoOöÖpPrRsStTuUüÜvVyYzZ';
    const extract = (s: string) => {
      const m = s.match(/Madde\s+(\d+)(?:\/(\d+))?(?:-(.))?/);
      if (!m) return [0, 0, 999];
      const main = parseInt(m[1]) || 0;
      const sub = parseInt(m[2]) || 0;
      const letter = m[3] || '';
      const li = letter ? order.indexOf(letter) : -1;
      return [main, sub, li >= 0 ? li : 999];
    };
    const [a1, a2, a3] = extract(a);
    const [b1, b2, b3] = extract(b);
    if (a1 !== b1) return a1 - b1;
    if (a2 !== b2) return a2 - b2;
    return a3 - b3;
  });

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 40 }}>
        <div className="spinner spinner-dark" />
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">⚠️ Yazılı Uyarılar</h1>
          <p className="page-subtitle">Öğrencilere verilen yazılı uyarı belgelerini yönetin</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>+ Yeni Uyarı</button>
      </div>

      {/* Arama çubuğu */}
      <div className="card" style={{ marginBottom: 16 }}>
        <input
            type="text"
            placeholder="Öğrenci adı, numarası veya sınıf ile ara..."
            value={listSearch}
            onChange={(e) => setListSearch(e.target.value)}
            className="form-control"
            style={{ maxWidth: 400 }}
          />
      </div>

      {/* Records Table */}
      {records.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <p style={{ fontSize: 48, margin: 0 }}>📋</p>
          <h3>Henüz yazılı uyarı kaydı bulunmuyor</h3>
          <p style={{ color: 'var(--text-muted)' }}>Yeni bir yazılı uyarı oluşturmak için yukarıdaki butonu kullanın.</p>
        </div>
      ) : (
        <div className="card">
          <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Öğrenci</th>
                <th>Sınıf</th>
                <th>Uyarı No</th>
                <th>Davranış</th>
                <th>Tarih</th>
                <th>İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r.id}>
                  <td>
                    <strong>{r.student.fullName}</strong>
                    <br />
                    <small style={{ color: 'var(--text-muted)' }}>No: {r.student.schoolNumber}</small>
                  </td>
                  <td>{r.student.className}</td>
                  <td>
                    <span
                      className="badge"
                      style={{
                        background:
                          r.warningNumber >= 3
                            ? '#fee2e2'
                            : r.warningNumber === 2
                            ? '#fef3c7'
                            : '#dbeafe',
                        color:
                          r.warningNumber >= 3
                            ? '#dc2626'
                            : r.warningNumber === 2
                            ? '#d97706'
                            : '#2563eb',
                        padding: '3px 10px',
                        borderRadius: 12,
                        fontWeight: 600,
                        fontSize: 13,
                      }}
                    >
                      {r.warningNumber}. Uyarı
                    </span>
                  </td>
                  <td style={{ maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.behaviorText}
                  </td>
                  <td>{formatDate(r.issuedAt)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <button
                        className="btn btn-sm"
                        style={{ background: '#e0e7ff', color: '#3730a3', border: 'none', padding: '4px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}
                        onClick={() => handleShowDetail(r)}
                        title="Detay"
                      >
                        👁 Detay
                      </button>
                      <button
                        className="btn btn-sm"
                        style={{ background: '#dbeafe', color: '#1d4ed8', border: 'none', padding: '4px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}
                        onClick={() => handleViewPdf(r.id)}
                        title="PDF Görüntüle"
                      >
                        📄 PDF
                      </button>
                      {waConnected && (
                        r.waSentAt ? (
                          <span style={{ fontSize: 12, color: '#16a34a', padding: '4px 8px' }}>✅ WA Gönderildi</span>
                        ) : (
                          <button
                            className="btn btn-sm"
                            style={{ background: '#16a34a', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}
                            onClick={() => handleWaPreviewOpen(r)}
                            disabled={waSendLoading === r.id}
                          title="WhatsApp'tan bilgilendirme mesajı gönder"
                          >
                            {waSendLoading === r.id ? '...' : '📱 Otomatik Gönder'}
                          </button>
                        )
                      )}
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={() => handleDelete(r.id)}
                        disabled={deleteLoading && deleteId === r.id}
                        title="Sil"
                        style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}
                      >
                        {deleteLoading && deleteId === r.id ? '...' : 'Sil'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {/* Sayfalama */}
      {pagination && pagination.totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
          <button className="btn btn-outline btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Önceki</button>
          <span style={{ padding: '6px 12px', fontSize: 13, color: 'var(--text)' }}>{page} / {pagination.totalPages}</span>
          <button className="btn btn-outline btn-sm" disabled={page >= pagination.totalPages} onClick={() => setPage(p => p + 1)}>Sonraki →</button>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onMouseDown={() => { setShowCreateModal(false); resetCreateForm(); }}>
          <div className="modal" onMouseDown={(e) => e.stopPropagation()} style={{ maxWidth: 560 }}>
            <h2>➕ Yeni Yazılı Uyarı</h2>

            <form onSubmit={handleCreate}>
              {/* Step 1: Student Selection */}
              <div className="form-group">
                <label className="form-label">1. Öğrenci Seçin</label>
                <div style={{ position: 'relative' }}>
                  <input
                    className="form-control"
                    type="text"
                    placeholder="Öğrenci adı, numarası veya sınıfı ile arayın..."
                    value={studentSearch}
                    onChange={(e) => {
                      setStudentSearch(e.target.value);
                      setShowStudentDropdown(true);
                      setSelectedStudentId('');
                    }}
                    onFocus={() => setShowStudentDropdown(true)}
                  />
                  {showStudentDropdown && studentSearch && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        background: 'white',
                        border: '1px solid #ddd',
                        borderRadius: 8,
                        maxHeight: 200,
                        overflowY: 'auto',
                        zIndex: 100,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      }}
                    >
                      {filteredStudents.length === 0 ? (
                        <div style={{ padding: '10px 14px', color: '#999' }}>Öğrenci bulunamadı</div>
                      ) : (
                        filteredStudents.slice(0, 20).map((s) => (
                          <div
                            key={s.id}
                            onClick={() => handleStudentSelect(s)}
                            style={{
                              padding: '8px 14px',
                              cursor: 'pointer',
                              borderBottom: '1px solid #f0f0f0',
                              fontSize: 14,
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = '#f5f5ff')}
                            onMouseLeave={(e) => (e.currentTarget.style.background = '')}
                          >
                            <strong>{s.fullName}</strong>
                            <span style={{ color: '#888', marginLeft: 8 }}>
                              {s.className} - No: {s.schoolNumber}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
                {selectedStudentId && (
                  <div style={{ marginTop: 6, fontSize: 13, color: '#059669' }}>
                    ✓ Öğrenci seçildi — Bu öğrencinin mevcut uyarı sayısı: <strong>{warningCount}</strong> (sıradaki: {warningCount + 1}. uyarı)
                  </div>
                )}
              </div>

              {/* Step 2: Behavior Selection — Madde numarasına göre */}
              <div className="form-group">
                <label className="form-label">2. Davranış Seçin</label>
                <select
                  className="form-control"
                  value={selectedBehaviorCode}
                  onChange={(e) => {
                    setSelectedBehaviorCode(e.target.value);
                    const b = allBehaviors.find((b) => b.code === e.target.value);
                    if (b) setSelectedCategory(b.category);
                  }}
                >
                  <option value="">Davranış seçin...</option>
                  {articleKeys.map((article) => (
                    <optgroup key={article} label={article}>
                      {behaviorsByArticle[article].map((b) => (
                        <option key={b.code} value={b.code}>
                          {b.text}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                {selectedBehaviorCode && (
                  <div style={{ marginTop: 6, fontSize: 13, color: '#059669' }}>
                    ✓ {allBehaviors.find((b) => b.code === selectedBehaviorCode)?.article} — {allBehaviors.find((b) => b.code === selectedBehaviorCode)?.text}
                  </div>
                )}
              </div>

              {/* Step 3: Sınıf Rehber Öğretmeni */}
              <div className="form-group">
                <label className="form-label">3. Sınıf Rehber Öğretmeni (Opsiyonel)</label>
                {classTeachers.length > 0 ? (
                  <select
                    className="form-control"
                    value={classTeacherName}
                    onChange={(e) => setClassTeacherName(e.target.value)}
                  >
                    <option value="">— Seçilmedi —</option>
                    {classTeachers.map((t) => (
                      <option key={t.id} value={t.name}>
                        {t.name} ({t.className})
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    className="form-control"
                    type="text"
                    placeholder="Sınıf rehber öğretmeninin adını yazın..."
                    value={classTeacherName}
                    onChange={(e) => setClassTeacherName(e.target.value)}
                    maxLength={100}
                  />
                )}
                {classTeachers.length > 0 && (
                  <small style={{ color: 'var(--text-muted)' }}>
                    Öğrenci seçildiğinde sınıfına göre otomatik seçilir.
                  </small>
                )}
              </div>

              {/* Step 4: Okul Rehber Öğretmeni */}
              <div className="form-group">
                <label className="form-label">4. Okul Rehber Öğretmeni (Opsiyonel)</label>
                {counselors.length > 0 ? (
                  <select
                    className="form-control"
                    value={schoolCounselorName}
                    onChange={(e) => setSchoolCounselorName(e.target.value)}
                  >
                    <option value="">— Seçilmedi —</option>
                    {counselors.map((c) => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    className="form-control"
                    type="text"
                    placeholder="Okul rehber öğretmeninin adını yazın..."
                    value={schoolCounselorName}
                    onChange={(e) => setSchoolCounselorName(e.target.value)}
                    maxLength={100}
                  />
                )}
              </div>

              {/* Step 5: Düzenleyen */}
              <div className="form-group">
                <label className="form-label">5. Düzenleyen (Müdür Yardımcısı)</label>
                {assistantPrincipals.length > 0 ? (
                  <select
                    className="form-control"
                    value={issuedBy}
                    onChange={(e) => setIssuedBy(e.target.value)}
                  >
                    <option value="">— Seçilmedi (Okul Yönetimi) —</option>
                    {assistantPrincipals.map((a) => (
                      <option key={a.id} value={a.name}>{a.name}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    className="form-control"
                    type="text"
                    placeholder="Müdür yardımcısının adını yazın..."
                    value={issuedBy}
                    onChange={(e) => setIssuedBy(e.target.value)}
                    maxLength={100}
                  />
                )}
                <small style={{ color: 'var(--text-muted)' }}>Boş bırakılırsa "Okul Yönetimi" olarak kaydedilir.</small>
              </div>

              {/* Açıklama */}
              <div className="form-group">
                <label className="form-label">Açıklama (Opsiyonel)</label>
                <textarea
                  className="form-control"
                  placeholder="İhlalin detayını buraya yazabilirsiniz..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  maxLength={500}
                  style={{ resize: 'vertical', fontFamily: 'inherit' }}
                />
              </div>

              {/* Rehberlik Notu */}
              <div className="form-group">
                <label className="form-label">Rehberlik Notu (Opsiyonel)</label>
                <textarea
                  className="form-control"
                  placeholder="Rehberlik servisi notu..."
                  value={guidanceNote}
                  onChange={(e) => setGuidanceNote(e.target.value)}
                  rows={2}
                  maxLength={500}
                  style={{ resize: 'vertical', fontFamily: 'inherit' }}
                />
              </div>

              {createError && (
                <div className="alert alert-error">{createError}</div>
              )}

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => { setShowCreateModal(false); resetCreateForm(); }}
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={!selectedStudentId || !selectedBehaviorCode || createLoading}
                >
                  {createLoading ? 'Oluşturuluyor...' : '📄 Uyarı Oluştur & PDF Üret'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedRecord && (
        <div className="modal-overlay" onMouseDown={() => setShowDetailModal(false)}>
          <div className="modal" onMouseDown={(e) => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <h2>👁 Uyarı Detayı</h2>

            <div style={{ lineHeight: 1.8 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '4px 12px', marginBottom: 16 }}>
                <strong>Öğrenci:</strong>
                <span>{selectedRecord.student.fullName}</span>

                <strong>Sınıf:</strong>
                <span>{selectedRecord.student.className}</span>

                <strong>Okul No:</strong>
                <span>{selectedRecord.student.schoolNumber}</span>

                <strong>Uyarı No:</strong>
                <span
                  style={{
                    background: selectedRecord.warningNumber >= 3 ? '#fee2e2' : '#dbeafe',
                    color: selectedRecord.warningNumber >= 3 ? '#dc2626' : '#2563eb',
                    padding: '1px 8px',
                    borderRadius: 8,
                    fontWeight: 600,
                    display: 'inline-block',
                  }}
                >
                  {selectedRecord.warningNumber}. Uyarı
                </span>

                <strong>Davranış:</strong>
                <span>{selectedRecord.behaviorText}</span>

                {selectedRecord.description && (
                  <>
                    <strong>Açıklama:</strong>
                    <span>{selectedRecord.description}</span>
                  </>
                )}

                {selectedRecord.guidanceNote && (
                  <>
                    <strong>Rehberlik Notu:</strong>
                    <span>{selectedRecord.guidanceNote}</span>
                  </>
                )}

                <strong>Düzenleyen:</strong>
                <span>{selectedRecord.issuedBy}</span>

                <strong>Tarih:</strong>
                <span>{formatDate(selectedRecord.issuedAt)}</span>
              </div>

              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                {waConnected && (
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => { setShowDetailModal(false); handleWaPreviewOpen(selectedRecord); }}
                    disabled={waSendLoading === selectedRecord.id}
                  >
                    {waSendLoading === selectedRecord.id ? 'Gönderiliyor...' : '📱 Otomatik Gönder'}
                  </button>
                )}
                <button
                  className="btn btn-primary"
                  onClick={() => handleViewPdf(selectedRecord.id)}
                  style={{ fontSize: 14 }}
                >
                  📄 PDF Görüntüle
                </button>
                <button
                  className="btn btn-outline"
                  onClick={() => setShowDetailModal(false)}
                >
                  Kapat
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp Önizleme Modal */}
      {showWaModal && waRecord && (
        <div className="modal-overlay" onMouseDown={() => setShowWaModal(false)} style={{ zIndex: 1100 }}>
          <div className="modal" style={{ maxWidth: 560 }} onMouseDown={(e) => e.stopPropagation()}>
            <h2>📱 WhatsApp Mesaj Önizleme</h2>

            <div style={{ marginBottom: 12, fontSize: 13, color: 'var(--text-muted)' }}>
              <strong>{waRecord.student.fullName}</strong> — {waRecord.student.className} — {waRecord.warningNumber}. Uyarı
            </div>

            {waPreviewLoading && (
              <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)' }}>
                <span className="spinner" /> Önizleme yükleniyor...
              </div>
            )}

            {waPreviewError && (
              <div style={{ background: '#fee2e2', color: '#dc2626', borderRadius: 8, padding: '10px 14px', marginBottom: 16 }}>
                {waPreviewError}
              </div>
            )}

            {waPreviewData && (
              <div>
                {/* Veli seçimi */}
                {waPreviewData.messages.length > 1 && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>Gönderilecek Veliler</div>
                    {waPreviewData.messages.map((m, i) => (
                      <label key={i} style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '7px 12px', borderRadius: 8, marginBottom: 4, cursor: 'pointer',
                        background: waSelectedPhones.has(m.phone) ? '#f0fdf4' : '#f9fafb',
                        border: `1.5px solid ${waSelectedPhones.has(m.phone) ? '#86efac' : '#e5e7eb'}`,
                        userSelect: 'none',
                      }}>
                        <input
                          type="checkbox"
                          checked={waSelectedPhones.has(m.phone)}
                          onChange={() => {
                            setWaSelectedPhones(prev => {
                              const next = new Set(prev);
                              next.has(m.phone) ? next.delete(m.phone) : next.add(m.phone);
                              return next;
                            });
                          }}
                          style={{ width: 15, height: 15, cursor: 'pointer' }}
                        />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>{m.parent}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{m.phone}</div>
                        </div>
                      </label>
                    ))}
                    <div style={{ borderTop: '1px solid #e5e7eb', marginTop: 12, paddingTop: 12 }} />
                  </div>
                )}

                {/* Mesaj önizleme — sadece seçili veliler */}
                {waPreviewData.messages
                  .filter(m => waSelectedPhones.has(m.phone))
                  .map((m, i) => (
                    <div key={i} style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
                        📞 {m.parent} — {m.phone}
                      </div>
                      <div style={{
                        background: '#dcfce7',
                        border: '1px solid #bbf7d0',
                        borderRadius: 10,
                        padding: '12px 14px',
                        fontSize: 13,
                        lineHeight: 1.6,
                        whiteSpace: 'pre-wrap',
                        fontFamily: 'inherit',
                      }}>
                        {m.message}
                      </div>
                    </div>
                  ))}

                {waSelectedPhones.size === 0 && (
                  <div style={{ padding: '12px 14px', background: '#fef3c7', borderRadius: 8, fontSize: 13, color: '#92400e', marginBottom: 12 }}>
                    ⚠️ Gönderim için en az bir veli seçin.
                  </div>
                )}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
              <button className="btn btn-outline" onClick={() => setShowWaModal(false)}>İptal</button>
              <button
                className="btn btn-success"
                style={{ background: '#25d366', color: '#fff' }}
                onClick={handleWaSend}
                disabled={waPreviewLoading || !!waPreviewError || waSendLoading === waRecord.id || waSelectedPhones.size === 0}
              >
                {waSendLoading === waRecord.id ? <><span className="spinner" /> Gönderiliyor...</> : `📱 ${waSelectedPhones.size} Veliye Gönder`}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmModal}
    </div>
  );
}
