import React, { useState, useEffect, useRef, FormEvent } from 'react';
import api from '../../services/api';
import { useConfirm } from '../../hooks/useConfirm';
import { PageHeader } from '../../components/ui/PageHeader';
import { ActionModal } from '../../components/ui/ActionModal';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { FileText, Search, Plus, Filter, RefreshCw, Send, History, Trash2, Smartphone, ShieldAlert, CheckCircle2, Clock, MapPin, Printer, Mail } from 'lucide-react';
import { printPdfBlob } from '../../utils/printPdf';

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
  
  // Modals
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showWaModal, setShowWaModal] = useState(false);

  // List Search
  const [listSearch, setListSearch] = useState('');
  const prevSearchRef = useRef('');
  
  // Pagination
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<{ total: number; totalPages: number } | null>(null);

  // Upload Form
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

  // WhatsApp 
  const [waConnected, setWaConnected] = useState(false);
  const [waSendLoading, setWaSendLoading] = useState('');
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

  // Crop
  const [cropTop, setCropTop] = useState(0);
  const [cropBottom, setCropBottom] = useState(50);
  const [fullPageImage, setFullPageImage] = useState<string | null>(null);
  const [fullPageLoading, setFullPageLoading] = useState(false);
  const cropContainerRef = useRef<HTMLDivElement>(null);
  const cropDragRef = useRef<'top' | 'bottom' | null>(null);
  const cropTopRef = useRef(0);
  const cropBottomRef = useRef(50);

  useEffect(() => {
    if (listSearch !== prevSearchRef.current) {
      prevSearchRef.current = listSearch;
      setPage(1);
    }
  }, [listSearch]);

  useEffect(() => {
    loadData();
    api.get('/whatsapp/status').then(r => setWaConnected(r.data.data.status === 'connected')).catch(() => {});
  }, [page, listSearch]);

  useEffect(() => {
    if (showUploadModal && students.length === 0) {
      api.get('/students?limit=2000').then(r => setStudents(r.data.data.students)).catch(() => {});
    }
  }, [showUploadModal]);

  const loadData = async () => {
    setLoading(true);
    try {
      const isSearch = !!listSearch.trim();
      const searchParam = isSearch
        ? `&search=${encodeURIComponent(listSearch.trim())}&limit=1000`
        : `&limit=20&page=${page}`;
      const recordsRes = await api.get(`/absenteeism?${searchParam}`);
      setRecords(recordsRes.data.data.records);
      if (isSearch) setPagination(null);
      else setPagination(recordsRes.data.data.pagination);
    } catch (error) {
      console.error('Load error:', error);
    } finally {
      setLoading(false);
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
      await api.post('/absenteeism', formData, { headers: { 'Content-Type': 'multipart/form-data' }});
      setShowUploadModal(false);
      resetUploadForm();
      loadData();
    } catch (err: any) {
      setUploadError(err.response?.data?.message || 'Yükleme başarısız.');
    } finally {
      setUploadLoading(false);
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
    
    setCropTop(0); setCropBottom(50);
    cropTopRef.current = 0; cropBottomRef.current = 50;
    setFullPageImage(null);
    
    try {
      setWaPreviewLoading(true);
      const res = await api.post(`/whatsapp/preview/absenteeism/${record.id}`, {
        excusedDays: record.excusedDays != null ? record.excusedDays : '',
        unexcusedDays: record.unexcusedDays != null ? record.unexcusedDays : '',
      });
      setWaPreviewData(res.data.data);
      setWaSelectedParents(new Set((res.data.data.messages as { phone: string }[]).map((m) => m.phone)));
      
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
    const recordId = waRecord.id;
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
      
      if (results.some(r => r.ok)) {
        setRecords(prev => prev.map(rec => rec.id === recordId ? { ...rec, waSentAt: new Date().toISOString() } : rec));
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
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const unsent = records.filter(r => !r.waSentAt);
  const sent = records.filter(r => r.waSentAt);

  return (
    <div className="space-y-6">
      
      {/* 1. Page Header */}
      <PageHeader
        title="Devamsızlık Mektubu Gönderimi"
        description="Öğrenci devamsızlık mektuplarını PDF olarak yükleyin ve WhatsApp üzerinden velilere otomatik gönderin."
        icon={<Mail size={28} className="text-indigo-600" />}
        actions={
          <button onClick={() => { resetUploadForm(); setShowUploadModal(true); }} className="btn btn-primary flex items-center gap-2">
            <Plus size={16} /> Mektup Yükle
          </button>
        }
      />

      {/* 2. Main Content */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        
        {/* Search */}
        <div className="p-4 border-b border-gray-100 bg-gray-50/50">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Öğrenci ara (ad, numara, sınıf)..."
              value={listSearch}
              onChange={e => setListSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
            />
          </div>
        </div>

        {/* Data List (Custom Grouping Table) */}
        {loading ? (
          <div className="p-12 text-center text-gray-500 animate-pulse font-medium">Kayıtlar Yükleniyor...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase text-left tracking-wider">Öğrenci</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase text-left tracking-wider">Sınıf</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase text-center tracking-wider">Uyarı No</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase text-left tracking-wider">Durum</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase text-left tracking-wider">Tarih</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase text-right tracking-wider">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                
                {records.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500 text-sm">
                      {listSearch ? 'Arama sonucu bulunamadı.' : 'Henüz devamsızlık mektubu yüklenmemiş.'}
                    </td>
                  </tr>
                ) : (
                  <>
                    {unsent.length > 0 && (
                      <>
                        <tr>
                          <td colSpan={6} className="px-6 py-2 bg-amber-50/50 border-y border-amber-100 text-amber-800 text-xs font-bold uppercase tracking-wider">
                            📨 Gönderilmeyi Bekleyenler ({unsent.length})
                          </td>
                        </tr>
                        {unsent.map(r => (
                          <RecordRow 
                            key={r.id} 
                            r={r} 
                            waConnected={waConnected} 
                            waSendLoading={waSendLoading} 
                            formatDate={formatDate}
                            onPreview={() => handleWaPreviewOpen(r)}
                            onDelete={() => handleDelete(r.id)}
                            onViewPDF={async () => {
                              try {
                                const response = await api.get(`/absenteeism/${r.id}/pdf`, { responseType: 'blob' });
                                const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
                                const a = document.createElement('a'); a.href = url; a.target = '_blank'; document.body.appendChild(a); a.click(); document.body.removeChild(a);
                              } catch (err) { alert('Mektup açılamadı.'); }
                            }}
                          />
                        ))}
                      </>
                    )}
                    {sent.length > 0 && (
                      <>
                        <tr>
                          <td colSpan={6} className="px-6 py-2 bg-green-50/50 border-y border-green-100 text-green-800 text-xs font-bold uppercase tracking-wider mt-4">
                            ✅ Başarıyla Gönderilenler ({sent.length})
                          </td>
                        </tr>
                        {sent.map(r => (
                          <RecordRow 
                            key={r.id} 
                            r={r} 
                            waConnected={waConnected} 
                            waSendLoading={waSendLoading} 
                            formatDate={formatDate}
                            onPreview={() => handleWaPreviewOpen(r)}
                            onDelete={() => handleDelete(r.id)}
                            onViewPDF={async () => {
                              try {
                                const response = await api.get(`/absenteeism/${r.id}/pdf`, { responseType: 'blob' });
                                printPdfBlob(new Blob([response.data], { type: 'application/pdf' }));
                              } catch (err) { alert('Mektup açılamadı.'); }
                            }}
                          />
                        ))}
                      </>
                    )}
                  </>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="p-4 border-t border-gray-100 flex items-center justify-center gap-3">
            <button disabled={page === 1} onClick={() => setPage(page - 1)} className="px-4 py-2 border rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition">Geri</button>
            <span className="text-sm text-gray-600 font-medium">Sayfa {page} / {pagination.totalPages}</span>
            <button disabled={page === pagination.totalPages} onClick={() => setPage(page + 1)} className="px-4 py-2 border rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition">İleri</button>
          </div>
        )}
      </div>

      {/* ─── MODALS ─── */}

      {/* 1. Upload Modal */}
      <ActionModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        title="Yeni Devamsızlık Mektubu Yükle"
        onSubmit={handleUpload}
        submitText="Yükle ve Kaydet"
      >
        <div className="space-y-5">
          {uploadError && <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm border border-red-100 flex items-center gap-2"><ShieldAlert size={16}/> {uploadError}</div>}
          
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">Öğrenci</label>
            <input
              ref={searchInputRef}
              type="text"
              value={studentSearch}
              onChange={(e) => { setStudentSearch(e.target.value); setShowStudentDropdown(true); if (!e.target.value) setSelectedStudentId(''); }}
              onFocus={() => setShowStudentDropdown(true)}
              placeholder="Öğrenci adı veya numarası..."
              className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
              required={!selectedStudentId}
            />
            {showStudentDropdown && studentSearch.length > 0 && (
              <div className="absolute top-full left-0 right-0 max-h-48 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg z-10 mt-1">
                {students
                  .filter((s) => s.fullName.toLocaleLowerCase('tr-TR').includes(studentSearch.toLocaleLowerCase('tr-TR')) || s.schoolNumber.includes(studentSearch))
                  .map((s) => (
                    <div
                      key={s.id}
                      onClick={() => {
                        setSelectedStudentId(s.id);
                        setStudentSearch(`${s.fullName} (${s.schoolNumber}) - ${s.className}`);
                        setShowStudentDropdown(false);
                        fetchWarningCount(s.id);
                      }}
                      className="px-4 py-2 text-sm hover:bg-indigo-50 cursor-pointer border-b border-gray-50 last:border-0 transition"
                    >
                      <strong className="text-gray-900">{s.fullName}</strong>
                      <span className="text-gray-500 ml-2">{s.schoolNumber} — {s.className}</span>
                    </div>
                  ))}
              </div>
            )}
            {selectedStudentId && <p className="text-xs text-green-600 font-medium mt-1">✓ Öğrenci seçildi</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Uyarı Numarası</label>
            {warningLoading ? (
              <div className="text-sm text-gray-500 animate-pulse">Önerilen uyarı no hesaplanıyor...</div>
            ) : (
              <div>
                <div className="flex gap-2">
                  {[1,2,3,4,5].map(n => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setWarningNumber(n)}
                      className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition ${
                        warningNumber === n ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {n}. Uyarı
                    </button>
                  ))}
                </div>
                {selectedStudentId && (
                  <p className="text-xs text-gray-500 mt-2">Sistem önerisi: <strong>{warningNumber}. uyarı</strong> (daha önce {warningNumber - 1} mektup yüklenmiş)</p>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mektup Dosyası</label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:bg-gray-50 transition cursor-pointer" onClick={() => document.getElementById('pdfUpload')?.click()}>
              <FileText className="mx-auto text-gray-400 mb-2" size={24} />
              <span className="text-sm text-gray-600 font-medium">{pdfFile ? pdfFile.name : 'PDF veya Fotoğraf seçmek için tıklayın'}</span>
              <input id="pdfUpload" type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={e => setPdfFile(e.target.files?.[0] || null)} />
            </div>
          </div>

          <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg bg-gray-50 cursor-pointer">
            <input type="checkbox" checked={isBep} onChange={e => setIsBep(e.target.checked)} className="mt-1 w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500" />
            <div>
              <p className="text-sm font-semibold text-gray-800">BEP Öğrencisi</p>
              <p className="text-xs text-gray-500 mt-0.5">Öğrencinin Bireysel Eğitim Planı varsa seçin. BEP öğrencilerinin devamsızlık hakkı farklı hesaplanır.</p>
            </div>
          </label>
        </div>
      </ActionModal>

      {/* 2. WhatsApp Preview Modal */}
      <ActionModal
        isOpen={showWaModal}
        onClose={() => setShowWaModal(false)}
        title="WhatsApp Mesaj Önizleme"
        submitText={waSendLoading ? 'Gönderiliyor...' : 'Gönder'}
        onSubmit={async (e) => { e.preventDefault(); await handleWaSend(); }}
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
                <div className="text-indigo-700 text-xs mt-0.5">{waRecord.warningNumber}. Devamsızlık Uyarısı</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Özürlü Devamsızlık (Gün)</label>
                <input type="number" min="0" step="0.5" value={waExcusedDays} onChange={e => setWaExcusedDays(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm" placeholder="Örn: 2.5" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Özürsüz Devamsızlık (Gün)</label>
                <input type="number" min="0" step="0.5" value={waUnexcusedDays} onChange={e => setWaUnexcusedDays(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm" placeholder="Örn: 4" />
              </div>
            </div>
            
            <div className="flex justify-end">
              <button type="button" onClick={handleWaPreviewRefresh} disabled={waPreviewLoading} className="px-4 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition disabled:opacity-50 flex items-center gap-2">
                🔄 Metni Güncelle
              </button>
            </div>

            {waPreviewError && <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm border border-red-100"><ShieldAlert size={16} className="inline mr-2"/> {waPreviewError}</div>}
            {waPreviewLoading && !waPreviewData && <div className="p-8 text-center text-gray-500 animate-pulse font-medium">Önizleme Oluşturuluyor...</div>}

            {waPreviewData && (
              <div className="border-t pt-4">
                
                {waPreviewData.hasPreviewImage && (
                  <div className="mb-6">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="text-sm font-semibold text-gray-800">📸 Belge Kırpma (PDF'den dönüştürülen resim)</h4>
                      <span className="text-xs text-gray-500">Mavi çubukları sürükleyin</span>
                    </div>
                    {fullPageLoading ? (
                      <div className="h-48 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-center animate-pulse text-gray-400">PDF Görseli Yükleniyor...</div>
                    ) : (
                      fullPageImage && (
                        <div ref={cropContainerRef} className="relative rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
                          <img src={`data:image/jpeg;base64,${fullPageImage}`} alt="PDF" className="w-full h-auto max-h-[300px] object-contain block select-none pointer-events-none" />
                          <div className="absolute top-0 left-0 right-0 bg-black/60 pointer-events-none" style={{ height: `${cropTop}%` }} />
                          <div className="absolute left-0 right-0 bottom-0 bg-black/60 pointer-events-none" style={{ top: `${cropBottom}%` }} />
                          <div className="absolute left-0 right-0 border-2 border-indigo-500 pointer-events-none" style={{ top: `${cropTop}%`, height: `${cropBottom - cropTop}%` }} />
                          
                          <div onMouseDown={handleCropMouseDown('top')} className="absolute left-0 right-0 h-1.5 bg-indigo-500 cursor-ns-resize z-10 flex items-center justify-center hover:h-2 transition-all" style={{ top: `calc(${cropTop}% - 3px)` }}>
                            <div className="bg-indigo-600 text-white text-[9px] px-2 py-0.5 rounded shadow pointer-events-none mb-4">Üst Sınır</div>
                          </div>
                          
                          <div onMouseDown={handleCropMouseDown('bottom')} className="absolute left-0 right-0 h-1.5 bg-indigo-500 cursor-ns-resize z-10 flex items-center justify-center hover:h-2 transition-all" style={{ top: `calc(${cropBottom}% - 3px)` }}>
                            <div className="bg-indigo-600 text-white text-[9px] px-2 py-0.5 rounded shadow pointer-events-none mt-4">Alt Sınır</div>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                )}

                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-sm font-semibold text-gray-800 flex items-center gap-2"><Smartphone size={16}/> Gönderilecek Veliler ve Mesaj</h4>
                  {waPreviewData.messages.length > 1 && (
                    <div className="text-xs">
                      <button type="button" onClick={() => setWaSelectedParents(new Set(waPreviewData.messages.map(m => m.phone)))} className="text-indigo-600 font-medium hover:underline mr-3">Tümünü Seç</button>
                      <button type="button" onClick={() => setWaSelectedParents(new Set())} className="text-red-600 font-medium hover:underline">Temizle</button>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  {waPreviewData.messages.map((m, i) => (
                    <div key={i} className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
                      <label className="flex items-center gap-3 p-3 bg-white border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition">
                        <input
                          type="checkbox"
                          checked={waSelectedParents.has(m.phone)}
                          onChange={(e) => {
                            setWaSelectedParents(prev => {
                              const next = new Set(prev);
                              if (e.target.checked) next.add(m.phone); else next.delete(m.phone);
                              return next;
                            });
                          }}
                          className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500 cursor-pointer"
                        />
                        <div>
                          <p className="text-sm font-semibold text-gray-800">{m.parent}</p>
                          <p className="text-xs text-gray-500">{m.phone}</p>
                        </div>
                      </label>
                      <div className="p-3 bg-[#e6f4ea]/30">
                        <pre className="text-[13px] font-sans text-gray-700 whitespace-pre-wrap break-words m-0">{m.message}</pre>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </ActionModal>
      
      {confirmModal}
    </div>
  );
}

// ─── Yardımcı Bileşenler ─── //

const RecordRow = ({ r, waConnected, waSendLoading, formatDate, onPreview, onDelete, onViewPDF }: any) => {
  return (
    <tr className="hover:bg-gray-50/50 transition">
      <td className="px-6 py-4">
        <div className="font-bold text-gray-900 flex items-center gap-2">
          {r.student.fullName}
          {r.isBep && <span className="bg-purple-100 text-purple-700 text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">BEP</span>}
        </div>
        <div className="text-xs text-gray-500 font-medium">{r.student.schoolNumber}</div>
      </td>
      <td className="px-6 py-4 text-sm font-medium text-gray-700">{r.student.className}</td>
      <td className="px-6 py-4 text-center">
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border
          ${r.warningNumber === 1 ? 'bg-amber-50 text-amber-700 border-amber-200' : 
            r.warningNumber === 2 ? 'bg-orange-50 text-orange-700 border-orange-200' : 
            'bg-red-50 text-red-700 border-red-200'}
        `}>
          {r.warningNumber}. Uyarı
        </span>
      </td>
      <td className="px-6 py-4">
        {r.waSentAt ? (
          <StatusBadge status="ACTIVE" customText="Gönderildi" />
        ) : (
          <StatusBadge status="PENDING" customText="Gönderilmedi" />
        )}
      </td>
      <td className="px-6 py-4 text-xs text-gray-500 font-medium">
        {formatDate(r.createdAt)}
      </td>
      <td className="px-6 py-4 text-right">
        <div className="flex justify-end gap-2">
          {waConnected && (
            <button 
              onClick={onPreview}
              disabled={waSendLoading === r.id || !!r.waSentAt}
              className={`p-1.5 rounded transition-colors flex items-center gap-1.5 text-xs font-semibold
                ${r.waSentAt 
                  ? 'bg-green-50 text-green-700 opacity-75 cursor-not-allowed border border-green-200' 
                  : 'bg-green-100 text-green-700 hover:bg-green-200 border border-green-200 shadow-sm'}
              `}
              title="Veliye Gönder"
            >
              {waSendLoading === r.id ? <div className="w-4 h-4 border-2 border-green-700 border-t-transparent rounded-full animate-spin"/> : <Smartphone size={14}/>}
              {!r.waSentAt && 'Gönder'}
            </button>
          )}
          <button onClick={onViewPDF} className="p-1.5 text-gray-600 bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded shadow-sm transition" title="Mektubu PDF olarak aç">
            <FileText size={16}/>
          </button>
          <button onClick={onDelete} className="p-1.5 text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded shadow-sm transition" title="Kaydı Sil">
            <Trash2 size={16}/>
          </button>
        </div>
      </td>
    </tr>
  );
};
