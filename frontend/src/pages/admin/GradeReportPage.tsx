import { useState, useRef } from 'react';
import { PDFDocument } from 'pdf-lib';
import api from '../../services/api';
import { useConfirm } from '../../hooks/useConfirm';

interface FailedSubject {
  subject: string;
  grade: number;
}

interface StudentRecord {
  id: string;
  fullName: string;
  className: string;
  schoolNumber?: string;
  tcKimlikNo?: string;
  failedSubjects: FailedSubject[];
  dbStudentName?: string;
  matched: boolean;
  pdfPath?: string;
}

interface AnalyzeResult {
  reportId: string;
  className: string;
  studentCount: number;
  students: StudentRecord[];
  existingReportId?: string | null;
}

interface ReportListItem {
  id: string;
  className: string;
  schoolYear: string;
  meetingDate: string;
  uploadedAt: string;
  _count: { students: number };
}

type GenResult = { id: string; name: string; pdfPath: string | null; error?: string };

export default function GradeReportPage() {
  const { confirm, confirmModal } = useConfirm();
  const fileRef = useRef<HTMLInputElement>(null);

  const [schoolYear,      setSchoolYear]      = useState('2025 / 2026');
  const [meetingDate,     setMeetingDate]      = useState(new Date().toISOString().slice(0, 10));
  const [uploading,       setUploading]        = useState(false);
  const [generating,      setGenerating]       = useState(false);
  const [bulkDownloading, setBulkDownloading]  = useState(false);
  const [result,          setResult]           = useState<AnalyzeResult | null>(null);
  const [reports,         setReports]          = useState<ReportListItem[] | null>(null);
  const [archivedReports, setArchivedReports]  = useState<ReportListItem[] | null>(null);
  const [loadingList,     setLoadingList]      = useState(false);
  const [error,           setError]            = useState('');
  const [genResults,      setGenResults]       = useState<GenResult[]>([]);
  const [selectedIds,     setSelectedIds]      = useState<Set<string>>(new Set());
  const [activePanel,     setActivePanel]      = useState<'none' | 'reports' | 'archived'>('none');

  // Conflict modal state
  const [conflictInfo, setConflictInfo] = useState<{ existingId: string; className: string } | null>(null);

  // ── Analiz ─────────────────────────────────────────────────────────────
  const handleAnalyze = async () => {
    setError(''); setResult(null); setGenResults([]); setSelectedIds(new Set());
    const file = fileRef.current?.files?.[0];
    if (!file) { setError('Lütfen bir Excel veya PDF dosyası seçin.'); return; }

    const formData = new FormData();
    formData.append('karne', file);
    formData.append('schoolYear', schoolYear);
    formData.append('meetingDate', meetingDate);

    setUploading(true);
    try {
      const res = await api.post<{ success: boolean; data: AnalyzeResult }>(
        '/grade-reports/analyze', formData,
        { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 180000 },
      );
      const data = res.data.data;
      setResult(data);
      setActivePanel('none');
      // Mevcut rapor varsa conflict modal göster
      if (data.existingReportId) {
        setConflictInfo({ existingId: data.existingReportId, className: data.className });
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Analiz hatası');
    } finally { setUploading(false); }
  };

  // ── PDF Oluştur ─────────────────────────────────────────────────────────
  const handleGenerate = async () => {
    if (!result) return;
    setError(''); setGenerating(true);
    try {
      const res = await api.post<{ success: boolean; data: GenResult[] }>(
        `/grade-reports/${result.reportId}/generate-pdfs`, {},
        { timeout: 300000 },
      );
      setGenResults(res.data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'PDF oluşturma hatası');
    } finally { setGenerating(false); }
  };

  // ── Raporları listele ────────────────────────────────────────────────────
  const handleLoadReports = async () => {
    setLoadingList(true);
    try {
      const res = await api.get<{ success: boolean; data: ReportListItem[] }>('/grade-reports');
      setReports(res.data.data);
      setActivePanel('reports');
    } catch (err: any) { setError(err.response?.data?.message || err.message); }
    finally { setLoadingList(false); }
  };
  // ── Arşivlenmiş raporları yükle ──────────────────────────────
  const handleLoadArchived = async () => {
    try {
      const res = await api.get<{ success: boolean; data: ReportListItem[] }>('/grade-reports/archived');
      setArchivedReports(res.data.data);
      setActivePanel('archived');
    } catch (err: any) { setError(err.response?.data?.message || err.message); }
  };

  // ── Conflict: eski raporu sil ────────────────────────────────
  const handleConflictDelete = async () => {
    if (!conflictInfo) return;
    try {
      await api.delete(`/grade-reports/${conflictInfo.existingId}`);
      setReports(prev => prev?.filter(r => r.id !== conflictInfo.existingId) ?? null);
    } catch (err: any) { setError(err.response?.data?.message || err.message); }
    finally { setConflictInfo(null); }
  };

  // ── Conflict: eski raporu arşivle ───────────────────────────
  const handleConflictArchive = async () => {
    if (!conflictInfo) return;
    try {
      await api.patch(`/grade-reports/${conflictInfo.existingId}/archive`);
      setReports(prev => prev?.filter(r => r.id !== conflictInfo.existingId) ?? null);
      setArchivedReports(null); // arşiv listesi yenilenir
    } catch (err: any) { setError(err.response?.data?.message || err.message); }
    finally { setConflictInfo(null); }
  };
  // ── Tek PDF görüntüle ────────────────────────────────────────────────────
  const handleDownload = async (studentId: string, studentName: string) => {
    try {
      const res = await api.get(`/grade-reports/students/${studentId}/pdf`, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const newWin = window.open(url, '_blank');
      if (!newWin) { window.location.href = url; }
    } catch { setError('PDF görüntüleme başarısız.'); }
  };

  // ── Toplu PDF birleştir ve indir ──────────────────────────────────────────
  const handleBulkDownload = async () => {
    if (selectedIds.size === 0 || !result) return;
    setBulkDownloading(true);
    setError('');
    try {
      const mergedPdf = await PDFDocument.create();

      // Öğrenci sıralamasını koruyarak PDF'leri sırayla ekle
      const orderedIds = result.students
        .filter(s => selectedIds.has(s.id))
        .map(s => s.id);

      for (const id of orderedIds) {
        try {
          const r = await api.get(`/grade-reports/students/${id}/pdf`, { responseType: 'arraybuffer' });
          const srcPdf = await PDFDocument.load(r.data);
          const pages = await mergedPdf.copyPages(srcPdf, srcPdf.getPageIndices());
          pages.forEach(p => mergedPdf.addPage(p));
        } catch { /* skip failed individual PDF */ }
      }

      const mergedBytes = await mergedPdf.save();
      const blob = new Blob([mergedBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `sinif_risk_${(result.className || 'rapor').replace(/\//g, '-')}.pdf`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
    } catch { setError('Toplu PDF birleştirme başarısız.'); }
    finally { setBulkDownloading(false); }
  };

  // ── Rapor sil ────────────────────────────────────────────────────────────
  const handleDeleteReport = async (id: string) => {
    if (!await confirm('Bu raporu silmek istediğinizden emin misiniz?')) return;
    try {
      await api.delete(`/grade-reports/${id}`);
      setReports(prev => prev?.filter(r => r.id !== id) ?? null);
      if (result?.reportId === id) { setResult(null); setGenResults([]); setSelectedIds(new Set()); }
    } catch (err: any) { setError(err.response?.data?.message || err.message); }
  };

  // ── Raporu yükle ─────────────────────────────────────────────────────────
  const handleLoadReport = async (id: string) => {
    try {
      const res = await api.get<{ success: boolean; data: any }>(`/grade-reports/${id}`);
      const d = res.data.data;
      setResult({
        reportId: d.id, className: d.className,
        studentCount: d.students.length,
        students: d.students.map((s: any) => ({
          id: s.id, fullName: s.fullName, className: s.className,
          schoolNumber: s.schoolNumber, tcKimlikNo: s.tcKimlikNo,
          failedSubjects: s.failedSubjects,
          dbStudentName: s.student?.fullName, matched: !!s.studentId, pdfPath: s.pdfPath,
        })),
      });
      setGenResults([]); setSelectedIds(new Set()); setActivePanel('none');
    } catch (err: any) { setError(err.response?.data?.message || err.message); }
  };

  // ── Seçim yönetimi ────────────────────────────────────────────────────────
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (!result) return;
    if (selectedIds.size === result.students.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(result.students.map(s => s.id)));
    }
  };

  const successCount      = genResults.filter(g => g.pdfPath).length;
  const selectedHavePdfs  = result?.students.some(s => selectedIds.has(s.id) && (genResults.find(g => g.id === s.id)?.pdfPath || s.pdfPath));
  const allSelected       = result ? selectedIds.size === result.students.length : false;
  const someSelected      = selectedIds.size > 0;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>

      {/* ── Başlık ──────────────────────────────────────────── */}
      <div className="page-header" style={{ marginBottom: 20 }}>
        <div>
          <h1 className="page-title">📉 Başarısızlık Riski Bildirimi</h1>
          <p className="page-subtitle">Not listesi yükleyin — 4 veya daha fazla zayıfı olan öğrenciler için bildirim formu oluşturun</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="btn btn-outline"
            onClick={activePanel === 'reports' ? () => setActivePanel('none') : handleLoadReports}
            disabled={loadingList}
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}
          >
            {loadingList ? '⏳' : '📋'} {activePanel === 'reports' ? 'Analize Dön' : 'Raporlar'}
            {reports && activePanel !== 'reports' && (
              <span style={{ background: '#e5e7eb', borderRadius: 10, padding: '1px 7px', fontSize: 12 }}>
                {reports.length}
              </span>
            )}
          </button>
          <button
            className="btn btn-outline"
            onClick={() => { activePanel === 'archived' ? setActivePanel('none') : handleLoadArchived(); }}
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}
          >
            🗄️ {activePanel === 'archived' ? 'Arşivi Kapat' : 'Arşiv'}
          </button>
        </div>
      </div>

      {/* ── Hata ─────────────────────────────────────────────────────── */}
      {error && (
        <div style={{
          background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca',
          borderRadius: 8, padding: '10px 16px', marginBottom: 16, fontSize: 14,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span>⚠️ {error}</span>
          <button onClick={() => setError('')} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>
      )}

      {/* ── Yükleme formu ─────────────────────────────────────────────── */}
      {activePanel === 'none' && !result && (
        <div style={{
          background: '#fff',
          border: '1px solid #e0e7ff',
          borderRadius: 12,
          padding: '22px 24px',
          marginBottom: 20,
          boxShadow: '0 1px 4px rgba(79,70,229,0.07)',
        }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ background: '#dbeafe', borderRadius: 6, padding: '3px 8px', fontSize: 13 }}>📤</span>
            Not Listesi Yükle
          </h2>

          {/* Rapor tipi bilgilendirme */}
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 10,
            background: '#fffbeb', border: '1px solid #fde68a',
            borderLeft: '4px solid #f59e0b',
            borderRadius: 8, padding: '10px 14px', marginBottom: 16,
          }}>
            <span style={{ fontSize: 18, lineHeight: 1.3 }}>📋</span>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#92400e', marginBottom: 2 }}>
                Yüklenecek rapor: OOK07003R035
              </p>
              <p style={{ fontSize: 12, color: '#78350f' }}>
                e-Okul &gt; Raporlar bölümünden <strong>«Öğrenci Dönem Sonu Ders Notu Ortalamaları»</strong> raporunu Excel (.xlsx) olarak indirip yükleyin.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginBottom: 14 }}>
            <div style={{ flex: '1 1 180px' }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Eğitim-Öğretim Yılı
              </label>
              <input
                style={{ width: '100%', border: '1.5px solid #c7d2fe', borderRadius: 8, padding: '9px 12px', fontSize: 14, outline: 'none' }}
                value={schoolYear}
                onChange={e => setSchoolYear(e.target.value)}
                placeholder="2025 / 2026"
                onFocus={e => (e.target.style.borderColor = 'var(--primary)')}
                onBlur={e => (e.target.style.borderColor = '#c7d2fe')}
              />
            </div>
            <div style={{ flex: '1 1 180px' }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Komisyon Toplantı Tarihi
              </label>
              <input
                type="date"
                style={{ width: '100%', border: '1.5px solid #c7d2fe', borderRadius: 8, padding: '9px 12px', fontSize: 14, outline: 'none' }}
                value={meetingDate}
                onChange={e => setMeetingDate(e.target.value)}
                onFocus={e => (e.target.style.borderColor = 'var(--primary)')}
                onBlur={e => (e.target.style.borderColor = '#c7d2fe')}
              />
            </div>
            <div style={{ flex: '2 1 260px' }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Dosya (Excel / PDF)
              </label>
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,application/pdf"
                style={{ width: '100%', border: '1.5px dashed #c7d2fe', borderRadius: 8, padding: '8px 12px', fontSize: 13, cursor: 'pointer', background: '#fafafe' }}
              />
            </div>
          </div>

          <button
            onClick={handleAnalyze}
            disabled={uploading}
            className="btn btn-primary"
          >
            {uploading ? '⏳ Analiz ediliyor...' : '🔍 Analiz Et'}
          </button>
        </div>
      )}

      {/* ── Raporlar paneli ─────────────────────────────────────────── */}
      {activePanel === 'reports' && reports && (
        <div style={{
          background: '#fff',
          border: '1px solid #e0e7ff',
          borderRadius: 12,
          padding: '22px 24px',
          marginBottom: 20,
          boxShadow: '0 1px 4px rgba(79,70,229,0.07)',
        }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ background: '#dbeafe', borderRadius: 6, padding: '3px 8px', fontSize: 13 }}>📋</span>
            Kayıtlı Raporlar
            <span style={{ background: 'var(--primary)', color: 'white', borderRadius: 12, padding: '2px 9px', fontSize: 12, fontWeight: 600 }}>
              {reports.length}
            </span>
          </h2>

          {reports.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)' }}>
              Henüz kayıtlı rapor bulunmuyor.
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Sınıf</th>
                    <th>Eğitim-Öğretim Yılı</th>
                    <th>Toplantı Tarihi</th>
                    <th>Öğrenci</th>
                    <th>Yüklenme</th>
                    <th>İşlemler</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map(r => (
                    <tr key={r.id}>
                      <td><strong>{r.className || '—'}</strong></td>
                      <td>{r.schoolYear}</td>
                      <td>{new Date(r.meetingDate).toLocaleDateString('tr-TR')}</td>
                      <td>{r._count.students} öğrenci</td>
                      <td>{new Date(r.uploadedAt).toLocaleDateString('tr-TR')}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-outline btn-sm" onClick={() => handleLoadReport(r.id)}>
                            Görüntüle
                          </button>
                          <button className="btn btn-outline btn-sm" style={{ color: '#ef4444', borderColor: '#fca5a5' }} onClick={() => handleDeleteReport(r.id)}>
                            Sil
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Arşiv paneli ─────────────────────────────────────────────── */}
      {activePanel === 'archived' && archivedReports && (
        <div style={{
          background: '#fff',
          border: '1px solid #fde68a',
          borderRadius: 12,
          padding: '22px 24px',
          marginBottom: 20,
          boxShadow: '0 1px 4px rgba(251,191,36,0.1)',
        }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#92400e', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ background: '#fef3c7', borderRadius: 6, padding: '3px 8px', fontSize: 13 }}>🗄️</span>
            Arşivlenmiş Raporlar
            <span style={{ background: '#d97706', color: 'white', borderRadius: 12, padding: '2px 9px', fontSize: 12, fontWeight: 600 }}>
              {archivedReports.length}
            </span>
          </h2>

          {archivedReports.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)' }}>
              Arşivlenmiş rapor bulunmuyor.
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Sınıf</th>
                    <th>Eğitim-Öğretim Yılı</th>
                    <th>Toplantı Tarihi</th>
                    <th>Öğrenci</th>
                    <th>Yüklenme</th>
                    <th>İşlemler</th>
                  </tr>
                </thead>
                <tbody>
                  {archivedReports.map(r => (
                    <tr key={r.id} style={{ opacity: 0.8 }}>
                      <td><strong>{r.className || '—'}</strong></td>
                      <td>{r.schoolYear}</td>
                      <td>{new Date(r.meetingDate).toLocaleDateString('tr-TR')}</td>
                      <td>{r._count.students} öğrenci</td>
                      <td>{new Date(r.uploadedAt).toLocaleDateString('tr-TR')}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-outline btn-sm" onClick={() => handleLoadReport(r.id)}>
                            Görüntüle
                          </button>
                          <button className="btn btn-outline btn-sm" style={{ color: '#ef4444', borderColor: '#fca5a5' }} onClick={async () => {
                            if (!await confirm('Bu arşiv raporunu kalıcı olarak silmek istiyor musunuz?')) return;
                            try {
                              await api.delete(`/grade-reports/${r.id}`);
                              setArchivedReports(prev => prev?.filter(x => x.id !== r.id) ?? null);
                            } catch (err: any) { setError(err.response?.data?.message || err.message); }
                          }}>
                            Sil
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Analiz sonuçları ──────────────────────────────────────────── */}
      {result && activePanel === 'none' && (
        <div style={{
          background: '#fff',
          border: '1px solid var(--border)',
          borderRadius: 12,
          overflow: 'hidden',
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        }}>
          {/* Sonuç başlığı */}
          <div style={{
            background: '#f8fafd',
            borderBottom: '1px solid var(--border)',
            padding: '16px 22px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 12,
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>
                  Analiz Sonuçları
                </h2>
                {result.className && (
                  <span style={{
                    background: 'var(--primary)', color: 'white', borderRadius: 6,
                    padding: '3px 11px', fontSize: 13, fontWeight: 700,
                  }}>
                    {result.className}
                  </span>
                )}
              </div>
              <p style={{ fontSize: 13, color: '#6b7280' }}>
                {result.studentCount} öğrencide 4 veya daha fazla zayıf tespit edildi
                {successCount > 0 && (
                  <span style={{ color: '#059669', fontWeight: 600 }}>
                    {' '}· {successCount}/{genResults.length} PDF oluşturuldu ✓
                  </span>
                )}
              </p>
            </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button
                  onClick={() => { setResult(null); setGenResults([]); setSelectedIds(new Set()); }}
                  className="btn btn-outline"
                  style={{ fontSize: 13 }}
                >
                  ← Yeni Analiz
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={generating}
                  className="btn btn-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: 7 }}
                >
                  {generating ? '⏳ Oluşturuluyor...' : "📄 Tüm PDF'leri Oluştur"}
                </button>
              </div>
          </div>
          {someSelected && (
            <div style={{
              background: '#eff6ff',
              borderBottom: '1px solid #bfdbfe',
              padding: '10px 22px',
              display: 'flex',
              alignItems: 'center',
              gap: 14,
            }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--primary)' }}>
                ✓ {selectedIds.size} öğrenci seçildi
              </span>
              {selectedHavePdfs && (
                <button
                  onClick={handleBulkDownload}
                  disabled={bulkDownloading}
                  className="btn btn-primary btn-sm"
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  {bulkDownloading ? '⏳ Birleştiriliyor...' : '⬇️ Tek PDF\'e Birleştir'}
                </button>
              )}
              <button
                onClick={() => setSelectedIds(new Set())}
                style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: 13 }}
              >
                Seçimi Temizle
              </button>
            </div>
          )}

          {/* Tablo */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8f7ff' }}>
                  <th style={{ padding: '11px 16px', textAlign: 'center', width: 40, borderBottom: '1px solid #e0e7ff' }}>
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleAll}
                      style={{ cursor: 'pointer', width: 15, height: 15 }}
                    />
                  </th>
                  <th style={{ padding: '11px 8px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #e0e7ff' }}>#</th>
                  <th style={{ padding: '11px 12px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #e0e7ff' }}>Öğrenci Adı</th>
                  <th style={{ padding: '11px 12px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #e0e7ff' }}>Sınıf</th>
                  <th style={{ padding: '11px 12px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #e0e7ff' }}>DB Eşleşmesi</th>
                  <th style={{ padding: '11px 12px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #e0e7ff' }}>Zayıf Dersler</th>
                  <th style={{ padding: '11px 16px', textAlign: 'center', fontSize: 12, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #e0e7ff' }}>PDF</th>
                </tr>
              </thead>
              <tbody>
                {result.students.map((stu, idx) => {
                  const genRes   = genResults.find(g => g.id === stu.id);
                  const hasPdf   = genRes?.pdfPath || stu.pdfPath;
                  const isSelected = selectedIds.has(stu.id);
                  return (
                    <tr
                      key={stu.id}
                      style={{
                        background: isSelected ? '#f5f3ff' : undefined,
                        transition: 'background 0.15s',
                        cursor: 'default',
                      }}
                      onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLTableRowElement).style.background = '#fafafe'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = isSelected ? '#f5f3ff' : ''; }}
                    >
                      <td style={{ padding: '10px 16px', textAlign: 'center', borderBottom: '1px solid #f1f5f9' }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(stu.id)}
                          style={{ cursor: 'pointer', width: 15, height: 15 }}
                        />
                      </td>
                      <td style={{ padding: '10px 8px', fontSize: 13, color: '#9ca3af', borderBottom: '1px solid #f1f5f9' }}>{idx + 1}</td>
                      <td style={{ padding: '10px 12px', fontWeight: 600, fontSize: 14, color: '#1e1b4b', borderBottom: '1px solid #f1f5f9' }}>
                        {stu.fullName}
                      </td>
                      <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9' }}>
                        {stu.className ? (
                          <span style={{
                            background: '#dbeafe', color: 'var(--primary)', border: '1px solid #bfdbfe',
                            borderRadius: 5, padding: '2px 8px', fontSize: 12, fontWeight: 600,
                          }}>
                            {stu.className}
                          </span>
                        ) : <span style={{ color: '#9ca3af', fontSize: 12 }}>—</span>}
                      </td>
                      <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9' }}>
                        {stu.matched ? (
                          <span style={{ color: '#059669', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span style={{ background: '#d1fae5', borderRadius: 10, padding: '2px 8px' }}>
                              ✓ {stu.dbStudentName || 'Eşleşti'}
                            </span>
                          </span>
                        ) : (
                          <span style={{ color: '#dc2626', fontSize: 12 }}>
                            <span style={{ background: '#fee2e2', borderRadius: 10, padding: '2px 8px' }}>
                              ✗ Eşleşme yok
                            </span>
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {stu.failedSubjects.map((f, fi) => (
                            <span key={fi} style={{
                              background: '#fef2f2', border: '1px solid #fca5a5',
                              borderRadius: 4, padding: '2px 7px', fontSize: 11, color: '#dc2626', fontWeight: 500,
                            }}>
                              {f.subject} ({f.grade})
                            </span>
                          ))}
                        </div>
                      </td>
                      <td style={{ padding: '10px 16px', textAlign: 'center', borderBottom: '1px solid #f1f5f9' }}>
                        {hasPdf ? (
                          <button
                            onClick={() => handleDownload(stu.id, stu.fullName)}
                            title="PDF Görüntüle"
                            style={{
                              background: '#dbeafe', color: 'var(--primary)', border: '1px solid #bfdbfe',
                              borderRadius: 6, padding: '5px 10px', fontSize: 12, fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            📄
                          </button>
                        ) : genRes?.error ? (
                          <span title={genRes.error} style={{ color: '#dc2626', fontSize: 11 }}>⚠️</span>
                        ) : (
                          <span style={{ color: '#d1d5db', fontSize: 12 }}>—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Alt özet */}
          {genResults.length > 0 && (
            <div style={{
              background: successCount === genResults.length ? '#f0fdf4' : '#fffbeb',
              borderTop: '1px solid #e0e7ff',
              padding: '12px 22px',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}>
              <span style={{ fontSize: 20 }}>{successCount === genResults.length ? '✅' : '⚠️'}</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: successCount === genResults.length ? '#059669' : '#d97706' }}>
                {successCount}/{genResults.length} PDF başarıyla oluşturuldu.
                {successCount > 0 && ' PDF\'leri indirmek için tablo satırlarındaki ⬇️ butonunu kullanın veya satırları seçip "Toplu İndir" yapın.'}
              </span>
            </div>
          )}
        </div>
      )}
      {confirmModal}

      {/* ── Çakışma modali ─────────────────────────────────────────── */}
      {conflictInfo && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          }}
        >
          <div style={{
            background: '#fff', borderRadius: 14, padding: '28px 28px 24px',
            maxWidth: 420, width: '90%', boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
          }}>
            <div style={{ fontSize: 32, marginBottom: 12, textAlign: 'center' }}>⚠️</div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: '0 0 8px', textAlign: 'center' }}>
              Mevcut Rapor Bulundu
            </h3>
            <p style={{ fontSize: 13, color: '#6b7280', textAlign: 'center', marginBottom: 20, lineHeight: 1.6 }}>
              <strong>{conflictInfo.className}</strong> sınıfına ait kayıtlı bir rapor zaten var.
              Yeni analiz kaydedildi. Eski raporu ne yapmak istersiniz?
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button
                onClick={handleConflictArchive}
                style={{
                  background: '#f59e0b', color: 'white', border: 'none', borderRadius: 8,
                  padding: '10px 0', fontSize: 14, fontWeight: 700, cursor: 'pointer',
                }}
              >
                🗄️ Eski raporu arşivle
              </button>
              <button
                onClick={handleConflictDelete}
                style={{
                  background: '#dc2626', color: 'white', border: 'none', borderRadius: 8,
                  padding: '10px 0', fontSize: 14, fontWeight: 700, cursor: 'pointer',
                }}
              >
                🗑️ Eski raporu sil
              </button>
              <button
                onClick={() => setConflictInfo(null)}
                style={{
                  background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 8,
                  padding: '10px 0', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                }}
              >
                Şimdilik kalsın
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
