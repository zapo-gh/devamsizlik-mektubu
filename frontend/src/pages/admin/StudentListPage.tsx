import { useState, useEffect, useRef, FormEvent } from 'react';
import api from '../../services/api';

interface Student {
  id: string;
  schoolNumber: string;
  fullName: string;
  className: string;
  status: string;
  parents: { id: string; fullName: string; phone: string }[];
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

  // Auto-select first class when data loads or active becomes invalid
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
    if (!confirm(`"${name}" öğrencisini silmek istediğinize emin misiniz?`)) return;

    try {
      await api.delete(`/students/${id}`);
      loadStudents();
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  // ——— Excel Import Functions ———

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

  // ——— Parent Import Functions ———

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

  // ——— Edit Modal Functions ———

  const openEditModal = (student: Student) => {
    setEditStudent(student);
    setEditForm({
      fullName: student.fullName,
      className: student.className,
      status: student.status,
      schoolNumber: student.schoolNumber,
    });
    setEditParents(student.parents.map((p) => ({ ...p })));
    setEditError('');
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editStudent) return;
    setEditLoading(true);
    setEditError('');

    try {
      // Update student info
      await api.put(`/students/${editStudent.id}`, {
        fullName: editForm.fullName,
        className: editForm.className,
        status: editForm.status,
      });

      // Update each parent
      for (const p of editParents) {
        if (p.id) {
          await api.put(`/students/parents/${p.id}`, {
            fullName: p.fullName,
            phone: p.phone,
          });
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
    if (!confirm('Bu veliyi öğrenciden kaldırmak istediğinize emin misiniz?')) return;

    try {
      await api.delete(`/students/${editStudent.id}/parents/${parentId}`);
      setEditParents((prev) => prev.filter((p) => p.id !== parentId));
    } catch (err: any) {
      setEditError(err?.response?.data?.message || 'Veli kaldırma başarısız.');
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Öğrenciler</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="btn btn-outline"
            onClick={() => { resetParentModal(); setShowParentModal(true); }}
          >
            👨‍👩‍👧 Veli Bilgisi Aktar
          </button>
          <button
            className="btn btn-outline"
            onClick={() => { resetImportModal(); setShowImportModal(true); }}
          >
            📥 Excel'den Aktar
          </button>
          <button
            className="btn btn-primary"
            onClick={() => { setNewForm({ schoolNumber: '', fullName: '', className: '' }); setNewParents([{ fullName: '', phone: '' }]); setNewError(''); setShowNewModal(true); }}
          >
            + Yeni Öğrenci
          </button>
        </div>
      </div>

      <div className="card">
        <div style={{ marginBottom: 16 }}>
          <input
            type="text"
            placeholder="Öğrenci ara (ad, numara, sınıf)..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            style={{ width: '100%', maxWidth: 400, padding: '10px 14px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: 14 }}
          />
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <div className="spinner spinner-dark" />
          </div>
        ) : sortedClassNames.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
            Öğrenci bulunamadı.
          </div>
        ) : (
          <>
            {/* Class Tabs */}
            <div className="class-tabs">
              {sortedClassNames.map((cls) => (
                <button
                  key={cls}
                  className={`class-tab ${effectiveClass === cls ? 'class-tab-active' : ''}`}
                  onClick={() => setActiveClass(cls)}
                >
                  {cls}
                  <span className="class-tab-count">{grouped[cls].length}</span>
                </button>
              ))}
            </div>

            {/* Class Info Bar */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '10px 14px',
              background: '#f8fafc',
              borderRadius: 'var(--radius)',
              marginBottom: 12,
              fontSize: 13,
            }}>
              <span>
                📚 <strong>{effectiveClass}</strong> — {filteredStudents.length} öğrenci
              </span>
              <span style={{ color: 'var(--text-muted)' }}>
                Toplam: {students.length} öğrenci / {sortedClassNames.length} sınıf
              </span>
            </div>

            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Okul No</th>
                    <th>Ad Soyad</th>
                    <th>Durum</th>
                    <th>Veli</th>
                    <th>Devamsızlık</th>
                    <th>İşlemler</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                        Bu sınıfta öğrenci bulunamadı.
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((s) => (
                      <tr key={s.id}>
                        <td>{s.schoolNumber}</td>
                        <td><strong>{s.fullName}</strong></td>
                        <td>
                          <span className={`badge ${s.status === 'ACTIVE' ? 'badge-success' : 'badge-danger'}`}>
                            {s.status === 'ACTIVE' ? 'Aktif' : 'Pasif'}
                          </span>
                        </td>
                        <td>
                          {s.parents.length > 0
                            ? s.parents.map((p, pi) => (
                                <div key={pi} style={{ fontSize: 13, marginBottom: pi < s.parents.length - 1 ? 4 : 0 }}>
                                  <strong>{p.fullName}</strong>
                                  {p.phone && (
                                    <span style={{ color: 'var(--text-muted)', marginLeft: 6 }}>
                                      {p.phone}
                                    </span>
                                  )}
                                </div>
                              ))
                            : <span style={{ color: 'var(--text-muted)' }}>-</span>
                          }
                        </td>
                        <td>{s._count.absenteeisms}</td>
                        <td>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button
                              className="btn btn-outline btn-sm"
                              onClick={() => openEditModal(s)}
                            >
                              Düzenle
                            </button>
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() => handleDelete(s.id, s.fullName)}
                            >
                              Sil
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {pagination && pagination.totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
                <button
                  className="btn btn-outline btn-sm"
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                >
                  ← Önceki
                </button>
                <span style={{ padding: '6px 12px', fontSize: 13 }}>
                  {page} / {pagination.totalPages}
                </span>
                <button
                  className="btn btn-outline btn-sm"
                  disabled={page === pagination.totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  Sonraki →
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ——— Excel Import Modal ——— */}
      {showImportModal && (
        <div className="modal-overlay" onClick={() => setShowImportModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 700 }}>
            <div className="modal-header">
              <h2>📥 Excel'den Öğrenci Aktar</h2>
              <button className="modal-close" onClick={() => setShowImportModal(false)}>×</button>
            </div>

            {importError && <div className="alert alert-danger">{importError}</div>}

            {/* File Selection */}
            {!importPreview && !importDone && (
              <div style={{ padding: '24px 0', textAlign: 'center' }}>
                <div
                  style={{
                    border: '2px dashed var(--border)',
                    borderRadius: 'var(--radius)',
                    padding: '40px 20px',
                    cursor: 'pointer',
                    transition: 'border-color 0.2s',
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--primary)'; }}
                  onDragLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.currentTarget.style.borderColor = 'var(--border)';
                    const file = e.dataTransfer.files[0];
                    if (file) handleFileSelect(file);
                  }}
                >
                  {importLoading ? (
                    <div className="spinner spinner-dark" />
                  ) : (
                    <>
                      <div style={{ fontSize: 48, marginBottom: 12 }}>📄</div>
                      <p style={{ margin: 0, fontWeight: 500 }}>Excel dosyasını sürükleyin veya tıklayarak seçin</p>
                      <p style={{ margin: '8px 0 0', color: 'var(--text-muted)', fontSize: 13 }}>
                        .xlsx veya .xls formatında
                      </p>
                    </>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelect(file);
                  }}
                />
              </div>
            )}

            {/* Preview Table */}
            {importPreview && !importDone && (
              <div>
                <div style={{
                  background: '#f1f5f9',
                  padding: '12px 16px',
                  borderRadius: 'var(--radius)',
                  marginBottom: 16,
                  fontSize: 14,
                }}>
                  <strong>{importPreview.totalParsed}</strong> öğrenci bulundu.
                  {importFile && (
                    <span style={{ color: 'var(--text-muted)', marginLeft: 8 }}>
                      ({importFile.name})
                    </span>
                  )}
                </div>

                <div className="table-container" style={{ maxHeight: 350, overflowY: 'auto' }}>
                  <table>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Okul No</th>
                        <th>Ad Soyad</th>
                        <th>Sınıf</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importPreview.students.map((s, i) => (
                        <tr key={i}>
                          <td>{i + 1}</td>
                          <td>{s.schoolNumber}</td>
                          <td>{s.fullName}</td>
                          <td>{s.className}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end' }}>
                  <button className="btn btn-outline" onClick={resetImportModal}>
                    Farklı Dosya Seç
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={handleImportConfirm}
                    disabled={importLoading}
                  >
                    {importLoading ? (
                      <><span className="spinner" /> Aktarılıyor...</>
                    ) : (
                      `${importPreview.totalParsed} Öğrenciyi Aktar`
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Import Done */}
            {importDone && (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
                <h3 style={{ marginBottom: 16 }}>Aktarım Tamamlandı</h3>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr',
                  gap: 12,
                  marginBottom: 16,
                }}>
                  <div className="card" style={{ padding: 16, textAlign: 'center' }}>
                    <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--success)' }}>{importDone.created}</div>
                    <small style={{ color: 'var(--text-muted)' }}>Yeni Eklenen</small>
                  </div>
                  <div className="card" style={{ padding: 16, textAlign: 'center' }}>
                    <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--warning)' }}>{importDone.skipped}</div>
                    <small style={{ color: 'var(--text-muted)' }}>Güncellenen</small>
                  </div>
                  <div className="card" style={{ padding: 16, textAlign: 'center' }}>
                    <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--danger)' }}>{importDone.errors.length}</div>
                    <small style={{ color: 'var(--text-muted)' }}>Hata</small>
                  </div>
                </div>

                {importDone.errors.length > 0 && (
                  <div className="alert alert-danger" style={{ textAlign: 'left', fontSize: 13, maxHeight: 120, overflowY: 'auto' }}>
                    {importDone.errors.map((e, i) => <div key={i}>{e}</div>)}
                  </div>
                )}

                <button className="btn btn-primary" onClick={() => setShowImportModal(false)}>
                  Kapat
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ——— Parent Import Modal ——— */}
      {showParentModal && (
        <div className="modal-overlay" onClick={() => setShowParentModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 800 }}>
            <div className="modal-header">
              <h2>👨‍👩‍👧 Veli Bilgisi Aktar</h2>
              <button className="modal-close" onClick={() => setShowParentModal(false)}>×</button>
            </div>

            {parentError && <div className="alert alert-danger">{parentError}</div>}

            {/* File Selection */}
            {!parentPreview && !parentDone && (
              <div style={{ padding: '24px 0', textAlign: 'center' }}>
                <p style={{ marginBottom: 16, color: 'var(--text-muted)', fontSize: 13 }}>
                  Excel sütunları: Okul No | Öğr. Ad Soyad | Sınıf/Grup | 1. Veli Telefon | 1. Veli Ad Soyad | 1. Veli Yakınlık | 2. Veli Telefon | 2. Veli Adı
                </p>
                <div
                  style={{
                    border: '2px dashed var(--border)',
                    borderRadius: 'var(--radius)',
                    padding: '40px 20px',
                    cursor: 'pointer',
                    transition: 'border-color 0.2s',
                  }}
                  onClick={() => parentFileRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--primary)'; }}
                  onDragLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.currentTarget.style.borderColor = 'var(--border)';
                    const file = e.dataTransfer.files[0];
                    if (file) handleParentFileSelect(file);
                  }}
                >
                  {parentLoading ? (
                    <div className="spinner spinner-dark" />
                  ) : (
                    <>
                      <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
                      <p style={{ margin: 0, fontWeight: 500 }}>Veli Excel dosyasını sürükleyin veya tıklayarak seçin</p>
                      <p style={{ margin: '8px 0 0', color: 'var(--text-muted)', fontSize: 13 }}>
                        .xlsx veya .xls formatında
                      </p>
                    </>
                  )}
                </div>
                <input
                  ref={parentFileRef}
                  type="file"
                  accept=".xlsx,.xls"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleParentFileSelect(file);
                  }}
                />
              </div>
            )}

            {/* Preview Table */}
            {parentPreview && !parentDone && (
              <div>
                <div style={{
                  display: 'flex',
                  gap: 12,
                  marginBottom: 16,
                  flexWrap: 'wrap',
                }}>
                  <div style={{ background: '#dcfce7', padding: '8px 14px', borderRadius: 'var(--radius)', fontSize: 13 }}>
                    ✅ <strong>{parentPreview.matched}</strong> öğrenci eşleşti
                  </div>
                  <div style={{ background: '#fef3c7', padding: '8px 14px', borderRadius: 'var(--radius)', fontSize: 13 }}>
                    ⚠️ <strong>{parentPreview.unmatched}</strong> öğrenci bulunamadı
                  </div>
                  {parentFile && (
                    <div style={{ background: '#f1f5f9', padding: '8px 14px', borderRadius: 'var(--radius)', fontSize: 13, color: 'var(--text-muted)' }}>
                      {parentFile.name}
                    </div>
                  )}
                </div>

                <div className="table-container" style={{ maxHeight: 350, overflowY: 'auto' }}>
                  <table>
                    <thead>
                      <tr>
                        <th>Okul No</th>
                        <th>Öğrenci</th>
                        <th>Durum</th>
                        <th>1. Veli</th>
                        <th>1. Veli Tel</th>
                        <th>2. Veli</th>
                        <th>2. Veli Tel</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parentPreview.preview.map((r, i) => (
                        <tr key={i} style={{ opacity: r.matched ? 1 : 0.5 }}>
                          <td>{r.schoolNumber}</td>
                          <td>{r.studentName}</td>
                          <td>
                            {r.matched ? (
                              <span className="badge badge-success">Eşleşti</span>
                            ) : (
                              <span className="badge badge-danger">Bulunamadı</span>
                            )}
                          </td>
                          <td>{r.parent1Name || '-'}</td>
                          <td style={{ fontSize: 12 }}>{r.parent1Phone || '-'}</td>
                          <td>{r.parent2Name || '-'}</td>
                          <td style={{ fontSize: 12 }}>{r.parent2Phone || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end' }}>
                  <button className="btn btn-outline" onClick={resetParentModal}>
                    Farklı Dosya Seç
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={handleParentImportConfirm}
                    disabled={parentLoading || parentPreview.matched === 0}
                  >
                    {parentLoading ? (
                      <><span className="spinner" /> Aktarılıyor...</>
                    ) : (
                      `${parentPreview.matched} Öğrencinin Velisini Aktar`
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Import Done */}
            {parentDone && (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
                <h3 style={{ marginBottom: 16 }}>Veli Aktarımı Tamamlandı</h3>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr 1fr',
                  gap: 12,
                  marginBottom: 16,
                }}>
                  <div className="card" style={{ padding: 16, textAlign: 'center' }}>
                    <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--success)' }}>{parentDone.parentsCreated}</div>
                    <small style={{ color: 'var(--text-muted)' }}>Yeni Veli</small>
                  </div>
                  <div className="card" style={{ padding: 16, textAlign: 'center' }}>
                    <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--warning)' }}>{parentDone.parentsUpdated}</div>
                    <small style={{ color: 'var(--text-muted)' }}>Güncellenen</small>
                  </div>
                  <div className="card" style={{ padding: 16, textAlign: 'center' }}>
                    <div style={{ fontSize: 24, fontWeight: 700 }}>{parentDone.matched}</div>
                    <small style={{ color: 'var(--text-muted)' }}>Eşleşen</small>
                  </div>
                  <div className="card" style={{ padding: 16, textAlign: 'center' }}>
                    <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--danger)' }}>{parentDone.errors.length}</div>
                    <small style={{ color: 'var(--text-muted)' }}>Hata</small>
                  </div>
                </div>

                {parentDone.errors.length > 0 && (
                  <div className="alert alert-danger" style={{ textAlign: 'left', fontSize: 13, maxHeight: 120, overflowY: 'auto' }}>
                    {parentDone.errors.map((e, i) => <div key={i}>{e}</div>)}
                  </div>
                )}

                <button className="btn btn-primary" onClick={() => setShowParentModal(false)}>
                  Kapat
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ——— New Student Modal ——— */}
      {showNewModal && (
        <div className="modal-overlay" onClick={() => setShowNewModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 600 }}>
            <div className="modal-header">
              <h2>➕ Yeni Öğrenci Ekle</h2>
              <button className="modal-close" onClick={() => setShowNewModal(false)}>×</button>
            </div>

            {newError && <div className="alert alert-danger">{newError}</div>}

            <form onSubmit={async (e: FormEvent) => {
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
            }}>
              <div className="form-group">
                <label>Okul Numarası</label>
                <input
                  type="text"
                  value={newForm.schoolNumber}
                  onChange={(e) => setNewForm({ ...newForm, schoolNumber: e.target.value })}
                  placeholder="ör: 1234"
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Ad Soyad</label>
                  <input
                    type="text"
                    value={newForm.fullName}
                    onChange={(e) => setNewForm({ ...newForm, fullName: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Sınıf</label>
                  <input
                    type="text"
                    value={newForm.className}
                    onChange={(e) => setNewForm({ ...newForm, className: e.target.value })}
                    placeholder="ör: 9/A"
                    required
                  />
                </div>
              </div>

              {/* Parent Section */}
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <h3 style={{ fontSize: 15, margin: 0 }}>👨‍👩‍👧 Veli Bilgileri</h3>
                  {newParents.length < 2 && (
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => setNewParents([...newParents, { fullName: '', phone: '' }])}
                    >
                      + Veli Ekle
                    </button>
                  )}
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 12 }}>
                  Veli bilgileri opsiyoneldir. Telefon numarası ile veli hesabı oluşturulacaktır.
                </p>

                {newParents.map((p, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      gap: 8,
                      alignItems: 'flex-end',
                      marginBottom: 12,
                      padding: 12,
                      background: '#f8fafc',
                      borderRadius: 'var(--radius)',
                    }}
                  >
                    <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                      <label>{idx + 1}. Veli Adı</label>
                      <input
                        type="text"
                        value={p.fullName}
                        onChange={(e) => {
                          const updated = [...newParents];
                          updated[idx] = { ...updated[idx], fullName: e.target.value };
                          setNewParents(updated);
                        }}
                        placeholder="Ad Soyad"
                      />
                    </div>
                    <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                      <label>Telefon</label>
                      <input
                        type="text"
                        value={p.phone}
                        onChange={(e) => {
                          const updated = [...newParents];
                          updated[idx] = { ...updated[idx], phone: e.target.value };
                          setNewParents(updated);
                        }}
                        placeholder="05XX XXX XX XX"
                      />
                    </div>
                    {newParents.length > 1 && (
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        onClick={() => setNewParents(newParents.filter((_, i) => i !== idx))}
                        title="Veliyi kaldır"
                        style={{ flexShrink: 0, marginBottom: 2 }}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setShowNewModal(false)}
                >
                  İptal
                </button>
                <button type="submit" className="btn btn-primary" disabled={newLoading}>
                  {newLoading ? <><span className="spinner" /> Kaydediliyor...</> : 'Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ——— Edit Student Modal ——— */}
      {showEditModal && editStudent && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 600 }}>
            <div className="modal-header">
              <h2>✏️ Öğrenci Düzenle</h2>
              <button className="modal-close" onClick={() => setShowEditModal(false)}>×</button>
            </div>

            {editError && <div className="alert alert-danger">{editError}</div>}

            <form onSubmit={handleEditSubmit}>
              <div className="form-group">
                <label>Okul Numarası</label>
                <input type="text" value={editForm.schoolNumber} disabled style={{ opacity: 0.6 }} />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Ad Soyad</label>
                  <input
                    type="text"
                    value={editForm.fullName}
                    onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Sınıf</label>
                  <input
                    type="text"
                    value={editForm.className}
                    onChange={(e) => setEditForm({ ...editForm, className: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Durum</label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                >
                  <option value="ACTIVE">Aktif</option>
                  <option value="INACTIVE">Pasif</option>
                </select>
              </div>

              {/* Parent Section */}
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 16 }}>
                <h3 style={{ fontSize: 15, marginBottom: 12 }}>👨‍👩‍👧 Veli Bilgileri</h3>

                {editParents.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Kayıtlı veli bulunmuyor.</p>
                ) : (
                  editParents.map((p, idx) => (
                    <div
                      key={p.id}
                      style={{
                        display: 'flex',
                        gap: 8,
                        alignItems: 'flex-end',
                        marginBottom: 12,
                        padding: '12px',
                        background: '#f8fafc',
                        borderRadius: 'var(--radius)',
                      }}
                    >
                      <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                        <label>
                          {idx + 1}. Veli Adı
                        </label>
                        <input
                          type="text"
                          value={p.fullName}
                          onChange={(e) => {
                            const updated = [...editParents];
                            updated[idx] = { ...updated[idx], fullName: e.target.value };
                            setEditParents(updated);
                          }}
                        />
                      </div>
                      <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                        <label>
                          Telefon
                        </label>
                        <input
                          type="text"
                          value={p.phone}
                          onChange={(e) => {
                            const updated = [...editParents];
                            updated[idx] = { ...updated[idx], phone: e.target.value };
                            setEditParents(updated);
                          }}
                        />
                      </div>
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        onClick={() => handleRemoveParent(p.id)}
                        title="Veliyi kaldır"
                        style={{ flexShrink: 0, marginBottom: 2 }}
                      >
                        ✕
                      </button>
                    </div>
                  ))
                )}
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setShowEditModal(false)}
                >
                  İptal
                </button>
                <button type="submit" className="btn btn-primary" disabled={editLoading}>
                  {editLoading ? <><span className="spinner" /> Kaydediliyor...</> : 'Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
