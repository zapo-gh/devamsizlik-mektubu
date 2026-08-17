import React, { useEffect, useState, useRef } from 'react';
import api from '../../../services/api';
import { useConfirm } from '../../../hooks/useConfirm';
import { CalendarRange, Save, Trash2, MapPin } from 'lucide-react';
import { PageHeader } from '../../../components/ui/PageHeader';
import { ActionModal } from '../../../components/ui/ActionModal';
import toast from 'react-hot-toast';
import { useReactToPrint } from 'react-to-print';
import { DutySchedulePrintTemplate } from './print/DutySchedulePrintTemplate';
import { Printer } from 'lucide-react';

interface DutyStation {
  id: string;
  name: string;
  sortOrder: number;
}

interface Staff {
  id: string;
  name: string;
}

interface Assignment {
  id?: string;
  staffId: string;
  stationId: string;
  dayOfWeek: number; // 1: Pazartesi, ..., 5: Cuma
  weekNumber?: number; // Şimdilik 0 sabit kullanılabilir
}

const DAYS = [
  { val: 1, label: 'Pazartesi' },
  { val: 2, label: 'Salı' },
  { val: 3, label: 'Çarşamba' },
  { val: 4, label: 'Perşembe' },
  { val: 5, label: 'Cuma' },
];

export default function DutySchedulePage() {
  const { confirm, alert } = useConfirm();
  const [stations, setStations] = useState<DutyStation[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);

  const [showStationDrawer, setShowStationDrawer] = useState(false);
  const [stationForm, setStationForm] = useState<Partial<DutyStation>>({});

  const fetchData = async () => {
    setLoading(true);
    try {
      const [stRes, staffRes, assignRes] = await Promise.all([
        api.get('/duty-schedule/stations'),
        api.get('/staff'),
        api.get('/duty-schedule/assignments')
      ]);
      
      const sortedStations = (stRes.data.data || []).sort((a: DutyStation, b: DutyStation) => a.sortOrder - b.sortOrder);
      
      setStations(sortedStations);
      setStaffList(staffRes.data.data?.staff || []);
      setAssignments(assignRes.data.data || []);
    } catch {
      toast.error('Nöbet verileri yüklenemedi.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAssignmentChange = (stationId: string, dayOfWeek: number, staffId: string) => {
    setAssignments(prev => {
      const filtered = prev.filter(a => !(a.stationId === stationId && a.dayOfWeek === dayOfWeek));
      if (staffId) {
        filtered.push({ stationId, dayOfWeek, staffId, weekNumber: 0 });
      }
      return filtered;
    });
  };

  const handleSaveAssignments = async () => {
    try {
      await api.post('/duty-schedule/assignments', { assignments });
      toast.success('Nöbet çizelgesi başarıyla kaydedildi!');
      fetchData();
    } catch {
      toast.error('Çizelge kaydedilirken hata oluştu.');
    }
  };

  const handleSaveStation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (stationForm.id) {
        await api.put(`/duty-schedule/stations/${stationForm.id}`, stationForm);
        toast.success('Nöbet yeri güncellendi');
      } else {
        await api.post('/duty-schedule/stations', stationForm);
        toast.success('Yeni nöbet yeri eklendi');
      }
      setShowStationDrawer(false);
      fetchData();
    } catch {
      toast.error('Nöbet yeri kaydedilemedi.');
    }
  };

  const handleDeleteStation = async (id: string) => {
    if (await confirm('Bu nöbet yerini silmek istediğinize emin misiniz? (Bağlı nöbet kayıtları da etkilenebilir)')) {
      try {
        await api.delete(`/duty-schedule/stations/${id}`);
        fetchData();
      } catch {
        toast.error('Nöbet yeri silinemedi.');
      }
    }
  };

  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: 'Nobet_Cizelgesi',
  });

  return (
    <div className="space-y-4">
      <PageHeader 
        title="Personel Nöbet Çizelgesi" 
        description="Öğretmenlerin ve müdür yardımcılarının günlük nöbet yerleri atama tablosu."
        icon={<CalendarRange size={24} />}
        actionText="Yeni Nöbet Yeri Ekle"
        onAction={() => { setStationForm({ sortOrder: stations.length + 1 }); setShowStationDrawer(true); }}
      />

      {loading ? (
        <div className="p-8 text-center text-gray-500 animate-pulse">Yükleniyor...</div>
      ) : stations.length === 0 ? (
        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 text-center text-gray-500">
          Önce sağ üstten nöbet yerlerini (Örn: Zemin Kat, Bahçe vb.) tanımlamalısınız.
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
            <h3 className="font-bold text-gray-700">Haftalık Nöbet Matrisi</h3>
            <div className="flex gap-3">
              <button 
                onClick={handlePrint}
                className="bg-slate-100 text-slate-700 px-4 py-2 rounded-lg shadow-sm hover:bg-slate-200 transition-colors flex items-center gap-2 font-medium text-sm border border-slate-200"
              >
                <Printer size={18} /> Yazdır (MEB Formatı)
              </button>
              <button 
                onClick={handleSaveAssignments}
                className="bg-green-600 text-white px-4 py-2 rounded-lg shadow-sm hover:bg-green-700 transition-colors flex items-center gap-2 font-medium text-sm"
              >
                <Save size={18} /> Değişiklikleri Kaydet
              </button>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-48">Nöbet Yeri</th>
                  {DAYS.map(d => (
                    <th key={d.val} className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      {d.label}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider w-24">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {stations.map((station) => (
                  <tr key={station.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3 text-sm font-bold text-gray-800 border-r border-gray-100">
                      {station.name}
                    </td>
                    {DAYS.map(day => {
                      const assignment = assignments.find(a => a.stationId === station.id && a.dayOfWeek === day.val);
                      return (
                        <td key={day.val} className="px-2 py-3 border-r border-gray-100">
                          <select
                            value={assignment?.staffId || ''}
                            onChange={(e) => handleAssignmentChange(station.id, day.val, e.target.value)}
                            className={`w-full text-sm border-gray-300 rounded focus:ring-indigo-500 focus:border-indigo-500 ${assignment?.staffId ? 'bg-indigo-50 border-indigo-200 text-indigo-800 font-medium' : 'bg-white text-gray-500'}`}
                          >
                            <option value="">- Boş -</option>
                            {staffList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                          </select>
                        </td>
                      );
                    })}
                    <td className="px-4 py-3 text-right text-sm">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => { setStationForm(station); setShowStationDrawer(true); }} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded"><MapPin size={16}/></button>
                        <button onClick={() => handleDeleteStation(station.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 size={16}/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* GİZLİ YAZDIRMA ŞABLONU */}
      <div className="hidden">
        <DutySchedulePrintTemplate ref={printRef} stations={stations} staffList={staffList} assignments={assignments} />
      </div>

      <ActionModal 
        isOpen={showStationDrawer} 
        onClose={() => setShowStationDrawer(false)} 
        title={stationForm.id ? 'Nöbet Yerini Düzenle' : 'Yeni Nöbet Yeri Ekle'}
        onSubmit={handleSaveStation}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nöbet Yeri Adı</label>
            <input type="text" required value={stationForm.name || ''} onChange={e => setStationForm({...stationForm, name: e.target.value})} className="w-full border border-gray-300 rounded p-2.5 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" placeholder="Örn: 1. Kat Koridor" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sıralama No</label>
            <input type="number" required value={stationForm.sortOrder || ''} onChange={e => setStationForm({...stationForm, sortOrder: Number(e.target.value)})} className="w-full border border-gray-300 rounded p-2.5 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" min="1" />
            <p className="text-xs text-gray-500 mt-1">Tabloda gösterim sırası (Yukarıdan aşağıya)</p>
          </div>
        </div>
      </ActionModal>
    </div>
  );
}
