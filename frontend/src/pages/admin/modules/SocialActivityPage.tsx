import React, { useEffect, useState } from 'react';
import api from '../../../services/api';
import { useSettings } from '../../../context/SettingsContext';
import { useConfirm } from '../../../hooks/useConfirm';
import { Music, Edit2, Trash2, Plus, Printer, Save, X } from 'lucide-react';
import { PageHeader } from '../../../components/ui/PageHeader';
import { DataTable, Column } from '../../../components/ui/DataTable';
import { StatusBadge } from '../../../components/ui/StatusBadge';

interface Staff {
  id: string;
  name: string;
}

interface SocialActivity {
  id: string;
  name: string;
  type: string;
  description?: string;
  plannedDate?: string;
  academicYear: string;
  assignedStaffId?: string;
  assignedStaffName?: string;
  status: string;
  notes?: string;
}

const TYPES = [
  { val: 'KULTUREL', label: 'Kültürel (Tiyatro, Sinema vb.)' },
  { val: 'SPOR', label: 'Sportif (Turnuva, Maç vb.)' },
  { val: 'BILIMSEL', label: 'Bilimsel (TÜBİTAK, Proje Fuarı vb.)' },
  { val: 'SOSYAL', label: 'Sosyal Sorumluluk (Kermes, Yardım vb.)' },
  { val: 'DIGER', label: 'Diğer Etkinlikler' },
];

export default function SocialActivityPage() {
  const { confirm, alert } = useConfirm();
  const [activities, setActivities] = useState<SocialActivity[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'info'|'print'>('info');
  const [form, setForm] = useState<Partial<SocialActivity>>({});

  const { settings } = useSettings();
  const academicYear = settings?.academicYear || '2024-2025';

  const fetchData = async () => {
    setLoading(true);
    try {
      const [actRes, staffRes] = await Promise.all([
        api.get(`/social-activity?academicYear=${academicYear}`),
        api.get('/staff')
      ]);
      setActivities(actRes.data.data || []);
      setStaffList(staffRes.data.data?.staff || []);
    } catch {
      alert('Etkinlikler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!form.name || !form.plannedDate) {
        alert('Etkinlik Adı ve Planlanan Tarih zorunludur.');
        return;
      }

      const payload = { ...form, academicYear };
      if (form.id) {
        await api.put(`/social-activity/${form.id}`, payload);
      } else {
        await api.post('/social-activity', payload);
      }
      setIsModalOpen(false);
      fetchData();
    } catch {
      alert('Kaydedilirken hata oluştu.');
    }
  };

  const handleDelete = async (id: string) => {
    if (await confirm('Bu etkinliği silmek istediğinize emin misiniz?')) {
      try {
        await api.delete(`/social-activity/${id}`);
        fetchData();
      } catch {
        alert('Silinemedi.');
      }
    }
  };

  const openAddModal = () => {
    setActiveTab('info');
    setForm({ 
      name: '', description: '', type: 'SOSYAL', status: 'PLAN_ASAMASINDA',
      plannedDate: new Date().toISOString().split('T')[0],
      assignedStaffId: '', assignedStaffName: '', notes: ''
    });
    setIsModalOpen(true);
  };

  const openEditModal = (a: SocialActivity) => {
    setActiveTab('info');
    setForm(a);
    setIsModalOpen(true);
  };

  const handlePrint = () => {
    window.print();
  };

  const columns: Column<SocialActivity>[] = [
    {
      header: 'Etkinlik / Tür',
      render: (a) => (
        <div>
          <div className="font-bold text-slate-800">{a.name}</div>
          <div className="text-xs font-semibold text-indigo-600 mt-0.5">{TYPES.find(t => t.val === a.type)?.label || a.type}</div>
        </div>
      )
    },
    {
      header: 'Planlanan Tarih',
      render: (a) => <span className="font-medium text-slate-700">{a.plannedDate ? new Date(a.plannedDate).toLocaleDateString('tr-TR') : 'Tarih Belirsiz'}</span>
    },
    {
      header: 'Sorumlu Öğretmen',
      render: (a) => <span className="font-medium text-slate-700">{a.assignedStaffName || 'Atanmadı'}</span>
    },
    {
      header: 'Durum',
      render: (a) => (
        <StatusBadge 
          status={a.status} 
          colorMap={{
            'PLAN_ASAMASINDA': 'gray',
            'ILCE_ONAYINDA': 'yellow',
            'ONAYLANDI': 'blue',
            'GERCEKLESTI': 'green',
            'IPTAL': 'red'
          }} 
        />
      )
    },
    {
      header: 'İşlemler',
      align: 'right',
      render: (a) => (
        <div className="flex justify-end gap-2">
          <button onClick={() => openEditModal(a)} className="text-blue-600 hover:text-blue-900" title="Düzenle">
            <Edit2 size={20} />
          </button>
          <button onClick={() => handleDelete(a.id)} className="text-red-600 hover:text-red-900" title="Sil">
            <Trash2 size={20} />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6 relative">
      <div className="print:hidden flex items-center justify-between">
        <PageHeader 
          title="Sosyal ve Kültürel Etkinlikler" 
          description="Okulda düzenlenen veya okul dışı sosyal faaliyetlerin izin ve onay işlemleri"
          icon={<Music size={24} />}
        />
        <button
          onClick={openAddModal}
          className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5" />
          <span>Yeni Etkinlik Planla</span>
        </button>
      </div>

      <div className="print:hidden bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <DataTable data={activities} columns={columns} loading={loading} emptyMessage="Kayıtlı etkinlik bulunamadı." />
      </div>

      {/* MODAL */}
      {isModalOpen && (
        <div className="print:hidden fixed inset-0 z-50 flex items-center justify-center bg-black/60  p-4 sm:p-6">
          <div className="bg-slate-50 w-full max-w-3xl h-full max-h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200 shrink-0">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                  <Music className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-bold text-slate-800">
                  {form.id ? 'Etkinlik Düzenle' : 'Yeni Sosyal Etkinlik'}
                </h2>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex border-b border-slate-200 bg-white px-6 shrink-0 space-x-8">
              {[
                { id: 'info', label: 'Etkinlik Bilgileri' },
                { id: 'print', label: 'Onay Yazısı (Çıktı)' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-4 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.id ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
              {activeTab === 'info' && (
                <div className="space-y-6">
                  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-slate-700 mb-1">Etkinlik Adı</label>
                        <input type="text" value={form.name || ''} onChange={e => setForm({...form, name: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" placeholder="Örn: Yıl Sonu Tiyatro Gösterisi" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Etkinlik Türü</label>
                        <select value={form.type || 'SOSYAL'} onChange={e => setForm({...form, type: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500">
                          {TYPES.map(t => <option key={t.val} value={t.val}>{t.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Planlanan Tarih</label>
                        <input type="date" value={form.plannedDate?.split('T')[0] || ''} onChange={e => setForm({...form, plannedDate: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-slate-700 mb-1">Etkinliğin Amacı / Açıklaması</label>
                        <textarea rows={2} value={form.description || ''} onChange={e => setForm({...form, description: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" placeholder="Öğrencilere tiyatro kültürünü aşılamak vb..." />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Sorumlu Öğretmen / Kulüp</label>
                        <select 
                          value={form.assignedStaffId || ''} 
                          onChange={(e) => {
                            const staffId = e.target.value;
                            const staffObj = staffList.find(s => s.id === staffId);
                            setForm({...form, assignedStaffId: staffId, assignedStaffName: staffObj ? staffObj.name : ''});
                          }}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="">-- Danışman Seçiniz --</option>
                          {staffList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">İzin / Onay Durumu</label>
                        <select value={form.status || 'PLAN_ASAMASINDA'} onChange={e => setForm({...form, status: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500">
                          <option value="PLAN_ASAMASINDA">Plan Aşamasında (Okul İçi)</option>
                          <option value="ILCE_ONAYINDA">İlçe MEM Onayında</option>
                          <option value="ONAYLANDI">Onaylandı (Hazır)</option>
                          <option value="GERCEKLESTI">Gerçekleşti</option>
                          <option value="IPTAL">İptal Edildi</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'print' && (
                <div className="flex flex-col items-center space-y-4 pt-10">
                  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm text-center max-w-sm w-full space-y-4 hover:border-indigo-300">
                     <Printer className="w-12 h-12 text-indigo-500 mx-auto" />
                     <div>
                       <h3 className="font-bold text-slate-800">Sosyal Etkinlik İzin Onayı</h3>
                       <p className="text-sm text-slate-500 mt-1">Okul müdürlüğü ve İlçe MEM onayına sunulacak resmi dilekçe formu.</p>
                     </div>
                     <button onClick={handlePrint} className="w-full py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 font-medium flex items-center justify-center space-x-2">
                       <Printer className="w-4 h-4" />
                       <span>Yazdır</span>
                     </button>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-end space-x-3 shrink-0">
              <button onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-200 rounded-lg transition-colors">
                İptal Et
              </button>
              <button onClick={handleSave} className="flex items-center space-x-2 px-6 py-2.5 bg-indigo-600 text-white font-medium hover:bg-indigo-700 rounded-lg transition-colors shadow-sm">
                <Save className="w-5 h-5" />
                <span>Kaydet</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* YAZDIRMA (PRINT) ALANI */}
      {isModalOpen && (
        <div className="hidden print:block font-serif bg-white text-black" style={{ margin: '0 auto', border: 'none', padding: '10px', boxSizing: 'border-box', minHeight: '277mm', width: '100%' }}>
          <style>{`
            @media print {
              @page { size: A4 portrait; margin: 15mm; }
              body { background: white; margin: 0; padding: 0; font-size: 15px; }
            }
          `}</style>
          
          <div className="text-center font-bold text-lg mb-16 leading-tight">
            T.C.<br/>
            MİLLİ EĞİTİM BAKANLIĞI<br/>
            ... LİSESİ MÜDÜRLÜĞÜNE<br/>
          </div>

          <div className="text-justify leading-loose mb-16">
            <p className="indent-10">
               Okulumuzda yürütülen sosyal ve kültürel faaliyetler kapsamında, <strong>{form.plannedDate ? new Date(form.plannedDate).toLocaleDateString('tr-TR') : '................'}</strong> tarihinde 
               <strong> {form.name}</strong> adıyla bir etkinlik düzenlenmesi planlanmaktadır.
            </p>
            <p className="indent-10 mt-4">
               "{TYPES.find(t => t.val === form.type)?.label || form.type}" türünde gerçekleştirilecek olan bu etkinliğin temel amacı; {form.description || 'öğrencilerimizin sosyokültürel gelişimlerine katkı sağlamaktır.'} 
            </p>
            <p className="indent-10 mt-4">
               Etkinliğin okulumuz içerisinde / dışında gerçekleştirilmesi ve gerekli yasal izinlerin alınması hususunda;
            </p>
            <p className="indent-10 mt-4">
               Makamlarınızca da uygun görülmesi halinde Olur'larınıza arz ederim.
            </p>
          </div>

          <div className="grid grid-cols-2 text-center mt-32 gap-x-32">
             <div>
                <p className="font-bold">Sorumlu / Danışman Öğretmen</p>
                <p className="mt-2">{form.assignedStaffName || '....................'}</p>
                <br/><br/>
                <p>İmza</p>
             </div>
             <div>
                <p className="font-bold">O L U R</p>
                <p className="mt-2 text-sm">.../.../20...</p>
                <p className="mt-4 font-bold">Okul Müdürü</p>
                <br/><br/>
                <p>İmza</p>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}


