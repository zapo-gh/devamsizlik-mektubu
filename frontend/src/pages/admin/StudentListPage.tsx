import React, { useState, useEffect, useRef, FormEvent } from 'react';
import api from '../../services/api';
import { useConfirm } from '../../hooks/useConfirm';
import { PageHeader } from '../../components/ui/PageHeader';
import { DataTable, Column } from '../../components/ui/DataTable';
import { ActionModal } from '../../components/ui/ActionModal';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Users, Upload, FileSpreadsheet, Trash2, Plus, Edit2, ShieldAlert } from 'lucide-react';

interface Student {
  id: string;
  schoolNumber: string;
  fullName: string;
  className: string;
  status: string;
  parents: { id: string; fullName: string; phone: string; waConsentStatus: string }[];
  _count: { absenteeisms: number };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface ParsedStudent {
  schoolNumber: string;
  fullName: string;
  className: string;
}

interface ImportResult {
  totalParsed: number;
  created: number;
  skipped: number;
  errors: string[];
  students: ParsedStudent[];
}

interface ParentPreviewRow {
  schoolNumber: string;
  studentName: string;
  className: string;
  matched: boolean;
  parent1Name: string;
  parent1Phone: string;
  parent2Name: string;
  parent2Phone: string;
}

interface ParentImportResult {
  totalParsed: number;
  matched: number;
  unmatched: number;
  parentsCreated: number;
  parentsUpdated: number;
  errors: string[];
  preview: ParentPreviewRow[];
}

export default function StudentListPage() {
  const { confirm, alert, confirmModal } = useConfirm();
  const [students, setStudents] = useState<Student[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  // Excel import state
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<ImportResult | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState('');
  const [importDone, setImportDone] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Parent import state
  const [showParentModal, setShowParentModal] = useState(false);
  const [parentFile, setParentFile] = useState<File | null>(null);
  const [parentPreview, setParentPreview] = useState<ParentImportResult | null>(null);
  const [parentLoading, setParentLoading] = useState(false);
  const [parentError, setParentError] = useState('');
  const [parentDone, setParentDone] = useState<ParentImportResult | null>(null);
  const parentFileRef = useRef<HTMLInputElement>(null);

  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editStudent, setEditStudent] = useState<Student | null>(null);
  const [editForm, setEditForm] = useState({ fullName: '', className: '', status: 'ACTIVE', schoolNumber: '' });
  const [editParents, setEditParents] = useState<{ id: string; fullName: string; phone: string }[]>([]);
  const [newEditParent, setNewEditParent] = useState<{ fullName: string; phone: string } | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');

  // New student modal state
  const [showNewModal, setShowNewModal] = useState(false);
  const [newForm, setNewForm] = useState({ schoolNumber: '', fullName: '', className: '' });
  const [newParents, setNewParents] = useState<{ fullName: string; phone: string }[]>([{ fullName: '', phone: '' }]);
  const [newLoading, setNewLoading] = useState(false);
  const [newError, setNewError] = useState('');

  // Tab state
  const [activeClass, setActiveClass] = useState<string>('');

  // Bulk delete state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // Derive sorted class names and grouped data
  const grouped: Record<string, Student[]> = {};
  students.forEach((s) => {
    if (!grouped[s.className]) grouped[s.className] = [];
    grouped[s.className].push(s);
  });

  const sortedClassNames = Object.keys(grouped).sort((a, b) => {
    const parse = (cls: string) => {
      const parts = cls.split(/[/\s-]+/);
      const grade = parseInt(parts[0], 10) || 99;
      const section = (parts[1] || '').toUpperCase();
      return { grade, section };
    };
    const pa = parse(a), pb = parse(b);
    if (pa.grade !== pb.grade) return pa.grade - pb.grade;
    return pa.section.localeCompare(pb.section, 'tr');
  });

  const effectiveClass = activeClass && grouped[activeClass] ? activeClass : sortedClassNames[0] || '';
  const filteredStudents = (grouped[effectiveClass] || []).sort((a, b) =>
    a.schoolNumber.localeCompare(b.schoolNumber, undefined, { numeric: true })
  );

  useEffect(() => {
    loadStudents();
  }, [page, search]);

  const loadStudents = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: '500' });
      if (search) params.set('search', search);

      const res = await api.get(`/students?${params}`);
      setStudents(res.data.data.students);
      setPagination(res.data.data.pagination);
    } catch (error) {
      console.error('Failed to load students:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!await confirm(`${name} adlı öğrenciyi silmek istediğinize emin misiniz?`)) return;
    try {
      await api.delete(`/students/${id}`);
      loadStudents();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Öğrenci silinemedi.');
    }
  };

  const handleSendConsent = async (parentId: string) => {
    try {
      await api.post('/whatsapp/send-consent', { parentId });
      await alert('Onay isteği veliye WhatsApp üzerinden gönderildi.');
      loadStudents();
    } catch (err: any) {
      await alert(err.response?.data?.message || 'Onay isteği gönderilemedi.');
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    const allIds = filteredStudents.map((s) => s.id);
    const allSelected = allIds.length > 0 && allIds.every((id) => selectedIds.has(id));
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allIds));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!await confirm(`Seçili ${selectedIds.size} öğrenciyi silmek istediğinize emin misiniz?`)) return;

    setBulkDeleting(true);
    try {
      await api.post('/students/bulk-delete', { ids: Array.from(selectedIds) });
      setSelectedIds(new Set());
      loadStudents();
    } catch (error) {
      console.error('Bulk delete failed:', error);
      await alert('Toplu silme başarısız oldu.');
    } finally {
      setBulkDeleting(false);
    }
  };

  const resetImportModal = () => {
    setImportFile(null);
    setImportPreview(null);
    setImportError('');
    setImportDone(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileSelect = async (file: File) => {
    setImportFile(file);
    setImportError('');
    setImportDone(null);
    setImportLoading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/students/import-excel?mode=preview', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setImportPreview(res.data.data);
    } catch (err: any) {
      setImportError(err?.response?.data?.message || 'Excel dosyası okunamadı.');
      setImportPreview(null);
    } finally {
      setImportLoading(false);
    }
  };

  const handleImportConfirm = async () => {
    if (!importFile) return;
    setImportLoading(true);
    setImportError('');

    try {
      const formData = new FormData();
      formData.append('file', importFile);
      const res = await api.post('/students/import-excel?mode=import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setImportDone(res.data.data);
      setImportPreview(null);
      loadStudents();
    } catch (err: any) {
      setImportError(err?.response?.data?.message || 'İçe aktarma başarısız.');
    } finally {
      setImportLoading(false);
    }
  };

  const resetParentModal = () => {
    setParentFile(null);
    setParentPreview(null);
    setParentError('');
    setParentDone(null);
    if (parentFileRef.current) parentFileRef.current.value = '';
  };

  const handleParentFileSelect = async (file: File) => {
    setParentFile(file);
    setParentError('');
    setParentDone(null);
    setParentLoading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/students/import-parents?mode=preview', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setParentPreview(res.data.data);
    } catch (err: any) {
      setParentError(err?.response?.data?.message || 'Excel dosyası okunamadı.');
      setParentPreview(null);
    } finally {
      setParentLoading(false);
    }
  };

  const handleParentImportConfirm = async () => {
    if (!parentFile) return;
    setParentLoading(true);
    setParentError('');

    try {
      const formData = new FormData();
      formData.append('file', parentFile);
      const res = await api.post('/students/import-parents?mode=import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setParentDone(res.data.data);
      setParentPreview(null);
      loadStudents();
    } catch (err: any) {
      setParentError(err?.response?.data?.message || 'İçe aktarma başarısız.');
    } finally {
      setParentLoading(false);
    }
  };

  const openEditModal = (student: Student) => {
    setEditStudent(student);
    setEditForm({
      fullName: student.fullName,
      className: student.className,
      status: student.status,
      schoolNumber: student.schoolNumber,
    });
    setEditParents(student.parents.map((p) => ({ ...p })));
    setNewEditParent(null);
    setEditError('');
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editStudent) return;
    setEditLoading(true);
    setEditError('');

    try {
      await api.put(`/students/${editStudent.id}`, {
        fullName: editForm.fullName,
        className: editForm.className,
        status: editForm.status,
      });

      for (const p of editParents) {
        if (p.id) {
          await api.put(`/students/parents/${p.id}`, {
            fullName: p.fullName,
            phone: p.phone,
          });
        }
      }

      if (newEditParent && newEditParent.fullName.trim() && newEditParent.phone.trim()) {
        const response = await api.post(`/students/${editStudent.id}/parents`, {
          fullName: newEditParent.fullName.trim(),
          phone: newEditParent.phone.trim(),
        });

        if (response.data?.data?.generatedPassword) {
          alert(`✅ Yeni veli hesabı oluşturuldu.\n\nGeçici Şifre: ${response.data.data.generatedPassword}\n\nLütfen bu şifreyi veliye iletin. Veli ilk girişinde şifresini değiştirmek zorundadır.`);
        } else if (response.data?.data?.isExistingUser) {
          alert(`ℹ️ Bu telefon numarası zaten sistemde kayıtlı.\n\nVeli mevcut hesabıyla bağlandı. Şifre değiştirilmedi.`);
        }
      }

      setShowEditModal(false);
      loadStudents();
    } catch (err: any) {
      setEditError(err?.response?.data?.message || 'Güncelleme başarısız.');
    } finally {
      setEditLoading(false);
    }
  };

  const handleRemoveParent = async (parentId: string) => {
    if (!editStudent) return;
    if (!await confirm('Bu veliyi öğrenciden kaldırmak istediğinize emin misiniz?')) return;

    try {
      await api.delete(`/students/${editStudent.id}/parents/${parentId}`);
      setEditParents((prev) => prev.filter((p) => p.id !== parentId));
    } catch (err: any) {
      setEditError(err?.response?.data?.message || 'Veli kaldırma başarısız.');
    }
  };

  const columns: Column<Student>[] = [
    {
      header: (
        <input
          type="checkbox"
          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          checked={filteredStudents.length > 0 && filteredStudents.every((s) => selectedIds.has(s.id))}
          onChange={toggleSelectAll}
          title="Tümünü seç/kaldır"
        />
      ),
      align: 'center',
      render: (s) => (
        <input
          type="checkbox"
          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          checked={selectedIds.has(s.id)}
          onChange={() => toggleSelect(s.id)}
        />
      )
    },
    {
      header: 'Okul No',
      render: (s) => <span className="font-semibold text-gray-700">{s.schoolNumber}</span>
    },
    {
      header: 'Ad Soyad',
      render: (s) => <span className="font-bold text-gray-900">{s.fullName}</span>
    },
    {
      header: 'Durum',
      render: (s) => <StatusBadge status={s.status} />
    },
    {
      header: 'Veli Bilgileri',
      render: (s) => (
        <div className="space-y-2">
          {s.parents.length > 0 ? (
            s.parents.map((p, pi) => (
              <div key={pi} className="text-sm border-b border-gray-50 pb-1 last:border-0 last:pb-0">
                <div>
                  <span className="font-medium text-gray-800">{p.fullName}</span>
                  {p.phone && <span className="text-gray-500 ml-2">{p.phone}</span>}
                </div>
                <div className="mt-1 flex items-center gap-2">
                  {p.waConsentStatus === 'ACCEPTED' && <StatusBadge status="ACTIVE" customText="Onaylı" />}
                  {p.waConsentStatus === 'DECLINED' && <StatusBadge status="REJECTED" customText="Reddedildi" />}
                  {p.waConsentStatus === 'PENDING' && (
                    <>
                      <StatusBadge status="PENDING" customText="Bekliyor" />
                      <button 
                        onClick={() => handleSendConsent(p.id)}
                        className="text-xs px-2 py-0.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition"
                      >
                        Onay İste
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))
          ) : (
            <span className="text-gray-400">-</span>
          )}
        </div>
      )
    },
    {
      header: 'İşlemler',
      align: 'right',
      render: (s) => (
        <div className="flex justify-end gap-2">
          <button 
            onClick={() => openEditModal(s)}
            className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
            title="Düzenle"
          >
            <Edit2 size={16} />
          </button>
          <button 
            onClick={() => handleDelete(s.id, s.fullName)}
            className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
            title="Sil"
          >
            <Trash2 size={16} />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      
      {/* 1. Page Header */}
      <PageHeader
        title="Öğrenciler"
        description="Öğrenci listesini yönetin ve veli bilgilerini güncelleyin"
        icon={<Users size={28} className="text-indigo-600" />}
        actions={
          <>
            <button 
              onClick={() => { resetParentModal(); setShowParentModal(true); }}
              className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 font-medium text-sm flex items-center gap-2 transition"
            >
              <Users size={16} /> Veli Bilgisi Aktar
            </button>
            <button 
              onClick={() => { resetImportModal(); setShowImportModal(true); }}
              className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 font-medium text-sm flex items-center gap-2 transition"
            >
              <FileSpreadsheet size={16} /> Excel'den Aktar
            </button>
            <button 
              onClick={() => { setNewForm({ schoolNumber: '', fullName: '', className: '' }); setNewParents([{ fullName: '', phone: '' }]); setNewError(''); setShowNewModal(true); }}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium text-sm flex items-center gap-2 shadow-sm transition"
            >
              <Plus size={16} /> Yeni Öğrenci
            </button>
          </>
        }
      />

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Search & Tabs */}
        <div className="p-4 border-b border-gray-100 bg-gray-50/50">
          <div className="max-w-md mb-4">
            <input
              type="text"
              placeholder="Öğrenci ara (ad, numara, sınıf)..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
            />
          </div>

          {!loading && sortedClassNames.length > 0 && (
            <div className="flex flex-wrap gap-2 overflow-x-auto pb-2">
              {sortedClassNames.map((cls) => (
                <button
                  key={cls}
                  onClick={() => { setActiveClass(cls); setSelectedIds(new Set()); }}
                  className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors shrink-0 ${
                    effectiveClass === cls 
                      ? 'bg-indigo-600 text-white shadow-sm' 
                      : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {cls}
                  <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${effectiveClass === cls ? 'bg-indigo-700/50 text-indigo-50' : 'bg-gray-100 text-gray-500'}`}>
                    {grouped[cls].length}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Action Bar (Delete / Summary) */}
        {!loading && sortedClassNames.length > 0 && (
          <div className="flex justify-between items-center px-6 py-3 bg-indigo-50/50 border-b border-indigo-100/50 text-sm">
            <div className="font-medium text-gray-700">
              <span className="text-indigo-700 font-bold mr-2">Sınıf {effectiveClass}</span> 
              ({filteredStudents.length} öğrenci)
              
              {selectedIds.size > 0 && (
                <span className="ml-3 text-indigo-600 font-bold">
                  {selectedIds.size} Seçili
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-4">
              {selectedIds.size > 0 && (
                <button 
                  onClick={handleBulkDelete}
                  disabled={bulkDeleting}
                  className="px-3 py-1.5 bg-white border border-red-200 text-red-600 hover:bg-red-50 rounded flex items-center gap-1 font-medium transition disabled:opacity-50"
                >
                  {bulkDeleting ? 'Siliniyor...' : <><Trash2 size={14}/> {selectedIds.size} Öğrenciyi Sil</>}
                </button>
              )}
              <span className="text-gray-500">Toplam {students.length} Kayıt</span>
            </div>
          </div>
        )}

        {/* Data Table */}
        <DataTable
          data={filteredStudents}
          columns={columns}
          loading={loading}
          emptyMessage="Bu sınıfta öğrenci bulunamadı veya hiç öğrenci kaydı yok."
          rowClassName={(s) => selectedIds.has(s.id) ? 'bg-indigo-50/30' : ''}
        />

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="p-4 border-t border-gray-100 flex items-center justify-center gap-3">
            <button 
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
              className="px-4 py-2 border rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Geri
            </button>
            <span className="text-sm text-gray-600 font-medium">Sayfa {page} / {pagination.totalPages}</span>
            <button 
              disabled={page === pagination.totalPages}
              onClick={() => setPage(page + 1)}
              className="px-4 py-2 border rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              İleri
            </button>
          </div>
        )}
      </div>

      {/* ─── MODALS ─── */}

      {/* New Student Modal */}
      <ActionModal
        isOpen={showNewModal}
        onClose={() => setShowNewModal(false)}
        title="Yeni Öğrenci Ekle"
        submitText="Öğrenciyi Kaydet"
        onSubmit={async (e) => {
          e.preventDefault();
          setNewLoading(true);
          setNewError('');
          try {
            const validParents = newParents.filter(p => p.fullName.trim() && p.phone.trim());
            await api.post('/students', {
              schoolNumber: newForm.schoolNumber,
              fullName: newForm.fullName,
              className: newForm.className,
              ...(validParents.length > 0 ? { parents: validParents } : {}),
            });
            setShowNewModal(false);
            loadStudents();
          } catch (err: any) {
            setNewError(err?.response?.data?.message || 'Öğrenci eklenemedi.');
          } finally {
            setNewLoading(false);
          }
        }}
      >
        <div className="space-y-4">
          {newError && <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm border border-red-100 flex items-center gap-2"><ShieldAlert size={16}/> {newError}</div>}
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Okul Numarası</label>
            <input type="text" value={newForm.schoolNumber} onChange={e => setNewForm({...newForm, schoolNumber: e.target.value})} className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" required autoFocus />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ad Soyad</label>
              <input type="text" value={newForm.fullName} onChange={e => setNewForm({...newForm, fullName: e.target.value})} className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sınıf</label>
              <input type="text" value={newForm.className} onChange={e => setNewForm({...newForm, className: e.target.value})} className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" required placeholder="ör: 9/A" />
            </div>
          </div>

          <div className="mt-6 border-t pt-4">
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-semibold text-gray-800">Veli Bilgileri</h4>
              {newParents.length < 2 && (
                <button type="button" onClick={() => setNewParents([...newParents, { fullName: '', phone: '' }])} className="text-sm text-indigo-600 font-medium hover:text-indigo-700">+ Veli Ekle</button>
              )}
            </div>
            <p className="text-xs text-gray-500 mb-4">Telefon numarası ile veli hesabı otomatik oluşturulacaktır.</p>

            {newParents.map((p, idx) => (
              <div key={idx} className="flex items-end gap-3 p-3 bg-white border rounded-lg mb-3 shadow-sm">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-700 mb-1">{idx+1}. Veli Adı</label>
                  <input type="text" value={p.fullName} onChange={e => { const up = [...newParents]; up[idx].fullName = e.target.value; setNewParents(up); }} className="w-full p-2 border border-gray-300 rounded-md text-sm" placeholder="Ad Soyad" />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Telefon</label>
                  <input type="text" value={p.phone} onChange={e => { const up = [...newParents]; up[idx].phone = e.target.value; setNewParents(up); }} className="w-full p-2 border border-gray-300 rounded-md text-sm" placeholder="05XX XXX XX XX" />
                </div>
                {newParents.length > 1 && (
                  <button type="button" onClick={() => setNewParents(newParents.filter((_, i) => i !== idx))} className="p-2 text-red-500 hover:bg-red-50 rounded-md border border-red-100 shrink-0"><Trash2 size={16}/></button>
                )}
              </div>
            ))}
          </div>
        </div>
      </ActionModal>

      {/* Edit Student Modal */}
      <ActionModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Öğrenciyi Düzenle"
        onSubmit={handleEditSubmit}
      >
        <div className="space-y-4">
          {editError && <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm border border-red-100 flex items-center gap-2"><ShieldAlert size={16}/> {editError}</div>}
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Okul Numarası</label>
            <input type="text" value={editForm.schoolNumber} disabled className="w-full p-2 border border-gray-200 bg-gray-50 text-gray-500 rounded-lg" />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ad Soyad</label>
              <input type="text" value={editForm.fullName} onChange={e => setEditForm({...editForm, fullName: e.target.value})} className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sınıf</label>
              <input type="text" value={editForm.className} onChange={e => setEditForm({...editForm, className: e.target.value})} className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" required />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Durum</label>
            <select value={editForm.status} onChange={e => setEditForm({...editForm, status: e.target.value})} className="w-full p-2 border border-gray-300 rounded-lg">
              <option value="ACTIVE">Aktif</option>
              <option value="INACTIVE">Pasif</option>
            </select>
          </div>

          <div className="mt-6 border-t pt-4">
            <h4 className="font-semibold text-gray-800 mb-3">Veli Bilgileri</h4>
            
            {editParents.map((p, idx) => (
              <div key={p.id} className="flex items-end gap-3 p-3 bg-white border rounded-lg mb-3 shadow-sm">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-700 mb-1">{idx+1}. Veli Adı</label>
                  <input type="text" value={p.fullName} onChange={e => { const up = [...editParents]; up[idx].fullName = e.target.value; setEditParents(up); }} className="w-full p-2 border border-gray-300 rounded-md text-sm" />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Telefon</label>
                  <input type="text" value={p.phone} onChange={e => { const up = [...editParents]; up[idx].phone = e.target.value; setEditParents(up); }} className="w-full p-2 border border-gray-300 rounded-md text-sm" />
                </div>
                <button type="button" onClick={() => handleRemoveParent(p.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-md border border-red-100 shrink-0" title="Kaldır"><Trash2 size={16}/></button>
              </div>
            ))}

            {newEditParent ? (
              <div className="flex items-end gap-3 p-3 bg-green-50 border border-green-200 border-dashed rounded-lg mb-3">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-green-800 mb-1">Yeni Veli Adı</label>
                  <input type="text" value={newEditParent.fullName} onChange={e => setNewEditParent({...newEditParent, fullName: e.target.value})} className="w-full p-2 border border-green-300 rounded-md text-sm bg-white" placeholder="Ad Soyad" />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-green-800 mb-1">Telefon</label>
                  <input type="text" value={newEditParent.phone} onChange={e => setNewEditParent({...newEditParent, phone: e.target.value})} className="w-full p-2 border border-green-300 rounded-md text-sm bg-white" placeholder="05XX XXX XX XX" />
                </div>
                <button type="button" onClick={() => setNewEditParent(null)} className="p-2 text-red-500 hover:bg-red-50 rounded-md shrink-0">İptal</button>
              </div>
            ) : (
              <button type="button" onClick={() => setNewEditParent({ fullName: '', phone: '' })} className="text-sm px-3 py-1.5 border border-dashed border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50">+ Yeni Veli Ekle</button>
            )}
          </div>
        </div>
      </ActionModal>

      {/* Excel Import Modal */}
      <ActionModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        title="Excel'den Öğrenci Aktar"
        width="lg"
      >
        <div className="space-y-4">
          {importError && <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm border border-red-100 flex items-center gap-2"><ShieldAlert size={16}/> {importError}</div>}
          
          {!importPreview && !importDone && (
            <div 
              className="border-2 border-dashed border-gray-300 rounded-xl p-10 text-center hover:border-indigo-500 hover:bg-indigo-50 transition cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              {importLoading ? (
                <div className="animate-pulse text-indigo-600 font-medium">Excel Dosyası Okunuyor...</div>
              ) : (
                <>
                  <Upload className="mx-auto text-gray-400 mb-3" size={40} />
                  <p className="font-semibold text-gray-800">Excel dosyasını tıklayarak seçin</p>
                  <p className="text-xs text-gray-500 mt-2">Sadece .xls ve .xlsx formatları desteklenir.</p>
                </>
              )}
            </div>
          )}
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={e => { if(e.target.files?.[0]) handleFileSelect(e.target.files[0]) }} />

          {importPreview && !importDone && (
            <div className="space-y-4">
              <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-100 text-sm text-indigo-800 flex justify-between items-center">
                <span><strong>{importPreview.totalParsed}</strong> öğrenci bulundu.</span>
                <span className="text-xs bg-white px-2 py-1 rounded shadow-sm">{importFile?.name}</span>
              </div>
              
              <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg shadow-inner">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-2 text-left font-semibold text-gray-600">Okul No</th>
                      <th className="px-4 py-2 text-left font-semibold text-gray-600">Ad Soyad</th>
                      <th className="px-4 py-2 text-left font-semibold text-gray-600">Sınıf</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {importPreview.students.map((s, i) => (
                      <tr key={i}>
                        <td className="px-4 py-2">{s.schoolNumber}</td>
                        <td className="px-4 py-2">{s.fullName}</td>
                        <td className="px-4 py-2">{s.className}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button type="button" onClick={resetImportModal} className="px-4 py-2 border rounded-lg text-sm font-medium hover:bg-gray-50">Farklı Dosya Seç</button>
                <button type="button" onClick={handleImportConfirm} disabled={importLoading} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
                  {importLoading ? 'Aktarılıyor...' : `${importPreview.totalParsed} Öğrenciyi Aktar`}
                </button>
              </div>
            </div>
          )}

          {importDone && (
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">✓</div>
              <h3 className="text-xl font-bold text-gray-900 mb-6">Aktarım Tamamlandı</h3>
              
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                  <div className="text-2xl font-bold text-green-600">{importDone.created}</div>
                  <div className="text-xs text-gray-500 font-medium">Yeni Eklenen</div>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                  <div className="text-2xl font-bold text-yellow-600">{importDone.skipped}</div>
                  <div className="text-xs text-gray-500 font-medium">Güncellenen</div>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                  <div className="text-2xl font-bold text-red-600">{importDone.errors.length}</div>
                  <div className="text-xs text-gray-500 font-medium">Hatalı Satır</div>
                </div>
              </div>

              {importDone.errors.length > 0 && (
                <div className="text-left text-xs text-red-600 bg-red-50 p-3 rounded-lg max-h-32 overflow-y-auto mb-6">
                  {importDone.errors.map((e,i) => <div key={i}>{e}</div>)}
                </div>
              )}
              
              <button type="button" onClick={() => setShowImportModal(false)} className="px-6 py-2 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 w-full">Kapat</button>
            </div>
          )}
        </div>
      </ActionModal>

      {/* Parent Import Modal */}
      <ActionModal
        isOpen={showParentModal}
        onClose={() => setShowParentModal(false)}
        title="Veli Bilgisi Aktar (Excel)"
        width="lg"
      >
        <div className="space-y-4">
          {parentError && <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm border border-red-100 flex items-center gap-2"><ShieldAlert size={16}/> {parentError}</div>}
          
          {!parentPreview && !parentDone && (
            <>
              <div className="bg-blue-50 border border-blue-100 p-3 rounded-lg text-xs text-blue-800 mb-2">
                <strong>Desteklenen Sütunlar:</strong> Okul No | Öğr. Ad Soyad | Sınıf/Grup | 1. Veli Telefon | 1. Veli Ad Soyad | 1. Veli Yakınlık | 2. Veli Telefon | 2. Veli Adı
              </div>
              <div 
                className="border-2 border-dashed border-gray-300 rounded-xl p-10 text-center hover:border-indigo-500 hover:bg-indigo-50 transition cursor-pointer"
                onClick={() => parentFileRef.current?.click()}
              >
                {parentLoading ? (
                  <div className="animate-pulse text-indigo-600 font-medium">Excel Dosyası Okunuyor...</div>
                ) : (
                  <>
                    <Upload className="mx-auto text-gray-400 mb-3" size={40} />
                    <p className="font-semibold text-gray-800">Veli Excel dosyasını seçin</p>
                    <p className="text-xs text-gray-500 mt-2">.xls, .xlsx</p>
                  </>
                )}
              </div>
            </>
          )}
          <input ref={parentFileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={e => { if(e.target.files?.[0]) handleParentFileSelect(e.target.files[0]) }} />

          {parentPreview && !parentDone && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2 text-sm">
                <span className="bg-green-100 text-green-800 px-3 py-1.5 rounded-lg font-medium">{parentPreview.matched} Eşleşen</span>
                <span className="bg-yellow-100 text-yellow-800 px-3 py-1.5 rounded-lg font-medium">{parentPreview.unmatched} Bulunamayan</span>
              </div>
              
              <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg shadow-inner">
                <table className="min-w-full divide-y divide-gray-200 text-xs">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold text-gray-600">Öğrenci</th>
                      <th className="px-3 py-2 text-center font-semibold text-gray-600">Durum</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-600">Veli 1</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-600">Veli 2</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {parentPreview.preview.map((r, i) => (
                      <tr key={i} className={r.matched ? '' : 'bg-red-50/50 opacity-60'}>
                        <td className="px-3 py-2 font-medium">{r.schoolNumber} - {r.studentName}</td>
                        <td className="px-3 py-2 text-center">{r.matched ? <span className="text-green-600 font-bold">✓</span> : <span className="text-red-500 font-bold">✕</span>}</td>
                        <td className="px-3 py-2">{r.parent1Name} <br/><span className="text-gray-500">{r.parent1Phone}</span></td>
                        <td className="px-3 py-2">{r.parent2Name} <br/><span className="text-gray-500">{r.parent2Phone}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button type="button" onClick={resetParentModal} className="px-4 py-2 border rounded-lg text-sm font-medium hover:bg-gray-50">Farklı Seç</button>
                <button type="button" onClick={handleParentImportConfirm} disabled={parentLoading || parentPreview.matched === 0} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
                  {parentLoading ? 'Aktarılıyor...' : `${parentPreview.matched} Öğrenci Velisini Aktar`}
                </button>
              </div>
            </div>
          )}

          {parentDone && (
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">✓</div>
              <h3 className="text-xl font-bold text-gray-900 mb-6">Veli Aktarımı Tamamlandı</h3>
              
              <div className="grid grid-cols-4 gap-3 mb-6">
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <div className="text-xl font-bold text-green-600">{parentDone.parentsCreated}</div>
                  <div className="text-xs text-gray-500">Yeni Veli</div>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <div className="text-xl font-bold text-yellow-600">{parentDone.parentsUpdated}</div>
                  <div className="text-xs text-gray-500">Güncellenen</div>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <div className="text-xl font-bold text-indigo-600">{parentDone.matched}</div>
                  <div className="text-xs text-gray-500">Eşleşen</div>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <div className="text-xl font-bold text-red-600">{parentDone.errors.length}</div>
                  <div className="text-xs text-gray-500">Hata</div>
                </div>
              </div>
              
              <button type="button" onClick={() => setShowParentModal(false)} className="px-6 py-2 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 w-full">Kapat</button>
            </div>
          )}
        </div>
      </ActionModal>
      
      {confirmModal}
    </div>
  );
}
