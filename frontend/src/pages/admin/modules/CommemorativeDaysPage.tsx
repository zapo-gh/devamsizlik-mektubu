import React, { useEffect, useState, useRef } from 'react';
import api from '../../../services/api';
import { useSettings } from '../../../context/SettingsContext';
import { useConfirm } from '../../../hooks/useConfirm';
import { Flag, Edit2, Trash2, Plus, Printer, Save, X } from 'lucide-react';
import { PageHeader } from '../../../components/ui/PageHeader';
import { DataTable, Column } from '../../../components/ui/DataTable';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { useReactToPrint } from 'react-to-print';
import { CommemorativeDaysPrintTemplate } from './print/CommemorativeDaysPrintTemplate';

interface Staff {
  id: string;
  name: string;
}

interface CommemorativeDay {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  academicYear: string;
  description?: string;
  assignedStaffId?: string;
  assignedStaffName?: string;
  status: string;
}

export default function CommemorativeDaysPage() {
  const { confirm, alert } = useConfirm();
  const [days, setDays] = useState<CommemorativeDay[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'info'|'print'>('info');
  const [form, setForm] = useState<Partial<CommemorativeDay>>({});

  const { settings } = useSettings();
  const academicYear = settings?.academicYear || '2024-2025';

  const fetchData = async () => {
    setLoading(true);
    try {
      const [daysRes, staffRes] = await Promise.all([
        api.get(`/commemorative-days?academicYear=${academicYear}`),
        api.get('/staff')
      ]);
      setDays(daysRes.data.data || []);
      setStaffList(staffRes.data.data?.staff || []);
    } catch {
      alert('Veriler yüklenemedi');
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
      if (!form.name || !form.startDate) {
        alert('Etkinlik Adı ve Başlangıç Tarihi zorunludur.');
        return;
      }
      
      const payload = { ...form, academicYear };
      if (form.id) {
        await api.put(`/commemorative-days/${form.id}`, payload);
      } else {
        await api.post('/commemorative-days', payload);
      }
      setIsModalOpen(false);
      fetchData();
    } catch {
      alert('Kaydedilirken hata oluştu.');
    }
  };

  const handleDelete = async (id: string) => {
    if (await confirm('Bu kaydı silmek istediğinize emin misiniz?')) {
      try {
        await api.delete(`/commemorative-days/${id}`);
        fetchData();
      } catch {
        alert('Silinemedi.');
      }
    }
  };

  const openAddModal = () => {
    setActiveTab('info');
    setForm({ 
      name: '29 Ekim Cumhuriyet Bayramı', description: 'Cumhuriyetin ilanı kutlama programı ve panosu', 
      status: 'BEKLIYOR',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
      assignedStaffId: '', assignedStaffName: ''
    });
    setIsModalOpen(true);
  };

  const openEditModal = (d: CommemorativeDay) => {
    setActiveTab('info');
    setForm(d);
    setIsModalOpen(true);
  };

  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: 'Gorevlendirme_Yazisi'
  });

  const columns: Column<CommemorativeDay>[] = [
    {
      header: 'Program / Etkinlik Adı',
      render: (d) => (
        <div>
          <div className="font-bold text-slate-800">{d.name}</div>
          <div className="text-xs text-slate-500 mt-0.5 truncate max-w-xs" title={d.description}>{d.description || 'Açıklama yok'}</div>
        </div>
      )
    },
    {
      header: 'Tarih',
      render: (d) => (
        <div className="font-medium text-slate-700">
          {new Date(d.startDate).toLocaleDateString('tr-TR')} 
          {d.endDate && d.endDate !== d.startDate && ` - ${new Date(d.endDate).toLocaleDateString('tr-TR')}`}
        </div>
      )
    },
    {
      header: 'Görevli Öğretmen',
      render: (d) => <span className="font-medium text-slate-700">{d.assignedStaffName || '-'}</span>
    },
    {
      header: 'Durum',
      render: (d) => (
        <StatusBadge 
          status={d.status} 
          colorMap={{
            'BEKLIYOR': 'yellow',
            'HAZIRLIK_ASAMASINDA': 'blue',
            'TAMAMLANDI': 'green',
            'IPTAL': 'red'
          }} 
        />
      )
    },
    {
      header: 'İşlemler',
      align: 'right',
      render: (d) => (
        <div className="flex justify-end gap-2">
          <button onClick={() => openEditModal(d)} className="text-blue-600 hover:text-blue-900" title="Düzenle">
            <Edit2 size={20} />
          </button>
          <button onClick={() => handleDelete(d.id)} className="text-red-600 hover:text-red-900" title="Sil">
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
          title="Belirli Gün ve Haftalar" 
          description="Eğitim yılı içerisindeki belirli gün ve haftaların kutlama ve anma programları"
          icon={<Flag size={24} />}
        />
        <button
          onClick={openAddModal}
          className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5" />
          <span>Yeni Program Ekle</span>
        </button>
      </div>

      <div className="print:hidden bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <DataTable data={days} columns={columns} loading={loading} emptyMessage="Henüz belirli gün/hafta planlaması yapılmamış." />
      </div>

      {/* MODAL */}
      {isModalOpen && (
        <div className="print:hidden fixed inset-0 z-50 flex items-center justify-center bg-black/60  p-4 sm:p-6">
          <div className="bg-slate-50 w-full max-w-3xl h-full max-h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200 shrink-0">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                  <Flag className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-bold text-slate-800">
                  {form.id ? 'Program Düzenle' : 'Yeni Kutlama/Anma Programı'}
                </h2>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex border-b border-slate-200 bg-white px-6 shrink-0 space-x-8">
              {[
                { id: 'info', label: 'Görevlendirme Bilgileri' },
                { id: 'print', label: 'Görevlendirme Yazısı (Çıktı)' }
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
                        <label className="block text-sm font-medium text-slate-700 mb-1">Gün / Hafta Adı</label>
                        <input type="text" value={form.name || ''} onChange={e => setForm({...form, name: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" placeholder="Örn: 10 Kasım Atatürk'ü Anma Günü" />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-slate-700 mb-1">Açıklama / İçerik</label>
                        <textarea rows={2} value={form.description || ''} onChange={e => setForm({...form, description: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" placeholder="Program içeriği..." />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Başlangıç Tarihi</label>
                        <input type="date" value={form.startDate?.split('T')[0] || ''} onChange={e => setForm({...form, startDate: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Bitiş Tarihi</label>
                        <input type="date" value={form.endDate?.split('T')[0] || ''} onChange={e => setForm({...form, endDate: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Sorumlu / Görevli Öğretmen</label>
                        <select 
                          value={form.assignedStaffId || ''} 
                          onChange={(e) => {
                            const staffId = e.target.value;
                            const staffObj = staffList.find(s => s.id === staffId);
                            setForm({...form, assignedStaffId: staffId, assignedStaffName: staffObj ? staffObj.name : ''});
                          }}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="">-- Öğretmen Seçiniz --</option>
                          {staffList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Hazırlık Durumu</label>
                        <select value={form.status || 'BEKLIYOR'} onChange={e => setForm({...form, status: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500">
                          <option value="BEKLIYOR">Bekliyor (Atanmadı)</option>
                          <option value="HAZIRLIK_ASAMASINDA">Hazırlık Aşamasında</option>
                          <option value="TAMAMLANDI">Program Tamamlandı / Sunuldu</option>
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
                       <h3 className="font-bold text-slate-800">Görevlendirme Yazısı</h3>
                       <p className="text-sm text-slate-500 mt-1">İlgili öğretmene tebliğ edilecek resmi görevlendirme evrakı.</p>
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

      {/* GİZLİ YAZDIRMA ŞABLONU */}
      {isModalOpen && (
        <div className="hidden">
           <CommemorativeDaysPrintTemplate ref={printRef} form={form} />
        </div>
      )}

    </div>
  );
}


