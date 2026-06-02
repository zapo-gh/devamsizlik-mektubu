import { useState, useEffect, useRef, FormEvent } from 'react';
import api from '../../services/api';
import { useConfirm } from '../../hooks/useConfirm';

interface Student {
  id: string;
  schoolNumber: string;
  fullName: string;
  className: string;
  parents: { id: string; fullName: string; phone: string }[];
}

interface AbsenteeismRecord {
  id: string;
  studentId: string;
  warningNumber: number;
  isBep: boolean;
  viewedByParent: boolean;
  waSentAt?: string | null;
  createdAt: string;
  excusedDays?: number | null;
  unexcusedDays?: number | null;
  student: { fullName: string; className: string; schoolNumber: string };
}

export default function AbsenteeismPage() {
  const { confirm, alert, confirmModal } = useConfirm();
  const [records, setRecords] = useState<AbsenteeismRecord[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Liste arama — değişince sayfa 1'e sıfırla
  const [listSearch, setListSearch] = useState('');
  const prevSearchRef = useRef('');
  useEffect(() => {
    if (listSearch !== prevSearchRef.current) {
      prevSearchRef.current = listSearch;
      setPage(1);
    }
  }, [listSearch]);

  // Upload form
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [showStudentDropdown, setShowStudentDropdown] = useState(false);
  const [warningNumber, setWarningNumber] = useState(1);
  const [warningLoading, setWarningLoading] = useState(false);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [isBep, setIsBep] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Modal açılınca arama input'una fokuslan
  useEffect(() => {
    if (showUploadModal) {
      const t = setTimeout(() => searchInputRef.current?.focus(), 80);
      return () => clearTimeout(t);
    }
  }, [showUploadModal]);

  // Pagination
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<{ total: number; totalPages: number } | null>(null);

  // WhatsApp otomatik gönderim
  const [waConnected, setWaConnected] = useState(false);
  const [waSendLoading, setWaSendLoading] = useState('');

  // WhatsApp önizleme modal
  const [showWaModal, setShowWaModal] = useState(false);
  const [waRecord, setWaRecord] = useState<AbsenteeismRecord | null>(null);
  const [waExcusedDays, setWaExcusedDays] = useState('');
  const [waUnexcusedDays, setWaUnexcusedDays] = useState('');
  const [waPreviewData, setWaPreviewData] = useState<{
    messages: { parent: string; phone: string; message: string }[];
    hasPreviewImage: boolean;
  } | null>(null);
  const [waPreviewLoading, setWaPreviewLoading] = useState(false);
  const [waPreviewError, setWaPreviewError] = useState('');
  const [waSelectedParents, setWaSelectedParents] = useState<Set<string>>(new Set());

  // Kırpma alanı seçimi (0–100 yüzde değerleri)
  const [cropTop, setCropTop] = useState(0);
  const [cropBottom, setCropBottom] = useState(50);
  const [fullPageImage, setFullPageImage] = useState<string | null>(null);
  const [fullPageLoading, setFullPageLoading] = useState(false);
  const cropContainerRef = useRef<HTMLDivElement>(null);
  const cropDragRef = useRef<'top' | 'bottom' | null>(null);
  const cropTopRef = useRef(0);
  const cropBottomRef = useRef(50);

  useEffect(() => {
    loadData();
    api.get('/whatsapp/status').then(r => setWaConnected(r.data.data.status === 'connected')).catch(() => {});
  }, [page, listSearch]);

  // Öğrenci listesini yalnızca modal açıldığında yükle (performans)
  useEffect(() => {
    if (showUploadModal && students.length === 0) {
      api.get('/students?limit=2000').then(r => setStudents(r.data.data.students)).catch(() => {});
    }
  }, [showUploadModal]);

  const loadData = async () => {
    try {
      const isSearch = !!listSearch.trim();
      const searchParam = isSearch
        ? `&search=${encodeURIComponent(listSearch.trim())}&limit=1000`
        : `&limit=20&page=${page}`;
      const recordsRes = await api.get(`/absenteeism?${searchParam}`);
      setRecords(recordsRes.data.data.records);
      // Arama aktifken sayfalama durumunu sıfırla
      if (isSearch) {
        setPagination(null);
      } else {
        setPagination(recordsRes.data.data.pagination);
      }
    } catch (error) {
      console.error('Load error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: FormEvent) => {
    e.preventDefault();
    if (!pdfFile || !selectedStudentId) return;

    setUploadError('');
    setUploadLoading(true);

    try {
      const formData = new FormData();
      formData.append('pdf', pdfFile);
      formData.append('studentId', selectedStudentId);
      formData.append('warningNumber', String(warningNumber));
      formData.append('isBep', String(isBep));

      await api.post('/absenteeism', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setShowUploadModal(false);
      resetUploadForm();
      loadData();
    } catch (err: any) {
      setUploadError(err.response?.data?.message || 'Yükleme başarısız.');
    } finally {
      setUploadLoading(false);
    }
  };

  const resetUploadForm = () => {
    setSelectedStudentId('');
    setStudentSearch('');
    setWarningNumber(1);
    setPdfFile(null);
    setIsBep(false);
    setUploadError('');
  };

  const fetchWarningCount = async (studentId: string) => {
    setWarningLoading(true);
    try {
      const res = await api.get(`/absenteeism/warning-count/${studentId}`);
      setWarningNumber(res.data.data.nextWarning);
    } catch {
      setWarningNumber(1);
    } finally {
      setWarningLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!await confirm('Devamsızlık kaydını silmek istediğinize emin misiniz?')) return;

    try {
      await api.delete(`/absenteeism/${id}`);
      loadData();
    } catch (err: any) {
      await alert(err.response?.data?.message || 'Silme işlemi başarısız.');
    }
  };

  const handleWaPreviewOpen = async (record: AbsenteeismRecord) => {
    setWaRecord(record);
    setWaExcusedDays(record.excusedDays != null ? String(record.excusedDays) : '');
    setWaUnexcusedDays(record.unexcusedDays != null ? String(record.unexcusedDays) : '');
    setWaPreviewData(null);
    setWaPreviewError('');
    setShowWaModal(true);
    // Kırpma alanını sıfırla
    setCropTop(0);
    setCropBottom(50);
    cropTopRef.current = 0;
    cropBottomRef.current = 50;
    setFullPageImage(null);
    // Otomatik önizle
    try {
      setWaPreviewLoading(true);
      const res = await api.post(`/whatsapp/preview/absenteeism/${record.id}`, {
        excusedDays: record.excusedDays != null ? record.excusedDays : '',
        unexcusedDays: record.unexcusedDays != null ? record.unexcusedDays : '',
      });
      setWaPreviewData(res.data.data);
      setWaSelectedParents(new Set((res.data.data.messages as { phone: string }[]).map((m) => m.phone)));
      // Görsel önizleme varsa tam sayfayı da yükle
      if (res.data.data.hasPreviewImage) {
        setFullPageLoading(true);
        api.get(`/whatsapp/full-image/absenteeism/${record.id}`)
          .then(imgRes => setFullPageImage(imgRes.data.data.image))
          .catch(() => {})
          .finally(() => setFullPageLoading(false));
      }
    } catch (err: any) {
      setWaPreviewError(err.response?.data?.message || 'Önizleme yüklenemedi.');
    } finally {
      setWaPreviewLoading(false);
    }
  };

  const handleWaPreviewRefresh = async () => {
    if (!waRecord) return;
    setWaPreviewLoading(true);
    setWaPreviewError('');
    try {
      const res = await api.post(`/whatsapp/preview/absenteeism/${waRecord.id}`, {
        excusedDays: waExcusedDays,
        unexcusedDays: waUnexcusedDays,
      });
      setWaPreviewData(res.data.data);
      // Güncel veli listesiyle seçili telefonları senkronize et (M-6)
      setWaSelectedParents(new Set((res.data.data.messages as { phone: string }[]).map((m) => m.phone)));
    } catch (err: any) {
      setWaPreviewError(err.response?.data?.message || 'Önizleme yüklenemedi.');
    } finally {
      setWaPreviewLoading(false);
    }
  };

  const handleCropMouseDown = (type: 'top' | 'bottom') => (e: React.MouseEvent) => {
    e.preventDefault();
    cropDragRef.current = type;
    const onMove = (me: MouseEvent) => {
      if (!cropContainerRef.current || !cropDragRef.current) return;
      const rect = cropContainerRef.current.getBoundingClientRect();
      const pct = Math.max(0, Math.min(100, (me.clientY - rect.top) / rect.height * 100));
      if (cropDragRef.current === 'top') {
        const newTop = Math.min(pct, cropBottomRef.current - 5);
        cropTopRef.current = newTop;
        setCropTop(newTop);
      } else {
        const newBottom = Math.max(pct, cropTopRef.current + 5);
        cropBottomRef.current = newBottom;
        setCropBottom(newBottom);
      }
    };
    const onUp = () => {
      cropDragRef.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const handleWaSend = async () => {
    if (!waRecord) return;
    const recordId = waRecord.id;  // stale closure'dan koru
    setWaSendLoading(recordId);
    try {
      const res = await api.post(`/whatsapp/send/absenteeism/${waRecord.id}`, {
        excusedDays: waExcusedDays,
        unexcusedDays: waUnexcusedDays,
        selectedPhones: Array.from(waSelectedParents),
        cropTop: waPreviewData?.hasPreviewImage ? cropTop : undefined,
        cropBottom: waPreviewData?.hasPreviewImage ? cropBottom : undefined,
      });
      const results = res.data.data.results as { parent: string; phone: string; ok: boolean; error?: string }[];
      const failed = results.filter(r => !r.ok);
      setShowWaModal(false);
      if (results.some((r: any) => r.ok)) {
        // Gönderilen kaydı lokal state'te güncelle → buton hemen pasif
        setRecords(prev => prev.map(rec =>
          rec.id === recordId ? { ...rec, waSentAt: new Date().toISOString() } : rec
        ));
      }
      if (failed.length === 0) {
        await alert(`✅ Mesaj ve dosya ${results.length} veliye başarıyla gönderildi.`);
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


  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

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
          <h1 className="page-title">✉️ Devamsızlık Mektubu Gönderimi</h1>
          <p className="page-subtitle">Öğrenci devamsızlık mektuplarını yönetin ve gönderin</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowUploadModal(true)}>
          + Devamsızlık Mektubu Ekle
        </button>
      </div>

      {/* Records Table */}
      <div className="card">
        <div style={{ marginBottom: 16 }}>
          <input
            type="text"
            placeholder="Öğrenci ara (ad, numara, sınıf)..."
            value={listSearch}
            onChange={e => { setListSearch(e.target.value); setPage(1); }}
            style={{ width: '100%', maxWidth: 400, padding: '10px 14px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: 14 }}
          />
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Öğrenci</th>
                <th>Sınıf</th>
                <th>Uyarı No</th>
                <th>Durum</th>
                <th>Tarih</th>
                <th>İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const unsent = records.filter(r => !r.waSentAt);
                const sent   = records.filter(r =>  r.waSentAt);

                if (records.length === 0) {
                  return (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                        {listSearch ? 'Arama sonucu bulunamadı.' : 'Henüz devamsızlık kaydı yok.'}
                      </td>
                    </tr>
                  );
                }

                const renderRow = (r: AbsenteeismRecord) => (
                  <tr key={r.id}>
                    <td>
                      <strong>{r.student.fullName}</strong>
                      {r.isBep && (
                        <span className="badge" style={{ background: '#ede9fe', color: '#6d28d9', fontSize: 10, marginLeft: 6, verticalAlign: 'middle' }}>BEP</span>
                      )}
                      <br />
                      <small style={{ color: 'var(--text-muted)' }}>
                        {r.student.schoolNumber}
                      </small>
                    </td>
                    <td>{r.student.className}</td>
                    <td>
                      <span
                        className="badge"
                        style={{
                          background: r.warningNumber === 1 ? '#fef3c7' : r.warningNumber === 2 ? '#fed7aa' : '#fecaca',
                          color: r.warningNumber === 1 ? '#92400e' : r.warningNumber === 2 ? '#9a3412' : '#991b1b',
                          fontWeight: 600,
                        }}
                      >
                        {r.warningNumber}. Uyarı
                      </span>
                    </td>
                    <td>
                      {r.waSentAt ? (
                        <span className="badge" style={{ background: '#dcfce7', color: '#15803d' }}>
                          📱 WA Gönderildi
                        </span>
                      ) : (
                        <span className="badge badge-warning">Gönderilmedi</span>
                      )}
                    </td>
                    <td>{formatDate(r.createdAt)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {waConnected && (
                          <button
                            className="btn btn-sm"
                            style={{
                              background: r.waSentAt ? '#86efac' : '#16a34a',
                              color: r.waSentAt ? '#14532d' : '#fff',
                              border: 'none',
                              cursor: r.waSentAt ? 'default' : 'pointer',
                              opacity: r.waSentAt ? 0.7 : 1,
                            }}
                            onClick={() => !r.waSentAt && handleWaPreviewOpen(r)}
                            disabled={waSendLoading === r.id || !!r.waSentAt}
                            title={r.waSentAt ? `Gönderildi: ${formatDate(r.waSentAt)}` : "PDF'i WhatsApp'tan otomatik gönder"}
                          >
                            {waSendLoading === r.id ? '...' : r.waSentAt ? '✅ Gönderildi' : '📱 Otomatik Gönder'}
                          </button>
                        )}
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={async () => {
                            try {
                              const response = await api.get(`/absenteeism/${r.id}/pdf`, { responseType: 'blob' });
                              const contentType = response.headers['content-type'] || 'application/pdf';
                              const blob = new Blob([response.data], { type: contentType });
                              const url = window.URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.target = '_blank';
                              a.rel = 'noopener';
                              document.body.appendChild(a); a.click(); document.body.removeChild(a);
                              setTimeout(() => window.URL.revokeObjectURL(url), 30000);
                            } catch (err: any) {
                              let msg = err?.message || 'Bilinmeyen hata';
                              if (err?.response?.data instanceof Blob) {
                                try {
                                  const text = await err.response.data.text();
                                  const json = JSON.parse(text);
                                  msg = json?.message || msg;
                                } catch { /* json parse failed, use original msg */ }
                              }
                              await alert(`Mektup açılamadı: ${msg}`);
                            }
                          }}
                        >
                          📄 Mektubu Gör
                        </button>
                        <button
                          className="btn btn-outline btn-sm"
                          style={{ color: '#ef4444', borderColor: '#fca5a5' }}
                          onClick={() => handleDelete(r.id)}
                        >
                          Sil
                        </button>
                      </div>
                    </td>
                  </tr>
                );

                return (
                  <>
                    {unsent.length > 0 && (
                      <>
                        <tr>
                          <td colSpan={6} style={{ background: '#fefce8', color: '#854d0e', fontWeight: 600, fontSize: 12, padding: '6px 12px', borderBottom: '1px solid #fde68a' }}>
                            📨 Gönderilmeyenler ({unsent.length})
                          </td>
                        </tr>
                        {unsent.map(renderRow)}
                      </>
                    )}
                    {sent.length > 0 && (
                      <>
                        <tr>
                          <td colSpan={6} style={{ background: '#f0fdf4', color: '#166534', fontWeight: 600, fontSize: 12, padding: '6px 12px', borderBottom: '1px solid #bbf7d0', borderTop: unsent.length > 0 ? '2px solid #d1d5db' : undefined }}>
                            ✅ Gönderilenler ({sent.length})
                          </td>
                        </tr>
                        {sent.map(renderRow)}
                      </>
                    )}
                  </>
                );
              })()}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
            <button
              className="btn btn-outline btn-sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              ◀ Önceki
            </button>
            <span style={{ padding: '6px 12px', fontSize: 13 }}>
              Sayfa {page} / {pagination.totalPages} (Toplam: {pagination.total})
            </span>
            <button
              className="btn btn-outline btn-sm"
              disabled={page >= pagination.totalPages}
              onClick={() => setPage(page + 1)}
            >
              Sonraki ▶
            </button>
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="modal-overlay" onMouseDown={() => setShowUploadModal(false)}>
          <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
            <h2>Devamsızlık Mektubu Ekle</h2>

            {uploadError && <div className="alert alert-error">{uploadError}</div>}

            <form onSubmit={handleUpload}>
              <div className="form-group" style={{ position: 'relative' }}>
                <label>Öğrenci</label>
                <input
                  ref={searchInputRef}
                  type="text"
                  value={studentSearch}
                  onChange={(e) => {
                    setStudentSearch(e.target.value);
                    setShowStudentDropdown(true);
                    if (!e.target.value) setSelectedStudentId('');
                  }}
                  onFocus={() => setShowStudentDropdown(true)}
                  placeholder="Öğrenci adı veya numarası ile arayın..."
                  autoComplete="off"
                  required={!selectedStudentId}
                />
                {showStudentDropdown && studentSearch.length > 0 && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    maxHeight: 200,
                    overflowY: 'auto',
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius)',
                    zIndex: 10,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  }}>
                    {students
                      .filter((s) => {
                        const q = studentSearch.toLocaleLowerCase('tr-TR');
                        return (
                          s.fullName.toLocaleLowerCase('tr-TR').includes(q) ||
                          s.schoolNumber.toLowerCase().includes(q)
                        );
                      })
                      .map((s) => (
                        <div
                          key={s.id}
                          onClick={() => {
                            setSelectedStudentId(s.id);
                            setStudentSearch(`${s.fullName} (${s.schoolNumber}) - ${s.className}`);
                            setShowStudentDropdown(false);
                            fetchWarningCount(s.id);
                          }}
                          style={{
                            padding: '10px 14px',
                            cursor: 'pointer',
                            borderBottom: '1px solid var(--border)',
                            fontSize: 14,
                            transition: 'background 0.15s',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = '#f1f5f9')}
                          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                        >
                          <strong>{s.fullName}</strong>
                          <span style={{ color: 'var(--text-muted)', marginLeft: 8 }}>
                            {s.schoolNumber} — {s.className}
                          </span>
                        </div>
                      ))}
                    {students.filter((s) => {
                      const q = studentSearch.toLocaleLowerCase('tr-TR');
                      return s.fullName.toLocaleLowerCase('tr-TR').includes(q) || s.schoolNumber.toLowerCase().includes(q);
                    }).length === 0 && (
                      <div style={{ padding: '10px 14px', color: 'var(--text-muted)', fontSize: 14 }}>
                        Sonuç bulunamadı.
                      </div>
                    )}
                  </div>
                )}
                {selectedStudentId && (
                  <small style={{ color: 'var(--success)' }}>✓ Öğrenci seçildi</small>
                )}
              </div>

              <div className="form-group">
                <label>Uyarı Numarası</label>
                {warningLoading ? (
                  <div style={{ padding: '10px 0', color: 'var(--text-muted)', fontSize: 13 }}>
                    Hesaplanıyor...
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setWarningNumber(n)}
                          style={{
                            padding: '8px 16px',
                            borderRadius: 'var(--radius)',
                            border: warningNumber === n ? '2px solid var(--primary)' : '1px solid var(--border)',
                            background: warningNumber === n ? '#eff6ff' : '#fff',
                            color: warningNumber === n ? 'var(--primary)' : 'var(--text)',
                            fontWeight: warningNumber === n ? 700 : 400,
                            cursor: 'pointer',
                            fontSize: 14,
                            transition: 'all 0.15s',
                          }}
                        >
                          {n}. Uyarı
                        </button>
                      ))}
                    </div>
                    {selectedStudentId && (
                      <small style={{ color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
                        Sistem önerisi: <strong>{warningNumber}. uyarı</strong> (daha önce {warningNumber - 1} mektup gönderilmiş)
                      </small>
                    )}
                  </>
                )}
              </div>

              <div className="form-group">
                <label>Dosya (PDF / JPG / PNG)</label>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                  required
                />
                <small style={{ color: 'var(--text-muted)' }}>
                  Maksimum 10MB — PDF, JPG veya PNG
                </small>
              </div>

              <div className="form-group">
                <label
                  style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', userSelect: 'none' }}
                >
                  <input
                    type="checkbox"
                    checked={isBep}
                    onChange={(e) => setIsBep(e.target.checked)}
                    style={{ width: 18, height: 18, accentColor: 'var(--primary)', cursor: 'pointer' }}
                  />
                  <span style={{ fontWeight: 600, fontSize: 14 }}>
                    BEP Öğrencisi
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    (Bireysel Eğitim Planı — özel devamsızlık sınırları uygulanır)
                  </span>
                </label>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setShowUploadModal(false)}
                >
                  İptal
                </button>
                <button type="submit" className="btn btn-primary" disabled={uploadLoading}>
                  {uploadLoading ? <span className="spinner" /> : 'Yükle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* WhatsApp Önizleme & Gönderim Modali */}
      {showWaModal && waRecord && (
        <div className="modal-overlay" onMouseDown={() => setShowWaModal(false)}>
          <div className="modal" style={{ maxWidth: 600 }} onMouseDown={(e) => e.stopPropagation()}>
            <h2>📱 WhatsApp Mesaj Önizleme</h2>

            <div style={{ marginBottom: 16, padding: '10px 14px', background: 'var(--surface-2, #f8fafc)', borderRadius: 8, fontSize: 13 }}>
              <strong>{waRecord.student.fullName}</strong>
              <span style={{ color: 'var(--text-muted)', marginLeft: 8 }}>{waRecord.student.className}</span>
              <span style={{ marginLeft: 12 }}>— {waRecord.warningNumber}. Uyarı</span>
            </div>

            <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
              <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                <label style={{ fontSize: 13 }}>Özürlü Gün</label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={waExcusedDays}
                  onChange={(e) => setWaExcusedDays(e.target.value)}
                  placeholder="0"
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 14 }}
                />
              </div>
              <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                <label style={{ fontSize: 13 }}>Özürsüz Gün</label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={waUnexcusedDays}
                  onChange={(e) => setWaUnexcusedDays(e.target.value)}
                  placeholder="0"
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 14 }}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 2 }}>
                <button
                  className="btn btn-outline btn-sm"
                  onClick={handleWaPreviewRefresh}
                  disabled={waPreviewLoading}
                  style={{ whiteSpace: 'nowrap' }}
                >
                  {waPreviewLoading ? '...' : '🔄 Önizle'}
                </button>
              </div>
            </div>

            {waPreviewError && (
              <div className="alert alert-error" style={{ marginBottom: 12 }}>{waPreviewError}</div>
            )}

            {waPreviewLoading && !waPreviewData && (
              <div style={{ textAlign: 'center', padding: 20 }}><div className="spinner spinner-dark" /></div>
            )}

            {waPreviewData && (
              <>
                <div style={{ marginBottom: 8, fontSize: 12, color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>{waPreviewData.hasPreviewImage ? '🖼 Görsel önizleme ile gönderilecek' : '📄 PDF belgesi olarak gönderilecek'}</span>
                  {waPreviewData.messages.length > 1 && (
                    <span>
                      <button
                        style={{ background: 'none', border: 'none', color: '#6366f1', cursor: 'pointer', fontSize: 12, padding: 0, marginRight: 8 }}
                        onClick={() => setWaSelectedParents(new Set(waPreviewData.messages.map(m => m.phone)))}
                      >Tümünü seç</button>
                      <button
                        style={{ background: 'none', border: 'none', color: '#6366f1', cursor: 'pointer', fontSize: 12, padding: 0 }}
                        onClick={() => setWaSelectedParents(new Set())}
                      >Kaldır</button>
                    </span>
                  )}
                </div>

                {/* Kırpma alanı seçimi — yalnızca PDF'den görsel üretildiyse göster */}
                {waPreviewData.hasPreviewImage && (
                  <div style={{ marginBottom: 16, border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
                    <div style={{ padding: '8px 12px', background: '#f1f5f9', borderBottom: '1px solid var(--border)', fontSize: 12, fontWeight: 600, color: '#334155' }}>
                      ✂️ WhatsApp'a gönderilecek kırpma alanını seçin
                      <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: 8 }}>
                        (mavi çizgileri yukarı/aşağı sürükleyin)
                      </span>
                    </div>
                    {fullPageLoading && (
                      <div style={{ textAlign: 'center', padding: 20 }}><div className="spinner spinner-dark" /></div>
                    )}
                    {!fullPageLoading && fullPageImage && (
                      <div
                        ref={cropContainerRef}
                        style={{ position: 'relative', userSelect: 'none', lineHeight: 0 }}
                      >
                        <img
                          src={`data:image/jpeg;base64,${fullPageImage}`}
                          alt="PDF önizleme"
                          style={{ width: '100%', display: 'block', maxHeight: 360, objectFit: 'contain' }}
                          draggable={false}
                        />
                        {/* Üst karartma (seçim dışı) */}
                        <div style={{
                          position: 'absolute', top: 0, left: 0, right: 0,
                          height: `${cropTop}%`,
                          background: 'rgba(0,0,0,0.55)',
                          pointerEvents: 'none',
                        }} />
                        {/* Alt karartma (seçim dışı) */}
                        <div style={{
                          position: 'absolute', top: `${cropBottom}%`, left: 0, right: 0, bottom: 0,
                          background: 'rgba(0,0,0,0.55)',
                          pointerEvents: 'none',
                        }} />
                        {/* Seçili alan kenarlığı */}
                        <div style={{
                          position: 'absolute',
                          top: `${cropTop}%`,
                          left: 0,
                          right: 0,
                          height: `${cropBottom - cropTop}%`,
                          border: '2px solid #2563eb',
                          boxSizing: 'border-box',
                          pointerEvents: 'none',
                        }} />
                        {/* Üst sürükleme kolu */}
                        <div
                          onMouseDown={handleCropMouseDown('top')}
                          style={{
                            position: 'absolute',
                            top: `calc(${cropTop}% - 3px)`,
                            left: 0, right: 0,
                            height: 6,
                            background: '#2563eb',
                            cursor: 'ns-resize',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            zIndex: 2,
                          }}
                        >
                          <div style={{ background: '#2563eb', color: '#fff', fontSize: 10, padding: '1px 8px', borderRadius: 4, pointerEvents: 'none' }}>
                            ↕ Üst Sınır — %{Math.round(cropTop)}
                          </div>
                        </div>
                        {/* Alt sürükleme kolu */}
                        <div
                          onMouseDown={handleCropMouseDown('bottom')}
                          style={{
                            position: 'absolute',
                            top: `calc(${cropBottom}% - 3px)`,
                            left: 0, right: 0,
                            height: 6,
                            background: '#2563eb',
                            cursor: 'ns-resize',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            zIndex: 2,
                          }}
                        >
                          <div style={{ background: '#2563eb', color: '#fff', fontSize: 10, padding: '1px 8px', borderRadius: 4, pointerEvents: 'none' }}>
                            ↕ Alt Sınır — %{Math.round(cropBottom)}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {waPreviewData.messages.map((m, i) => (
                  <div key={i} style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <input
                        type="checkbox"
                        id={`wa-parent-${i}`}
                        checked={waSelectedParents.has(m.phone)}
                        onChange={(e) => {
                          setWaSelectedParents(prev => {
                            const next = new Set(prev);
                            if (e.target.checked) next.add(m.phone); else next.delete(m.phone);
                            return next;
                          });
                        }}
                        style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#16a34a', flexShrink: 0 }}
                      />
                      <label htmlFor={`wa-parent-${i}`} style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', cursor: 'pointer', margin: 0 }}>
                        {m.parent} · {m.phone}
                      </label>
                    </div>
                    <pre style={{
                      background: '#e7fbe9',
                      border: '1px solid #c3e6cb',
                      borderRadius: 8,
                      padding: '12px 14px',
                      fontSize: 13,
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      maxHeight: 280,
                      overflowY: 'auto',
                      fontFamily: 'inherit',
                      margin: 0,
                    }}>
                      {m.message}
                    </pre>
                  </div>
                ))}
              </>
            )}

            <div className="modal-actions" style={{ marginTop: 16 }}>
              <button className="btn btn-outline" onClick={() => setShowWaModal(false)}>İptal</button>
              <button
                className="btn btn-primary"
                style={{ background: '#16a34a', borderColor: '#16a34a' }}
                onClick={handleWaSend}
                disabled={!!waSendLoading || !waPreviewData || waSelectedParents.size === 0}
              >
                {waSendLoading ? <span className="spinner" /> : '📱 Gönder'}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmModal}
    </div>
  );
}

