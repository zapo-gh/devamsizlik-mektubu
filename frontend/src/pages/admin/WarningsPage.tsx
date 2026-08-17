import React, { useState, useEffect, useRef, FormEvent } from 'react';
import api from '../../services/api';
import { useConfirm } from '../../hooks/useConfirm';
import { PageHeader } from '../../components/ui/PageHeader';
import { DataTable, Column } from '../../components/ui/DataTable';
import { ActionModal } from '../../components/ui/ActionModal';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { AlertTriangle, Plus, Search, Eye, FileText, Smartphone, Trash2, ShieldAlert } from 'lucide-react';

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
  
  // Modals
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
  
  // WA
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
    api.get('/whatsapp/status').then(r => setWaConnected(r.data.data.status === 'connected')).catch(() => {});
  }, [page, listSearch]);

  const loadData = async () => {
    setLoading(true);
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
      if (isSearch) setPagination(null);
      else setPagination(recordsRes.data.data.pagination);
      
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

    const ct = classTeachers.find(
      (t) => t.className?.toLocaleLowerCase('tr-TR').trim() === student.className?.toLocaleLowerCase('tr-TR').trim()
    );
    setClassTeacherName(ct ? ct.name : '');

    if (counselors.length === 1) {
      setSchoolCounselorName(counselors[0].name);
    }

    try {
      const res = await api.get(`/warnings/warning-count/${student.id}`);
      setWarningCount(res.data.data.count);
    } catch {
      setWarningCount(0);
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
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const newWin = window.open(url, '_blank');
      if (!newWin) window.location.href = url;
    } catch {
      await alert('PDF görüntüleme başarısız.');
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
      setWaSelectedPhones(new Set((res.data.data.messages as { phone: string }[]).map(m => m.phone)));
    } catch (err: any) {
      setWaPreviewError(err.response?.data?.message || 'Önizleme yüklenemedi.');
    } finally {
      setWaPreviewLoading(false);
    }
  };

  const handleWaSend = async () => {
    if (!waRecord || waSelectedPhones.size === 0) return;
    setWaSendLoading(waRecord.id);
    try {
      const res = await api.post(`/whatsapp/send/warning/${waRecord.id}`, {
        selectedPhones: Array.from(waSelectedPhones),
      });
      const results = res.data.data.results as { parent: string; phone: string; ok: boolean; error?: string }[];
      const failed = results.filter(r => !r.ok);
      if (results.some(r => r.ok)) {
        setRecords(prev => prev.map(rec => rec.id === waRecord.id ? { ...rec, waSentAt: new Date().toISOString() } : rec));
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

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getFullYear()}`;
  };

  const behaviorsByArticle = allBehaviors.reduce<Record<string, WarningBehavior[]>>((acc, b) => {
    const key = b.article || 'Diğer';
    if (!acc[key]) acc[key] = [];
    acc[key].push(b);
    return acc;
  }, {});

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

  const columns: Column<WarningRecord>[] = [
    {
      header: 'Öğrenci',
      render: (r) => (
        <div>
          <div className="font-bold text-gray-900">{r.student.fullName}</div>
          <div className="text-xs text-gray-500 font-medium">No: {r.student.schoolNumber}</div>
        </div>
      )
    },
    {
      header: 'Sınıf',
      render: (r) => <span className="text-sm font-medium text-gray-700">{r.student.className}</span>
    },
    {
      header: 'Uyarı No',
      render: (r) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border
          ${r.warningNumber >= 3 ? "bg-red-50 text-red-700 border-red-200" : 
            r.warningNumber === 2 ? "bg-amber-50 text-amber-700 border-amber-200" : 
            "bg-blue-50 text-blue-700 border-blue-200"}
        `}>
          {r.warningNumber}. Uyarı
        </span>
      )
    },
    {
      header: 'Davranış',
      render: (r) => (
        <div className="max-w-xs md:max-w-md truncate text-sm text-gray-600 font-medium" title={r.behaviorText}>
          {r.behaviorText}
        </div>
      )
    },
    {
      header: 'Tarih',
      render: (r) => <span className="text-sm text-gray-500">{formatDate(r.issuedAt)}</span>
    },
    {
      header: 'İşlemler',
      align: 'right',
      render: (r) => (
        <div className="flex justify-end gap-2">
          <button onClick={() => { setSelectedRecord(r); setShowDetailModal(true); }} className="p-1.5 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded shadow-sm transition" title="Detay">
            <Eye size={16}/>
          </button>
          <button onClick={() => handleViewPdf(r.id)} className="p-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded shadow-sm transition" title="PDF Görüntüle">
            <FileText size={16}/>
          </button>
          {waConnected && (
            r.waSentAt ? (
              <span className="text-xs text-green-700 bg-green-50 px-2 py-1.5 rounded border border-green-200 font-semibold" title={`Gönderildi: ${formatDate(r.waSentAt)}`}>✅ WA Gönderildi</span>
            ) : (
              <button 
                onClick={() => handleWaPreviewOpen(r)}
                disabled={waSendLoading === r.id}
                className="p-1.5 text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 rounded shadow-sm transition flex items-center gap-1.5 text-xs font-semibold"
                title="WhatsApp'tan bilgilendirme mesajı gönder"
              >
                {waSendLoading === r.id ? <div className="w-4 h-4 border-2 border-green-700 border-t-transparent rounded-full animate-spin"/> : <Smartphone size={14}/>}
                Gönder
              </button>
            )
          )}
          <button 
            onClick={() => handleDelete(r.id)}
            disabled={deleteLoading && deleteId === r.id}
            className="p-1.5 text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded shadow-sm transition"
            title="Sil"
          >
            <Trash2 size={16}/>
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Yazılı Uyarılar"
        description="Öğrencilere verilen yazılı uyarı (tutanak) belgelerini yönetin"
        icon={<AlertTriangle size={28} className="text-indigo-600" />}
        actionText="Yeni Uyarı"
        onAction={() => setShowCreateModal(true)}
      />

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Öğrenci adı, numarası veya sınıf ile ara..."
              value={listSearch}
              onChange={e => setListSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
            />
          </div>
        </div>

        <DataTable
          data={records}
          columns={columns}
          loading={loading}
          emptyMessage={listSearch ? "Arama sonucu bulunamadı." : "Henüz yazılı uyarı kaydı bulunmuyor. Yeni bir yazılı uyarı oluşturmak için 'Yeni Uyarı' butonunu kullanın."}
        />

        {pagination && pagination.totalPages > 1 && (
          <div className="p-4 border-t border-gray-100 flex items-center justify-center gap-3">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-4 py-2 border rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition">Geri</button>
            <span className="text-sm text-gray-600 font-medium">Sayfa {page} / {pagination.totalPages}</span>
            <button disabled={page >= pagination.totalPages} onClick={() => setPage(p => p + 1)} className="px-4 py-2 border rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition">İleri</button>
          </div>
        )}
      </div>

      {/* ─── MODALS ─── */}

      {/* 1. Create Modal */}
      <ActionModal
        isOpen={showCreateModal}
        onClose={() => { setShowCreateModal(false); resetCreateForm(); }}
        title="Yeni Yazılı Uyarı"
        submitText={createLoading ? 'Oluşturuluyor...' : 'Uyarı Oluştur & PDF Üret'}
        onSubmit={handleCreate}
        submitDisabled={!selectedStudentId || !selectedBehaviorCode || createLoading}
        width="md"
      >
        <div className="space-y-5">
          {createError && <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm border border-red-100 flex items-center gap-2"><ShieldAlert size={16}/> {createError}</div>}
          
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">1. Öğrenci Seçin</label>
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
              className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
            />
            {showStudentDropdown && studentSearch && (
              <div className="absolute top-full left-0 right-0 max-h-48 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg z-10 mt-1">
                {filteredStudents.length === 0 ? (
                  <div className="p-3 text-gray-500 text-sm text-center">Öğrenci bulunamadı</div>
                ) : (
                  filteredStudents.slice(0, 20).map((s) => (
                    <div
                      key={s.id}
                      onClick={() => handleStudentSelect(s)}
                      className="px-4 py-2 text-sm hover:bg-indigo-50 cursor-pointer border-b border-gray-50 last:border-0 transition"
                    >
                      <strong className="text-gray-900">{s.fullName}</strong>
                      <span className="text-gray-500 ml-2">{s.className} - No: {s.schoolNumber}</span>
                    </div>
                  ))
                )}
              </div>
            )}
            {selectedStudentId && (
              <p className="text-xs text-green-600 font-medium mt-1">✓ Öğrenci seçildi — Bu öğrencinin mevcut uyarı sayısı: <strong className="text-green-700">{warningCount}</strong> (Sıradaki: {warningCount + 1}. uyarı)</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">2. Davranış Seçin</label>
            <select
              value={selectedBehaviorCode}
              onChange={(e) => {
                setSelectedBehaviorCode(e.target.value);
                const b = allBehaviors.find(x => x.code === e.target.value);
                if (b) setSelectedCategory(b.category);
              }}
              className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
            >
              <option value="">Davranış seçin...</option>
              {articleKeys.map((article) => (
                <optgroup key={article} label={article}>
                  {behaviorsByArticle[article].map((b) => (
                    <option key={b.code} value={b.code}>{b.text}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">3. Sınıf Rehber Öğretmeni</label>
              {classTeachers.length > 0 ? (
                <select value={classTeacherName} onChange={e => setClassTeacherName(e.target.value)} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm">
                  <option value="">— Seçilmedi —</option>
                  {classTeachers.map(t => <option key={t.id} value={t.name}>{t.name} ({t.className})</option>)}
                </select>
              ) : (
                <input type="text" value={classTeacherName} onChange={e => setClassTeacherName(e.target.value)} placeholder="Ad Soyad..." className="w-full p-2.5 border border-gray-300 rounded-lg text-sm" />
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">4. Okul Rehber Öğretmeni</label>
              {counselors.length > 0 ? (
                <select value={schoolCounselorName} onChange={e => setSchoolCounselorName(e.target.value)} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm">
                  <option value="">— Seçilmedi —</option>
                  {counselors.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
              ) : (
                <input type="text" value={schoolCounselorName} onChange={e => setSchoolCounselorName(e.target.value)} placeholder="Ad Soyad..." className="w-full p-2.5 border border-gray-300 rounded-lg text-sm" />
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">5. Düzenleyen (Müdür Yardımcısı)</label>
            {assistantPrincipals.length > 0 ? (
              <select value={issuedBy} onChange={e => setIssuedBy(e.target.value)} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm">
                <option value="">— Okul Yönetimi —</option>
                {assistantPrincipals.map(a => <option key={a.id} value={a.name}>{a.name}</option>)}
              </select>
            ) : (
              <input type="text" value={issuedBy} onChange={e => setIssuedBy(e.target.value)} placeholder="Müdür yardımcısının adını yazın..." className="w-full p-2.5 border border-gray-300 rounded-lg text-sm" />
            )}
            <p className="text-xs text-gray-500 mt-1">Boş bırakılırsa "Okul Yönetimi" olarak kaydedilir.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Açıklama (Opsiyonel)</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="İhlalin detayını buraya yazabilirsiniz..." className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm resize-y" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rehberlik Notu (Opsiyonel)</label>
            <textarea value={guidanceNote} onChange={e => setGuidanceNote(e.target.value)} rows={2} placeholder="Rehberlik servisi notu..." className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm resize-y" />
          </div>
        </div>
      </ActionModal>

      {/* 2. Detail Modal */}
      <ActionModal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        title="Uyarı Detayı"
        hideSubmit
        cancelText="Kapat"
      >
        {selectedRecord && (
          <div className="space-y-4 text-sm text-gray-700">
            <div className="grid grid-cols-[120px_1fr] gap-y-3">
              <strong className="text-gray-900">Öğrenci:</strong>
              <div>{selectedRecord.student.fullName}</div>
              
              <strong className="text-gray-900">Sınıf / No:</strong>
              <div>{selectedRecord.student.className} - {selectedRecord.student.schoolNumber}</div>
              
              <strong className="text-gray-900">Uyarı No:</strong>
              <div><span className="font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">{selectedRecord.warningNumber}. Uyarı</span></div>
              
              <strong className="text-gray-900">Tarih:</strong>
              <div>{formatDate(selectedRecord.issuedAt)}</div>
              
              <strong className="text-gray-900 mt-2">Davranış:</strong>
              <div className="mt-2 text-gray-800 bg-gray-50 p-2 rounded border border-gray-200">{selectedRecord.behaviorText}</div>
              
              {selectedRecord.description && (
                <>
                  <strong className="text-gray-900 mt-2">Açıklama:</strong>
                  <div className="mt-2 text-gray-800 bg-gray-50 p-2 rounded border border-gray-200 whitespace-pre-wrap">{selectedRecord.description}</div>
                </>
              )}
              
              {selectedRecord.guidanceNote && (
                <>
                  <strong className="text-gray-900 mt-2">Rehberlik Notu:</strong>
                  <div className="mt-2 text-gray-800 bg-gray-50 p-2 rounded border border-gray-200 whitespace-pre-wrap">{selectedRecord.guidanceNote}</div>
                </>
              )}
              
              <strong className="text-gray-900 mt-2">Düzenleyen:</strong>
              <div className="mt-2">{selectedRecord.issuedBy}</div>
            </div>

            <div className="flex gap-2 justify-end mt-6 pt-4 border-t border-gray-100">
              {waConnected && (
                <button 
                  onClick={() => { setShowDetailModal(false); handleWaPreviewOpen(selectedRecord); }}
                  className="px-4 py-2 bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 rounded-lg text-sm font-medium transition flex items-center gap-2"
                >
                  <Smartphone size={16}/> Gönder
                </button>
              )}
              <button 
                onClick={() => handleViewPdf(selectedRecord.id)}
                className="px-4 py-2 bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 rounded-lg text-sm font-medium transition flex items-center gap-2"
              >
                <FileText size={16}/> PDF Görüntüle
              </button>
            </div>
          </div>
        )}
      </ActionModal>

      {/* 3. WhatsApp Preview Modal */}
      <ActionModal
        isOpen={showWaModal}
        onClose={() => setShowWaModal(false)}
        title="WhatsApp Önizleme"
        submitText={waSendLoading ? 'Gönderiliyor...' : `📱 ${waSelectedPhones.size} Veliye Gönder`}
        onSubmit={async (e) => { e.preventDefault(); await handleWaSend(); }}
        submitDisabled={waPreviewLoading || !!waPreviewError || waSelectedPhones.size === 0}
        width="lg"
      >
        {waRecord && (
          <div className="space-y-4">
            <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3 text-sm flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold">
                {waRecord.warningNumber}
              </div>
              <div>
                <div className="font-bold text-indigo-900">{waRecord.student.fullName} <span className="text-indigo-600 font-normal ml-2">{waRecord.student.className}</span></div>
                <div className="text-indigo-700 text-xs mt-0.5">{waRecord.warningNumber}. Tutanak & Yazılı Uyarı</div>
              </div>
            </div>

            {waPreviewError && <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm border border-red-100"><ShieldAlert size={16} className="inline mr-2"/> {waPreviewError}</div>}
            {waPreviewLoading && !waPreviewData && <div className="p-8 text-center text-gray-500 animate-pulse font-medium">Önizleme Oluşturuluyor...</div>}

            {waPreviewData && (
              <div>
                {waPreviewData.messages.length > 1 && (
                  <div className="mb-4 bg-gray-50 p-3 rounded-lg border border-gray-100">
                    <div className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wider">Gönderilecek Veliler</div>
                    {waPreviewData.messages.map((m, i) => (
                      <label key={i} className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition border border-transparent ${waSelectedPhones.has(m.phone) ? 'bg-green-50 border-green-200' : 'hover:bg-gray-100'}`}>
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
                          className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500 cursor-pointer"
                        />
                        <div>
                          <div className="text-sm font-semibold text-gray-800">{m.parent}</div>
                          <div className="text-xs text-gray-500">{m.phone}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                )}

                <div className="space-y-4">
                  {waPreviewData.messages.filter(m => waSelectedPhones.has(m.phone)).map((m, i) => (
                    <div key={i} className="bg-green-50 rounded-xl border border-green-200 overflow-hidden">
                      <div className="bg-white border-b border-green-100 px-3 py-2 text-xs font-semibold text-gray-600 flex items-center gap-2">
                        <Smartphone size={14} className="text-green-600" /> {m.parent} ({m.phone})
                      </div>
                      <div className="p-3">
                        <pre className="text-[13px] font-sans text-gray-800 whitespace-pre-wrap break-words m-0 leading-relaxed">{m.message}</pre>
                      </div>
                    </div>
                  ))}
                </div>

                {waSelectedPhones.size === 0 && (
                  <div className="p-3 bg-amber-50 text-amber-800 rounded-lg text-sm border border-amber-200 mt-2 font-medium">
                    ⚠️ Gönderim için en az bir veli seçin.
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </ActionModal>
      
      {confirmModal}
    </div>
  );
}
