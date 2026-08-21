import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../services/api';
import { ArrowLeft, User, Users, FileText, AlertTriangle, ShieldAlert, MessageSquare, History, RefreshCw } from 'lucide-react';

interface Student360Data {
  student: { id: string; schoolNumber: string; fullName: string; className: string; status: string; createdAt: string };
  parents: Array<{ id: string; fullName: string; phone: string; waConsentStatus: string; waConsentDate: string | null; user: { username: string; mustChangePassword: boolean } }>;
  absenteeisms: { summary: { records: number; excusedDays: number; unexcusedDays: number; sent: number; pending: number }; records: Array<{ id: string; warningNumber: number; isBep: boolean; excusedDays: number | null; unexcusedDays: number | null; createdAt: string; viewedByParent: boolean; waSentAt: string | null }> };
  warnings: { total: number; records: Array<{ id: string; warningNumber: number; behaviorCode: string; behaviorText: string; description: string | null; issuedBy: string; issuedAt: string; waSentAt: string | null }> };
  violations: { total: number; confirmed: number; records: Array<{ id: string; type: string; violationDate: string; matchedBy: string; isConfirmed: boolean; createdAt: string }> };
  auditLogs: Array<{ id: string; action: string; metadata: string | null; createdAt: string; user: { username: string; role: string } }>;
}

const fmtDate = (value: string | null) => value ? new Intl.DateTimeFormat('tr-TR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—';
const consentLabel: Record<string, string> = { PENDING: 'Bekliyor', ACCEPTED: 'Onaylandı', DECLINED: 'Reddedildi' };

export default function Student360Page() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<Student360Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    if (!id) return;
    setLoading(true); setError('');
    try {
      const res = await api.get(`/students/360/${id}`);
      setData(res.data.data);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Öğrenci bilgileri yüklenemedi.');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [id]);

  if (loading) return <div className="flex justify-center items-center p-16"><RefreshCw className="animate-spin" /></div>;
  if (error || !data) return <div className="p-8"><p className="text-red-600 mb-4">{error || 'Kayıt bulunamadı.'}</p><button onClick={load} className="px-4 py-2 rounded-lg bg-slate-900 text-white">Tekrar Dene</button></div>;

  const { student } = data;
  return (
    <div className="p-2 md:p-6 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between gap-3 mb-5">
        <button onClick={() => navigate('/admin/students')} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-sm"><ArrowLeft size={16} /> Öğrencilere Dön</button>
        <button onClick={load} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-sm"><RefreshCw size={16} /> Yenile</button>
      </div>

      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 mb-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center"><User className="text-indigo-600" size={28} /></div>
            <div><h1 className="text-2xl font-bold text-slate-900">{student.fullName}</h1><p className="text-sm text-slate-500 mt-1">{student.schoolNumber} · {student.className}</p></div>
          </div>
          <span className={`px-3 py-1.5 rounded-full text-xs font-semibold ${student.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>{student.status === 'ACTIVE' ? 'Aktif Öğrenci' : 'Pasif Öğrenci'}</span>
        </div>
      </section>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <Metric icon={FileText} label="Devamsızlık" value={data.absenteeisms.summary.records} />
        <Metric icon={AlertTriangle} label="Yazılı Uyarı" value={data.warnings.total} />
        <Metric icon={ShieldAlert} label="İhlal" value={data.violations.total} />
        <Metric icon={Users} label="Veli" value={data.parents.length} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <Card icon={Users} title="Veli Bilgileri">
          {data.parents.length === 0 ? <Empty text="Kayıtlı veli yok." /> : data.parents.map(parent => (
            <div key={parent.id} className="border border-slate-200 rounded-xl p-4 mb-3 last:mb-0">
              <div className="flex justify-between gap-3"><div><div className="font-semibold">{parent.fullName}</div><div className="text-sm text-slate-500 mt-1">{parent.phone}</div></div><span className="text-xs px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">WhatsApp: {consentLabel[parent.waConsentStatus] || parent.waConsentStatus}</span></div>
              <div className="text-xs text-slate-500 mt-3">Kullanıcı: {parent.user.username} · {parent.user.mustChangePassword ? 'İlk şifre değişikliği bekleniyor' : 'Şifre aktif'}</div>
            </div>
          ))}
        </Card>

        <Card icon={FileText} title="Devamsızlık Özeti">
          <div className="grid grid-cols-3 gap-2 mb-4"><Mini label="Özürlü Gün" value={data.absenteeisms.summary.excusedDays} /><Mini label="Özürsüz Gün" value={data.absenteeisms.summary.unexcusedDays} /><Mini label="Bekleyen" value={data.absenteeisms.summary.pending} /></div>
          <div className="space-y-2">{data.absenteeisms.records.slice(0, 8).map(item => <Row key={item.id} title={`Mektup #${item.warningNumber}${item.isBep ? ' · BEP' : ''}`} meta={`${fmtDate(item.createdAt)} · ${item.waSentAt ? 'WhatsApp gönderildi' : 'WhatsApp bekliyor'}`} />)}{data.absenteeisms.records.length === 0 && <Empty text="Devamsızlık kaydı yok." />}</div>
        </Card>

        <Card icon={AlertTriangle} title="Yazılı Uyarılar">
          <div className="space-y-2">{data.warnings.records.slice(0, 8).map(item => <Row key={item.id} title={`${item.behaviorCode} · ${item.behaviorText}`} meta={`${fmtDate(item.issuedAt)} · ${item.issuedBy}`} />)}{data.warnings.records.length === 0 && <Empty text="Yazılı uyarı yok." />}</div>
        </Card>

        <Card icon={ShieldAlert} title="İhlal Takibi">
          <div className="flex gap-2 mb-4"><Mini label="Toplam" value={data.violations.total} /><Mini label="Onaylı" value={data.violations.confirmed} /></div>
          <div className="space-y-2">{data.violations.records.slice(0, 8).map(item => <Row key={item.id} title={item.type} meta={`${fmtDate(item.violationDate)} · ${item.isConfirmed ? 'Onaylı' : 'Bekliyor'} · ${item.matchedBy}`} />)}{data.violations.records.length === 0 && <Empty text="İhlal kaydı yok." />}</div>
        </Card>

        <Card icon={History} title="Audit Geçmişi">
          <div className="space-y-2">{data.auditLogs.slice(0, 10).map(item => <Row key={item.id} title={item.action} meta={`${fmtDate(item.createdAt)} · ${item.user.username}`} />)}{data.auditLogs.length === 0 && <Empty text="Audit kaydı yok." />}</div>
        </Card>

        <Card icon={MessageSquare} title="İletişim Durumu">
          <div className="space-y-3">{data.parents.map(parent => <div key={parent.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50"><span className="font-medium text-sm">{parent.fullName}</span><span className={`text-xs font-semibold ${parent.waConsentStatus === 'ACCEPTED' ? 'text-green-600' : parent.waConsentStatus === 'DECLINED' ? 'text-red-600' : 'text-amber-600'}`}>{consentLabel[parent.waConsentStatus] || parent.waConsentStatus}</span></div>)}{data.parents.length === 0 && <Empty text="İletişim bilgisi yok." />}</div>
        </Card>
      </div>
    </div>
  );
}

function Card({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) { return <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5"><div className="flex items-center gap-2 mb-4"><Icon size={18} className="text-indigo-600" /><h2 className="font-semibold text-slate-900">{title}</h2></div>{children}</section>; }
function Metric({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: number }) { return <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3"><Icon size={20} className="text-indigo-600" /><div><div className="text-xl font-bold">{value}</div><div className="text-xs text-slate-500">{label}</div></div></div>; }
function Mini({ label, value }: { label: string; value: number }) { return <div className="bg-slate-50 rounded-lg p-3 text-center"><div className="text-lg font-bold">{value}</div><div className="text-[11px] text-slate-500">{label}</div></div>; }
function Row({ title, meta }: { title: string; meta: string }) { return <div className="p-3 rounded-xl border border-slate-100 bg-slate-50"><div className="text-sm font-medium text-slate-800">{title}</div><div className="text-xs text-slate-500 mt-1">{meta}</div></div>; }
function Empty({ text }: { text: string }) { return <div className="text-sm text-slate-400 py-3">{text}</div>; }
