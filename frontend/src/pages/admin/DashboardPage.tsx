import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import {
  Users,
  UserCheck,
  FileText,
  AlertTriangle,
  ShieldAlert,
  MessageSquare,
  Settings,
  RefreshCw,
  CheckCircle2,
  Clock,
  QrCode,
  XCircle
} from 'lucide-react';

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

const WA_STATUS_LABELS: Record<
  string,
  { label: string; icon: React.ElementType; color: string; bg: string }
> = {
  connected: { label: 'Bağlı', icon: CheckCircle2, color: '#16a34a', bg: '#dcfce7' },
  connecting: { label: 'Bağlanıyor...', icon: Clock, color: '#b45309', bg: '#fef9c3' },
  qr: { label: 'QR Bekleniyor', icon: QrCode, color: '#1d4ed8', bg: '#dbeafe' },
  disconnected: { label: 'Bağlı Değil', icon: XCircle, color: '#dc2626', bg: '#fee2e2' },
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
      const [studentsRes, staffRes, absStatsRes, warnStatsRes, violStatsRes, waRes, settingsRes] =
        await Promise.all([
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
      <div style={{ textAlign: 'center', padding: 64 }}>
        <div className="spinner spinner-dark" />
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ textAlign: 'center', padding: 64, color: 'var(--danger)' }}>
        <p style={{ fontSize: 16, fontWeight: 600 }}>Veriler yüklenemedi.</p>
        <button className="btn btn-outline" onClick={loadAll} style={{ marginTop: 12 }}>
          Tekrar Dene
        </button>
      </div>
    );
  }

  const d = data;
  const waInfo = WA_STATUS_LABELS[d.waStatus] ?? WA_STATUS_LABELS.disconnected;
  const WaIcon = waInfo.icon;

  return (
    <div style={{ animation: 'fade-in 0.25s ease-out' }}>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Gösterge Paneli</h1>
          <p className="page-subtitle">
            {d.schoolName ? (
              <>
                <strong>{d.schoolName}</strong>
                {d.principalName ? ` · Müdür: ${d.principalName}` : ''}
              </>
            ) : (
              'OkulDesk Yönetim Paneli'
            )}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            className="btn btn-outline"
            onClick={() => navigate('/admin/settings')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              fontSize: 13,
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'white',
              cursor: 'pointer',
            }}
          >
            <Settings size={15} />
            <span>Ayarlar</span>
          </button>
          <button
            className="btn btn-outline"
            onClick={loadAll}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              fontSize: 13,
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'white',
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={15} />
            <span>Yenile</span>
          </button>
        </div>
      </div>

      {/* Ana İstatistik Kartları (5 Adet Kompakt Shadcn Tarzı) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
          gap: 16,
          marginBottom: 20,
        }}
      >
        <StatCard
          icon={Users}
          value={d.totalStudents}
          label="Aktif Öğrenci"
          accent="#3b82f6"
          bgTint="rgba(59,130,246,0.1)"
          onClick={() => navigate('/admin/students')}
        />
        <StatCard
          icon={UserCheck}
          value={d.totalStaff}
          label="Personel"
          accent="#0891b2"
          bgTint="rgba(8,145,178,0.1)"
          onClick={() => navigate('/admin/staff')}
        />
        <StatCard
          icon={FileText}
          value={d.absenteeism.total}
          label="Devamsızlık Kaydı"
          accent="#7c3aed"
          bgTint="rgba(124,58,237,0.1)"
          onClick={() => navigate('/admin/absenteeism')}
        />
        <StatCard
          icon={AlertTriangle}
          value={d.warnings.total}
          label="Yazılı Uyarı"
          accent="#d97706"
          bgTint="rgba(217,119,6,0.1)"
          onClick={() => navigate('/admin/warnings')}
        />
        <StatCard
          icon={ShieldAlert}
          value={d.violations.confirmedViolations}
          label="Onaylı İhlal"
          accent="#dc2626"
          bgTint="rgba(220,38,38,0.1)"
          onClick={() => navigate('/admin/violations')}
        />
      </div>

      {/* Alt Satır: Detay Kartları (4 Adet Kompakt Kart) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 16,
          marginBottom: 24,
        }}
      >
        {/* Devamsızlık Detayı */}
        <div
          className="card"
          style={{ cursor: 'pointer' }}
          onClick={() => navigate('/admin/absenteeism')}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 16,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: 'rgba(99,102,241,0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <FileText size={18} color="#6366f1" />
              </div>
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Devamsızlık Durumu</h3>
            </div>
            <span
              style={{
                fontSize: 11,
                background: 'hsl(210 40% 95%)',
                padding: '2px 8px',
                borderRadius: 12,
                color: 'var(--text-muted)',
              }}
            >
              Mektup
            </span>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <MiniStat value={d.absenteeism.notSentCount} label="Gönderilmedi" color="#dc2626" />
            <MiniStat value={d.absenteeism.sentCount} label="Gönderildi" color="#16a34a" />
            <MiniStat value={d.absenteeism.total} label="Toplam" color="#4f46e5" />
          </div>
        </div>

        {/* Yazılı Uyarı Detayı */}
        <div
          className="card"
          style={{ cursor: 'pointer' }}
          onClick={() => navigate('/admin/warnings')}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 16,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: 'rgba(217,119,6,0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <AlertTriangle size={18} color="#d97706" />
              </div>
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Yazılı Uyarılar</h3>
            </div>
            <span
              style={{
                fontSize: 11,
                background: 'hsl(210 40% 95%)',
                padding: '2px 8px',
                borderRadius: 12,
                color: 'var(--text-muted)',
              }}
            >
              Uyarı
            </span>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <MiniStat value={d.warnings.total} label="Toplam Uyarı" color="#d97706" />
            <MiniStat value={d.warnings.studentsWithWarnings} label="Etkilenen Öğrenci" color="#7c3aed" />
          </div>
        </div>

        {/* İhlal Detayı */}
        <div
          className="card"
          style={{ cursor: 'pointer' }}
          onClick={() => navigate('/admin/violations')}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 16,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: 'rgba(220,38,38,0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ShieldAlert size={18} color="#dc2626" />
              </div>
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>İhlal Takibi</h3>
            </div>
            <span
              style={{
                fontSize: 11,
                background: 'hsl(210 40% 95%)',
                padding: '2px 8px',
                borderRadius: 12,
                color: 'var(--text-muted)',
              }}
            >
              Disiplin
            </span>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <MiniStat value={d.violations.totalViolations} label="Toplam İhlal" color="#dc2626" />
            <MiniStat value={d.violations.confirmedViolations} label="Onaylı" color="#16a34a" />
            <MiniStat value={d.violations.totalUploads} label="Yükleme" color="#0891b2" />
          </div>
        </div>

        {/* WhatsApp Durumu */}
        <div
          className="card"
          style={{
            cursor: 'pointer',
            background: waInfo.bg,
            border: `1px solid ${waInfo.color}35`,
          }}
          onClick={() => navigate('/admin/whatsapp')}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 16,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
                }}
              >
                <MessageSquare size={18} color="#16a34a" />
              </div>
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>WhatsApp</h3>
            </div>
            <WaIcon size={18} color={waInfo.color} />
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: waInfo.color }}>
            {waInfo.label}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
            {d.waStatus === 'connected'
              ? 'Velilere anlık bildirim gönderilebilir'
              : 'Bağlanmak için tıklayın'}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  value,
  label,
  accent,
  bgTint,
  onClick,
}: {
  icon: React.ElementType;
  value: number;
  label: string;
  accent: string;
  bgTint: string;
  onClick: () => void;
}) {
  return (
    <div
      className="stat-card"
      onClick={onClick}
      style={{
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        userSelect: 'none',
      }}
    >
      <div>
        <div className="stat-label" style={{ marginBottom: 4 }}>
          {label}
        </div>
        <div className="stat-value" style={{ color: accent }}>
          {value}
        </div>
      </div>
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          background: bgTint,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Icon size={22} color={accent} />
      </div>
    </div>
  );
}

function MiniStat({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div
      style={{
        flex: 1,
        textAlign: 'center',
        background: 'white',
        padding: '10px 8px',
        borderRadius: 8,
        border: '1px solid var(--border)',
      }}
    >
      <div style={{ fontSize: 20, fontWeight: 700, color, lineHeight: 1.1 }}>{value}</div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{label}</div>
    </div>
  );
}
