import { useState, useEffect, useRef } from 'react';
import api from '../../services/api';
import { useConfirm } from '../../hooks/useConfirm';

interface MatchedStudent {
  id: string;
  studentId: string;
  student: { fullName: string; className: string; schoolNumber: string };
  matchedText: string;
  matchedBy: string;
  confidence: number;
  previousViolations: number;
  suggestWarning: boolean;
  requiresDiscipline?: boolean;
  isConfirmed?: boolean;
}

interface UnmatchedLine { text: string; reason: string; }

interface UploadResult {
  uploadId: string;
  ocrRawText: string;
  ocrLines: string[];
  type: string;
  typeLabel: string;
  violationDate: string;
  matched: MatchedStudent[];
  unmatched: UnmatchedLine[];
  summary: { totalLines: number; matchedCount: number; unmatchedCount: number; repeatOffenders: number; disciplineRequired?: number };
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
    id: string; studentId: string; type: string; matchedBy: string; isConfirmed: boolean;
    student: { fullName: string; className: string; schoolNumber: string };
    previousViolations?: number; suggestWarning?: boolean; hasWarning?: boolean; requiresDiscipline?: boolean;
  }[];
}

interface StudentOption { id: string; fullName: string; className: string; schoolNumber: string; }

interface ViolationStats {
  totalUploads: number; totalViolations: number; confirmedViolations: number;
  todayCount: number; weekCount: number;
}

interface StudentViolation {
  id: string; type: string; isConfirmed: boolean;
  upload: { type: string; description: string | null; violationDate: string; createdAt: string };
}

interface WarningSuggestion {
  type: string;
  confirmedCount: number;
  behaviorCode: string;
  hasWarning: boolean;
}

interface ExistingWarning {
  id: string;
  behaviorCode: string;
  issuedAt: string;
  warningNumber: number;
}

interface StaffMember { id: string; name: string; role: string; className?: string | null; }

const VIOLATION_TYPES = [
  { value: 'KIYAFET',  label: '👔 Kıyafet / Makyaj Kontrolü', color: '#7c3aed' },
  { value: 'TOREN_GEC', label: '🏳️ Tören Geç Kalma',         color: '#ea580c' },
  { value: 'DIGER',    label: '📋 Diğer İhlal',               color: '#6b7280' },
];

const BEHAVIOR_MAP: Record<string, string> = {
  KIYAFET: 'M164_1_C', TOREN_GEC: 'M164_1_F', DIGER: 'M164_1_B',
};

function getTypeLabel(t: string) { return VIOLATION_TYPES.find(v => v.value === t)?.label || t; }
function getTypeColor(t: string) { return VIOLATION_TYPES.find(v => v.value === t)?.color || '#6b7280'; }
function formatDate(d: string) {
  const dt = new Date(d);
  return `${dt.getDate().toString().padStart(2,'0')}.${(dt.getMonth()+1).toString().padStart(2,'0')}.${dt.getFullYear()}`;
}

export default function ViolationsPage() {
  const { confirm, alert, confirmModal } = useConfirm();
  const [tab, setTab] = useState<'entry' | 'history'>('entry');
  const [entryMethod, setEntryMethod] = useState<'photo' | 'manual' | null>(null);
  const [historyView, setHistoryView] = useState<'uploads' | 'student'>('uploads');
  const [stats, setStats] = useState<ViolationStats | null>(null);

  // Upload
  const [uploading, setUploading]   = useState(false);
  const [result, setResult]         = useState<UploadResult | null>(null);
  const [error, setError]           = useState('');
  const [type, setType]             = useState('KIYAFET');
  const [description, setDescription] = useState('');
  const [violationDate, setViolationDate] = useState(new Date().toISOString().slice(0, 10));
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed]   = useState(false);
  const [bulkWarningLoading, setBulkWarningLoading] = useState(false);
  const [creatingWarning, setCreatingWarning] = useState('');

  // Manual add in results
  const [showManualAdd, setShowManualAdd] = useState(false);
  const [manualSearch, setManualSearch]   = useState('');
  const [manualLoading, setManualLoading] = useState(false);
  const [allStudents, setAllStudents]     = useState<StudentOption[]>([]);

  // Manual text tab
  const [manualText, setManualText]       = useState('');
  const [manualType, setManualType]       = useState('KIYAFET');
  const [manualDate, setManualDate]       = useState(new Date().toISOString().slice(0, 10));
  const [manualDesc, setManualDesc]       = useState('');
  const [manualProcessing, setManualProcessing] = useState(false);

  // History tab
  const [history, setHistory]           = useState<UploadRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [expandedUploadId, setExpandedUploadId] = useState<string | null>(null);
  const [expandedDetails, setExpandedDetails] = useState<Record<string, UploadRecord | null>>({});
  const [expandDetailLoading, setExpandDetailLoading] = useState<string | null>(null);
  const [deletingUploadId, setDeletingUploadId] = useState<string | null>(null);
  const [historyWarningLoading, setHistoryWarningLoading] = useState('');
  const [historyBulkWarningLoading, setHistoryBulkWarningLoading] = useState('');
  const [historyConfirmLoading, setHistoryConfirmLoading] = useState('');
  const [hFilterType, setHFilterType]   = useState('');
  const [hFilterFrom, setHFilterFrom]   = useState('');
  const [hFilterTo, setHFilterTo]       = useState('');

  // Student history tab
  const [stuSearch, setStuSearch]       = useState('');
  const [stuSelected, setStuSelected]   = useState<StudentOption | null>(null);
  const [stuHistory, setStuHistory]     = useState<{ student: any; violations: StudentViolation[]; total: number; confirmed: number; violationsByType: Record<string, number>; warningSuggestions: WarningSuggestion[]; existingWarnings: ExistingWarning[] } | null>(null);
  const [stuLoading, setStuLoading]     = useState(false);
  const [stuWarningLoading, setStuWarningLoading] = useState('');

  // Track warnings created in this session (studentId_behaviorCode)
  const [createdWarnings, setCreatedWarnings] = useState<Set<string>>(new Set());

  // Staff
  const [assistantPrincipals, setAssistantPrincipals] = useState<StaffMember[]>([]);
  const [counselors, setCounselors] = useState<StaffMember[]>([]);
  const [classTeachers, setClassTeachers] = useState<StaffMember[]>([]);

  // Warning modal (tek / toplu uyarı için)
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [warningModalTargets, setWarningModalTargets] = useState<{
    uploadId: string; uploadType: string; studentId: string;
    studentName: string; studentClassName: string; prevViolations: number;
  }[]>([]);
  const [wIssuedBy, setWIssuedBy] = useState('');
  const [wClassTeacherName, setWClassTeacherName] = useState('');
  const [wCounselorName, setWCounselorName] = useState('');
  const [wGuidanceNote, setWGuidanceNote] = useState('');
  const [wLoading, setWLoading] = useState(false);

  useEffect(() => {
    loadStudents();
    loadStaff();
    loadStats();
  }, []);

  useEffect(() => {
    if (tab === 'history') {
      loadHistory();
      setExpandedDetails({});
      setExpandedUploadId(null);
    }
  }, [tab]);

  const loadStats = async () => {
    try {
      const res = await api.get('/violations/stats');
      setStats(res.data.data);
    } catch {}
  };

  const loadStudents = async () => {
    try {
      const res = await api.get('/students?limit=2000');
      setAllStudents(res.data.data.students);
    } catch {}
  };

  const loadStaff = async () => {
    try {
      const res = await api.get('/staff');
      const all: StaffMember[] = res.data.data.staff;
      setAssistantPrincipals(all.filter(s => s.role === 'MUDUR_YARDIMCISI'));
      setCounselors(all.filter(s => s.role === 'REHBER_OGRETMEN'));
      setClassTeachers(all.filter(s => s.role === 'SINIF_REHBER_OGRETMEN'));
    } catch {}
  };

  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await api.get('/violations/uploads?limit=100');
      setHistory(res.data.data.records);
    } catch {} finally { setHistoryLoading(false); }
  };

  const handleToggleExpand = async (uploadId: string) => {
    if (expandedUploadId === uploadId) {
      setExpandedUploadId(null);
      return;
    }
    setExpandedUploadId(uploadId);
    if (expandedDetails[uploadId]) return; // already loaded
    setExpandDetailLoading(uploadId);
    try {
      const res = await api.get(`/violations/uploads/${uploadId}`);
      setExpandedDetails(prev => ({ ...prev, [uploadId]: res.data.data }));
    } catch {
      setExpandedDetails(prev => ({ ...prev, [uploadId]: null }));
    } finally {
      setExpandDetailLoading(null);
    }
  };

  const handleHistoryCreateWarning = (uploadId: string, uploadType: string, studentId: string, studentName: string, studentClassName: string, prevViolations: number) => {
    setWarningModalTargets([{ uploadId, uploadType, studentId, studentName, studentClassName, prevViolations }]);
    // Öğrenci sınıfına göre sınıf rehber öğretmenini otomatik seç
    const ct = classTeachers.find(t => t.className?.toLocaleLowerCase('tr-TR').trim() === studentClassName?.toLocaleLowerCase('tr-TR').trim());
    setWClassTeacherName(ct ? ct.name : '');
    // Tek rehber öğretmen varsa otomatik seç
    if (counselors.length === 1) setWCounselorName(counselors[0].name);
    else setWCounselorName('');
    setWIssuedBy('');
    setWGuidanceNote('');
    setShowWarningModal(true);
  };

  const handleHistoryBulkWarning = async (upload: UploadRecord) => {
    const detail = expandedDetails[upload.id];
    if (!detail?.records) return;
    const targets = detail.records.filter(r => r.suggestWarning && r.isConfirmed && !r.hasWarning);
    if (targets.length === 0) { await alert('Uyarı önerilen ve henüz uyarı almamış onaylı öğrenci yok.'); return; }
    if (!await confirm(`${targets.length} öğrenci için toplu yazılı uyarı oluşturulacak. Devam etmek için personel seçimi yapılacak.`)) return;
    setWarningModalTargets(targets.map(r => ({
      uploadId: upload.id,
      uploadType: upload.type,
      studentId: r.studentId,
      studentName: r.student.fullName,
      studentClassName: r.student.className,
      prevViolations: r.previousViolations ?? 0,
    })));
    setWClassTeacherName('');
    if (counselors.length === 1) setWCounselorName(counselors[0].name);
    else setWCounselorName('');
    setWIssuedBy('');
    setWGuidanceNote('');
    setShowWarningModal(true);
  };

  const handleConfirmWarningModal = async () => {
    if (warningModalTargets.length === 0) return;
    setWLoading(true);
    const isBulk = warningModalTargets.length > 1;
    let success = 0;
    const errors: string[] = [];
    for (const t of warningModalTargets) {
      const bCode = BEHAVIOR_MAP[t.uploadType] || 'M164_1_B';
      try {
        await api.post('/warnings', {
          studentId: t.studentId,
          behaviorCode: bCode,
          description: `${getTypeLabel(t.uploadType)} - Tekrarlanan ihlal (${t.prevViolations + 1}. kez)`,
          issuedBy: wIssuedBy || undefined,
          classTeacherName: wClassTeacherName || undefined,
          schoolCounselorName: wCounselorName || undefined,
          guidanceNote: wGuidanceNote || undefined,
        });
        success++;
        if (!isBulk) {
          // Tek uyarı: expandedDetails cache'ini güncelle
          setExpandedDetails(prev => {
            const detail = prev[t.uploadId];
            if (!detail?.records) return prev;
            return { ...prev, [t.uploadId]: { ...detail, records: detail.records.map(r => r.studentId === t.studentId ? { ...r, hasWarning: true } : r) } };
          });
        }
      } catch (err: any) {
        errors.push(`${t.studentName}: ${err.response?.data?.message || 'Hata'}`);
      }
    }
    setWLoading(false);
    setShowWarningModal(false);
    if (isBulk) {
      // Toplu: cache'i temizle, sonraki açılışta API'den taze veri gelsin
      const uploadId = warningModalTargets[0].uploadId;
      setExpandedDetails(prev => { const n = { ...prev }; delete n[uploadId]; return n; });
      if (errors.length === 0) await alert(`✅ ${success} öğrenci için yazılı uyarı oluşturuldu.`);
      else await alert(`✅ ${success} başarılı, ${errors.length} başarısız:\n${errors.join('\n')}`);
    } else if (errors.length > 0) {
      await alert(errors[0]);
    } else {
      await alert(`${warningModalTargets[0].studentName} için yazılı uyarı oluşturuldu!`);
    }
  };

  const handleHistoryConfirm = async (uploadId: string, pendingIds: string[]) => {
    if (pendingIds.length === 0) return;
    setHistoryConfirmLoading(uploadId);
    try {
      await api.post(`/violations/${uploadId}/confirm`, { violationIds: pendingIds });
      setExpandedDetails(prev => {
        const detail = prev[uploadId];
        if (!detail?.records) return prev;
        return { ...prev, [uploadId]: { ...detail, records: detail.records.map(r => pendingIds.includes(r.id) ? { ...r, isConfirmed: true } : r) } };
      });
      setHistory(prev => prev.map(h => {
        if (h.id !== uploadId || !h.records) return h;
        return { ...h, records: h.records.map(r => pendingIds.includes(r.id) ? { ...r, isConfirmed: true } : r) };
      }));
      loadStats();
    } catch (err: any) {
      await alert(err.response?.data?.message || 'Onaylama başarısız.');
    } finally { setHistoryConfirmLoading(''); }
  };

  const handleDeleteUpload = async (uploadId: string) => {
    if (!await confirm('Bu yükleme ve ilişkili tüm ihlal kayıtları silinecek. Emin misiniz?')) return;
    setDeletingUploadId(uploadId);
    try {
      await api.delete(`/violations/uploads/${uploadId}`);
      setHistory(prev => prev.filter(h => h.id !== uploadId));
      if (expandedUploadId === uploadId) setExpandedUploadId(null);
    } catch (err: any) {
      if (err.response?.status === 404) {
        setHistory(prev => prev.filter(h => h.id !== uploadId));
      } else {
        await alert(err.response?.data?.message || 'Silme işlemi başarısız.');
      }
    } finally { setDeletingUploadId(null); }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { setSelectedFile(file); setPreviewUrl(URL.createObjectURL(file)); setResult(null); setConfirmed(false); setError(''); }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploading(true); setError(''); setResult(null); setConfirmed(false); setSelectedIds(new Set());
    const formData = new FormData();
    formData.append('image', selectedFile);
    formData.append('type', type);
    formData.append('violationDate', violationDate);
    if (description) formData.append('description', description);
    try {
      const res = await api.post('/violations/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 120000 });
      const data: UploadResult = res.data.data;
      setResult(data);
      setSelectedIds(new Set(data.matched.map(m => m.id)));
    } catch (err: any) {
      setError(err.response?.data?.message || 'Yükleme başarısız. Lütfen tekrar deneyin.');
    } finally { setUploading(false); }
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const handleConfirm = async () => {
    if (!result || selectedIds.size === 0) return;
    setConfirming(true);
    try {
      await api.post(`/violations/${result.uploadId}/confirm`, { violationIds: Array.from(selectedIds) });
      setConfirmed(true);
      loadStats();
    } catch (err: any) {
      await alert(err.response?.data?.message || 'Onaylama başarısız.');
    } finally { setConfirming(false); }
  };

  const handleBulkCreateWarnings = async () => {
    if (!result) return;
    const bCode = BEHAVIOR_MAP[result.type] || 'M164_1_B';
    const targets = result.matched.filter(m =>
      m.suggestWarning && selectedIds.has(m.id) && !createdWarnings.has(`${m.studentId}_${bCode}`)
    );
    if (targets.length === 0) { await alert('Uyarı önerilen tekrar ihlalci öğrenci yok.'); return; }
    if (!await confirm(`${targets.length} öğrenci için toplu yazılı uyarı oluşturulacak. Onaylıyor musunuz?`)) return;
    setBulkWarningLoading(true);
    let success = 0; const errors: string[] = [];
    for (const s of targets) {
      try {
        await api.post('/warnings', {
          studentId: s.studentId,
          behaviorCode: bCode,
          description: `${getTypeLabel(result.type)} - Tekrarlanan ihlal (${s.previousViolations + 1}. kez)`,
        });
        success++;
        setCreatedWarnings(prev => new Set(prev).add(`${s.studentId}_${bCode}`));
      } catch (err: any) {
        errors.push(`${s.student.fullName}: ${err.response?.data?.message || 'Hata'}`);
      }
    }
    setBulkWarningLoading(false);
    if (errors.length === 0) {
      await alert(`✅ ${success} öğrenci için yazılı uyarı oluşturuldu.`);
    } else {
      await alert(`✅ ${success} başarılı, ${errors.length} başarısız:\n${errors.join('\n')}`);
    }
  };

  const handleCreateWarning = async (student: MatchedStudent) => {
    if (!result) return;
    setCreatingWarning(student.studentId);
    try {
      await api.post('/warnings', {
        studentId: student.studentId,
        behaviorCode: BEHAVIOR_MAP[result.type] || 'M164_1_B',
        description: `${getTypeLabel(result.type)} - Tekrarlanan ihlal (${student.previousViolations + 1}. kez)`,
      });
      const bCode = BEHAVIOR_MAP[result.type] || 'M164_1_B';
      setCreatedWarnings(prev => new Set(prev).add(`${student.studentId}_${bCode}`));
      await alert(`${student.student.fullName} için yazılı uyarı oluşturuldu!`);
    } catch (err: any) {
      await alert(err.response?.data?.message || 'Uyarı oluşturulamadı.');
    } finally { setCreatingWarning(''); }
  };

  const handleRemoveViolation = async (violationId: string) => {
    if (!result) return;
    try {
      await api.delete(`/violations/record/${violationId}`);
      setResult({ ...result, matched: result.matched.filter(m => m.id !== violationId), summary: { ...result.summary, matchedCount: result.summary.matchedCount - 1 } });
      setSelectedIds(prev => { const n = new Set(prev); n.delete(violationId); return n; });
    } catch {}
  };

  const handleManualAdd = async (studentId: string) => {
    if (!result) return;
    setManualLoading(true);
    try {
      const res = await api.post(`/violations/${result.uploadId}/manual`, { studentId, type: result.type, violationDate: result.violationDate });
      const nr = res.data.data;
      setResult({ ...result, matched: [...result.matched, { id: nr.id, studentId: nr.studentId, student: nr.student, matchedText: '(Manuel eklendi)', matchedBy: 'MANUAL', confidence: 100, previousViolations: nr.previousViolations, suggestWarning: nr.suggestWarning }], summary: { ...result.summary, matchedCount: result.summary.matchedCount + 1 } });
      setSelectedIds(prev => new Set(prev).add(nr.id));
      setShowManualAdd(false); setManualSearch('');
    } catch (err: any) { await alert(err.response?.data?.message || 'Ekleme başarısız.'); }
    finally { setManualLoading(false); }
  };

  const handleReset = () => {
    setSelectedFile(null); setPreviewUrl(''); setResult(null); setConfirmed(false);
    setError(''); setSelectedIds(new Set()); setDescription(''); setManualText('');
    setEntryMethod(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleProcessManualText = async () => {
    if (!manualText.trim()) return;
    setManualProcessing(true); setError(''); setResult(null); setConfirmed(false); setSelectedIds(new Set());
    try {
      const res = await api.post('/violations/process-text', { text: manualText, type: type, violationDate: violationDate, description: manualDesc || undefined });
      const data: UploadResult = res.data.data;
      setResult(data);
      setSelectedIds(new Set(data.matched.map(m => m.id)));
    } catch (err: any) {
      setError(err.response?.data?.message || 'İşlem başarısız. Lütfen tekrar deneyin.');
    } finally { setManualProcessing(false); }
  };

  const handleStudentSearch = async (student: StudentOption) => {
    setStuSelected(student); setStuLoading(true); setStuHistory(null);
    try {
      const res = await api.get(`/violations/student/${student.id}`);
      setStuHistory(res.data.data);
    } catch (err: any) {
      await alert(err.response?.data?.message || 'Sorgu başarısız.');
    } finally { setStuLoading(false); }
  };

  const reloadStudentHistory = async () => {
    if (!stuSelected) return;
    try {
      const res = await api.get(`/violations/student/${stuSelected.id}`);
      setStuHistory(res.data.data);
    } catch {}
  };

  const handleStuCreateWarning = async (suggestion: WarningSuggestion) => {
    if (!stuSelected || !stuHistory) return;
    setStuWarningLoading(suggestion.type);
    try {
      await api.post('/warnings', {
        studentId: stuSelected.id,
        behaviorCode: suggestion.behaviorCode,
        description: `${getTypeLabel(suggestion.type)} - Tekrarlanan ihlal (${suggestion.confirmedCount}. kez)`,
      });
      setCreatedWarnings(prev => new Set(prev).add(`${stuSelected.id}_${suggestion.behaviorCode}`));
      await reloadStudentHistory();
      await alert(`${stuHistory.student.fullName} için yazılı uyarı oluşturuldu!`);
    } catch (err: any) {
      await alert(err.response?.data?.message || 'Uyarı oluşturulamadı.');
    } finally { setStuWarningLoading(''); }
  };

  const filteredManualStudents = allStudents.filter(s => {
    if (result?.matched.some(m => m.studentId === s.id)) return false;
    if (!manualSearch) return false;
    return s.fullName.toLocaleLowerCase('tr-TR').includes(manualSearch.toLocaleLowerCase('tr-TR')) || s.schoolNumber.includes(manualSearch) || s.className.toLocaleLowerCase('tr-TR').includes(manualSearch.toLocaleLowerCase('tr-TR'));
  });

  const filteredStuSearch = allStudents.filter(s => {
    if (!stuSearch) return false;
    return s.fullName.toLocaleLowerCase('tr-TR').includes(stuSearch.toLocaleLowerCase('tr-TR')) || s.schoolNumber.includes(stuSearch) || s.className.toLocaleLowerCase('tr-TR').includes(stuSearch.toLocaleLowerCase('tr-TR'));
  });

  const filteredHistory = history.filter(h => {
    if (hFilterType && h.type !== hFilterType) return false;
    if (hFilterFrom && new Date(h.violationDate) < new Date(hFilterFrom)) return false;
    if (hFilterTo && new Date(h.violationDate) > new Date(hFilterTo + 'T23:59:59')) return false;
    return true;
  });

  return (
    <div>
      {/* ── Header ── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">� İhlal Takip Sistemi</h1>
          <p className="page-subtitle">Kıyafet kontrolü ve tören listelerinden öğrenci eşleştirme</p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {[
            { label: 'Bugün',         value: stats?.todayCount ?? '—',          color: '#6b7280' },
            { label: 'Son 7 Gün',     value: stats?.weekCount ?? '—',           color: '#6b7280' },
            { label: 'Onaylı Toplam', value: stats?.confirmedViolations ?? '—', color: '#dc2626' },
            { label: 'Yükleme',       value: stats?.totalUploads ?? '—',        color: '#6b7280' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ background: '#f9fafb', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px 16px', textAlign: 'center', minWidth: 72 }}>
              <div style={{ fontSize: 20, fontWeight: 700, color }}>{value}</div>
              <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Ana Tabs ── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        <button className={`btn ${tab === 'entry' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setTab('entry')}>
          ➕ Yeni İhlal Kaydı
        </button>
        <button className={`btn ${tab === 'history' ? 'btn-primary' : 'btn-outline'}`} onClick={() => { setTab('history'); loadHistory(); setExpandedDetails({}); setExpandedUploadId(null); }}>
          📋 İhlal Kayıtları
        </button>
      </div>

      {/* ══════════════════════ ENTRY TAB ══════════════════════ */}
      {tab === 'entry' && (
        <>
          {!result && (
            <div>
              {/* Adım 1: İhlal Bilgileri */}
              <div className="card" style={{ padding: 24, marginBottom: 16 }}>
                <h3 style={{ marginTop: 0, marginBottom: 16, fontSize: 15, color: '#374151', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ background: '#2563eb', color: 'white', borderRadius: '50%', width: 24, height: 24, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>1</span>
                  İhlal Bilgileri
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
                  {VIOLATION_TYPES.map(vt => (
                    <div
                      key={vt.value}
                      onClick={() => setType(vt.value)}
                      style={{ padding: '10px 12px', borderRadius: 8, cursor: 'pointer', textAlign: 'center', border: `2px solid ${type === vt.value ? vt.color : '#e5e7eb'}`, background: type === vt.value ? `${vt.color}12` : '#fafafa', transition: 'all 0.15s', fontWeight: type === vt.value ? 700 : 500, fontSize: 13, color: type === vt.value ? vt.color : '#374151' }}
                    >
                      {vt.label}
                    </div>
                  ))}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>İhlal Tarihi</label>
                    <input type="date" value={violationDate} onChange={e => setViolationDate(e.target.value)} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Açıklama (Opsiyonel)</label>
                    <input type="text" placeholder="Ör: Sabah bahçe kontrolü..." value={description} onChange={e => setDescription(e.target.value)} />
                  </div>
                </div>
              </div>

              {/* Adım 2: Giriş Yöntemi */}
              <div className="card" style={{ padding: 24, marginBottom: 16 }}>
                <h3 style={{ marginTop: 0, marginBottom: 16, fontSize: 15, color: '#374151', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ background: '#2563eb', color: 'white', borderRadius: '50%', width: 24, height: 24, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>2</span>
                  Öğrenci Listesi Giriş Yöntemi
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: entryMethod ? 20 : 0 }}>
                  <div
                    onClick={() => setEntryMethod('photo')}
                    style={{ padding: '14px 16px', borderRadius: 10, cursor: 'pointer', textAlign: 'center', border: `2px solid ${entryMethod === 'photo' ? '#2563eb' : '#e5e7eb'}`, background: entryMethod === 'photo' ? '#eff6ff' : '#fafafa', transition: 'all 0.15s' }}
                  >
                    <div style={{ fontSize: 24, marginBottom: 4 }}>📷</div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: entryMethod === 'photo' ? '#1d4ed8' : '#374151' }}>Fotoğraf ile Tara</div>
                    <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>OCR ile otomatik öğrenci tanıma</div>
                  </div>
                  <div
                    onClick={() => setEntryMethod('manual')}
                    style={{ padding: '14px 16px', borderRadius: 10, cursor: 'pointer', textAlign: 'center', border: `2px solid ${entryMethod === 'manual' ? '#2563eb' : '#e5e7eb'}`, background: entryMethod === 'manual' ? '#eff6ff' : '#fafafa', transition: 'all 0.15s' }}
                  >
                    <div style={{ fontSize: 24, marginBottom: 4 }}>✏️</div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: entryMethod === 'manual' ? '#1d4ed8' : '#374151' }}>Numara ile Gir</div>
                    <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>Okul numaralarını manuel girin</div>
                  </div>
                </div>

                {/* Fotoğraf yükleme alanı */}
                {entryMethod === 'photo' && (
                  <div>
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      style={{ border: '2px dashed var(--border)', borderRadius: 'var(--radius)', padding: selectedFile ? 16 : 40, textAlign: 'center', cursor: 'pointer', background: selectedFile ? '#f0fdf4' : '#f8fafc', transition: 'all 0.2s', marginBottom: 16 }}
                      onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = '#3b82f6'; }}
                      onDragLeave={e => { e.currentTarget.style.borderColor = '#cbd5e1'; }}
                      onDrop={e => { e.preventDefault(); e.currentTarget.style.borderColor = '#cbd5e1'; const file = e.dataTransfer.files[0]; if (file?.type.startsWith('image/')) { setSelectedFile(file); setPreviewUrl(URL.createObjectURL(file)); } }}
                    >
                      <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileSelect} style={{ display: 'none' }} />
                      {selectedFile ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                          {previewUrl && <img src={previewUrl} alt="Önizleme" style={{ maxHeight: 160, borderRadius: 8, objectFit: 'contain' }} />}
                          <div style={{ textAlign: 'left' }}>
                            <p style={{ fontWeight: 600, margin: '0 0 4px' }}>{selectedFile.name}</p>
                            <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: 13 }}>{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                            <button className="btn btn-sm" style={{ marginTop: 8, fontSize: 12 }} onClick={e => { e.stopPropagation(); handleReset(); }}>Değiştir</button>
                          </div>
                        </div>
                      ) : (
                        <><p style={{ fontSize: 40, margin: '0 0 8px' }}>📷</p><p style={{ fontWeight: 600, margin: '0 0 4px' }}>Fotoğrafı buraya sürükleyin veya tıklayın</p><p style={{ color: '#999', margin: 0, fontSize: 13 }}>JPG, PNG veya WebP — Maks. 15MB</p></>
                      )}
                    </div>
                    {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}
                    <button className="btn btn-primary" onClick={handleUpload} disabled={!selectedFile || uploading} style={{ width: '100%', padding: '12px 0' }}>
                      {uploading ? 'OCR ile analiz ediliyor... (15-30 saniye sürebilir)' : '🔍 Fotoğrafı Analiz Et'}
                    </button>
                  </div>
                )}

                {/* Manuel numara girişi */}
                {entryMethod === 'manual' && (
                  <div>
                    <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', padding: '10px 16px', borderRadius: 8, marginBottom: 16, fontSize: 13, color: '#1e40af' }}>
                      💡 <strong>İpucu:</strong> Okul numaralarını virgülle, boşlukla veya her satıra bir numara gelecek şekilde girin.<br />
                      Örnek: <code style={{ background: '#dbeafe', padding: '1px 4px', borderRadius: 3 }}>182, 592, 561</code> veya <code style={{ background: '#dbeafe', padding: '1px 4px', borderRadius: 3 }}>182 Sıla Karoğlu</code>
                    </div>
                    <div className="form-group" style={{ marginBottom: 16 }}>
                      <label>Okul Numaraları / Öğrenci Bilgileri</label>
                      <textarea rows={7} placeholder={'Okul numaralarını girin:\n\n182, 592, 561, 551\n\nveya satır satır:\n182 Sıla Karoğlu\n592 Meryem Gök'} value={manualText} onChange={e => setManualText(e.target.value)} style={{ width: '100%', fontFamily: 'monospace', fontSize: 14, padding: 12, borderRadius: 8, border: '1px solid #d1d5db', resize: 'vertical', minHeight: 140 }} />
                      {manualText.trim() && <p style={{ margin: '4px 0 0', fontSize: 12, color: '#666' }}>Algılanan giriş sayısı: <strong>{manualText.split(/[\n,;]+/).filter(s => s.trim()).length}</strong></p>}
                    </div>
                    {error && <div style={{ background: '#fee2e2', color: '#dc2626', padding: '10px 16px', borderRadius: 8, marginBottom: 16, fontSize: 14 }}>{error}</div>}
                    <button className="btn btn-primary" onClick={handleProcessManualText} disabled={!manualText.trim() || manualProcessing} style={{ width: '100%', padding: '12px 0', fontSize: 15 }}>
                      {manualProcessing ? 'Eşleştiriliyor...' : '🔍 Numaraları Eşleştir'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {result && (
            <div>
              {/* Özet */}
              <div className="card" style={{ padding: 20, marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <h3 style={{ margin: '0 0 4px' }}>Sonuçlar — {result.typeLabel}</h3>
                    <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 13 }}>Tarih: {formatDate(result.violationDate)} | {result.ocrLines.length} giriş işlendi</p>
                  </div>
                  <button className="btn btn-outline" onClick={handleReset}>🔄 Yeni Kayıt</button>
                </div>
                <div style={{ display: 'flex', gap: 16, marginTop: 16, flexWrap: 'wrap' }}>
                  <div style={{ background: '#dbeafe', padding: '10px 20px', borderRadius: 8, textAlign: 'center', flex: 1, minWidth: 100 }}><div style={{ fontSize: 24, fontWeight: 700, color: '#2563eb' }}>{result.summary.matchedCount}</div><div style={{ fontSize: 12, color: '#3b82f6' }}>Eşleşen</div></div>
                  <div style={{ background: '#fef3c7', padding: '10px 20px', borderRadius: 8, textAlign: 'center', flex: 1, minWidth: 100 }}><div style={{ fontSize: 24, fontWeight: 700, color: '#d97706' }}>{result.summary.unmatchedCount}</div><div style={{ fontSize: 12, color: '#d97706' }}>Eşleşemeyen</div></div>
                  <div style={{ background: '#fee2e2', padding: '10px 20px', borderRadius: 8, textAlign: 'center', flex: 1, minWidth: 100 }}><div style={{ fontSize: 24, fontWeight: 700, color: '#dc2626' }}>{result.summary.repeatOffenders}</div><div style={{ fontSize: 12, color: '#dc2626' }}>Tekrar Eden</div></div>
                  {(result.summary.disciplineRequired ?? 0) > 0 && (
                    <div style={{ background: '#fef2f2', padding: '10px 20px', borderRadius: 8, textAlign: 'center', flex: 1, minWidth: 100, border: '2px solid #dc2626' }}><div style={{ fontSize: 24, fontWeight: 700, color: '#dc2626' }}>{result.summary.disciplineRequired}</div><div style={{ fontSize: 12, color: '#dc2626', fontWeight: 700 }}>🔴 Disiplin</div></div>
                  )}
                </div>
              </div>

              {(result.summary.disciplineRequired ?? 0) > 0 && (
                <div style={{ background: '#fef2f2', border: '2px solid #dc2626', padding: '14px 20px', borderRadius: 8, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 28, flexShrink: 0 }}>🔴</span>
                  <div>
                    <strong style={{ color: '#dc2626', fontSize: 15 }}>Disiplin İşlemi Gerekiyor!</strong>
                    <p style={{ margin: '4px 0 0', color: '#991b1b', fontSize: 13 }}>
                      {result.summary.disciplineRequired} öğrenci daha önce bu ihlal nedeniyle yazılı uyarı almış ve tekrar aynı ihlali yapmıştır.
                      Bu öğrenciler için <strong>disiplin işlemleri başlatılmalıdır</strong>.
                    </p>
                  </div>
                </div>
              )}

              {confirmed && (
                <div style={{ background: '#dcfce7', border: '1px solid #86efac', padding: '12px 20px', borderRadius: 8, marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 24 }}>✅</span>
                    <div><strong>İhlaller onaylandı!</strong><p style={{ margin: '2px 0 0', color: '#166534', fontSize: 13 }}>Seçilen {selectedIds.size} ihlal kaydedildi.</p></div>
                  </div>
                  {(() => {
                    const bCode = BEHAVIOR_MAP[result.type] || 'M164_1_B';
                    const pendingCount = result.matched.filter(m => m.suggestWarning && selectedIds.has(m.id) && !createdWarnings.has(`${m.studentId}_${bCode}`)).length;
                    return pendingCount > 0 ? (
                      <button className="btn" style={{ background: '#dc2626', color: 'white', border: 'none', fontWeight: 700 }} onClick={handleBulkCreateWarnings} disabled={bulkWarningLoading}>
                        {bulkWarningLoading ? 'Oluşturuluyor...' : `⚠️ ${pendingCount} Öğrenciye Toplu Yazılı Uyarı`}
                      </button>
                    ) : null;
                  })()}
                </div>
              )}

              {!confirmed && result.summary.unmatchedCount > result.summary.matchedCount && (
                <div style={{ background: '#fef3c7', border: '1px solid #fcd34d', padding: '12px 20px', borderRadius: 8, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 24 }}>💡</span>
                  <div><strong>OCR sonuçları düşük doğrulukta</strong><p style={{ margin: '2px 0 0', color: '#92400e', fontSize: 13 }}>El yazısı düzgün okunamadı. <span style={{ color: '#2563eb', cursor: 'pointer', textDecoration: 'underline', marginLeft: 4 }} onClick={() => { handleReset(); setEntryMethod('manual'); }}>Manuel numara girişi ile devam edin →</span></p></div>
                </div>
              )}

              {result.matched.length > 0 && (
                <div className="card" style={{ marginBottom: 16 }}>
                  <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e5e7eb', flexWrap: 'wrap', gap: 8 }}>
                    <h3 style={{ margin: 0 }}>✅ Eşleşen Öğrenciler ({result.matched.length})</h3>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button className="btn btn-outline btn-sm" onClick={() => setShowManualAdd(true)}>+ Manuel Ekle</button>
                      {!confirmed && (
                        <button className="btn btn-primary btn-sm" disabled={selectedIds.size === 0 || confirming} onClick={handleConfirm}>
                          {confirming ? 'Onaylanıyor...' : `✓ Seçilenleri Onayla (${selectedIds.size})`}
                        </button>
                      )}
                    </div>
                  </div>
                  <table className="table">
                    <thead>
                      <tr>
                        {!confirmed && <th style={{ width: 40 }}><input type="checkbox" checked={selectedIds.size === result.matched.length} onChange={() => selectedIds.size === result.matched.length ? setSelectedIds(new Set()) : setSelectedIds(new Set(result.matched.map(m => m.id)))} /></th>}
                        <th>Öğrenci</th><th>Sınıf</th><th>No</th><th>Eşleşme</th><th>Güven</th><th>Geçmiş</th><th>İşlem</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.matched.map(m => (
                        <tr key={m.id} style={{ background: m.requiresDiscipline ? '#fef2f2' : m.suggestWarning ? '#fff7ed' : undefined }}>
                          {!confirmed && <td><input type="checkbox" checked={selectedIds.has(m.id)} onChange={() => toggleSelection(m.id)} /></td>}
                          <td><strong>{m.student.fullName}</strong></td>
                          <td>{m.student.className}</td>
                          <td>{m.student.schoolNumber}</td>
                          <td><span style={{ fontSize: 12, color: '#666' }}>{m.matchedBy === 'SCHOOL_NUMBER' && '🔢 '}{m.matchedBy === 'NAME_EXACT' && '✅ '}{m.matchedBy === 'NAME_FUZZY' && '🔤 '}{m.matchedBy === 'MANUAL' && '✋ '}{m.matchedText.length > 30 ? m.matchedText.slice(0, 30) + '...' : m.matchedText}</span></td>
                          <td><span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 12, fontWeight: 600, background: m.confidence >= 90 ? '#dcfce7' : m.confidence >= 70 ? '#fef3c7' : '#fee2e2', color: m.confidence >= 90 ? '#16a34a' : m.confidence >= 70 ? '#d97706' : '#dc2626' }}>%{m.confidence}</span></td>
                          <td>{m.previousViolations > 0 ? <span style={{ background: '#fee2e2', color: '#dc2626', padding: '2px 8px', borderRadius: 10, fontSize: 12, fontWeight: 600 }}>{m.previousViolations} kez ⚠️</span> : <span style={{ color: '#999', fontSize: 12 }}>İlk kez</span>}</td>
                          <td>
                            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                              {m.requiresDiscipline && confirmed && (
                                <span style={{ padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700, background: '#fef2f2', color: '#dc2626', border: '1px solid #fca5a5' }}>🔴 Disiplin Süreci</span>
                              )}
                              {!m.requiresDiscipline && m.suggestWarning && confirmed && (() => {
                                const bCode = BEHAVIOR_MAP[result.type] || 'M164_1_B';
                                const alreadyWarned = createdWarnings.has(`${m.studentId}_${bCode}`);
                                return alreadyWarned
                                  ? <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: '#dcfce7', color: '#16a34a' }}>✓ Uyarı Verildi</span>
                                  : <button className="btn btn-sm" style={{ background: '#fee2e2', color: '#dc2626', border: 'none', padding: '3px 8px', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 600 }} onClick={() => handleCreateWarning(m)} disabled={creatingWarning === m.studentId}>{creatingWarning === m.studentId ? '...' : '⚠️ Uyarı'}</button>;
                              })()}
                              {!confirmed && <button className="btn btn-sm" style={{ background: '#f3f4f6', color: '#6b7280', border: 'none', padding: '3px 8px', borderRadius: 6, cursor: 'pointer', fontSize: 11 }} onClick={() => handleRemoveViolation(m.id)} title="Kaldır">✕</button>}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {result.unmatched.length > 0 && (
                <div className="card" style={{ marginBottom: 16 }}>
                  <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb' }}>
                    <h3 style={{ margin: 0 }}>⚠️ Eşleşemeyen Satırlar ({result.unmatched.length})</h3>
                    <p style={{ margin: '4px 0 0', fontSize: 12, color: '#999' }}>Manuel olarak ekleyebilirsiniz.</p>
                  </div>
                  <div style={{ padding: '12px 20px' }}>
                    {result.unmatched.map((u, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: i < result.unmatched.length - 1 ? '1px solid #f0f0f0' : 'none' }}>
                        <div><span style={{ fontWeight: 500 }}>"{u.text}"</span><span style={{ color: '#999', fontSize: 12, marginLeft: 8 }}>— {u.reason}</span></div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <details className="card" style={{ marginBottom: 16 }}>
                <summary style={{ padding: '12px 20px', cursor: 'pointer', fontWeight: 600 }}>📝 OCR Ham Metin (Tıklayarak Görüntüle)</summary>
                <pre style={{ padding: '12px 20px', background: '#f8fafc', margin: 0, whiteSpace: 'pre-wrap', fontSize: 13, fontFamily: 'monospace', borderTop: '1px solid #e5e7eb', maxHeight: 300, overflowY: 'auto' }}>{result.ocrRawText}</pre>
              </details>
            </div>
          )}

          {showManualAdd && result && (
            <div className="modal-overlay" onMouseDown={() => setShowManualAdd(false)}>
              <div className="modal" onMouseDown={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
                <h2>✏️ Manuel Öğrenci Ekle</h2>
                <div className="form-group">
                  <label className="form-label">Öğrenci Ara</label>
                  <input className="form-control" type="text" placeholder="Ad, numara veya sınıf..." value={manualSearch} onChange={e => setManualSearch(e.target.value)} autoFocus />
                </div>
                <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                  {filteredManualStudents.length === 0 && manualSearch ? <p style={{ padding: 16, color: '#999', textAlign: 'center' }}>Öğrenci bulunamadı</p>
                    : filteredManualStudents.slice(0, 20).map(s => (
                      <div key={s.id} onClick={() => !manualLoading && handleManualAdd(s.id)} style={{ padding: '10px 16px', cursor: manualLoading ? 'wait' : 'pointer', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} onMouseEnter={e => (e.currentTarget.style.background = '#f5f5ff')} onMouseLeave={e => (e.currentTarget.style.background = '')}>
                        <div><strong>{s.fullName}</strong><span style={{ color: '#888', marginLeft: 8, fontSize: 13 }}>{s.className} - No: {s.schoolNumber}</span></div>
                        <span style={{ fontSize: 12, color: '#3b82f6' }}>+ Ekle</span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ══════════════════════ HISTORY TAB ══════════════════════ */}
      {tab === 'history' && (
        <div>
          {/* Alt sekmeler */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            <button className={`btn btn-sm ${historyView === 'uploads' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setHistoryView('uploads')}>📋 Yükleme Geçmişi</button>
            <button className={`btn btn-sm ${historyView === 'student' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setHistoryView('student')}>🔍 Öğrenci Sorgula</button>
          </div>

          {/* ── Yükleme Geçmişi ── */}
          {historyView === 'uploads' && (
            <div>
              <div className="card" style={{ padding: '14px 20px', marginBottom: 16, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <div className="form-group" style={{ marginBottom: 0, flex: '1 1 160px' }}>
                  <label style={{ fontSize: 12 }}>İhlal Tipi</label>
                  <select value={hFilterType} onChange={e => setHFilterType(e.target.value)}>
                    <option value="">Tümü</option>
                    {VIOLATION_TYPES.map(vt => <option key={vt.value} value={vt.value}>{vt.label}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: 0, flex: '1 1 140px' }}>
                  <label style={{ fontSize: 12 }}>Tarihten</label>
                  <input type="date" value={hFilterFrom} onChange={e => setHFilterFrom(e.target.value)} />
                </div>
                <div className="form-group" style={{ marginBottom: 0, flex: '1 1 140px' }}>
                  <label style={{ fontSize: 12 }}>Tarihe</label>
                  <input type="date" value={hFilterTo} onChange={e => setHFilterTo(e.target.value)} />
                </div>
                {(hFilterType || hFilterFrom || hFilterTo) && (
                  <button className="btn btn-outline btn-sm" onClick={() => { setHFilterType(''); setHFilterFrom(''); setHFilterTo(''); }}>✕ Temizle</button>
                )}
                <span style={{ fontSize: 13, color: '#888', marginLeft: 'auto' }}>{filteredHistory.length} / {history.length} kayıt</span>
              </div>

              {historyLoading ? (
                <div className="card" style={{ padding: 40, textAlign: 'center' }}><div className="loading-spinner" /><p>Yükleniyor...</p></div>
              ) : filteredHistory.length === 0 ? (
                <div className="card" style={{ padding: 40, textAlign: 'center' }}>
                  <p style={{ fontSize: 48, margin: 0 }}>📋</p>
                  <h3>{history.length === 0 ? 'Henüz yükleme yapılmamış' : 'Filtreyle eşleşen kayıt yok'}</h3>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {filteredHistory.map(h => {
                    const confirmedCount = h.records?.filter(r => r.isConfirmed).length ?? 0;
                    const pendingCount = (h.records?.length ?? h.studentCount) - confirmedCount;
                    return (
                      <div key={h.id} className="card" style={{ overflow: 'hidden' }}>
                        <div onClick={() => handleToggleExpand(h.id)} style={{ padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', background: expandedUploadId === h.id ? '#f8fafc' : undefined, transition: 'background 0.15s' }} onMouseEnter={e => { if (expandedUploadId !== h.id) e.currentTarget.style.background = '#fafafa'; }} onMouseLeave={e => { if (expandedUploadId !== h.id) e.currentTarget.style.background = ''; }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                            <span style={{ fontSize: 14, transition: 'transform 0.2s', transform: expandedUploadId === h.id ? 'rotate(90deg)' : 'rotate(0deg)', display: 'inline-block' }}>▶</span>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                <strong style={{ fontSize: 15 }}>{formatDate(h.violationDate)}</strong>
                                <span style={{ padding: '2px 10px', borderRadius: 10, fontSize: 11, fontWeight: 600, background: `${getTypeColor(h.type)}15`, color: getTypeColor(h.type) }}>{getTypeLabel(h.type)}</span>
                                <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600, background: '#dbeafe', color: '#2563eb' }}>{h.studentCount} öğrenci</span>
                                {confirmedCount > 0 && <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600, background: '#dcfce7', color: '#16a34a' }}>✓ {confirmedCount} onaylı</span>}
                                {pendingCount > 0 && <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600, background: '#fef3c7', color: '#d97706' }}>⏳ {pendingCount} beklemede</span>}
                              </div>
                              {h.description && <p style={{ margin: '2px 0 0', fontSize: 12, color: '#888' }}>{h.description}</p>}
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 12, color: '#999' }}>{formatDate(h.createdAt)}</span>
                            <button className="btn btn-sm" style={{ background: '#fee2e2', color: '#dc2626', border: 'none', padding: '4px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }} onClick={e => { e.stopPropagation(); handleDeleteUpload(h.id); }} disabled={deletingUploadId === h.id} title="Sil">{deletingUploadId === h.id ? '...' : '🗑️ Sil'}</button>
                          </div>
                        </div>
                        {expandedUploadId === h.id && (() => {
                          const detail = expandedDetails[h.id];
                          const records = detail?.records ?? h.records;
                          const bCode = BEHAVIOR_MAP[h.type] || 'M164_1_B';
                          const pendingConfirmCount = records?.filter(r => !r.isConfirmed).length ?? 0;
                          const pendingWarningCount = records?.filter(r => r.suggestWarning && r.isConfirmed && !r.hasWarning).length ?? 0;
                          return (
                            <div style={{ borderTop: '1px solid #e5e7eb' }}>
                              {pendingConfirmCount > 0 && (
                                <div style={{ padding: '10px 20px', background: '#eff6ff', borderBottom: '1px solid #bfdbfe', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                                  <span style={{ fontSize: 13, color: '#1e40af' }}>⏳ <strong>{pendingConfirmCount}</strong> öğrenci henüz onaylanmamış</span>
                                  <button className="btn btn-primary btn-sm" onClick={e => { e.stopPropagation(); handleHistoryConfirm(h.id, (records ?? []).filter(r => !r.isConfirmed).map(r => r.id)); }} disabled={historyConfirmLoading === h.id}>
                                    {historyConfirmLoading === h.id ? 'Onaylanıyor...' : `✓ Tümünü Onayla (${pendingConfirmCount})`}
                                  </button>
                                </div>
                              )}
                              {pendingWarningCount > 0 && (
                                <div style={{ padding: '10px 20px', background: '#fff7ed', borderBottom: '1px solid #fed7aa', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                                  <span style={{ fontSize: 13, color: '#92400e' }}>⚠️ <strong>{pendingWarningCount}</strong> öğrenci tekrar ihlalci — yazılı uyarı önerilebilir</span>
                                  <button className="btn btn-sm" style={{ background: '#dc2626', color: 'white', border: 'none', fontWeight: 700, fontSize: 12 }} onClick={e => { e.stopPropagation(); handleHistoryBulkWarning(h); }} disabled={historyBulkWarningLoading === h.id}>
                                    {historyBulkWarningLoading === h.id ? 'Oluşturuluyor...' : `⚠️ ${pendingWarningCount} Öğrenciye Toplu Yazılı Uyarı`}
                                  </button>
                                </div>
                              )}
                              {(() => {
                                const disciplineCount = records?.filter(r => r.requiresDiscipline && r.isConfirmed).length ?? 0;
                                return disciplineCount > 0 ? (
                                  <div style={{ padding: '10px 20px', background: '#fef2f2', borderBottom: '1px solid #fca5a5', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                                    <span style={{ fontSize: 18 }}>🔴</span>
                                    <span style={{ fontSize: 13, color: '#991b1b', fontWeight: 600 }}><strong>{disciplineCount}</strong> öğrenci yazılı uyarı aldıktan sonra tekrar ihlal yaptı — <strong>disiplin işlemleri başlatılmalıdır!</strong></span>
                                  </div>
                                ) : null;
                              })()}
                              {expandDetailLoading === h.id ? (
                                <div style={{ padding: 20, textAlign: 'center', color: '#999', fontSize: 14 }}>Yükleniyor...</div>
                              ) : !records || records.length === 0 ? (
                                <div style={{ padding: 20, textAlign: 'center', color: '#999', fontSize: 14 }}>Bu yüklemede öğrenci kaydı yok.</div>
                              ) : (
                                <table className="table" style={{ margin: 0 }}>
                                  <thead><tr style={{ background: '#f8fafc' }}><th style={{ padding: '8px 16px', fontSize: 12 }}>#</th><th style={{ padding: '8px 16px', fontSize: 12 }}>Öğrenci</th><th style={{ padding: '8px 16px', fontSize: 12 }}>Sınıf</th><th style={{ padding: '8px 16px', fontSize: 12 }}>Okul No</th><th style={{ padding: '8px 16px', fontSize: 12 }}>Bu Kategoride</th><th style={{ padding: '8px 16px', fontSize: 12 }}>Eşleşme</th><th style={{ padding: '8px 16px', fontSize: 12 }}>Durum</th><th style={{ padding: '8px 16px', fontSize: 12 }}>İşlem</th></tr></thead>
                                  <tbody>
                                    {records.map((r, idx) => {
                                      const alreadyWarned = r.hasWarning;
                                      const requiresDiscipline = r.requiresDiscipline;
                                      const totalInCategory = (r.previousViolations ?? 0) + 1;
                                      return (
                                        <tr key={r.id} style={{ background: requiresDiscipline && r.isConfirmed ? '#fef2f2' : r.suggestWarning && r.isConfirmed ? (alreadyWarned ? '#f0fdf4' : '#fff7ed') : undefined }}>
                                          <td style={{ padding: '6px 16px', fontSize: 13, color: '#999' }}>{idx + 1}</td>
                                          <td style={{ padding: '6px 16px', fontSize: 13 }}><strong>{r.student.fullName}</strong></td>
                                          <td style={{ padding: '6px 16px', fontSize: 13 }}>{r.student.className}</td>
                                          <td style={{ padding: '6px 16px', fontSize: 13 }}>{r.student.schoolNumber}</td>
                                          <td style={{ padding: '6px 16px' }}>
                                            <span style={{ padding: '2px 10px', borderRadius: 10, fontSize: 12, fontWeight: 700, background: totalInCategory >= 3 ? '#fee2e2' : totalInCategory === 2 ? '#fef3c7' : '#f3f4f6', color: totalInCategory >= 3 ? '#dc2626' : totalInCategory === 2 ? '#d97706' : '#6b7280' }}>
                                              {totalInCategory}. ihlal
                                            </span>
                                          </td>
                                          <td style={{ padding: '6px 16px', fontSize: 12, color: '#888' }}>{r.matchedBy === 'SCHOOL_NUMBER' && '🔢 Numara'}{r.matchedBy === 'NAME_EXACT' && '✅ İsim (Tam)'}{r.matchedBy === 'NAME_FUZZY' && '🔤 İsim (Yakın)'}{r.matchedBy === 'MANUAL' && '✋ Manuel'}{r.matchedBy === 'OCR' && '📷 OCR'}</td>
                                          <td style={{ padding: '6px 16px' }}>
                                            {r.isConfirmed
                                              ? <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600, background: '#dcfce7', color: '#16a34a' }}>✓ Onaylı</span>
                                              : <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600, background: '#fef3c7', color: '#d97706' }}>Beklemede</span>}
                                          </td>
                                          <td style={{ padding: '6px 16px' }}>
                                            {requiresDiscipline && r.isConfirmed ? (
                                              <span style={{ padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700, background: '#fef2f2', color: '#dc2626', border: '1px solid #fca5a5' }}>🔴 Disiplin Süreci</span>
                                            ) : r.suggestWarning && r.isConfirmed ? (
                                              alreadyWarned
                                                ? <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: '#dcfce7', color: '#16a34a' }}>✓ Uyarı Verildi</span>
                                                : <button className="btn btn-sm" style={{ background: '#fee2e2', color: '#dc2626', border: 'none', padding: '3px 8px', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 600 }} onClick={e => { e.stopPropagation(); handleHistoryCreateWarning(h.id, h.type, r.studentId, r.student.fullName, r.student.className, r.previousViolations ?? 0); }} disabled={historyWarningLoading === r.studentId}>{historyWarningLoading === r.studentId ? '...' : '⚠️ Uyarı'}</button>
                                            ) : null}
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── Öğrenci Sorgula ── */}
          {historyView === 'student' && (
            <div>
              <div className="card" style={{ padding: 20, marginBottom: 16 }}>
                <h3 style={{ marginTop: 0, marginBottom: 12 }}>🔍 Öğrenci İhlal Geçmişi</h3>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    placeholder="Öğrenci adı, okul numarası veya sınıf ile arayın..."
                    value={stuSearch}
                    onChange={e => { setStuSearch(e.target.value); setStuSelected(null); setStuHistory(null); }}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 14 }}
                  />
                  {stuSearch && filteredStuSearch.length > 0 && !stuSelected && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid #e5e7eb', borderTop: 'none', borderRadius: '0 0 8px 8px', maxHeight: 220, overflowY: 'auto', zIndex: 50, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                      {filteredStuSearch.slice(0, 20).map(s => (
                        <div key={s.id} onClick={() => { setStuSearch(s.fullName); handleStudentSearch(s); }} style={{ padding: '10px 16px', cursor: 'pointer', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between' }} onMouseEnter={e => (e.currentTarget.style.background = '#f5f5ff')} onMouseLeave={e => (e.currentTarget.style.background = '')}>
                          <span><strong>{s.fullName}</strong></span>
                          <span style={{ color: '#888', fontSize: 13 }}>{s.className} · {s.schoolNumber}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {stuLoading && <div className="card" style={{ padding: 40, textAlign: 'center' }}><div className="spinner spinner-dark" /><p>Yükleniyor...</p></div>}

              {stuHistory && stuSelected && !stuLoading && (
                <div>
                  <div className="card" style={{ padding: '16px 20px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 700 }}>{stuHistory.student.fullName}</div>
                      <div style={{ fontSize: 13, color: '#666', marginTop: 2 }}>{stuHistory.student.className} · Okul No: {stuHistory.student.schoolNumber}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <div style={{ textAlign: 'center', background: '#fee2e2', borderRadius: 'var(--radius)', padding: '8px 16px' }}>
                        <div style={{ fontSize: 22, fontWeight: 800, color: '#dc2626' }}>{stuHistory.total}</div>
                        <div style={{ fontSize: 11, color: '#dc2626' }}>Toplam İhlal</div>
                      </div>
                      <div style={{ textAlign: 'center', background: '#dcfce7', borderRadius: 'var(--radius)', padding: '8px 16px' }}>
                        <div style={{ fontSize: 22, fontWeight: 800, color: '#16a34a' }}>{stuHistory.confirmed}</div>
                        <div style={{ fontSize: 11, color: '#16a34a' }}>Onaylı</div>
                      </div>
                      <div style={{ textAlign: 'center', background: '#fef3c7', borderRadius: 'var(--radius)', padding: '8px 16px' }}>
                        <div style={{ fontSize: 22, fontWeight: 800, color: '#d97706' }}>{stuHistory.total - stuHistory.confirmed}</div>
                        <div style={{ fontSize: 11, color: '#d97706' }}>Beklemede</div>
                      </div>
                    </div>
                  </div>

                  {stuHistory.warningSuggestions.length > 0 && (
                    <div className="card" style={{ marginBottom: 16, overflow: 'hidden', border: `1px solid ${stuHistory.warningSuggestions.some(s => s.hasWarning) ? '#fca5a5' : '#fed7aa'}` }}>
                      <div style={{ padding: '12px 20px', background: stuHistory.warningSuggestions.some(s => s.hasWarning) ? '#fef2f2' : '#fff7ed', borderBottom: `1px solid ${stuHistory.warningSuggestions.some(s => s.hasWarning) ? '#fca5a5' : '#fed7aa'}` }}>
                        <strong style={{ color: stuHistory.warningSuggestions.some(s => s.hasWarning) ? '#dc2626' : '#92400e', fontSize: 14 }}>
                          {stuHistory.warningSuggestions.some(s => s.hasWarning) ? '🔴 Disiplin Süreci Uyarısı' : '⚠️ Yazılı Uyarı Durumu'}
                        </strong>
                        <p style={{ margin: '2px 0 0', fontSize: 12, color: stuHistory.warningSuggestions.some(s => s.hasWarning) ? '#991b1b' : '#b45309' }}>
                          {stuHistory.warningSuggestions.some(s => s.hasWarning)
                            ? 'Bu öğrenci yazılı uyarı aldıktan sonra aynı ihlali tekrarlamış — disiplin işlemi gerekebilir'
                            : 'Aynı kategoride 2 veya daha fazla onaylı ihlal — yazılı uyarı önerilebilir'}
                        </p>
                      </div>
                      <div style={{ padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {stuHistory.warningSuggestions.map(s => {
                          const alreadyWarned = s.hasWarning;
                          return (
                            <div key={s.type} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, padding: '10px 14px', borderRadius: 8, background: alreadyWarned ? '#fef2f2' : '#fff7ed', border: `1px solid ${alreadyWarned ? '#fca5a5' : '#fcd34d'}` }}>
                              <div>
                                <span style={{ fontWeight: 600, fontSize: 13 }}>{getTypeLabel(s.type)}</span>
                                <span style={{ marginLeft: 10, fontSize: 12, color: '#666' }}>Onaylı ihlal: <strong style={{ color: '#dc2626' }}>{s.confirmedCount}</strong></span>
                                {alreadyWarned && <span style={{ marginLeft: 10, fontSize: 12, fontWeight: 700, color: '#dc2626' }}>— Yazılı uyarı almasına rağmen tekrar ihlal!</span>}
                              </div>
                              {alreadyWarned ? (
                                <span style={{ padding: '4px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, background: '#fef2f2', color: '#dc2626', border: '1px solid #fca5a5' }}>🔴 Disiplin İşlemi Gerekiyor</span>
                              ) : (
                                <button className="btn btn-sm" style={{ background: '#dc2626', color: 'white', border: 'none', fontWeight: 700, fontSize: 12 }} onClick={() => handleStuCreateWarning(s)} disabled={stuWarningLoading === s.type}>
                                  {stuWarningLoading === s.type ? 'Oluşturuluyor...' : '⚠️ Yazılı Uyarı Oluştur'}
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      {stuHistory.existingWarnings.length > 0 && (
                        <div style={{ padding: '8px 20px 12px', borderTop: `1px solid ${stuHistory.warningSuggestions.some(s => s.hasWarning) ? '#fca5a5' : '#fed7aa'}` }}>
                          <p style={{ margin: '0 0 6px', fontSize: 12, color: '#92400e', fontWeight: 600 }}>Verilen Yazılı Uyarılar:</p>
                          {stuHistory.existingWarnings.map(w => (
                            <div key={w.id} style={{ fontSize: 12, color: '#666', padding: '2px 0' }}>• {formatDate(w.issuedAt)} — {w.warningNumber}. uyarı</div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {stuHistory.violations.length === 0 ? (
                    <div className="card" style={{ padding: 32, textAlign: 'center', color: '#888' }}>Bu öğrenci için ihlal kaydı bulunmuyor.</div>
                  ) : (
                    <div className="card" style={{ overflowX: 'auto', marginBottom: 16 }}>
                      <table className="table">
                        <thead><tr><th>Tarih</th><th>İhlal Tipi</th><th>Açıklama</th><th>Durum</th></tr></thead>
                        <tbody>
                          {stuHistory.violations.map((v, i) => (
                            <tr key={v.id} style={{ background: i % 2 === 0 ? undefined : '#fafafa' }}>
                              <td>{formatDate(v.upload.violationDate)}</td>
                              <td><span style={{ padding: '2px 10px', borderRadius: 10, fontSize: 12, fontWeight: 600, background: `${getTypeColor(v.type)}15`, color: getTypeColor(v.type) }}>{getTypeLabel(v.type)}</span></td>
                              <td style={{ color: '#666', fontSize: 13 }}>{v.upload.description || '—'}</td>
                              <td>{v.isConfirmed ? <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600, background: '#dcfce7', color: '#16a34a' }}>✓ Onaylı</span> : <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600, background: '#fef3c7', color: '#d97706' }}>Beklemede</span>}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Yazılı Uyarı Personel Seçim Modalı ── */}
      {showWarningModal && warningModalTargets.length > 0 && (
        <div className="modal-overlay" onMouseDown={() => { if (!wLoading) setShowWarningModal(false); }}>
          <div className="modal" onMouseDown={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <h2 style={{ marginTop: 0, marginBottom: 4 }}>⚠️ Yazılı Uyarı Oluştur</h2>
            {warningModalTargets.length === 1 ? (
              <p style={{ margin: '0 0 20px', fontSize: 13, color: '#666' }}>
                <strong>{warningModalTargets[0].studentName}</strong> — {warningModalTargets[0].studentClassName} |{' '}
                {getTypeLabel(warningModalTargets[0].uploadType)} ({warningModalTargets[0].prevViolations + 1}. ihlal)
              </p>
            ) : (
              <p style={{ margin: '0 0 20px', fontSize: 13, color: '#666' }}>
                <strong>{warningModalTargets.length} öğrenci</strong> için toplu yazılı uyarı
              </p>
            )}
            <div className="form-group">
              <label className="form-label">Sınıf Rehber Öğretmeni</label>
              {classTeachers.length > 0 ? (
                <select value={wClassTeacherName} onChange={e => setWClassTeacherName(e.target.value)}>
                  <option value="">— Seçilmedi —</option>
                  {classTeachers.map(t => <option key={t.id} value={t.name}>{t.name}{t.className ? ` (${t.className})` : ''}</option>)}
                </select>
              ) : (
                <input type="text" placeholder="Sınıf rehber öğretmeninin adı..." value={wClassTeacherName} onChange={e => setWClassTeacherName(e.target.value)} />
              )}
            </div>
            <div className="form-group">
              <label className="form-label">Okul Rehber Öğretmeni</label>
              {counselors.length > 0 ? (
                <select value={wCounselorName} onChange={e => setWCounselorName(e.target.value)}>
                  <option value="">— Seçilmedi —</option>
                  {counselors.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
              ) : (
                <input type="text" placeholder="Rehber öğretmenin adı..." value={wCounselorName} onChange={e => setWCounselorName(e.target.value)} />
              )}
            </div>
            <div className="form-group">
              <label className="form-label">Düzenleyen (Müdür Yardımcısı)</label>
              {assistantPrincipals.length > 0 ? (
                <select value={wIssuedBy} onChange={e => setWIssuedBy(e.target.value)}>
                  <option value="">— Seçilmedi (Okul Yönetimi) —</option>
                  {assistantPrincipals.map(a => <option key={a.id} value={a.name}>{a.name}</option>)}
                </select>
              ) : (
                <input type="text" placeholder="Müdür yardımcısının adı..." value={wIssuedBy} onChange={e => setWIssuedBy(e.target.value)} />
              )}
              <small style={{ color: 'var(--text-muted)' }}>Boş bırakılırsa "Okul Yönetimi" olarak kaydedilir.</small>
            </div>
            <div className="form-group">
              <label className="form-label">Rehberlik Notu (Opsiyonel)</label>
              <textarea rows={2} placeholder="Rehberlik notunu yazın..." value={wGuidanceNote} onChange={e => setWGuidanceNote(e.target.value)} style={{ width: '100%', resize: 'vertical' }} />
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <button className="btn btn-outline" onClick={() => setShowWarningModal(false)} disabled={wLoading} style={{ flex: 1 }}>İptal</button>
              <button className="btn btn-primary" onClick={handleConfirmWarningModal} disabled={wLoading} style={{ flex: 2, background: '#dc2626', borderColor: '#dc2626' }}>
                {wLoading ? 'Oluşturuluyor...' : `⚠️ Uyarı${warningModalTargets.length > 1 ? `ları (${warningModalTargets.length})` : ''} Oluştur`}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmModal}
    </div>
  );
}
