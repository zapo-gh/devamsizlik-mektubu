import { useState, useEffect, FormEvent } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export default function SettingsPage() {
  const { user, clearMustChangePassword } = useAuth();

  // ── Okul bilgileri ────────────────────────────────────────────────────────
  const [schoolName,      setSchoolName]     = useState('');
  const [principalName,   setPrincipalName]  = useState('');
  const [schoolEditing,   setSchoolEditing]  = useState(false);
  const [schoolNameEdit,  setSchoolNameEdit] = useState('');
  const [principalEdit,   setPrincipalEdit]  = useState('');
  const [schoolSaving,    setSchoolSaving]   = useState(false);
  const [schoolError,     setSchoolError]    = useState('');

  // ── WhatsApp şablonları ───────────────────────────────────────────────────
  const [waTemplates,     setWaTemplates]     = useState<string[]>(['', '', '']);
  const [waEditing,       setWaEditing]       = useState(false);
  const [waTemplatesEdit, setWaTemplatesEdit] = useState<string[]>(['', '', '']);
  const [waSaving,        setWaSaving]        = useState(false);
  const [waError,         setWaError]         = useState('');
  const [waSuccess,       setWaSuccess]       = useState('');

  // ── Şifre değiştir ────────────────────────────────────────────────────────
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword,     setNewPassword]     = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwLoading,       setPwLoading]       = useState(false);
  const [pwError,         setPwError]         = useState('');
  const [pwSuccess,       setPwSuccess]       = useState('');

  useEffect(() => { loadSettings(); }, []);

  const loadSettings = async () => {
    try {
      const res = await api.get('/settings');
      const d = res.data.data;
      setSchoolName(d.schoolName || '');
      setPrincipalName(d.principalName || '');
      setWaTemplates([d.waTemplate1 || '', d.waTemplate2 || '', d.waTemplate3 || '']);
    } catch { /* ignore */ }
  };

  // ── Okul bilgileri handlers ───────────────────────────────────────────────
  const openSchoolEdit = () => {
    setSchoolNameEdit(schoolName);
    setPrincipalEdit(principalName);
    setSchoolError('');
    setSchoolEditing(true);
  };

  const handleSaveSchool = async (e: FormEvent) => {
    e.preventDefault();
    setSchoolError('');
    setSchoolSaving(true);
    try {
      await api.put('/settings', { schoolName: schoolNameEdit.trim(), principalName: principalEdit.trim() });
      setSchoolName(schoolNameEdit.trim());
      setPrincipalName(principalEdit.trim());
      setSchoolEditing(false);
    } catch { setSchoolError('Kayıt sırasında hata oluştu.'); }
    finally { setSchoolSaving(false); }
  };

  // ── WhatsApp şablon handlers ──────────────────────────────────────────────
  const openWaEdit = () => {
    setWaTemplatesEdit([...waTemplates]);
    setWaError(''); setWaSuccess('');
    setWaEditing(true);
  };

  const handleSaveWa = async (e: FormEvent) => {
    e.preventDefault();
    setWaError(''); setWaSuccess('');
    setWaSaving(true);
    try {
      await api.put('/settings', {
        waTemplate1: waTemplatesEdit[0],
        waTemplate2: waTemplatesEdit[1],
        waTemplate3: waTemplatesEdit[2],
      });
      setWaTemplates([...waTemplatesEdit]);
      setWaEditing(false);
      setWaSuccess('WhatsApp şablonları kaydedildi.');
    } catch { setWaError('Kayıt sırasında hata oluştu.'); }
    finally { setWaSaving(false); }
  };

  // ── Şifre değiştir handler ────────────────────────────────────────────────
  const handlePasswordSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setPwError(''); setPwSuccess('');
    if (newPassword !== confirmPassword) { setPwError('Yeni şifreler eşleşmiyor.'); return; }
    if (newPassword.length < 6) { setPwError('Yeni şifre en az 6 karakter olmalıdır.'); return; }
    setPwLoading(true);
    try {
      await api.put('/auth/change-password', { currentPassword, newPassword });
      setPwSuccess('Şifreniz başarıyla güncellendi.');
      clearMustChangePassword();
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
    } catch (err: any) { setPwError(err.response?.data?.message || 'Şifre güncellenemedi.'); }
    finally { setPwLoading(false); }
  };

  const sectionTitle = (icon: string, text: string) => (
    <h2 style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ background: '#f1f5f9', borderRadius: 6, padding: '3px 8px', fontSize: 13 }}>{icon}</span>
      {text}
    </h2>
  );

  return (
    <div style={{ maxWidth: 960 }}>

      {/* Başlık */}
      <div className="page-header" style={{ marginBottom: 24 }}>
        <div>
          <h1 className="page-title">⚙️ Ayarlar</h1>
          <p className="page-subtitle">Okul bilgileri, mesaj şablonları ve hesap güvenliği</p>
        </div>
        <button
          className="btn btn-outline"
          onClick={async () => {
            try {
              const res = await api.get('/settings/backup', { responseType: 'blob' });
              const date = new Date().toISOString().slice(0, 10);
              const url = URL.createObjectURL(res.data as Blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `okuldesk-yedek-${date}.db`;
              a.click();
              URL.revokeObjectURL(url);
            } catch {
              alert('Yedek alınamadı. Lütfen tekrar deneyin.');
            }
          }}
          title="Veritabanı yedeğini indir"
        >
          💾 Yedek Al
        </button>
      </div>

      {/* İlk giriş uyarısı */}
      {user?.mustChangePassword && (
        <div className="alert alert-warning" style={{ marginBottom: 20, fontWeight: 500 }}>
          🔐 Güvenliğiniz için ilk girişte şifrenizi değiştirmeniz gerekmektedir. Lütfen aşağıdaki "Şifre Değiştir" bölümünü doldurun.
        </div>
      )}

      {/* ── Üst satır: 2 kolon ─────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 0, alignItems: 'start' }}>

        {/* ── Okul Bilgileri ─────────────────────────────────────────────── */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            {sectionTitle('🏛️', 'Okul Bilgileri')}
            {!schoolEditing && (
              <button className="btn btn-outline btn-sm" onClick={openSchoolEdit}>✏️ Düzenle</button>
            )}
          </div>

          {schoolEditing ? (
            <form onSubmit={handleSaveSchool}>
              {schoolError && (
                <div className="alert alert-error" style={{ marginBottom: 14 }}>⚠️ {schoolError}</div>
              )}
              <div style={{ marginBottom: 14 }}>
                <label className="form-label">Okul Adı</label>
                <input type="text" placeholder="Örn: Atatürk Anadolu Lisesi" value={schoolNameEdit}
                  onChange={e => setSchoolNameEdit(e.target.value)} maxLength={200} autoFocus className="form-control" />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label className="form-label">Okul Müdürü</label>
                <input type="text" placeholder="Müdürün adı soyadı" value={principalEdit}
                  onChange={e => setPrincipalEdit(e.target.value)} maxLength={100} className="form-control" />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button type="button" className="btn btn-outline" onClick={() => setSchoolEditing(false)}>İptal</button>
                <button type="submit" className="btn btn-primary" disabled={schoolSaving}>{schoolSaving ? 'Kaydediliyor...' : 'Kaydet'}</button>
              </div>
            </form>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ background: '#f8fafc', borderRadius: 8, padding: '12px 14px' }}>
                <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>Okul Adı</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>
                  {schoolName || <span style={{ color: '#94a3b8', fontWeight: 400 }}>Girilmemiş</span>}
                </div>
              </div>
              <div style={{ background: '#f8fafc', borderRadius: 8, padding: '12px 14px' }}>
                <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>Okul Müdürü</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>
                  {principalName || <span style={{ color: '#94a3b8', fontWeight: 400 }}>Girilmemiş</span>}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Şifre Değiştir ─────────────────────────────────────────────── */}
        <div className="card">
          {sectionTitle('🔒', 'Şifre Değiştir')}
          <div style={{ marginTop: 16 }}>
            {pwError && <div className="alert alert-error" style={{ marginBottom: 14 }}>⚠️ {pwError}</div>}
            {pwSuccess && <div className="alert alert-success" style={{ marginBottom: 14 }}>✅ {pwSuccess}</div>}

            <form onSubmit={handlePasswordSubmit}>
              {[
                { label: 'Mevcut Şifre',        value: currentPassword, setter: setCurrentPassword, placeholder: 'Mevcut şifrenizi girin' },
                { label: 'Yeni Şifre',           value: newPassword,     setter: setNewPassword,     placeholder: 'En az 6 karakter' },
                { label: 'Yeni Şifre (Tekrar)',  value: confirmPassword, setter: setConfirmPassword, placeholder: 'Yeni şifreyi tekrar girin' },
              ].map(({ label, value, setter, placeholder }) => (
                <div key={label} style={{ marginBottom: 14 }}>
                  <label className="form-label">{label}</label>
                  <input
                    type="password"
                    value={value}
                    onChange={e => setter(e.target.value)}
                    placeholder={placeholder}
                    required
                    className="form-control"
                  />
                </div>
              ))}
              <button type="submit" className="btn btn-primary" disabled={pwLoading} style={{ width: '100%', marginTop: 4 }}>
                {pwLoading ? '⏳ Güncelleniyor...' : '🔒 Şifreyi Güncelle'}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* ── WhatsApp Mesaj Şablonları — tam genişlik ───────────────────────── */}
      <div className="card" style={{ marginTop: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          {sectionTitle('📱', 'WhatsApp Devamsızlık Mesaj Şablonları')}
          {!waEditing && (
            <button className="btn btn-outline btn-sm" onClick={openWaEdit}>✏️ Düzenle</button>
          )}
        </div>

        <div style={{ background: '#f8fafc', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: '#64748b', lineHeight: 1.6 }}>
          Boş bırakılan şablonlar için varsayılan metin kullanılır. Kullanılabilir yer tutucular:
          <br />
          <code style={{ background: '#e2e8f0', padding: '2px 7px', borderRadius: 4, fontSize: 11, display: 'inline-block', marginTop: 4 }}>
            {'{{ogrenciAdi}} {{ozurluGun}} {{ozursuzGun}} {{toplamGun}} {{okulAdi}} {{uyariNo}}'}
          </code>
        </div>

        {waError && <div className="alert alert-error" style={{ marginBottom: 14 }}>⚠️ {waError}</div>}
        {waSuccess && <div className="alert alert-success" style={{ marginBottom: 14 }}>✅ {waSuccess}</div>}

        {waEditing ? (
          <form onSubmit={handleSaveWa}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
              {[1, 2, 3].map((n, i) => (
                <div key={n}>
                  <label className="form-label">
                    {n}. Uyarı Mesajı
                    <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: 8 }}>(boş = varsayılan)</span>
                  </label>
                  <textarea
                    rows={9}
                    value={waTemplatesEdit[i]}
                    onChange={e => {
                      const next = [...waTemplatesEdit];
                      next[i] = e.target.value;
                      setWaTemplatesEdit(next);
                    }}
                    placeholder="Boş bırakılırsa varsayılan şablon kullanılır..."
                    className="form-control"
                    style={{ resize: 'vertical', lineHeight: 1.6 }}
                  />
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
              <button type="button" className="btn btn-outline" onClick={() => setWaEditing(false)}>İptal</button>
              <button type="submit" className="btn btn-primary" disabled={waSaving}>{waSaving ? 'Kaydediliyor...' : 'Kaydet'}</button>
            </div>
          </form>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
            {[1, 2, 3].map((n, i) => (
              <div key={n}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ background: '#e2e8f0', borderRadius: 4, padding: '2px 8px' }}>{n}. Uyarı</span>
                  {waTemplates[i] ? <span style={{ color: '#16a34a', fontSize: 11 }}>● Özel</span> : <span style={{ color: '#94a3b8', fontSize: 11 }}>● Varsayılan</span>}
                </div>
                <div style={{
                  background: waTemplates[i] ? '#f0fdf4' : '#f8fafc',
                  border: `1px solid ${waTemplates[i] ? '#bbf7d0' : '#e2e8f0'}`,
                  borderRadius: 8, padding: '10px 14px', fontSize: 13,
                  color: waTemplates[i] ? '#166534' : '#94a3b8',
                  fontStyle: waTemplates[i] ? 'normal' : 'italic',
                  whiteSpace: 'pre-wrap', minHeight: 80, maxHeight: 160, overflowY: 'auto',
                }}>
                  {waTemplates[i] || 'Varsayılan şablon kullanılıyor'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
