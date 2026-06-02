import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { useConfirm } from '../../hooks/useConfirm';

type StaffRole = 'MUDUR_YARDIMCISI' | 'REHBER_OGRETMEN' | 'SINIF_REHBER_OGRETMEN';

interface StaffMember {
  id: string;
  name: string;
  role: StaffRole;
  className?: string | null;
  isActive: boolean;
  createdAt: string;
}

const ROLE_LABELS: Record<StaffRole, string> = {
  MUDUR_YARDIMCISI: 'Müdür Yardımcısı',
  REHBER_OGRETMEN: 'Okul Rehber Öğretmeni',
  SINIF_REHBER_OGRETMEN: 'Sınıf Rehber Öğretmeni',
};

const ROLE_ICONS: Record<StaffRole, string> = {
  MUDUR_YARDIMCISI: '🏛️',
  REHBER_OGRETMEN: '🧭',
  SINIF_REHBER_OGRETMEN: '📚',
};


const emptyForm = { name: '', role: 'MUDUR_YARDIMCISI' as StaffRole, className: '' };

export default function StaffPage() {
  const { confirm, alert, confirmModal } = useConfirm();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<StaffMember | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState('');

  const fetchStaff = async () => {
    try {
      const res = await api.get('/staff');
      setStaff(res.data.data.staff);
    } catch {
      setError('Personel listesi yüklenemedi.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStaff(); }, []);

  const openAdd = () => {
    setEditTarget(null);
    setForm(emptyForm);
    setFormError('');
    setShowModal(true);
  };

  const openEdit = (s: StaffMember) => {
    setEditTarget(s);
    setForm({ name: s.name, role: s.role, className: s.className || '' });
    setFormError('');
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!form.name.trim()) { setFormError('Ad zorunludur.'); return; }
    if (form.role === 'SINIF_REHBER_OGRETMEN' && !form.className.trim()) {
      setFormError('Sınıf rehber öğretmeni için sınıf adı zorunludur (örn: 10-A).');
      return;
    }
    setSaving(true);
    try {
      if (editTarget) {
        await api.put(`/staff/${editTarget.id}`, {
          name: form.name.trim(),
          className: form.role === 'SINIF_REHBER_OGRETMEN' ? form.className.trim() : '',
        });
      } else {
        await api.post('/staff', {
          name: form.name.trim(),
          role: form.role,
          className: form.role === 'SINIF_REHBER_OGRETMEN' ? form.className.trim() : undefined,
        });
      }
      setShowModal(false);
      fetchStaff();
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Kayıt sırasında hata oluştu.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!await confirm('Bu personeli silmek istediğinizden emin misiniz?')) return;
    setDeleteId(id);
    try {
      await api.delete(`/staff/${id}`);
      fetchStaff();
    } catch (err: any) {
      await alert(err.response?.data?.message || 'Silme işlemi başarısız.');
    } finally {
      setDeleteId('');
    }
  };

  const grouped = (Object.keys(ROLE_LABELS) as StaffRole[]).reduce<Record<StaffRole, StaffMember[]>>(
    (acc, role) => {
      const list = staff.filter((s) => s.role === role);
      if (role === 'SINIF_REHBER_OGRETMEN') {
        list.sort((a, b) => (a.className ?? '').localeCompare(b.className ?? '', 'tr', { numeric: true }));
      }
      acc[role] = list;
      return acc;
    },
    { MUDUR_YARDIMCISI: [], REHBER_OGRETMEN: [], SINIF_REHBER_OGRETMEN: [] }
  );

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 40 }}>
        <div className="spinner spinner-dark" />
      </div>
    );
  }

  return (
    <div>
      {/* Sayfa başlığı */}
      <div className="page-header">
        <div>
          <h1 className="page-title">👥 Personel Yönetimi</h1>
          <p className="page-subtitle">Öğretmen ve yöneticileri ekleyin, düzenleyin veya silin</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>+ Personel Ekle</button>
      </div>

      {error && (
        <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>
      )}

      {/* Üst 2-kolon: Müdür Yardımcısı + Rehber Öğretmen */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        {(['MUDUR_YARDIMCISI', 'REHBER_OGRETMEN'] as StaffRole[]).map(role => (
          <div key={role} className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 16px', background: '#f8fafc', borderBottom: '1px solid var(--border)',
            }}>
              <span style={{ fontSize: 16 }}>{ROLE_ICONS[role]}</span>
              <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>{ROLE_LABELS[role]}</span>
              <span style={{ marginLeft: 'auto', fontSize: 12, color: '#9ca3af' }}>{grouped[role].length} kişi</span>
            </div>
            {grouped[role].length === 0 ? (
              <div style={{ padding: '18px 16px', color: '#9ca3af', fontSize: 13, textAlign: 'center' }}>
                Henüz kayıtlı personel yok.
              </div>
            ) : (
              <div>
                {grouped[role].map((s, idx) => (
                  <div key={s.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 16px',
                    borderBottom: idx < grouped[role].length - 1 ? '1px solid var(--border)' : 'none',
                  }}>
                    <span style={{ fontSize: 14, color: 'var(--text)' }}>{s.name}</span>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-outline btn-sm" onClick={() => openEdit(s)} style={{ fontSize: 12, padding: '4px 10px' }}>Düzenle</button>
                      <button className="btn btn-outline btn-sm" onClick={() => handleDelete(s.id)} disabled={deleteId === s.id}
                        style={{ fontSize: 12, padding: '4px 10px', color: 'var(--danger)', borderColor: 'var(--danger)' }}>
                        {deleteId === s.id ? '...' : 'Sil'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Sınıf Rehber Öğretmenleri */}
      {(() => {
        const role: StaffRole = 'SINIF_REHBER_OGRETMEN';
        return (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 16px', background: '#f8fafc', borderBottom: '1px solid var(--border)',
            }}>
              <span style={{ fontSize: 16 }}>{ROLE_ICONS[role]}</span>
              <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>{ROLE_LABELS[role]}</span>
              <span style={{ marginLeft: 'auto', fontSize: 12, color: '#9ca3af' }}>{grouped[role].length} kişi</span>
            </div>
            {grouped[role].length === 0 ? (
              <div style={{ padding: '24px 16px', color: '#9ca3af', fontSize: 13, textAlign: 'center' }}>
                Henüz kayıtlı personel yok.
              </div>
            ) : (
              <div>
                {grouped[role].map((s, idx) => (
                  <div key={s.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 16px',
                    borderBottom: idx < grouped[role].length - 1 ? '1px solid var(--border)' : 'none',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{
                        background: '#dbeafe', color: 'var(--primary)',
                        borderRadius: 'var(--radius)', padding: '1px 8px',
                        fontSize: 12, fontWeight: 600, flexShrink: 0,
                      }}>{s.className}</span>
                      <span style={{ fontSize: 14, color: 'var(--text)' }}>{s.name}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-outline btn-sm" onClick={() => openEdit(s)} style={{ fontSize: 12, padding: '4px 10px' }}>Düzenle</button>
                      <button className="btn btn-outline btn-sm" onClick={() => handleDelete(s.id)} disabled={deleteId === s.id}
                        style={{ fontSize: 12, padding: '4px 10px', color: 'var(--danger)', borderColor: 'var(--danger)' }}>
                        {deleteId === s.id ? '...' : 'Sil'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })()}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onMouseDown={() => setShowModal(false)}>
          <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
            <h2>{editTarget ? '✏️ Personeli Düzenle' : '➕ Yeni Personel Ekle'}</h2>

            <form onSubmit={handleSave}>
              <div className="form-group">
                <label className="form-label">Ad Soyad *</label>
                <input
                  className="form-control"
                  type="text"
                  placeholder="Personelin adı soyadı"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  maxLength={100}
                  autoFocus
                />
              </div>

              {!editTarget && (
                <div className="form-group">
                  <label className="form-label">Görev *</label>
                  <select
                    className="form-control"
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value as StaffRole, className: '' })}
                  >
                    {(Object.keys(ROLE_LABELS) as StaffRole[]).map(r => (
                      <option key={r} value={r}>{ROLE_ICONS[r]} {ROLE_LABELS[r]}</option>
                    ))}
                  </select>
                </div>
              )}

              {(editTarget ? editTarget.role === 'SINIF_REHBER_OGRETMEN' : form.role === 'SINIF_REHBER_OGRETMEN') && (
                <div className="form-group">
                  <label className="form-label">Sınıf *</label>
                  <input
                    className="form-control"
                    type="text"
                    placeholder="Örn: 10-A, 11-B"
                    value={form.className}
                    onChange={(e) => setForm({ ...form, className: e.target.value })}
                    maxLength={50}
                  />
                  <small style={{ color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
                    Yazılı uyarılarda bu sınıftaki öğrenciler için otomatik seçilir.
                  </small>
                </div>
              )}

              {editTarget?.role === 'REHBER_OGRETMEN' && (
                <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 16px' }}>
                  Okul rehber öğretmeni yazılı uyarı formlarında otomatik doldurulur.
                </p>
              )}

              {formError && (
                <div className="alert alert-error" style={{ marginBottom: 12 }}>{formError}</div>
              )}

              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>
                  İptal
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Kaydediliyor...' : editTarget ? 'Güncelle' : 'Ekle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {confirmModal}
    </div>
  );
}
