import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

interface DashboardData {
  totalStudents: number;
  totalStaff: number;
  absenteeism: { total: number; sentCount: number; notSentCount: number };
  warnings: { total: number; studentsWithWarnings: number };
  violations: { totalUploads: number; totalViolations: number; confirmedViolations: number };
  waStatus: 'disconnected' | 'qr' | 'connecting' | 'connected';
  schoolName: string;
  principalName: string;
}

const WA_STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  connected:    { label: '🟢 Bağlı',           color: '#16a34a', bg: '#dcfce7' },
  connecting:   { label: '🟡 Bağlanıyor...',   color: '#b45309', bg: '#fef9c3' },
  qr:           { label: '📱 QR Bekleniyor',   color: '#1d4ed8', bg: '#dbeafe' },
  disconnected: { label: '🔴 Bağlı Değil',     color: '#dc2626', bg: '#fee2e2' },
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    try {
      const [studentsRes, staffRes, absStatsRes, warnStatsRes, violStatsRes, waRes, settingsRes] = await Promise.all([
        api.get('/students?limit=1&status=ACTIVE'),
        api.get('/staff'),
        api.get('/absenteeism/stats'),
        api.get('/warnings/stats'),
        api.get('/violations/stats'),
        api.get('/whatsapp/status').catch(() => ({ data: { data: { status: 'disconnected' } } })),
        api.get('/settings'),
      ]);

      setData({
        totalStudents: studentsRes.data.data.pagination?.total ?? 0,
        totalStaff: staffRes.data.data?.staff?.length ?? 0,
        absenteeism: absStatsRes.data.data,
        warnings: warnStatsRes.data.data,
        violations: violStatsRes.data.data,
        waStatus: waRes.data.data.status,
        schoolName: settingsRes.data.data.schoolName || '',
        principalName: settingsRes.data.data.principalName || '',
      });
    } catch (error) {
      console.error('Dashboard load error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 48 }}>
        <div className="spinner spinner-dark" />
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ textAlign: 'center', padding: 48, color: 'var(--danger)' }}>
        <p style={{ fontSize: 16, fontWeight: 600 }}>Veriler yüklenemedi.</p>
        <button className="btn btn-outline" onClick={loadAll} style={{ marginTop: 12 }}>🔄 Tekrar Dene</button>
      </div>
    );
  }

  const d = data;
  const waInfo = WA_STATUS_LABELS[d.waStatus] ?? WA_STATUS_LABELS.disconnected;

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Gösterge Paneli</h1>
          <p className="page-subtitle">
            {d.schoolName
              ? <><strong>{d.schoolName}</strong>{d.principalName ? ` · Müdür: ${d.principalName}` : ''}</>
              : 'OkulDesk'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-outline" onClick={() => navigate('/admin/settings')}>⚙️ Ayarlar</button>
          <button className="btn btn-outline" onClick={loadAll}>🔄 Yenile</button>
        </div>
      </div>

      {/* Ana İstatistik Kartları */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16, marginBottom: 24 }}>
        <StatCard icon="👨‍🎓" value={d.totalStudents} label="Aktif Öğrenci"   accent="#4f46e5" onClick={() => navigate('/admin/students')}   />
        <StatCard icon="👥"   value={d.totalStaff}    label="Personel"         accent="#0891b2" onClick={() => navigate('/admin/staff')}      />
        <StatCard icon="📄"   value={d.absenteeism.total} label="Devamsızlık Kaydı" accent="#7c3aed" onClick={() => navigate('/admin/absenteeism')} />
        <StatCard icon="⚠️"  value={d.warnings.total} label="Yazılı Uyarı"   accent="#d97706" onClick={() => navigate('/admin/warnings')}   />
        <StatCard icon="📷"  value={d.violations.confirmedViolations} label="Onaylı İhlal" accent="#dc2626" onClick={() => navigate('/admin/violations')} />
      </div>

      {/* Alt Satır: Detay Kartları */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>

        {/* Devamsızlık Detayı */}
        <div className="card" style={{ cursor: 'pointer' }} onClick={() => navigate('/admin/absenteeism')}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <span style={{ fontSize: 20 }}>📄</span>
            <h3 style={{ margin: 0, fontSize: 15 }}>Devamsızlık Durumu</h3>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <MiniStat value={d.absenteeism.notSentCount} label="Gönderilmedi" color="#dc2626" />
            <MiniStat value={d.absenteeism.sentCount}    label="Gönderildi"   color="#16a34a" />
            <MiniStat value={d.absenteeism.total}        label="Toplam"       color="#4f46e5" />
          </div>
        </div>

        {/* Yazılı Uyarı Detayı */}
        <div className="card" style={{ cursor: 'pointer' }} onClick={() => navigate('/admin/warnings')}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <span style={{ fontSize: 20 }}>⚠️</span>
            <h3 style={{ margin: 0, fontSize: 15 }}>Yazılı Uyarılar</h3>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <MiniStat value={d.warnings.total}                label="Toplam Uyarı"      color="#d97706" />
            <MiniStat value={d.warnings.studentsWithWarnings} label="Etkilenen Öğrenci" color="#7c3aed" />
          </div>
        </div>

        {/* İhlal Detayı */}
        <div className="card" style={{ cursor: 'pointer' }} onClick={() => navigate('/admin/violations')}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <span style={{ fontSize: 20 }}>📷</span>
            <h3 style={{ margin: 0, fontSize: 15 }}>İhlal Takibi</h3>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <MiniStat value={d.violations.totalViolations}    label="Toplam İhlal" color="#dc2626" />
            <MiniStat value={d.violations.confirmedViolations} label="Onaylı"      color="#16a34a" />
            <MiniStat value={d.violations.totalUploads}       label="Yükleme"      color="#0891b2" />
          </div>
        </div>

        {/* WhatsApp Durumu */}
        <div
          className="card"
          style={{ cursor: 'pointer', background: waInfo.bg, border: `1px solid ${waInfo.color}30` }}
          onClick={() => navigate('/admin/whatsapp')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <span style={{ fontSize: 20 }}>📱</span>
            <h3 style={{ margin: 0, fontSize: 15 }}>WhatsApp</h3>
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: waInfo.color }}>{waInfo.label}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
            {d.waStatus === 'connected' ? 'Velilere mesaj gönderilebilir' : 'Bağlanmak için tıklayın'}
          </div>
        </div>

      </div>

    </div>
  );
}

function StatCard({
  icon, value, label, accent, onClick,
}: {
  icon: string; value: number; label: string; accent: string; onClick: () => void;
}) {
  return (
    <div
      className="card"
      onClick={onClick}
      style={{ cursor: 'pointer', textAlign: 'center', padding: '18px 12px', transition: 'transform .15s', userSelect: 'none' }}
      onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-2px)')}
      onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
    >
      <div style={{ fontSize: 28, marginBottom: 6 }}>{icon}</div>
      <div style={{ fontSize: 32, fontWeight: 700, color: accent, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>{label}</div>
    </div>
  );
}

function MiniStat({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div style={{ flex: 1, textAlign: 'center' }}>
      <div style={{ fontSize: 22, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{label}</div>
    </div>
  );
}
