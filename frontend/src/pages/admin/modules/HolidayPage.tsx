import React, { useEffect, useState } from 'react';
import api from '../../../services/api';
import { useConfirm } from '../../../hooks/useConfirm';
import { CalendarOff, Edit2, Trash2, Plus, Printer, Save, X } from 'lucide-react';
import { PageHeader } from '../../../components/ui/PageHeader';
import { DataTable, Column } from '../../../components/ui/DataTable';
import { StatusBadge } from '../../../components/ui/StatusBadge';

interface Holiday {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  academicYear: string;
  isRecurring: number | boolean;
}

export default function HolidayPage() {
  const { confirm, alert } = useConfirm();
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState<Partial<Holiday>>({});
  const [isPrinting, setIsPrinting] = useState(false);

  const academicYear = '2025-2026';

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/holiday?academicYear=${academicYear}`);
      
      // Tarihe göre sırala
      const sorted = (res.data.data || []).sort((a: Holiday, b: Holiday) => {
        return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
      });

      setHolidays(sorted);
    } catch {
      alert('Tatiller yüklenemedi');
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
      if (!form.name || !form.startDate || !form.endDate) {
        alert('Tüm alanları doldurunuz.');
        return;
      }

      const payload = { 
        ...form, 
        academicYear, 
        isRecurring: form.isRecurring ? 1 : 0 
      };

      if (form.id) {
        await api.put(`/holiday/${form.id}`, payload);
      } else {
        await api.post('/holiday', payload);
      }
      setIsModalOpen(false);
      fetchData();
    } catch {
      alert('Kaydedilirken hata oluştu.');
    }
  };

  const handleDelete = async (id: string) => {
    if (await confirm('Bu tatili silmek istediğinize emin misiniz?')) {
      try {
        await api.delete(`/holiday/${id}`);
        fetchData();
      } catch {
        alert('Silinemedi.');
      }
    }
  };

  const openAddModal = () => {
    setForm({ 
      name: '', 
      isRecurring: 0,
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0]
    });
    setIsModalOpen(true);
  };

  const openEditModal = (h: Holiday) => {
    setForm({
      ...h,
      startDate: h.startDate.split('T')[0],
      endDate: h.endDate.split('T')[0]
    });
    setIsModalOpen(true);
  };

  const handlePrint = () => {
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 100);
  };

  const columns: Column<Holiday>[] = [
    {
      header: 'Tatil / Dini Gün Adı',
      render: (h) => <span className="font-bold text-slate-800">{h.name}</span>
    },
    {
      header: 'Başlangıç Tarihi',
      render: (h) => <span className="font-medium text-slate-700">{new Date(h.startDate).toLocaleDateString('tr-TR')}</span>
    },
    {
      header: 'Bitiş Tarihi',
      render: (h) => <span className="font-medium text-slate-700">{new Date(h.endDate).toLocaleDateString('tr-TR')}</span>
    },
    {
      header: 'Tekrarlanma',
      render: (h) => (
        <StatusBadge 
          status={h.isRecurring} 
          trueText="Her Yıl Tekrarlanır (Sabit)" 
          falseText="Tek Seferlik (Değişken)" 
        />
      )
    },
    {
      header: 'İşlemler',
      align: 'right',
      render: (h) => (
        <div className="flex justify-end gap-2">
          <button onClick={() => openEditModal(h)} className="text-blue-600 hover:text-blue-900" title="Düzenle">
            <Edit2 size={20} />
          </button>
          <button onClick={() => handleDelete(h.id)} className="text-red-600 hover:text-red-900" title="Sil">
            <Trash2 size={20} />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-4 relative">
      <div className="print:hidden flex items-center justify-between">
        <PageHeader 
          title="Resmi ve Dini Tatiller" 
          description="Nöbet ve devamsızlık hesaplamalarında hariç tutulacak çalışma takvimi (tatil günleri)."
          icon={<CalendarOff size={24} />}
        />
        <div className="flex space-x-3">
          <button
            onClick={handlePrint}
            className="flex items-center space-x-2 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition-colors shadow-sm"
          >
            <Printer className="w-5 h-5" />
            <span>Takvimi Yazdır</span>
          </button>
          <button
            onClick={openAddModal}
            className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
          >
            <Plus className="w-5 h-5" />
            <span>Yeni Tatil Ekle</span>
          </button>
        </div>
      </div>

      <div className="print:hidden bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <DataTable 
          data={holidays} 
          columns={columns} 
          loading={loading}
          emptyMessage="Sisteme kayıtlı tatil günü bulunmuyor."
        />
      </div>

      {/* MODAL */}
      {isModalOpen && !isPrinting && (
        <div className="print:hidden fixed inset-0 z-50 flex items-center justify-center bg-black/60  p-4 sm:p-6">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                  <CalendarOff className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-bold text-slate-800">
                  {form.id ? 'Tatili Düzenle' : 'Yeni Tatil Ekle'}
                </h2>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tatil Adı</label>
                <input 
                  type="text" 
                  required 
                  value={form.name || ''} 
                  onChange={e => setForm({...form, name: e.target.value})} 
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" 
                  placeholder="Örn: Ramazan Bayramı" 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Başlangıç Tarihi</label>
                  <input 
                    type="date" 
                    required 
                    value={form.startDate || ''} 
                    onChange={e => setForm({...form, startDate: e.target.value})} 
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Bitiş Tarihi</label>
                  <input 
                    type="date" 
                    required 
                    value={form.endDate || ''} 
                    onChange={e => setForm({...form, endDate: e.target.value})} 
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" 
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-2 border-t border-slate-100">
                <input 
                  type="checkbox" 
                  id="recurring" 
                  checked={!!form.isRecurring} 
                  onChange={e => setForm({...form, isRecurring: e.target.checked ? 1 : 0})} 
                  className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500" 
                />
                <label htmlFor="recurring" className="text-sm font-medium text-slate-700 cursor-pointer">
                  Her yıl aynı tarihte tekrarlanır (Sabit tarihli tatiller için)
                </label>
              </div>

              <div className="pt-4 flex justify-end space-x-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-lg">İptal</button>
                <button type="submit" className="flex items-center space-x-2 px-6 py-2.5 bg-indigo-600 text-white font-medium hover:bg-indigo-700 rounded-lg">
                  <Save className="w-5 h-5" />
                  <span>Kaydet</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* YAZDIRMA (PRINT) ALANI - Sadece yazdırırken görünür */}
      <div className={`hidden ${isPrinting ? 'print:block' : ''} font-serif bg-white text-black`} style={{ margin: '0 auto', border: 'none', padding: '10px', boxSizing: 'border-box' }}>
        <style>{`
          @media print {
            @page { size: A4 portrait; margin: 15mm; }
            body { background: white; margin: 0; padding: 0; font-size: 14px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #000; padding: 10px; }
            th { background-color: #f3f4f6 !important; -webkit-print-color-adjust: exact; text-align: left; }
          }
        `}</style>

        <div className="text-center font-bold text-lg mb-8 leading-tight">
          T.C.<br/>
          MİLLİ EĞİTİM BAKANLIĞI<br/>
          ... LİSESİ MÜDÜRLÜĞÜ<br/>
          {academicYear} EĞİTİM ÖĞRETİM YILI
        </div>

        <h2 className="text-center font-bold text-xl underline mb-6 uppercase">ÇALIŞMA TAKVİMİ (RESMİ VE DİNİ TATİL GÜNLERİ)</h2>

        <table>
          <thead>
            <tr>
              <th style={{ width: '50px', textAlign: 'center' }}>S.No</th>
              <th>Tatil Adı</th>
              <th style={{ width: '150px' }}>Başlangıç Tarihi</th>
              <th style={{ width: '150px' }}>Bitiş Tarihi</th>
              <th style={{ width: '100px', textAlign: 'center' }}>Gün</th>
            </tr>
          </thead>
          <tbody>
            {holidays.map((item, idx) => {
               const start = new Date(item.startDate);
               const end = new Date(item.endDate);
               // Basit gün farkı hesaplama (Tatil gün sayısını yaklaşık göstermek için)
               const diffTime = Math.abs(end.getTime() - start.getTime());
               const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

               return (
                 <tr key={item.id}>
                   <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                   <td className="font-bold">{item.name}</td>
                   <td>{start.toLocaleDateString('tr-TR')}</td>
                   <td>{end.toLocaleDateString('tr-TR')}</td>
                   <td style={{ textAlign: 'center' }}>{diffDays} Gün</td>
                 </tr>
               )
            })}
            {holidays.length === 0 && (
              <tr><td colSpan={5} className="text-center p-4">Kayıtlı tatil günü bulunmamaktadır.</td></tr>
            )}
          </tbody>
        </table>

        <div className="mt-6 text-sm text-justify mb-20">
           * İşbu tatil çizelgesi, öğretmen nöbet planlamaları ve öğrenci devamsızlık hesaplamalarında esas alınmak üzere düzenlenmiştir.
        </div>

        <div className="text-center">
           <p className="font-bold">UYGUNDUR</p>
           <p className="mt-1 font-bold">Okul Müdürü</p>
           <br/><br/>
           <p>....................</p>
        </div>
      </div>

    </div>
  );
}
