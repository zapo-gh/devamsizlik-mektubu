import { useState, useEffect, FormEvent } from 'react';
import api from '../../services/api';

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
  viewedByParent: boolean;
  createdAt: string;
  student: { fullName: string; className: string; schoolNumber: string };
  _count: { otpCodes: number };
}

interface OtpResult {
  otp: { code: string; expiresAt: string };
  whatsappLink: string;
  token: string;
  studentName: string;
}

export default function AbsenteeismPage() {
  const [records, setRecords] = useState<AbsenteeismRecord[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);

  // Upload form
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [showStudentDropdown, setShowStudentDropdown] = useState(false);
  const [warningNumber, setWarningNumber] = useState(1);
  const [warningLoading, setWarningLoading] = useState(false);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  // OTP generation
  const [selectedRecordId, setSelectedRecordId] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [recordParents, setRecordParents] = useState<{ id: string; fullName: string; phone: string }[]>([]);
  const [otpResult, setOtpResult] = useState<OtpResult | null>(null);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [recordsRes, studentsRes] = await Promise.all([
        api.get('/absenteeism?limit=50'),
        api.get('/students?limit=2000'),
      ]);
      setRecords(recordsRes.data.data.records);
      setStudents(studentsRes.data.data.students);
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

  const openOtpModal = (recordId: string) => {
    setSelectedRecordId(recordId);
    setOtpResult(null);
    setOtpError('');
    setParentPhone('');

    // Find the record and its student's parents
    const record = records.find((r) => r.id === recordId);
    if (record) {
      const student = students.find((s) => s.id === record.studentId);
      if (student && student.parents.length > 0) {
        setRecordParents(student.parents);
        setParentPhone(student.parents[0].phone); // Auto-select first parent
      } else {
        setRecordParents([]);
      }
    } else {
      setRecordParents([]);
    }

    setShowOtpModal(true);
  };

  const handleGenerateOtp = async (e: FormEvent) => {
    e.preventDefault();
    setOtpError('');
    setOtpLoading(true);

    try {
      // Find parent name for the selected phone
      const selectedParent = recordParents.find((p) => p.phone === parentPhone);
      const res = await api.post(`/absenteeism/${selectedRecordId}/generate-otp`, {
        parentPhone,
        parentName: selectedParent?.fullName || '',
      });
      const data = res.data.data;
      // Rebuild WhatsApp link using current browser origin so link is always correct
      const veliLink = `${window.location.origin}/veli/${data.token}`;
      const parentLabel = selectedParent?.fullName ? `Sayın ${selectedParent.fullName},` : 'Sayın Veli,';
      const msg = `${parentLabel}\n\nOgrencinizin devamsizlik bildirimi sisteme yuklenmistir.\n\nSifre: ${data.otp.code}\n\nAsagidaki baglantiya tiklayarak devamsizlik mektubunu goruntuleyebilirsiniz:\n\n${veliLink}\n\n* Sifre 24 saat gecerlidir.`;
      const cleanPhone = parentPhone.replace(/\D/g, '');
      data.whatsappLink = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
      setOtpResult(data);
    } catch (err: any) {
      setOtpError(err.response?.data?.message || 'OTP oluşturulamadı.');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Devamsızlık kaydını silmek istediğinize emin misiniz?')) return;

    try {
      await api.delete(`/absenteeism/${id}`);
      loadData();
    } catch (error) {
      console.error('Delete failed:', error);
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
        <h1>Devamsızlık Yönetimi</h1>
        <button className="btn btn-primary" onClick={() => setShowUploadModal(true)}>
          + Devamsızlık Mektubu Ekle
        </button>
      </div>

      {/* Records Table */}
      <div className="card">
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
              {records.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                    Henüz devamsızlık kaydı yok.
                  </td>
                </tr>
              ) : (
                records.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <strong>{r.student.fullName}</strong>
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
                      <span
                        className={`badge ${
                          r.viewedByParent ? 'badge-success' : 'badge-warning'
                        }`}
                      >
                        {r.viewedByParent ? 'Görüntülendi' : 'Bekliyor'}
                      </span>
                    </td>
                    <td>{formatDate(r.createdAt)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        <button
                          className="btn btn-whatsapp btn-sm"
                          onClick={() => openOtpModal(r.id)}
                        >
                          📱 OTP & WhatsApp
                        </button>
                        <a
                          href={`/api/absenteeism/${r.id}/pdf?jwt=${localStorage.getItem('token') || ''}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-outline btn-sm"
                        >
                          Devamsızlık Mektubu Görüntüle
                        </a>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => handleDelete(r.id)}
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
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="modal-overlay" onClick={() => setShowUploadModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Devamsızlık Mektubu Ekle</h2>

            {uploadError && <div className="alert alert-error">{uploadError}</div>}

            <form onSubmit={handleUpload}>
              <div className="form-group" style={{ position: 'relative' }}>
                <label>Öğrenci</label>
                <input
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
                        const q = studentSearch.toLowerCase();
                        return (
                          s.fullName.toLowerCase().includes(q) ||
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
                      const q = studentSearch.toLowerCase();
                      return s.fullName.toLowerCase().includes(q) || s.schoolNumber.toLowerCase().includes(q);
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

      {/* OTP & WhatsApp Modal */}
      {showOtpModal && (
        <div className="modal-overlay" onClick={() => setShowOtpModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>OTP Oluştur & WhatsApp Mesajı</h2>

            {otpError && <div className="alert alert-error">{otpError}</div>}

            {!otpResult ? (
              <form onSubmit={handleGenerateOtp}>
                {recordParents.length > 0 ? (
                  <div className="form-group">
                    <label>Veli Seçin</label>
                    {recordParents.map((p, idx) => (
                      <label
                        key={p.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          padding: '10px 14px',
                          marginBottom: 8,
                          background: parentPhone === p.phone ? '#eff6ff' : '#f8fafc',
                          border: parentPhone === p.phone ? '2px solid var(--primary)' : '1px solid var(--border)',
                          borderRadius: 'var(--radius)',
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                        }}
                      >
                        <input
                          type="radio"
                          name="parentPhone"
                          value={p.phone}
                          checked={parentPhone === p.phone}
                          onChange={() => setParentPhone(p.phone)}
                          style={{ accentColor: 'var(--primary)' }}
                        />
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 14 }}>
                            {idx + 1}. Veli — {p.fullName}
                          </div>
                          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                            📞 {p.phone}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                ) : (
                  <div className="form-group">
                    <label>Veli Telefon Numarası</label>
                    <div className="alert alert-warning" style={{ marginBottom: 12, fontSize: 13 }}>
                      ⚠️ Bu öğrenciye ait kayıtlı veli bilgisi bulunamadı. Lütfen telefon numarasını manuel giriniz.
                    </div>
                    <input
                      type="tel"
                      value={parentPhone}
                      onChange={(e) => setParentPhone(e.target.value)}
                      placeholder="905551234567"
                      required
                    />
                    <small style={{ color: 'var(--text-muted)' }}>
                      Ülke kodu ile birlikte giriniz (ör: 905551234567)
                    </small>
                  </div>
                )}

                <div className="modal-actions">
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => setShowOtpModal(false)}
                  >
                    İptal
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={otpLoading}>
                    {otpLoading ? <span className="spinner" /> : 'OTP Oluştur'}
                  </button>
                </div>
              </form>
            ) : (
              <div>
                <div className="alert alert-success">
                  OTP başarıyla oluşturuldu!
                </div>

                <div className="card" style={{ marginBottom: 16 }}>
                  <div style={{ marginBottom: 12 }}>
                    <strong>Öğrenci:</strong> {otpResult.studentName}
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <strong>OTP Kodu:</strong>{' '}
                    <span
                      style={{
                        fontSize: 24,
                        fontWeight: 'bold',
                        color: 'var(--primary)',
                        letterSpacing: 4,
                      }}
                    >
                      {otpResult.otp.code}
                    </span>
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <strong>Son Geçerlilik:</strong>{' '}
                    {formatDate(otpResult.otp.expiresAt)}
                  </div>
                </div>

                <div style={{ marginBottom: 12 }}>
                  <strong>Veli Linki:</strong>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4 }}>
                    <input
                      type="text"
                      readOnly
                      value={`${window.location.origin}/veli/${otpResult.token}`}
                      style={{ flex: 1, fontSize: 12, padding: '8px 10px' }}
                      onClick={(e) => (e.target as HTMLInputElement).select()}
                    />
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/veli/${otpResult.token}`);
                        alert('Link kopyalandı!');
                      }}
                      style={{ whiteSpace: 'nowrap' }}
                    >
                      Kopyala
                    </button>
                  </div>
                </div>

                <a
                  href={otpResult.whatsappLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-whatsapp"
                  style={{ width: '100%', marginBottom: 8 }}
                >
                  📱 WhatsApp Mesajını Hazırla
                </a>

                <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
                  WhatsApp Web açılacak. Mesajı manuel olarak gönderin.
                </p>

                <div className="modal-actions">
                  <button
                    className="btn btn-outline"
                    onClick={() => setShowOtpModal(false)}
                  >
                    Kapat
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
