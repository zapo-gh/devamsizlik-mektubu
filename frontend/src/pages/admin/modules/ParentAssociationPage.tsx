import { useSettings } from '../../../context/SettingsContext';
import { useState, useEffect, useRef } from 'react';
import { PageHeader } from '../../../components/ui/PageHeader';
import { DataTable, Column } from '../../../components/ui/DataTable';
import api from '../../../services/api';
import { Calendar, Users2, Plus, Trash2, Edit, Printer, X, PlusCircle, AlertCircle, Save, Loader2 } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import { ParentAssociationPrintTemplate } from './print/ParentAssociationPrintTemplate';

export default function ParentAssociationPage() {
  const [meetings, setMeetings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'info'|'agenda'|'print'>('info');

  const [formData, setFormData] = useState<any>({
    type: 'Yönetim Kurulu Toplantısı',
    meetingNumber: 1,
    date: new Date().toISOString().split('T')[0],
    notes: '',
    agendaItems: []
  });

  const { settings } = useSettings();
  const academicYear = settings?.academicYear || '2024-2025';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/parent-association?academicYear=${academicYear}`);
      
      const parsedData = (res.data.data || []).map((item: any) => {
        let extra = { agendaItems: [] };
        if (item.extraData) {
          try { extra = JSON.parse(item.extraData); } catch (e) {}
        }
        return { ...item, extra };
      });
      
      setMeetings(parsedData);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Veriler yüklenirken hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      if (!formData.type) {
        alert('Toplantı Türü zorunludur.');
        return;
      }
      
      const payload = {
        type: formData.type,
        meetingNumber: parseInt(formData.meetingNumber) || 1,
        date: formData.date,
        notes: formData.notes,
        academicYear,
        extraData: JSON.stringify({
          agendaItems: formData.agendaItems
        })
      };

      if (editingId) {
        await api.put(`/parent-association/${editingId}`, payload);
      } else {
        await api.post('/parent-association', payload);
      }

      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Kaydedilirken hata oluştu.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Okul Aile Birliği toplantısını silmek istediğinize emin misiniz?')) return;
    try {
      await api.delete(`/parent-association/${id}`);
      fetchData();
    } catch (err: any) {
      alert('Silinemedi.');
    }
  };

  const openAddModal = () => {
    setEditingId(null);
    setActiveTab('info');
    setFormData({
      type: 'Yönetim Kurulu Toplantısı',
      meetingNumber: meetings.length + 1,
      date: new Date().toISOString().split('T')[0],
      notes: 'Okul kantin kirası ve bakım onarım giderleri hk.',
      agendaItems: [
        { id: crypto.randomUUID(), topic: 'Açılış ve yoklama', decision: 'Yönetim kurulu eksiksiz toplandı.' }
      ]
    });
    setIsModalOpen(true);
  };

  const openEditModal = (meeting: any) => {
    setEditingId(meeting.id);
    setActiveTab('info');
    setFormData({
      type: meeting.type || '',
      meetingNumber: meeting.meetingNumber || 1,
      date: meeting.date,
      notes: meeting.notes || '',
      agendaItems: meeting.extra?.agendaItems || []
    });
    setIsModalOpen(true);
  };

  const addAgendaItem = () => {
    setFormData({
      ...formData,
      agendaItems: [...formData.agendaItems, { id: crypto.randomUUID(), topic: '', decision: '' }]
    });
  };

  const updateAgendaItem = (id: string, field: string, value: string) => {
    setFormData({
      ...formData,
      agendaItems: formData.agendaItems.map((item: any) => item.id === id ? { ...item, [field]: value } : item)
    });
  };

  const removeAgendaItem = (id: string) => {
    setFormData({
      ...formData,
      agendaItems: formData.agendaItems.filter((item: any) => item.id !== id)
    });
  };

  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: 'OAB_Karar_Tutanagi'
  });

  const columns: Column<any>[] = [
    { header: 'Toplantı Türü', accessor: 'type', render: (row: any) => <span className="font-semibold">{row.type}</span> },
    { header: 'Toplantı / Karar No', accessor: 'meetingNumber' },
    { header: 'Tarih', accessor: 'date' },
    { header: 'Gündem', accessor: 'counts', render: (row: any) => <span className="text-slate-500 text-sm">{row.extra?.agendaItems?.length || 0} Madde</span> },
    { 
      header: 'İşlemler',
      align: 'right',
      render: (row: any) => (
        <div className="flex justify-end space-x-2">
          <button onClick={() => openEditModal(row)} className="text-blue-600 hover:text-blue-900" title="Düzenle">
            <Edit className="w-5 h-5" />
          </button>
          <button onClick={() => handleDelete(row.id)} className="text-red-600 hover:text-red-900" title="Sil">
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      )
    }
  ];

  if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>;

  return (
    <div className="space-y-6 relative">
      <div className="print:hidden flex items-center justify-between">
        <PageHeader 
          title="Okul Aile Birliği" 
          description="OAB yönetim kurulu toplantıları, kararlar ve gelir/gider tutanakları" 
          icon={<Users2 size={24} />}
        />
        <button
          onClick={openAddModal}
          className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5" />
          <span>Yeni Karar Tutanağı</span>
        </button>
      </div>

      {error && (
        <div className="print:hidden flex items-center space-x-2 p-4 bg-red-50 text-red-700 rounded-lg border border-red-200">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <div className="print:hidden bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <DataTable columns={columns} data={meetings} emptyMessage="Kayıtlı toplantı veya karar tutanağı bulunamadı." />
      </div>

      {/* MODAL */}
      {isModalOpen && (
        <div className="print:hidden fixed inset-0 z-50 flex items-center justify-center bg-black/60  p-4 sm:p-6">
          <div className="bg-slate-50 w-full max-w-5xl h-full max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200 shrink-0">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                  <Calendar className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-bold text-slate-800">
                  {editingId ? 'Karar Düzenle' : 'Yeni Karar Tutanağı'}
                </h2>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex border-b border-slate-200 bg-white px-6 shrink-0 space-x-8">
              {[
                { id: 'info', label: 'Toplantı Bilgileri' },
                { id: 'agenda', label: 'Gündem ve Kararlar' },
                { id: 'print', label: 'Yazdır / Çıktı' }
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
                <div className="space-y-6 max-w-2xl">
                  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Toplantı Türü / Başlığı</label>
                      <input type="text" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" placeholder="Örn: Yönetim Kurulu Toplantısı" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Toplantı / Karar No</label>
                        <input type="number" value={formData.meetingNumber} onChange={e => setFormData({...formData, meetingNumber: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Toplantı Tarihi</label>
                        <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Açıklama (Opsiyonel)</label>
                      <textarea rows={2} value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" placeholder="Genel toplantı notları..." />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'agenda' && (
                <div className="space-y-4 max-w-4xl">
                  <div className="flex justify-end">
                     <button onClick={addAgendaItem} className="flex items-center space-x-1 text-sm bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg hover:bg-indigo-100 font-medium">
                        <PlusCircle className="w-4 h-4" />
                        <span>Yeni Karar Ekle</span>
                     </button>
                  </div>
                  {formData.agendaItems.map((item: any, idx: number) => (
                    <div key={item.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col space-y-3 relative group">
                      <div className="flex justify-between items-center mb-1">
                        <h4 className="font-semibold text-slate-800">Karar Madde {idx + 1}</h4>
                        <button onClick={() => removeAgendaItem(item.id)} className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Gündem Konusu / Görüşülen Konu</label>
                        <input type="text" value={item.topic} onChange={(e) => updateAgendaItem(item.id, 'topic', e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Örn: Okul aile birliği bağışlarının durumu" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Alınan Karar / Sonuç</label>
                        <textarea value={item.decision} onChange={(e) => updateAgendaItem(item.id, 'decision', e.target.value)} rows={3} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Oy birliği ile şu yönde karar alınmıştır..." />
                      </div>
                    </div>
                  ))}
                  {formData.agendaItems.length === 0 && (
                    <div className="text-center py-10 bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl text-slate-500">
                      Henüz gündem / karar maddesi eklenmedi.
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'print' && (
                <div className="flex flex-col items-center space-y-4">
                  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm text-center max-w-sm w-full space-y-4 hover:border-indigo-300">
                     <Printer className="w-12 h-12 text-indigo-500 mx-auto" />
                     <div>
                       <h3 className="font-bold text-slate-800">Okul Aile Birliği Karar Tutanağı</h3>
                       <p className="text-sm text-slate-500 mt-1">Gündem maddeleri ve kararları içeren yönetim kurulu defteri formatında çıktı.</p>
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

      <div className="hidden">
        <ParentAssociationPrintTemplate ref={printRef} formData={formData} />
      </div>

    </div>
  );
}


