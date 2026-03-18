import { useState, useEffect, FormEvent } from 'react';
import api from '../../services/api';

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
  issuedBy: string;
  issuedAt: string;
  createdAt: string;
  student: { fullName: string; className: string; schoolNumber: string };
}

export default function WarningsPage() {
  const [records, setRecords] = useState<WarningRecord[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [behaviors, setBehaviors] = useState<Record<string, WarningBehavior[]>>({});
  const [allBehaviors, setAllBehaviors] = useState<WarningBehavior[]>([]);
  const [loading, setLoading] = useState(true);
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
  const [warningCount, setWarningCount] = useState(0);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');

  // Delete
  const [deleteId, setDeleteId] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [whatsappLoading, setWhatsappLoading] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [recordsRes, studentsRes, behaviorsRes] = await Promise.all([
        api.get('/warnings?limit=100'),
        api.get('/students?limit=2000'),
        api.get('/warnings/behaviors'),
      ]);
      setRecords(recordsRes.data.data.records);
      setStudents(studentsRes.data.data.students);
      setBehaviors(behaviorsRes.data.data.byCategory);
      setAllBehaviors(behaviorsRes.data.data.all);
    } catch (error) {
      console.error('Veri yükleme hatası:', error);
    } finally {
      setLoading(false);
    }
  };

  // Student search & select
  const filteredStudents = students.filter(
    (s) =>
      s.fullName.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.schoolNumber.includes(studentSearch) ||
      s.className.toLowerCase().includes(studentSearch.toLowerCase())
  );

  const handleStudentSelect = async (student: Student) => {
    setSelectedStudentId(student.id);
    setStudentSearch(`${student.fullName} - ${student.className} (${student.schoolNumber})`);
    setShowStudentDropdown(false);

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
    setWarningCount(0);
    setCreateError('');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bu yazılı uyarı kaydını silmek istediğinize emin misiniz?')) return;
    setDeleteId(id);
    setDeleteLoading(true);
    try {
      await api.delete(`/warnings/${id}`);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Silme işlemi başarısız.');
    } finally {
      setDeleteLoading(false);
      setDeleteId('');
    }
  };

  const handleViewPdf = async (id: string) => {
    try {
      const response = await api.get(`/warnings/${id}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      window.open(url, '_blank');
    } catch {
      alert('PDF görüntüleme başarısız.');
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
      alert('PDF indirme başarısız.');
    }
  };

  const handleWhatsApp = async (id: string) => {
    setWhatsappLoading(id);
    try {
      const res = await api.get(`/warnings/${id}/whatsapp`);
      const data = res.data.data;
      if (data.parents && data.parents.length > 0) {
        // Open first parent's WhatsApp link
        window.open(data.parents[0].whatsappUrl, '_blank');
        // If multiple parents, show info
        if (data.parents.length > 1) {
          const others = data.parents.slice(1);
          const openOthers = confirm(
            `${data.parents[0].parentName} için WhatsApp açıldı. ` +
            `${others.length} veli daha var: ${others.map((p: any) => p.parentName).join(', ')}. ` +
            `Diğer velilere de göndermek ister misiniz?`
          );
          if (openOthers) {
            others.forEach((p: any) => window.open(p.whatsappUrl, '_blank'));
          }
        }
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'WhatsApp linki oluşturulamadı.';
      alert(msg);
    } finally {
      setWhatsappLoading('');
    }
  };

  const handleShowDetail = (record: WarningRecord) => {
    setSelectedRecord(record);
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
      <div style={{ padding: 40, textAlign: 'center' }}>
        <div className="loading-spinner" />
        <p>Yükleniyor...</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0 }}>Yazılı Uyarılar</h1>
          <p style={{ margin: '4px 0 0', color: '#666', fontSize: 14 }}>
            Öğrencilere verilen yazılı uyarı belgelerini yönetin
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
          + Yeni Uyarı
        </button>
      </div>

      {/* Records Table */}
      {records.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <p style={{ fontSize: 48, margin: 0 }}>📋</p>
          <h3>Henüz yazılı uyarı kaydı bulunmuyor</h3>
          <p style={{ color: '#666' }}>Yeni bir yazılı uyarı oluşturmak için yukarıdaki butonu kullanın.</p>
        </div>
      ) : (
        <div className="card" style={{ overflowX: 'auto' }}>
          <table className="table">
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
                    <small style={{ color: '#888' }}>No: {r.student.schoolNumber}</small>
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
                        onClick={() => handleDownloadPdf(r.id)}
                        title="PDF İndir"
                      >
                        📥 PDF
                      </button>
                      <button
                        className="btn btn-sm"
                        style={{ background: '#dcfce7', color: '#16a34a', border: 'none', padding: '4px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}
                        onClick={() => handleWhatsApp(r.id)}
                        disabled={whatsappLoading === r.id}
                        title="WhatsApp ile Gönder"
                      >
                        {whatsappLoading === r.id ? '...' : '📩 WhatsApp'}
                      </button>
                      <button
                        className="btn btn-sm"
                        style={{ background: '#fee2e2', color: '#dc2626', border: 'none', padding: '4px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}
                        onClick={() => handleDelete(r.id)}
                        disabled={deleteLoading && deleteId === r.id}
                        title="Sil"
                      >
                        {deleteLoading && deleteId === r.id ? '...' : '🗑 Sil'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560 }}>
            <div className="modal-header">
              <h2>Yeni Yazılı Uyarı</h2>
              <button className="modal-close" onClick={() => { setShowCreateModal(false); resetCreateForm(); }}>
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate}>
              {/* Step 1: Student Selection */}
              <div className="form-group">
                <label>1. Öğrenci Seçin</label>
                <div style={{ position: 'relative' }}>
                  <input
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
                <label>2. Davranış Seçin</label>
                <select
                  value={selectedBehaviorCode}
                  onChange={(e) => {
                    setSelectedBehaviorCode(e.target.value);
                    const b = allBehaviors.find((b) => b.code === e.target.value);
                    if (b) setSelectedCategory(b.category);
                  }}
                  style={{ fontSize: 14 }}
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

              {/* Step 3: Optional Description */}
              <div className="form-group">
                <label>3. Ek Açıklama (Opsiyonel)</label>
                <textarea
                  rows={3}
                  placeholder="Davranışla ilgili ek detaylar..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={500}
                  style={{ resize: 'vertical' }}
                />
                <small style={{ color: '#888' }}>{description.length}/500</small>
              </div>

              {/* Step 4: Rehberlik Servisi Görüşü */}
              <div className="form-group">
                <label>4. Rehberlik Servisi Görüşü (Opsiyonel)</label>
                <textarea
                  rows={2}
                  placeholder="Rehberlik servisi ile görüşme notu..."
                  value={guidanceNote}
                  onChange={(e) => setGuidanceNote(e.target.value)}
                  maxLength={500}
                  style={{ resize: 'vertical' }}
                />
                <small style={{ color: '#888' }}>{guidanceNote.length}/500</small>
              </div>

              {/* Step 5: Düzenleyen */}
              <div className="form-group">
                <label>5. Düzenleyen</label>
                <input
                  type="text"
                  placeholder="Müdür yardımcısının adını yazın..."
                  value={issuedBy}
                  onChange={(e) => setIssuedBy(e.target.value)}
                  maxLength={100}
                />
                <small style={{ color: '#888' }}>Boş bırakılırsa "Okul Yönetimi" olarak kaydedilir.</small>
              </div>

              {createError && (
                <div style={{ background: '#fee2e2', color: '#dc2626', padding: '8px 14px', borderRadius: 8, marginBottom: 16, fontSize: 14 }}>
                  {createError}
                </div>
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
        <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <h2>Uyarı Detayı</h2>
              <button className="modal-close" onClick={() => setShowDetailModal(false)}>
                ✕
              </button>
            </div>

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

                <strong>Düzenleyen:</strong>
                <span>{selectedRecord.issuedBy}</span>

                <strong>Tarih:</strong>
                <span>{formatDate(selectedRecord.issuedAt)}</span>
              </div>

              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button
                  className="btn"
                  onClick={() => handleWhatsApp(selectedRecord.id)}
                  disabled={whatsappLoading === selectedRecord.id}
                  style={{ background: '#dcfce7', color: '#16a34a', border: 'none', fontSize: 14 }}
                >
                  {whatsappLoading === selectedRecord.id ? 'Gönderiliyor...' : '📩 WhatsApp ile Gönder'}
                </button>
                <button
                  className="btn btn-primary"
                  onClick={() => handleDownloadPdf(selectedRecord.id)}
                  style={{ fontSize: 14 }}
                >
                  📥 PDF İndir
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
    </div>
  );
}
