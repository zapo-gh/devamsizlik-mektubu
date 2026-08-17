import React, { useEffect, useState, useRef } from 'react';
import api from '../../../services/api';
import { useConfirm } from '../../../hooks/useConfirm';
import { CalendarDays, Edit2, Trash2, Plus, Printer, Save, X } from 'lucide-react';
import { PageHeader } from '../../../components/ui/PageHeader';
import { DataTable, Column } from '../../../components/ui/DataTable';
import { useReactToPrint } from 'react-to-print';
import { AnnualPlanPrintTemplate } from './print/AnnualPlanPrintTemplate';

interface AnnualPlanItem {
  id: string;
  academicYear: string;
  month: number;
  title: string;
  description?: string;
  category: string;
  sortOrder: number;
}

const MONTHS = [
  { val: 9, label: 'Eylül' },
  { val: 10, label: 'Ekim' },
  { val: 11, label: 'Kasım' },
  { val: 12, label: 'Aralık' },
  { val: 1, label: 'Ocak' },
  { val: 2, label: 'Şubat' },
  { val: 3, label: 'Mart' },
  { val: 4, label: 'Nisan' },
  { val: 5, label: 'Mayıs' },
  { val: 6, label: 'Haziran' },
  { val: 7, label: 'Temmuz' },
  { val: 8, label: 'Ağustos' },
];

const CATEGORIES = [
  { val: 'IDARI', label: 'İdari İşler', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  { val: 'EGITIM', label: 'Eğitim Öğretim', color: 'bg-green-100 text-green-800 border-green-200' },
  { val: 'SOSYAL', label: 'Sosyal & Kültürel', color: 'bg-purple-100 text-purple-800 border-purple-200' },
  { val: 'DIGER', label: 'Diğer', color: 'bg-gray-100 text-gray-800 border-gray-200' },
];

export default function AnnualPlanPage() {
  const { confirm, alert } = useConfirm();
  const [items, setItems] = useState<AnnualPlanItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState<Partial<AnnualPlanItem>>({});

  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: 'Yillik_Calisma_Plani'
  });

  const academicYear = '2025-2026';

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/annual-plan?academicYear=${academicYear}`);
      // Ay (Eylül-Ağustos sıralaması) ve sortOrder'a göre frontend sıralaması
      const sorted = (res.data.data || []).sort((a: AnnualPlanItem, b: AnnualPlanItem) => {
        const getMonthWeight = (m: number) => m >= 9 ? m - 9 : m + 3;
        const wA = getMonthWeight(a.month);
        const wB = getMonthWeight(b.month);
        if (wA === wB) return a.sortOrder - b.sortOrder;
        return wA - wB;
      });
      setItems(sorted);
    } catch {
      alert('Planlar yüklenemedi');
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
      if (!form.title) {
        alert('Çalışma / Konu başlığı zorunludur.');
        return;
      }
      
      const payload = { ...form, academicYear };
      if (form.id) {
        await api.put(`/annual-plan/${form.id}`, payload);
      } else {
        await api.post('/annual-plan', payload);
      }
      setIsModalOpen(false);
      fetchData();
    } catch {
      alert('Kaydedilirken hata oluştu.');
    }
  };

  const handleDelete = async (id: string) => {
    if (await confirm('Bu çalışma maddesini silmek istediğinize emin misiniz?')) {
      try {
        await api.delete(`/annual-plan/${id}`);
        fetchData();
      } catch {
        alert('Silinemedi.');
      }
    }
  };

  const openAddModal = () => {
    setForm({ month: new Date().getMonth() + 1, category: 'IDARI', sortOrder: items.length + 1, title: '', description: '' });
    setIsModalOpen(true);
  };

  const openEditModal = (i: AnnualPlanItem) => {
    setForm(i);
    setIsModalOpen(true);
  };



  const columns: Column<AnnualPlanItem>[] = [
    {
      header: 'Ay',
      render: (i) => <div className="font-bold text-slate-800 w-16">{MONTHS.find(m => m.val === i.month)?.label || '-'}</div>
    },
    {
      header: 'Kategori',
      render: (i) => {
        const cat = CATEGORIES.find(c => c.val === i.category);
        return <span className={`px-2 py-1 text-xs font-bold rounded-lg border ${cat?.color || 'bg-gray-100'}`}>{cat?.label || i.category}</span>
      }
    },
    {
      header: 'Çalışma / Konu',
      render: (i) => (
        <div>
          <div className="font-bold text-slate-800">{i.title}</div>
          <div className="text-xs text-slate-500 mt-0.5 truncate max-w-md">{i.description || 'Açıklama yok'}</div>
        </div>
      )
    },
    {
      header: 'Sıra',
      render: (i) => <span className="text-sm font-medium text-slate-500">{i.sortOrder}</span>
    },
    {
      header: 'İşlemler',
      align: 'right',
      render: (i) => (
        <div className="flex justify-end gap-2">
          <button onClick={() => openEditModal(i)} className="text-blue-600 hover:text-blue-900" title="Düzenle">
            <Edit2 size={20} />
          </button>
          <button onClick={() => handleDelete(i.id)} className="text-red-600 hover:text-red-900" title="Sil">
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
          title="Yıllık Çalışma Planı" 
          description="Eğitim-öğretim yılı boyunca yapılacak idari, sosyal ve akademik çalışmaların takvimi"
          icon={<CalendarDays size={24} />}
        />
        <div className="flex space-x-3">
          <button
            onClick={handlePrint}
            className="flex items-center space-x-2 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition-colors shadow-sm"
          >
            <Printer className="w-5 h-5" />
            <span>Yazdır</span>
          </button>
          <button
            onClick={openAddModal}
            className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
          >
            <Plus className="w-5 h-5" />
            <span>Yeni Madde Ekle</span>
          </button>
        </div>
      </div>

      <div className="print:hidden bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <DataTable data={items} columns={columns} emptyMessage="Kayıtlı çalışma maddesi bulunamadı." />
      </div>

      {/* MODAL */}
      {isModalOpen && (
        <div className="print:hidden fixed inset-0 z-50 flex items-center justify-center bg-black/60  p-4 sm:p-6">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                  <CalendarDays className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-bold text-slate-800">
                  {form.id ? 'Maddeyi Düzenle' : 'Yeni Plan Maddesi'}
                </h2>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Planlanan Ay</label>
                  <select
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                    value={form.month || 9}
                    onChange={e => setForm({ ...form, month: parseInt(e.target.value) })}
                  >
                    {MONTHS.map(m => <option key={m.val} value={m.val}>{m.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Kategori</label>
                  <select
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                    value={form.category || 'IDARI'}
                    onChange={e => setForm({ ...form, category: e.target.value })}
                  >
                    {CATEGORIES.map(c => <option key={c.val} value={c.val}>{c.label}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Çalışma / Konu Başlığı</label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                  value={form.title || ''}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Açıklama (Opsiyonel)</label>
                <textarea
                  rows={3}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                  value={form.description || ''}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Sıralama (Ay içindeki sıra)</label>
                <input
                  type="number"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                  value={form.sortOrder || 1}
                  onChange={e => setForm({ ...form, sortOrder: parseInt(e.target.value) })}
                />
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

      {/* GİZLİ YAZDIRMA ŞABLONU */}
      <div className="hidden">
        <AnnualPlanPrintTemplate ref={printRef} items={items} academicYear={academicYear} />
      </div>

    </div>
  );
}
