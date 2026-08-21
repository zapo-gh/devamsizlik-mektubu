import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileText,
  MessageSquare,
  RefreshCw,
  Settings,
  ShieldAlert,
  UserCheck,
  Users,
  XCircle,
} from 'lucide-react';

interface DashboardData {
  totalStudents: number;
  totalStaff: number;
  absenteeism: { total: number; sentCount: number; notSentCount: number };
  warnings: { total: number; studentsWithWarnings: number };
  violations: { totalUploads: number; totalViolations: number; confirmedViolations: number };
  whatsapp: { consentedParents: number };
  schoolName: string;
  principalName: string;
  fieldTripsCount: number;
  commissionsCount: number;
  dutyCount: number;
}

const emptyData: DashboardData = {
  totalStudents: 0,
  totalStaff: 0,
  absenteeism: { total: 0, sentCount: 0, notSentCount: 0 },
  warnings: { total: 0, studentsWithWarnings: 0 },
  violations: { totalUploads: 0, totalViolations: 0, confirmedViolations: 0 },
  whatsapp: { consentedParents: 0 },
  schoolName: '',
  principalName: '',
  fieldTripsCount: 0,
  commissionsCount: 0,
  dutyCount: 0,
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData>(emptyData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/dashboard/summary');
      setData(response.data?.data ?? emptyData);
    } catch (err: any) {
      console.error('Dashboard load error:', err);
      setError('Gösterge paneli verileri yüklenemedi.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (loading) {
    return <div className="flex h-full min-h-[360px] items-center justify-center"><RefreshCw className="animate-spin text-slate-500" size={28} /></div>;
  }

  const cards = [
    { icon: Users, value: data.totalStudents, label: 'Aktif Öğrenci', color: 'text-blue-600', bg: 'bg-blue-50', path: '/admin/students' },
    { icon: UserCheck, value: data.totalStaff, label: 'Aktif Personel', color: 'text-indigo-600', bg: 'bg-indigo-50', path: '/admin/staff' },
    { icon: CheckCircle2, value: data.fieldTripsCount, label: 'Planlı Gezi', color: 'text-emerald-600', bg: 'bg-emerald-50', path: '/admin/field-trip' },
    { icon: ShieldAlert, value: data.commissionsCount, label: 'Aktif Komisyon', color: 'text-orange-600', bg: 'bg-orange-50', path: '/admin/commission' },
    { icon: Clock, value: data.dutyCount, label: 'Nöbet Yeri', color: 'text-purple-600', bg: 'bg-purple-50', path: '/admin/duty-schedule' },
    { icon: FileText, value: data.absenteeism.total, label: 'Devamsızlık Kaydı', color: 'text-cyan-600', bg: 'bg-cyan-50', path: '/admin/absenteeism' },
    { icon: AlertTriangle, value: data.warnings.total, label: 'Yazılı Uyarı', color: 'text-amber-600', bg: 'bg-amber-50', path: '/admin/warnings' },
    { icon: ShieldAlert, value: data.violations.confirmedViolations, label: 'Onaylı İhlal', color: 'text-red-600', bg: 'bg-red-50', path: '/admin/violations' },
  ];

  return (
    <div className="mx-auto max-w-[1600px] p-2 md:p-6">
      <header className="mb-6 flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Gösterge Paneli</h1>
          <p className="mt-1 text-[13px] text-slate-500">
            {data.schoolName || 'OkulDesk Yönetim Paneli'}
            {data.principalName ? ` · Müdür: ${data.principalName}` : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => navigate('/admin/settings')} className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-[13px] font-medium hover:bg-slate-50">
            <Settings size={15} /> Ayarlar
          </button>
          <button onClick={load} className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-[13px] font-medium hover:bg-slate-50">
            <RefreshCw size={15} /> Yenile
          </button>
        </div>
      </header>

      {error && <div className="mb-5 flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"><span>{error}</span><button onClick={load} className="font-semibold underline">Tekrar dene</button></div>}

      <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8">
        {cards.map(({ icon: Icon, value, label, color, bg, path }) => (
          <button key={label} onClick={() => navigate(path)} className="flex min-h-[108px] items-center justify-between rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <div><div className="mb-1 text-[12px] font-medium text-slate-500">{label}</div><div className={`text-2xl font-bold ${color}`}>{value}</div></div>
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${bg}`}><Icon size={20} className={color} /></div>
          </button>
        ))}
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DetailCard title="Devamsızlık Durumu" icon={FileText} onClick={() => navigate('/admin/absenteeism')}>
          <MiniStat value={data.absenteeism.notSentCount} label="Gönderilmedi" className="text-red-600" />
          <MiniStat value={data.absenteeism.sentCount} label="Gönderildi" className="text-green-600" />
          <MiniStat value={data.absenteeism.total} label="Toplam" className="text-indigo-600" />
        </DetailCard>
        <DetailCard title="Yazılı Uyarılar" icon={AlertTriangle} onClick={() => navigate('/admin/warnings')}>
          <MiniStat value={data.warnings.total} label="Toplam" className="text-amber-600" />
          <MiniStat value={data.warnings.studentsWithWarnings} label="Öğrenci" className="text-purple-600" />
        </DetailCard>
        <DetailCard title="İhlal Takibi" icon={ShieldAlert} onClick={() => navigate('/admin/violations')}>
          <MiniStat value={data.violations.totalUploads} label="Yükleme" className="text-blue-600" />
          <MiniStat value={data.violations.totalViolations} label="Toplam" className="text-orange-600" />
          <MiniStat value={data.violations.confirmedViolations} label="Onaylı" className="text-red-600" />
        </DetailCard>
        <DetailCard title="WhatsApp" icon={MessageSquare} onClick={() => navigate('/admin/whatsapp')}>
          <div className="col-span-3 flex items-center gap-3 rounded-lg bg-slate-50 p-3">
            <CheckCircle2 size={20} className="text-green-600" />
            <div><div className="text-lg font-bold text-slate-900">{data.whatsapp.consentedParents}</div><div className="text-[11px] text-slate-500">Onaylı veli</div></div>
          </div>
        </DetailCard>
      </section>
    </div>
  );
}

function DetailCard({ title, icon: Icon, onClick, children }: { title: string; icon: React.ElementType; onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} className="rounded-xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:shadow-md"><div className="mb-4 flex items-center gap-2.5"><div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100"><Icon size={18} className="text-slate-700" /></div><h2 className="text-sm font-semibold text-slate-900">{title}</h2></div><div className="grid grid-cols-3 gap-2">{children}</div></button>;
}

function MiniStat({ value, label, className }: { value: number; label: string; className: string }) {
  return <div className="rounded-lg border border-slate-200 bg-white px-2 py-2.5 text-center"><div className={`text-xl font-bold ${className}`}>{value}</div><div className="mt-1 truncate text-[10px] font-medium text-slate-500">{label}</div></div>;
}
