import { useState, useEffect, useRef } from 'react';
import api from '../../services/api';

interface MatchedStudent {
  id: string;
  studentId: string;
  student: { fullName: string; className: string; schoolNumber: string };
  matchedText: string;
  matchedBy: string;
  confidence: number;
  previousViolations: number;
  suggestWarning: boolean;
  isConfirmed?: boolean;
}

interface UnmatchedLine {
  text: string;
  reason: string;
}

interface UploadResult {
  uploadId: string;
  ocrRawText: string;
  ocrLines: string[];
  type: string;
  typeLabel: string;
  violationDate: string;
  matched: MatchedStudent[];
  unmatched: UnmatchedLine[];
  summary: {
    totalLines: number;
    matchedCount: number;
    unmatchedCount: number;
    repeatOffenders: number;
  };
}

interface UploadRecord {
  id: string;
  type: string;
  description: string | null;
  uploadedBy: string;
  violationDate: string;
  createdAt: string;
  studentCount: number;
  records?: {
    id: string;
    studentId: string;
    type: string;
    matchedBy: string;
    isConfirmed: boolean;
    student: { fullName: string; className: string; schoolNumber: string };
    previousViolations?: number;
    suggestWarning?: boolean;
  }[];
}

interface StudentOption {
  id: string;
  fullName: string;
  className: string;
  schoolNumber: string;
}

const VIOLATION_TYPES = [
  { value: 'KIYAFET', label: '👔 Kıyafet / Makyaj Kontrolü', color: '#7c3aed' },
  { value: 'TOREN_GEC', label: '🏳️ Tören Geç Kalma', color: '#ea580c' },
  { value: 'DIGER', label: '📋 Diğer İhlal', color: '#6b7280' },
];

const BEHAVIOR_MAP: Record<string, string> = {
  KIYAFET: 'KIYAFET_KURALLAR',
  TOREN_GEC: 'DEVAMSIZLIK_OZURSUZ',
  DIGER: 'GENEL_KURAL_IHLAL',
};

export default function ViolationsPage() {
  const [tab, setTab] = useState<'upload' | 'manual' | 'history'>('upload');
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState('');

  // Upload form
  const [type, setType] = useState('KIYAFET');
  const [description, setDescription] = useState('');
  const [violationDate, setViolationDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Selection state for confirm
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  // Manual add
  const [showManualAdd, setShowManualAdd] = useState(false);
  const [manualSearch, setManualSearch] = useState('');
  const [allStudents, setAllStudents] = useState<StudentOption[]>([]);
  const [manualLoading, setManualLoading] = useState(false);

  // Warning creation
  const [creatingWarning, setCreatingWarning] = useState('');

  // Manual text input
  const [manualText, setManualText] = useState('');
  const [manualType, setManualType] = useState('KIYAFET');
  const [manualDate, setManualDate] = useState(new Date().toISOString().slice(0, 10));
  const [manualDesc, setManualDesc] = useState('');
  const [manualProcessing, setManualProcessing] = useState(false);

  // History
  const [history, setHistory] = useState<UploadRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [expandedUploadId, setExpandedUploadId] = useState<string | null>(null);
  const [deletingUploadId, setDeletingUploadId] = useState<string | null>(null);

  useEffect(() => {
    loadStudents();
  }, []);

  useEffect(() => {
    if (tab === 'history') loadHistory();
  }, [tab]);

  const loadStudents = async () => {
    try {
      const res = await api.get('/students?limit=2000');
      setAllStudents(res.data.data.students);
    } catch {}
  };

  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await api.get('/violations/uploads?limit=50');
      setHistory(res.data.data.records);
    } catch {} finally {
      setHistoryLoading(false);
    }
  };

  const handleDeleteUpload = async (uploadId: string) => {
    if (!confirm('Bu yükleme ve ilişkili tüm ihlal kayıtları silinecek. Emin misiniz?')) return;
    setDeletingUploadId(uploadId);
    try {
      await api.delete(`/violations/uploads/${uploadId}`);
      setHistory((prev) => prev.filter((h) => h.id !== uploadId));
      if (expandedUploadId === uploadId) setExpandedUploadId(null);
    } catch (err: any) {
      // 404 = zaten silinmiş, listeden kaldır
      if (err.response?.status === 404) {
        setHistory((prev) => prev.filter((h) => h.id !== uploadId));
        if (expandedUploadId === uploadId) setExpandedUploadId(null);
      } else {
        alert(err.response?.data?.message || 'Silme işlemi başarısız.');
      }
    } finally {
      setDeletingUploadId(null);
    }
  };

  const toggleExpand = (uploadId: string) => {
    setExpandedUploadId((prev) => (prev === uploadId ? null : uploadId));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setResult(null);
      setConfirmed(false);
      setError('');
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    setError('');
    setResult(null);
    setConfirmed(false);
    setSelectedIds(new Set());

    const formData = new FormData();
    formData.append('image', selectedFile);
    formData.append('type', type);
    formData.append('violationDate', violationDate);
    if (description) formData.append('description', description);

    try {
      const res = await api.post('/violations/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000, // OCR uzun sürebilir
      });
      const data: UploadResult = res.data.data;
      setResult(data);

      // Otomatik olarak tüm eşleşenleri seç
      const ids = new Set<string>(data.matched.map((m) => m.id));
      setSelectedIds(ids);
    } catch (err: any) {
      setError(
        err.response?.data?.message || 'Yükleme başarısız. Lütfen tekrar deneyin.'
      );
    } finally {
      setUploading(false);
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (!result) return;
    if (selectedIds.size === result.matched.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(result.matched.map((m) => m.id)));
    }
  };

  const handleConfirm = async () => {
    if (!result || selectedIds.size === 0) return;
    setConfirming(true);
    try {
      await api.post(`/violations/${result.uploadId}/confirm`, {
        violationIds: Array.from(selectedIds),
      });
      setConfirmed(true);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Onaylama başarısız.');
    } finally {
      setConfirming(false);
    }
  };

  const handleRemoveViolation = async (violationId: string) => {
    if (!result) return;
    try {
      await api.delete(`/violations/record/${violationId}`);
      setResult({
        ...result,
        matched: result.matched.filter((m) => m.id !== violationId),
        summary: {
          ...result.summary,
          matchedCount: result.summary.matchedCount - 1,
        },
      });
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(violationId);
        return next;
      });
    } catch {}
  };

  const handleManualAdd = async (studentId: string) => {
    if (!result) return;
    setManualLoading(true);
    try {
      const res = await api.post(`/violations/${result.uploadId}/manual`, {
        studentId,
        type: result.type,
        violationDate: result.violationDate,
      });
      const newRecord = res.data.data;
      setResult({
        ...result,
        matched: [...result.matched, {
          id: newRecord.id,
          studentId: newRecord.studentId,
          student: newRecord.student,
          matchedText: '(Manuel eklendi)',
          matchedBy: 'MANUAL',
          confidence: 100,
          previousViolations: newRecord.previousViolations,
          suggestWarning: newRecord.suggestWarning,
        }],
        summary: {
          ...result.summary,
          matchedCount: result.summary.matchedCount + 1,
        },
      });
      setSelectedIds((prev) => new Set(prev).add(newRecord.id));
      setShowManualAdd(false);
      setManualSearch('');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Ekleme başarısız.');
    } finally {
      setManualLoading(false);
    }
  };

  const handleCreateWarning = async (student: MatchedStudent) => {
    if (!result) return;
    setCreatingWarning(student.studentId);
    try {
      await api.post('/warnings', {
        studentId: student.studentId,
        behaviorCode: BEHAVIOR_MAP[result.type] || 'GENEL_KURAL_IHLAL',
        description: `${getTypeLabel(result.type)} - Tekrarlanan ihlal (${student.previousViolations + 1}. kez)`,
        schoolName: description || undefined,
      });
      alert(`${student.student.fullName} için yazılı uyarı oluşturuldu!`);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Uyarı oluşturulamadı.');
    } finally {
      setCreatingWarning('');
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setPreviewUrl('');
    setResult(null);
    setConfirmed(false);
    setError('');
    setSelectedIds(new Set());
    setDescription('');
    setManualText('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleProcessManualText = async () => {
    if (!manualText.trim()) return;
    setManualProcessing(true);
    setError('');
    setResult(null);
    setConfirmed(false);
    setSelectedIds(new Set());

    try {
      const res = await api.post('/violations/process-text', {
        text: manualText,
        type: manualType,
        violationDate: manualDate,
        description: manualDesc || undefined,
      });
      const data: UploadResult = res.data.data;
      setResult(data);
      setTab('upload'); // Sonuçları göstermek için upload tabına geç

      // Otomatik olarak tüm eşleşenleri seç
      const ids = new Set<string>(data.matched.map((m) => m.id));
      setSelectedIds(ids);
    } catch (err: any) {
      setError(
        err.response?.data?.message || 'İşlem başarısız. Lütfen tekrar deneyin.'
      );
    } finally {
      setManualProcessing(false);
    }
  };

  const getTypeLabel = (t: string) => VIOLATION_TYPES.find((v) => v.value === t)?.label || t;
  const getTypeColor = (t: string) => VIOLATION_TYPES.find((v) => v.value === t)?.color || '#6b7280';

  const formatDate = (d: string) => {
    const dt = new Date(d);
    return `${dt.getDate().toString().padStart(2, '0')}.${(dt.getMonth() + 1).toString().padStart(2, '0')}.${dt.getFullYear()}`;
  };

  const filteredManualStudents = allStudents.filter((s) => {
    // Zaten eşleşmiş olanları gösterme
    if (result?.matched.some((m) => m.studentId === s.id)) return false;
    if (!manualSearch) return false;
    return (
      s.fullName.toLowerCase().includes(manualSearch.toLowerCase()) ||
      s.schoolNumber.includes(manualSearch) ||
      s.className.toLowerCase().includes(manualSearch.toLowerCase())
    );
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0 }}>İhlal Takip Sistemi</h1>
          <p style={{ margin: '4px 0 0', color: '#666', fontSize: 14 }}>
            Kıyafet kontrolü ve tören geç kalma listesi fotoğraflarından otomatik öğrenci tanıma
          </p>
        </div>
      </div>

      {/* Tab Buttons */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        <button
          className={`btn ${tab === 'upload' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setTab('upload')}
        >
          📷 Fotoğraf ile Yükleme
        </button>
        <button
          className={`btn ${tab === 'manual' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setTab('manual')}
        >
          ✏️ Manuel Numara Girişi
        </button>
        <button
          className={`btn ${tab === 'history' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setTab('history')}
        >
          📜 Geçmiş Yüklemeler
        </button>
      </div>

      {tab === 'upload' && (
        <>
          {/* Upload Form */}
          {!result && (
            <div className="card" style={{ padding: 24 }}>
              <h3 style={{ marginTop: 0 }}>Fotoğraf Yükle</h3>
              <p style={{ color: '#666', fontSize: 14, marginBottom: 20 }}>
                Kıyafet kontrolü veya tören listesi fotoğrafını yükleyin. 
                Sistem OCR ile öğrenci isimlerini/numaralarını otomatik tanıyacak.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                <div className="form-group">
                  <label>İhlal Tipi</label>
                  <select value={type} onChange={(e) => setType(e.target.value)}>
                    {VIOLATION_TYPES.map((vt) => (
                      <option key={vt.value} value={vt.value}>{vt.label}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>İhlal Tarihi</label>
                  <input
                    type="date"
                    value={violationDate}
                    onChange={(e) => setViolationDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 20 }}>
                <label>Açıklama (Opsiyonel)</label>
                <input
                  type="text"
                  placeholder="Ör: Sabah bahçe kontrolü, Pazartesi tören..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              {/* Drop Zone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: '2px dashed #cbd5e1',
                  borderRadius: 12,
                  padding: selectedFile ? 16 : 48,
                  textAlign: 'center',
                  cursor: 'pointer',
                  background: selectedFile ? '#f0fdf4' : '#f8fafc',
                  transition: 'all 0.2s',
                  marginBottom: 20,
                }}
                onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = '#3b82f6'; }}
                onDragLeave={(e) => { e.currentTarget.style.borderColor = '#cbd5e1'; }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.currentTarget.style.borderColor = '#cbd5e1';
                  const file = e.dataTransfer.files[0];
                  if (file && file.type.startsWith('image/')) {
                    setSelectedFile(file);
                    setPreviewUrl(URL.createObjectURL(file));
                  }
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                />
                {selectedFile ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    {previewUrl && (
                      <img
                        src={previewUrl}
                        alt="Önizleme"
                        style={{ maxHeight: 200, borderRadius: 8, objectFit: 'contain' }}
                      />
                    )}
                    <div style={{ textAlign: 'left' }}>
                      <p style={{ fontWeight: 600, margin: '0 0 4px' }}>{selectedFile.name}</p>
                      <p style={{ color: '#666', margin: 0, fontSize: 13 }}>
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                      <button
                        className="btn btn-sm"
                        style={{ marginTop: 8, fontSize: 12 }}
                        onClick={(e) => { e.stopPropagation(); handleReset(); }}
                      >
                        Değiştir
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p style={{ fontSize: 48, margin: '0 0 8px' }}>📷</p>
                    <p style={{ fontWeight: 600, margin: '0 0 4px' }}>
                      Fotoğrafı buraya sürükleyin veya tıklayın
                    </p>
                    <p style={{ color: '#999', margin: 0, fontSize: 13 }}>
                      JPG, PNG veya WebP - Maks. 15MB
                    </p>
                  </>
                )}
              </div>

              {error && (
                <div style={{
                  background: '#fee2e2', color: '#dc2626', padding: '10px 16px',
                  borderRadius: 8, marginBottom: 16, fontSize: 14,
                }}>
                  {error}
                </div>
              )}

              <button
                className="btn btn-primary"
                onClick={handleUpload}
                disabled={!selectedFile || uploading}
                style={{ width: '100%', padding: '12px 0', fontSize: 16 }}
              >
                {uploading ? (
                  <span>
                    <span className="loading-spinner" style={{ width: 16, height: 16, display: 'inline-block', marginRight: 8 }} />
                    OCR ile analiz ediliyor... (bu işlem 15-30 saniye sürebilir)
                  </span>
                ) : (
                  '🔍 Fotoğrafı Analiz Et'
                )}
              </button>

              <div style={{
                marginTop: 12, textAlign: 'center', fontSize: 13, color: '#666',
              }}>
                El yazısı okunmuyorsa?{' '}
                <span
                  style={{ color: '#2563eb', cursor: 'pointer', textDecoration: 'underline' }}
                  onClick={() => setTab('manual')}
                >
                  Manuel numara girişi yapın →
                </span>
              </div>
            </div>
          )}

          {/* Results */}
          {result && (
            <div>
              {/* Summary Card */}
              <div className="card" style={{ padding: 20, marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <h3 style={{ margin: '0 0 4px' }}>
                      Sonuçlar — {result.typeLabel}
                    </h3>
                    <p style={{ margin: 0, color: '#666', fontSize: 13 }}>
                      Tarih: {formatDate(result.violationDate)} | {result.ocrLines.length} giriş işlendi
                    </p>
                  </div>
                  <button className="btn btn-outline" onClick={handleReset}>
                    🔄 Yeni Yükleme
                  </button>
                </div>

                <div style={{ display: 'flex', gap: 16, marginTop: 16, flexWrap: 'wrap' }}>
                  <div style={{ background: '#dbeafe', padding: '10px 20px', borderRadius: 8, textAlign: 'center', flex: 1, minWidth: 120 }}>
                    <div style={{ fontSize: 24, fontWeight: 700, color: '#2563eb' }}>{result.summary.matchedCount}</div>
                    <div style={{ fontSize: 12, color: '#3b82f6' }}>Eşleşen Öğrenci</div>
                  </div>
                  <div style={{ background: '#fef3c7', padding: '10px 20px', borderRadius: 8, textAlign: 'center', flex: 1, minWidth: 120 }}>
                    <div style={{ fontSize: 24, fontWeight: 700, color: '#d97706' }}>{result.summary.unmatchedCount}</div>
                    <div style={{ fontSize: 12, color: '#d97706' }}>Eşleşemeyen</div>
                  </div>
                  <div style={{ background: '#fee2e2', padding: '10px 20px', borderRadius: 8, textAlign: 'center', flex: 1, minWidth: 120 }}>
                    <div style={{ fontSize: 24, fontWeight: 700, color: '#dc2626' }}>{result.summary.repeatOffenders}</div>
                    <div style={{ fontSize: 12, color: '#dc2626' }}>Tekrar Eden (Uyarı Önerisi)</div>
                  </div>
                </div>
              </div>

              {/* Confirmed Banner */}
              {confirmed && (
                <div style={{
                  background: '#dcfce7', border: '1px solid #86efac', padding: '12px 20px',
                  borderRadius: 8, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12,
                }}>
                  <span style={{ fontSize: 24 }}>✅</span>
                  <div>
                    <strong>İhlaller onaylandı!</strong>
                    <p style={{ margin: '2px 0 0', color: '#166534', fontSize: 13 }}>
                      Seçilen {selectedIds.size} ihlal kaydedildi. Tekrar eden öğrenciler için aşağıdan yazılı uyarı oluşturabilirsiniz.
                    </p>
                  </div>
                </div>
              )}

              {/* Low match warning - suggest manual entry */}
              {!confirmed && result.summary.unmatchedCount > result.summary.matchedCount && (
                <div style={{
                  background: '#fef3c7', border: '1px solid #fcd34d', padding: '12px 20px',
                  borderRadius: 8, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12,
                }}>
                  <span style={{ fontSize: 24 }}>💡</span>
                  <div>
                    <strong>OCR sonuçları düşük doğrulukta</strong>
                    <p style={{ margin: '2px 0 0', color: '#92400e', fontSize: 13 }}>
                      El yazısı düzgün okunamadı. 
                      <span
                        style={{ color: '#2563eb', cursor: 'pointer', textDecoration: 'underline', marginLeft: 4 }}
                        onClick={() => { handleReset(); setTab('manual'); }}
                      >
                        Manuel numara girişi ile devam edin →
                      </span>
                    </p>
                  </div>
                </div>
              )}

              {/* Matched Students Table */}
              {result.matched.length > 0 && (
                <div className="card" style={{ marginBottom: 20, overflowX: 'auto' }}>
                  <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e5e7eb' }}>
                    <h3 style={{ margin: 0 }}>✅ Eşleşen Öğrenciler ({result.matched.length})</h3>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        className="btn btn-sm"
                        style={{ fontSize: 12, background: '#f0f0f0', border: 'none' }}
                        onClick={() => setShowManualAdd(true)}
                      >
                        + Manuel Ekle
                      </button>
                      {!confirmed && (
                        <button
                          className="btn btn-primary btn-sm"
                          disabled={selectedIds.size === 0 || confirming}
                          onClick={handleConfirm}
                          style={{ fontSize: 12 }}
                        >
                          {confirming ? 'Onaylanıyor...' : `✓ Seçilenleri Onayla (${selectedIds.size})`}
                        </button>
                      )}
                    </div>
                  </div>

                  <table className="table">
                    <thead>
                      <tr>
                        {!confirmed && (
                          <th style={{ width: 40 }}>
                            <input
                              type="checkbox"
                              checked={selectedIds.size === result.matched.length}
                              onChange={toggleAll}
                            />
                          </th>
                        )}
                        <th>Öğrenci</th>
                        <th>Sınıf</th>
                        <th>No</th>
                        <th>OCR Eşleşme</th>
                        <th>Güven</th>
                        <th>Geçmiş İhlal</th>
                        <th>İşlem</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.matched.map((m) => (
                        <tr
                          key={m.id}
                          style={{
                            background: m.suggestWarning ? '#fff7ed' : undefined,
                          }}
                        >
                          {!confirmed && (
                            <td>
                              <input
                                type="checkbox"
                                checked={selectedIds.has(m.id)}
                                onChange={() => toggleSelection(m.id)}
                              />
                            </td>
                          )}
                          <td>
                            <strong>{m.student.fullName}</strong>
                          </td>
                          <td>{m.student.className}</td>
                          <td>{m.student.schoolNumber}</td>
                          <td>
                            <span style={{ fontSize: 12, color: '#666' }}>
                              {m.matchedBy === 'SCHOOL_NUMBER' && '🔢 '}
                              {m.matchedBy === 'NAME_EXACT' && '✅ '}
                              {m.matchedBy === 'NAME_FUZZY' && '🔤 '}
                              {m.matchedBy === 'MANUAL' && '✋ '}
                              {m.matchedText.length > 30
                                ? m.matchedText.slice(0, 30) + '...'
                                : m.matchedText}
                            </span>
                          </td>
                          <td>
                            <span
                              style={{
                                padding: '2px 8px',
                                borderRadius: 10,
                                fontSize: 12,
                                fontWeight: 600,
                                background: m.confidence >= 90 ? '#dcfce7' : m.confidence >= 70 ? '#fef3c7' : '#fee2e2',
                                color: m.confidence >= 90 ? '#16a34a' : m.confidence >= 70 ? '#d97706' : '#dc2626',
                              }}
                            >
                              %{m.confidence}
                            </span>
                          </td>
                          <td>
                            {m.previousViolations > 0 ? (
                              <span style={{
                                background: '#fee2e2', color: '#dc2626',
                                padding: '2px 8px', borderRadius: 10, fontSize: 12, fontWeight: 600,
                              }}>
                                {m.previousViolations} kez ⚠️
                              </span>
                            ) : (
                              <span style={{ color: '#999', fontSize: 12 }}>İlk kez</span>
                            )}
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                              {m.suggestWarning && confirmed && (
                                <button
                                  className="btn btn-sm"
                                  style={{
                                    background: '#fee2e2', color: '#dc2626',
                                    border: 'none', padding: '3px 8px', borderRadius: 6,
                                    cursor: 'pointer', fontSize: 11, fontWeight: 600,
                                  }}
                                  onClick={() => handleCreateWarning(m)}
                                  disabled={creatingWarning === m.studentId}
                                >
                                  {creatingWarning === m.studentId
                                    ? '...'
                                    : '⚠️ Yazılı Uyarı'}
                                </button>
                              )}
                              {!confirmed && (
                                <button
                                  className="btn btn-sm"
                                  style={{
                                    background: '#f3f4f6', color: '#6b7280',
                                    border: 'none', padding: '3px 8px', borderRadius: 6,
                                    cursor: 'pointer', fontSize: 11,
                                  }}
                                  onClick={() => handleRemoveViolation(m.id)}
                                  title="Kaldır"
                                >
                                  ✕
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Unmatched Lines */}
              {result.unmatched.length > 0 && (
                <div className="card" style={{ marginBottom: 20 }}>
                  <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb' }}>
                    <h3 style={{ margin: 0 }}>⚠️ Eşleşemeyen Satırlar ({result.unmatched.length})</h3>
                    <p style={{ margin: '4px 0 0', fontSize: 12, color: '#999' }}>
                      Bu satırlar veritabanındaki öğrencilerle eşleştirilemedi. 
                      Manuel olarak ekleyebilirsiniz.
                    </p>
                  </div>
                  <div style={{ padding: '12px 20px' }}>
                    {result.unmatched.map((u, i) => (
                      <div
                        key={i}
                        style={{
                          display: 'flex', justifyContent: 'space-between',
                          alignItems: 'center', padding: '8px 0',
                          borderBottom: i < result.unmatched.length - 1 ? '1px solid #f0f0f0' : 'none',
                        }}
                      >
                        <div>
                          <span style={{ fontWeight: 500 }}>"{u.text}"</span>
                          <span style={{ color: '#999', fontSize: 12, marginLeft: 8 }}>
                            — {u.reason}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* OCR Raw Text (collapsible) */}
              <details className="card" style={{ marginBottom: 20 }}>
                <summary style={{ padding: '12px 20px', cursor: 'pointer', fontWeight: 600 }}>
                  📝 OCR Ham Metin (Tıklayarak Görüntüle)
                </summary>
                <pre style={{
                  padding: '12px 20px', background: '#f8fafc',
                  margin: 0, whiteSpace: 'pre-wrap', fontSize: 13,
                  fontFamily: 'monospace', borderTop: '1px solid #e5e7eb',
                  maxHeight: 300, overflowY: 'auto',
                }}>
                  {result.ocrRawText}
                </pre>
              </details>
            </div>
          )}

          {/* Manual Add Modal */}
          {showManualAdd && result && (
            <div className="modal-overlay" onClick={() => setShowManualAdd(false)}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
                <div className="modal-header">
                  <h2>Manuel Öğrenci Ekle</h2>
                  <button className="modal-close" onClick={() => setShowManualAdd(false)}>✕</button>
                </div>
                <div className="form-group">
                  <label>Öğrenci Ara</label>
                  <input
                    type="text"
                    placeholder="Ad, numara veya sınıf ile arayın..."
                    value={manualSearch}
                    onChange={(e) => setManualSearch(e.target.value)}
                    autoFocus
                  />
                </div>
                <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                  {filteredManualStudents.length === 0 && manualSearch ? (
                    <p style={{ padding: 16, color: '#999', textAlign: 'center' }}>Öğrenci bulunamadı</p>
                  ) : (
                    filteredManualStudents.slice(0, 20).map((s) => (
                      <div
                        key={s.id}
                        onClick={() => !manualLoading && handleManualAdd(s.id)}
                        style={{
                          padding: '10px 16px', cursor: manualLoading ? 'wait' : 'pointer',
                          borderBottom: '1px solid #f0f0f0', display: 'flex',
                          justifyContent: 'space-between', alignItems: 'center',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = '#f5f5ff')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = '')}
                      >
                        <div>
                          <strong>{s.fullName}</strong>
                          <span style={{ color: '#888', marginLeft: 8, fontSize: 13 }}>
                            {s.className} - No: {s.schoolNumber}
                          </span>
                        </div>
                        <span style={{ fontSize: 12, color: '#3b82f6' }}>+ Ekle</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Manual Text Input Tab */}
      {tab === 'manual' && !result && (
        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ marginTop: 0 }}>✏️ Manuel Okul Numarası Girişi</h3>
          <p style={{ color: '#666', fontSize: 14, marginBottom: 8 }}>
            Fotoğraf analizi başarısız olduğunda veya hızlıca numara girmek istediğinizde bu alanı kullanın.
          </p>
          <div style={{
            background: '#eff6ff', border: '1px solid #bfdbfe', padding: '10px 16px',
            borderRadius: 8, marginBottom: 20, fontSize: 13, color: '#1e40af',
          }}>
            💡 <strong>İpucu:</strong> Okul numaralarını virgülle, boşlukla veya her satıra bir numara gelecek şekilde girin.
            <br />
            Örnek: <code style={{ background: '#dbeafe', padding: '1px 4px', borderRadius: 3 }}>182, 592, 561, 551, 658</code>
            {' '}veya{' '}
            <code style={{ background: '#dbeafe', padding: '1px 4px', borderRadius: 3 }}>182 Sıla Karoğlu</code> (satır satır)
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            <div className="form-group">
              <label>İhlal Tipi</label>
              <select value={manualType} onChange={(e) => setManualType(e.target.value)}>
                {VIOLATION_TYPES.map((vt) => (
                  <option key={vt.value} value={vt.value}>{vt.label}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>İhlal Tarihi</label>
              <input
                type="date"
                value={manualDate}
                onChange={(e) => setManualDate(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 20 }}>
            <label>Açıklama (Opsiyonel)</label>
            <input
              type="text"
              placeholder="Ör: Sabah bahçe kontrolü..."
              value={manualDesc}
              onChange={(e) => setManualDesc(e.target.value)}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 20 }}>
            <label>Okul Numaraları / Öğrenci Bilgileri</label>
            <textarea
              rows={8}
              placeholder={`Okul numaralarını girin:\n\n182, 592, 561, 551, 658, 164, 319, 350\n\nveya satır satır:\n\n182 Sıla Karoğlu\n592 Meryem Gök\n561 Nur Yıldız`}
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
              style={{
                width: '100%', fontFamily: 'monospace', fontSize: 14,
                padding: 12, borderRadius: 8, border: '1px solid #d1d5db',
                resize: 'vertical', minHeight: 160,
              }}
            />
            {manualText.trim() && (
              <p style={{ margin: '4px 0 0', fontSize: 12, color: '#666' }}>
                Algılanan giriş sayısı: <strong>
                  {manualText.split(/[\n,;]+/).filter((s) => s.trim()).length}
                </strong>
              </p>
            )}
          </div>

          {error && (
            <div style={{
              background: '#fee2e2', color: '#dc2626', padding: '10px 16px',
              borderRadius: 8, marginBottom: 16, fontSize: 14,
            }}>
              {error}
            </div>
          )}

          <button
            className="btn btn-primary"
            onClick={handleProcessManualText}
            disabled={!manualText.trim() || manualProcessing}
            style={{ width: '100%', padding: '12px 0', fontSize: 16 }}
          >
            {manualProcessing ? (
              <span>
                <span className="loading-spinner" style={{ width: 16, height: 16, display: 'inline-block', marginRight: 8 }} />
                Eşleştiriliyor...
              </span>
            ) : (
              '🔍 Numaraları Eşleştir'
            )}
          </button>
        </div>
      )}

      {/* History Tab */}
      {tab === 'history' && (
        <div>
          {historyLoading ? (
            <div className="card" style={{ padding: 40, textAlign: 'center' }}>
              <div className="loading-spinner" />
              <p>Yükleniyor...</p>
            </div>
          ) : history.length === 0 ? (
            <div className="card" style={{ padding: 40, textAlign: 'center' }}>
              <p style={{ fontSize: 48, margin: 0 }}>📷</p>
              <h3>Henüz yükleme yapılmamış</h3>
              <p style={{ color: '#666' }}>İlk fotoğrafı yüklemek için "Yeni Yükleme" sekmesini kullanın.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {history.map((h) => (
                <div key={h.id} className="card" style={{ overflow: 'hidden' }}>
                  {/* Upload Header Row */}
                  <div
                    onClick={() => toggleExpand(h.id)}
                    style={{
                      padding: '14px 20px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      cursor: 'pointer',
                      background: expandedUploadId === h.id ? '#f8fafc' : undefined,
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={(e) => { if (expandedUploadId !== h.id) e.currentTarget.style.background = '#fafafa'; }}
                    onMouseLeave={(e) => { if (expandedUploadId !== h.id) e.currentTarget.style.background = ''; }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                      <span style={{
                        fontSize: 14, transition: 'transform 0.2s',
                        transform: expandedUploadId === h.id ? 'rotate(90deg)' : 'rotate(0deg)',
                        display: 'inline-block',
                      }}>
                        ▶
                      </span>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <strong style={{ fontSize: 15 }}>{formatDate(h.violationDate)}</strong>
                          <span style={{
                            padding: '2px 10px', borderRadius: 10, fontSize: 11,
                            fontWeight: 600, background: `${getTypeColor(h.type)}15`,
                            color: getTypeColor(h.type),
                          }}>
                            {getTypeLabel(h.type)}
                          </span>
                          <span style={{
                            padding: '2px 8px', borderRadius: 10, fontSize: 11,
                            fontWeight: 600, background: '#dbeafe', color: '#2563eb',
                          }}>
                            {h.studentCount} öğrenci
                          </span>
                        </div>
                        {h.description && (
                          <p style={{ margin: '2px 0 0', fontSize: 12, color: '#888' }}>{h.description}</p>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 12, color: '#999' }}>
                        {formatDate(h.createdAt)}
                      </span>
                      <button
                        className="btn btn-sm"
                        style={{
                          background: '#fee2e2', color: '#dc2626', border: 'none',
                          padding: '4px 10px', borderRadius: 6, cursor: 'pointer',
                          fontSize: 12, fontWeight: 600,
                        }}
                        onClick={(e) => { e.stopPropagation(); handleDeleteUpload(h.id); }}
                        disabled={deletingUploadId === h.id}
                        title="Sil"
                      >
                        {deletingUploadId === h.id ? '...' : '🗑️ Sil'}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Detail: Student List */}
                  {expandedUploadId === h.id && (
                    <div style={{ borderTop: '1px solid #e5e7eb' }}>
                      {!h.records || h.records.length === 0 ? (
                        <div style={{ padding: 20, textAlign: 'center', color: '#999', fontSize: 14 }}>
                          Bu yüklemede öğrenci kaydı yok.
                        </div>
                      ) : (
                        <table className="table" style={{ margin: 0 }}>
                          <thead>
                            <tr style={{ background: '#f8fafc' }}>
                              <th style={{ padding: '8px 16px', fontSize: 12 }}>#</th>
                              <th style={{ padding: '8px 16px', fontSize: 12 }}>Öğrenci</th>
                              <th style={{ padding: '8px 16px', fontSize: 12 }}>Sınıf</th>
                              <th style={{ padding: '8px 16px', fontSize: 12 }}>Okul No</th>
                              <th style={{ padding: '8px 16px', fontSize: 12 }}>Eşleşme</th>
                              <th style={{ padding: '8px 16px', fontSize: 12 }}>Durum</th>
                            </tr>
                          </thead>
                          <tbody>
                            {h.records.map((r, idx) => (
                              <tr key={r.id}>
                                <td style={{ padding: '6px 16px', fontSize: 13, color: '#999' }}>
                                  {idx + 1}
                                </td>
                                <td style={{ padding: '6px 16px', fontSize: 13 }}>
                                  <strong>{r.student.fullName}</strong>
                                </td>
                                <td style={{ padding: '6px 16px', fontSize: 13 }}>
                                  {r.student.className}
                                </td>
                                <td style={{ padding: '6px 16px', fontSize: 13 }}>
                                  {r.student.schoolNumber}
                                </td>
                                <td style={{ padding: '6px 16px', fontSize: 12, color: '#888' }}>
                                  {r.matchedBy === 'SCHOOL_NUMBER' && '🔢 Numara'}
                                  {r.matchedBy === 'NAME_EXACT' && '✅ İsim (Tam)'}
                                  {r.matchedBy === 'NAME_FUZZY' && '🔤 İsim (Yakın)'}
                                  {r.matchedBy === 'MANUAL' && '✋ Manuel'}
                                  {r.matchedBy === 'OCR' && '📷 OCR'}
                                </td>
                                <td style={{ padding: '6px 16px' }}>
                                  {r.isConfirmed ? (
                                    <span style={{
                                      padding: '2px 8px', borderRadius: 10, fontSize: 11,
                                      fontWeight: 600, background: '#dcfce7', color: '#16a34a',
                                    }}>
                                      ✓ Onaylı
                                    </span>
                                  ) : (
                                    <span style={{
                                      padding: '2px 8px', borderRadius: 10, fontSize: 11,
                                      fontWeight: 600, background: '#fef3c7', color: '#d97706',
                                    }}>
                                      Beklemede
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
