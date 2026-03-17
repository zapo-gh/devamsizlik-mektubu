import { useState, useEffect } from 'react';
import api from '../../services/api';

interface Stats {
  totalStudents: number;
  totalAbsenteeisms: number;
  viewedCount: number;
  pendingCount: number;
}

interface SchoolSettings {
  schoolName: string;
  principalName: string;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({
    totalStudents: 0,
    totalAbsenteeisms: 0,
    viewedCount: 0,
    pendingCount: 0,
  });
  const [loading, setLoading] = useState(true);

  // School settings state
  const [settings, setSettings] = useState<SchoolSettings>({ schoolName: '', principalName: '' });
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [settingsEditing, setSettingsEditing] = useState(false);

  useEffect(() => {
    loadStats();
    loadSettings();
  }, []);

  const loadStats = async () => {
    try {
      const [studentsRes, absenteeismRes, statsRes] = await Promise.all([
        api.get('/students?limit=1'),
        api.get('/absenteeism?limit=1'),
        api.get('/absenteeism/stats'),
      ]);

      const statsData = statsRes.data.data;

      setStats({
        totalStudents: studentsRes.data.data.pagination.total,
        totalAbsenteeisms: absenteeismRes.data.data.pagination.total,
        viewedCount: statsData.viewedCount,
        pendingCount: statsData.pendingCount,
      });
    } catch (error) {
      console.error('Stats load error:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSettings = async () => {
    try {
      const res = await api.get('/settings');
      setSettings(res.data.data);
    } catch (error) {
      console.error('Settings load error:', error);
    }
  };

  const saveSettings = async () => {
    setSettingsLoading(true);
    setSettingsSaved(false);
    try {
      const res = await api.put('/settings', settings);
      setSettings(res.data.data);
      setSettingsSaved(true);
      setSettingsEditing(false);
      setTimeout(() => setSettingsSaved(false), 3000);
    } catch (error) {
      console.error('Settings save error:', error);
    } finally {
      setSettingsLoading(false);
    }
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
        <h1>Gösterge Paneli</h1>
      </div>

      {/* Okul bilgileri özet kartı — yalnızca kayıtlı veri varsa görünür */}
      {(settings.schoolName || settings.principalName) && !settingsEditing && (
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 24, padding: '16px 24px', marginBottom: 20, background: '#f0f9ff', border: '1px solid #bae6fd' }}>
          <div style={{ fontSize: 28 }}>🏫</div>
          <div style={{ flex: 1 }}>
            {settings.schoolName && (
              <div style={{ fontSize: 15, fontWeight: 700, color: '#0c4a6e' }}>{settings.schoolName}</div>
            )}
            {settings.principalName && (
              <div style={{ fontSize: 13, color: '#0369a1', marginTop: 2 }}>Okul Müdürü: {settings.principalName}</div>
            )}
          </div>
          <button
            onClick={() => setSettingsEditing(true)}
            className="btn btn-outline"
            style={{ padding: '6px 16px', fontSize: 13 }}
          >
            ✏️ Düzenle
          </button>
        </div>
      )}

      <div className="card-grid">
        <div className="stat-card">
          <div className="stat-value">{stats.totalStudents}</div>
          <div className="stat-label">Toplam Öğrenci</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.totalAbsenteeisms}</div>
          <div className="stat-label">Devamsızlık Kaydı</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--success)' }}>
            {stats.viewedCount}
          </div>
          <div className="stat-label">Veli Tarafından Görüntülenen</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--warning)' }}>
            {stats.pendingCount}
          </div>
          <div className="stat-label">Bekleyen Bildirim</div>
        </div>
      </div>

      {/* Okul Bilgileri düzenleme formu — hiç kayıt yoksa veya Düzenle'ye basıldıysa açık */}
      {(settingsEditing || (!settings.schoolName && !settings.principalName)) && (
        <div className="card">
          <h3 style={{ marginBottom: 16 }}>⚙️ Okul Bilgileri</h3>
          <p style={{ fontSize: 13, color: '#666', marginBottom: 16 }}>
            Burada girilen bilgiler yazılı uyarı PDF belgelerinde otomatik olarak kullanılır.
          </p>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 16 }}>
            <div style={{ flex: '1 1 280px' }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Okul Adı</label>
              <input
                type="text"
                placeholder="Örn: Ankara Atatürk Anadolu Lisesi"
                value={settings.schoolName}
                onChange={(e) => setSettings({ ...settings, schoolName: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14 }}
              />
            </div>
            <div style={{ flex: '1 1 280px' }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Okul Müdürü Adı Soyadı</label>
              <input
                type="text"
                placeholder="Örn: Ahmet YILMAZ"
                value={settings.principalName}
                onChange={(e) => setSettings({ ...settings, principalName: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14 }}
              />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={saveSettings}
              disabled={settingsLoading}
              className="btn btn-primary"
              style={{ padding: '8px 24px' }}
            >
              {settingsLoading ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
            {(settings.schoolName || settings.principalName) && (
              <button
                type="button"
                onClick={() => setSettingsEditing(false)}
                className="btn btn-outline"
                style={{ padding: '8px 24px' }}
              >
                İptal
              </button>
            )}
            {settingsSaved && (
              <span style={{ color: 'var(--success)', fontSize: 13, fontWeight: 500 }}>
                ✓ Ayarlar kaydedildi
              </span>
            )}
          </div>
        </div>
      )}

      <div className="card">
        <h3 style={{ marginBottom: 16 }}>Hızlı Başlangıç</h3>
        <ol style={{ paddingLeft: 20, lineHeight: 2 }}>
          <li>e-Okul'dan devamsızlık mektubunu indirin</li>
          <li>Mektubu imzalayıp tarayın (PDF, JPG veya PNG)</li>
          <li>"Devamsızlık" sayfasından dosyayı sisteme yükleyin</li>
          <li>OTP oluşturun ve WhatsApp mesajını veliye gönderin</li>
          <li>Veli bağlantıya tıklayıp şifre ile devamsızlık mektubunu görüntüler</li>
        </ol>
      </div>
    </div>
  );
}
