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
  fieldTripsCount: number;
  commissionsCount: number;
  dutyCount: number;
}

const WA_STATUS_LABELS: Record<
  string,
  { label: string; icon: React.ElementType; color: string; bg: string; border: string }
> = {
  connected: { label: 'Bağlı', icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-100', border: 'border-green-600/35' },
  connecting: { label: 'Bağlanıyor...', icon: Clock, color: 'text-amber-700', bg: 'bg-yellow-100', border: 'border-amber-700/35' },
  qr: { label: 'QR Bekleniyor', icon: QrCode, color: 'text-blue-700', bg: 'bg-blue-100', border: 'border-blue-700/35' },
  disconnected: { label: 'Bağlı Değil', icon: XCircle, color: 'text-red-600', bg: 'bg-red-100', border: 'border-red-600/35' },
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [
        studentsRes, staffRes, absStatsRes, warnStatsRes, violStatsRes, waRes, settingsRes,
        fieldTripRes, commissionRes, dutyRes
      ] = await Promise.all([
          api.get('/students?limit=1&status=ACTIVE').catch((e: any) => { console.warn('Dashboard: /students failed:', e.message); return null; }),
          api.get('/staff').catch((e: any) => { console.warn('Dashboard: /staff failed:', e.message); return null; }),
          api.get('/absenteeism/stats').catch((e: any) => { console.warn('Dashboard: /absenteeism/stats failed:', e.message); return null; }),
          api.get('/warnings/stats').catch((e: any) => { console.warn('Dashboard: /warnings/stats failed:', e.message); return null; }),
          api.get('/violations/stats').catch((e: any) => { console.warn('Dashboard: /violations/stats failed:', e.message); return null; }),
          api.get('/whatsapp/status').catch(() => ({ data: { data: { status: 'disconnected' } } })),
          api.get('/settings').catch((e: any) => { console.warn('Dashboard: /settings failed:', e.message); return null; }),
          api.get('/field-trip').catch(() => null),
          api.get('/commission').catch(() => null),
          api.get('/duty-schedule/stations').catch(() => null),
        ]);

      setData({
        totalStudents: studentsRes?.data?.data?.pagination?.total ?? 0,
        totalStaff: staffRes?.data?.data?.staff?.length ?? 0,
        absenteeism: absStatsRes?.data?.data ?? { total: 0, sentCount: 0, notSentCount: 0 },
        warnings: warnStatsRes?.data?.data ?? { total: 0, studentsWithWarnings: 0 },
        violations: violStatsRes?.data?.data ?? { totalUploads: 0, totalViolations: 0, confirmedViolations: 0 },
        waStatus: waRes?.data?.data?.status ?? 'disconnected',
        schoolName: settingsRes?.data?.data?.schoolName || '',
        principalName: settingsRes?.data?.data?.principalName || '',
        fieldTripsCount: fieldTripRes?.data?.data?.length || 0,
        commissionsCount: commissionRes?.data?.data?.length || 0,
        dutyCount: dutyRes?.data?.data?.length || 0,
      });
    } catch (error) {
      console.error('Dashboard load error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-16 h-full" >
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"   />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center p-16 text-red-600" >
        <p className="text-base font-semibold mb-3" >Veriler yüklenemedi.</p>
        <button className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
          
          onClick={loadAll}
        >
          Tekrar Dene
        </button>
      </div>
    );
  }

  const d = data;
  const waInfo = WA_STATUS_LABELS[d.waStatus] ?? WA_STATUS_LABELS.disconnected;
  const WaIcon = waInfo.icon;

  return (
    <div className="p-2 md:p-6 max-w-[1600px] mx-auto animate-[fade-in_0.25s_ease-out]" >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 bg-white p-5 rounded-2xl border border-slate-300 shadow-md" >
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight" >Gösterge Paneli</h1>
          <p className="text-[13px] text-slate-500 mt-1" >
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
        <div className="flex gap-2.5" >
          <button className="flex items-center gap-1.5 py-2 px-3.5 text-[13px] font-medium bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-md"
            
            onClick={() => navigate('/admin/settings')}
          >
            <Settings size={15} />
            <span>Ayarlar</span>
          </button>
          <button className="flex items-center gap-1.5 py-2 px-3.5 text-[13px] font-medium bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-md"
            
            onClick={loadAll}
          >
            <RefreshCw size={15} />
            <span>Yenile</span>
          </button>
        </div>
      </div>

      {/* Ana İstatistik Kartları (5 Adet Kompakt Shadcn Tarzı) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-5" >
        <StatCard
          icon={Users}
          value={d.totalStudents}
          label="Aktif Öğrenci"
          color="text-blue-500"
          bgTint="bg-blue-500/10"
          onClick={() => navigate('/admin/students')}
        />
        <StatCard
          icon={UserCheck}
          value={d.totalStaff}
          label="Personel"
          color="text-indigo-500"
          bgTint="bg-indigo-500/10"
          onClick={() => navigate('/admin/staff')}
        />
        <StatCard
          icon={CheckCircle2}
          value={d.fieldTripsCount}
          label="Planlı Geziler"
          color="text-emerald-500"
          bgTint="bg-emerald-500/10"
          onClick={() => navigate('/admin/field-trip')}
        />
        <StatCard
          icon={ShieldAlert}
          value={d.commissionsCount}
          label="Komisyonlar"
          color="text-orange-500"
          bgTint="bg-orange-500/10"
          onClick={() => navigate('/admin/commission')}
        />
        <StatCard
          icon={Clock}
          value={d.dutyCount}
          label="Nöbet Yerleri"
          color="text-purple-500"
          bgTint="bg-purple-500/10"
          onClick={() => navigate('/admin/duty-schedule')}
        />
        <StatCard
          icon={UserCheck}
          value={d.totalStaff}
          label="Personel"
          color="text-cyan-600"
          bgTint="bg-cyan-600/10"
          onClick={() => navigate('/admin/staff')}
        />
        <StatCard
          icon={FileText}
          value={d.absenteeism.total}
          label="Devamsızlık Kaydı"
          color="text-purple-600"
          bgTint="bg-purple-600/10"
          onClick={() => navigate('/admin/absenteeism')}
        />
        <StatCard
          icon={AlertTriangle}
          value={d.warnings.total}
          label="Yazılı Uyarı"
          color="text-amber-600"
          bgTint="bg-amber-600/10"
          onClick={() => navigate('/admin/warnings')}
        />
        <StatCard
          icon={ShieldAlert}
          value={d.violations.confirmedViolations}
          label="Onaylı İhlal"
          color="text-red-600"
          bgTint="bg-red-600/10"
          onClick={() => navigate('/admin/violations')}
        />
      </div>

      {/* Alt Satır: Detay Kartları (4 Adet Kompakt Kart) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6" >
        {/* Devamsızlık Detayı */}
        <div className="bg-white rounded-xl border border-slate-300 p-5 shadow-md hover:shadow-md transition-shadow cursor-pointer"
          
          onClick={() => navigate('/admin/absenteeism')}
        >
          <div className="flex items-center justify-between mb-4" >
            <div className="flex items-center gap-2.5" >
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center" >
                <FileText className="text-indigo-500"  size={18}  />
              </div>
              <h3 className="m-0 text-sm font-semibold text-slate-900" >Devamsızlık Durumu</h3>
            </div>
            <span className="text-[11px] bg-slate-100 px-2 py-0.5 rounded-full text-slate-500 font-medium" >
              Mektup
            </span>
          </div>
          <div className="flex flex-wrap gap-2" >
            <MiniStat value={d.absenteeism.notSentCount} label="Gönderilmedi" color="text-red-600" />
            <MiniStat value={d.absenteeism.sentCount} label="Gönderildi" color="text-green-600" />
            <MiniStat value={d.absenteeism.total} label="Toplam" color="text-indigo-600" />
          </div>
        </div>

        {/* Yazılı Uyarı Detayı */}
        <div className="bg-white rounded-xl border border-slate-300 p-5 shadow-md hover:shadow-md transition-shadow cursor-pointer"
          
          onClick={() => navigate('/admin/warnings')}
        >
          <div className="flex items-center justify-between mb-4" >
            <div className="flex items-center gap-2.5" >
              <div className="w-8 h-8 rounded-lg bg-amber-600/10 flex items-center justify-center" >
                <AlertTriangle className="text-amber-600"  size={18}  />
              </div>
              <h3 className="m-0 text-sm font-semibold text-slate-900" >Yazılı Uyarılar</h3>
            </div>
            <span className="text-[11px] bg-slate-100 px-2 py-0.5 rounded-full text-slate-500 font-medium" >
              Uyarı
            </span>
          </div>
          <div className="flex flex-wrap gap-2" >
            <MiniStat value={d.warnings.total} label="Toplam Uyarı" color="text-amber-600" />
            <MiniStat value={d.warnings.studentsWithWarnings} label="Etkilenen Öğrenci" color="text-purple-600" />
          </div>
        </div>

        {/* İhlal Detayı */}
        <div className="bg-white rounded-xl border border-slate-300 p-5 shadow-md hover:shadow-md transition-shadow cursor-pointer"
          
          onClick={() => navigate('/admin/violations')}
        >
          <div className="flex items-center justify-between mb-4" >
            <div className="flex items-center gap-2.5" >
              <div className="w-8 h-8 rounded-lg bg-red-600/10 flex items-center justify-center" >
                <ShieldAlert className="text-red-600"  size={18}  />
              </div>
              <h3 className="m-0 text-sm font-semibold text-slate-900" >İhlal Takibi</h3>
            </div>
            <span className="text-[11px] bg-slate-100 px-2 py-0.5 rounded-full text-slate-500 font-medium" >
              Disiplin
            </span>
          </div>
          <div className="flex flex-wrap gap-2" >
            <MiniStat value={d.violations.totalUploads} label="İhlal Yüklemesi" color="text-blue-600" />
            <MiniStat value={d.violations.totalViolations} label="Toplam İhlal" color="text-orange-600" />
            <MiniStat value={d.violations.confirmedViolations} label="Onaylı" color="text-red-600" />
          </div>
        </div>

        {/* WhatsApp Durumu */}
        <div
          className={`rounded-xl border ${waInfo.bg} ${waInfo.border} p-5 shadow-md hover:shadow-md transition-shadow cursor-pointer`}
          onClick={() => navigate('/admin/whatsapp')}
        >
          <div className="flex items-center justify-between mb-4" >
            <div className="flex items-center gap-2.5" >
              <div className="w-8 h-8 rounded-lg bg-white shadow-md flex items-center justify-center" >
                <MessageSquare className="text-green-600"  size={18}  />
              </div>
              <h3 className="m-0 text-sm font-semibold text-slate-900" >WhatsApp</h3>
            </div>
            <WaIcon size={18} className={waInfo.color} />
          </div>
          <div className={`text-base font-bold ${waInfo.color}`}>
            {waInfo.label}
          </div>
          <div className="text-[12px] text-slate-500 mt-1" >
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
  color,
  bgTint,
  onClick,
}: {
  icon: React.ElementType;
  value: number;
  label: string;
  color: string;
  bgTint: string;
  onClick: () => void;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-md hover:shadow-md transition-shadow cursor-pointer flex items-center justify-between select-none"
      
      onClick={onClick}
    >
      <div>
        <div className="text-[12px] text-slate-500 font-medium mb-1" >
          {label}
        </div>
        <div className={`text-xl font-bold ${color}`}>
          {value}
        </div>
      </div>
      <div className={`w-11 h-11 rounded-xl ${bgTint} flex items-center justify-center shrink-0`}>
        <Icon size={22} className={color} />
      </div>
    </div>
  );
}

function MiniStat({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div className="flex-1 min-w-[75px] text-center bg-white py-2.5 px-2 rounded-lg border border-slate-200 shadow-sm overflow-hidden" >
      <div className={`text-[20px] font-bold leading-tight ${color}`}>{value}</div>
      <div className="text-[10px] sm:text-[11px] text-slate-500 mt-1 font-medium truncate" title={label} >{label}</div>
    </div>
  );
}
