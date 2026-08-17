import React, { useEffect, useState, useRef } from 'react';
import api from '../../../services/api';
import { useConfirm } from '../../../hooks/useConfirm';
import { Mail, Edit2, Trash2, Plus, Printer, Save, X, PlusCircle } from 'lucide-react';
import { PageHeader } from '../../../components/ui/PageHeader';
import { DataTable, Column } from '../../../components/ui/DataTable';
import { useReactToPrint } from 'react-to-print';
import { OrderLetterPrintTemplate } from './print/OrderLetterPrintTemplate';

interface OrderItem {
  name: string;
  quantity: number;
  unit: string;
  unitPrice: number;
}

interface OrderLetter {
  id: string;
  subject: string;
  supplierName: string;
  supplierAddress: string;
  date: string;
  deliveryDate: string;
  academicYear: string;
  items: any;
  notes: string;
}

export default function OrderLetterPage() {
  const { confirm } = useConfirm();
  const [letters, setLetters] = useState<OrderLetter[]>([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState<Partial<OrderLetter>>({ items: [] });
  const [itemsList, setItemsList] = useState<OrderItem[]>([]);

  const academicYear = '2025-2026';

  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: 'Siparis_Mektubu'
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/order-letter?academicYear=${academicYear}`);
      setLetters(res.data.data || []);
    } catch {
      alert('Veriler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openAddModal = () => {
    setForm({
      subject: '',
      supplierName: '',
      supplierAddress: '',
      date: new Date().toISOString().split('T')[0],
      deliveryDate: new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0],
      notes: ''
    });
    setItemsList([]);
    setIsModalOpen(true);
  };

  const openEditModal = (letter: OrderLetter) => {
    setForm(letter);
    let parsed = [];
    try {
      parsed = typeof letter.items === 'string' ? JSON.parse(letter.items) : letter.items;
    } catch { }
    setItemsList(parsed || []);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = { ...form, academicYear, items: itemsList };
      if (form.id) {
        await api.put(`/order-letter/${form.id}`, payload);
      } else {
        await api.post('/order-letter', payload);
      }
      setIsModalOpen(false);
      fetchData();
    } catch {
      alert('Kaydedilirken hata oluştu.');
    }
  };

  const handleDelete = async (id: string) => {
    if (await confirm('Sipariş mektubunu silmek istediğinize emin misiniz?')) {
      try {
        await api.delete(`/order-letter/${id}`);
        fetchData();
      } catch {
        alert('Silinemedi.');
      }
    }
  };

  const addItem = () => {
    setItemsList([...itemsList, { name: '', quantity: 1, unit: 'Adet', unitPrice: 0 }]);
  };

  const removeItem = (idx: number) => {
    setItemsList(itemsList.filter((_, i) => i !== idx));
  };

  const updateItem = (idx: number, field: keyof OrderItem, val: any) => {
    const arr = [...itemsList];
    arr[idx] = { ...arr[idx], [field]: val };
    setItemsList(arr);
  };

  const triggerPrint = (letter: OrderLetter) => {
    setForm(letter);
    let parsed = [];
    try {
      parsed = typeof letter.items === 'string' ? JSON.parse(letter.items) : letter.items;
    } catch { }
    setItemsList(parsed || []);
    setTimeout(() => {
      handlePrint();
    }, 100);
  };

  const columns: Column<OrderLetter>[] = [
    { header: 'Konu', accessor: 'subject', render: (row) => <span className="font-semibold">{row.subject}</span> },
    { header: 'Firma Adı', accessor: 'supplierName' },
    { header: 'Sipariş Tarihi', accessor: 'date', render: (row) => new Date(row.date).toLocaleDateString('tr-TR') },
    { header: 'Teslim Tarihi', accessor: 'deliveryDate', render: (row) => new Date(row.deliveryDate).toLocaleDateString('tr-TR') },
    {
      header: 'İşlemler',
      align: 'right',
      render: (row) => (
        <div className="flex justify-end gap-2">
          <button onClick={() => triggerPrint(row)} className="text-emerald-600 hover:text-emerald-900" title="Yazdır">
            <Printer size={20} />
          </button>
          <button onClick={() => openEditModal(row)} className="text-blue-600 hover:text-blue-900" title="Düzenle">
            <Edit2 size={20} />
          </button>
          <button onClick={() => handleDelete(row.id)} className="text-red-600 hover:text-red-900" title="Sil">
            <Trash2 size={20} />
          </button>
        </div>
      )
    }
  ];

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Yükleniyor...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <PageHeader 
          title="Sipariş Mektubu" 
          description="Satın alma için firmalara gönderilen resmi sipariş mektupları."
          icon={<Mail size={24} />}
        />
        <button
          onClick={openAddModal}
          className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5" />
          <span>Yeni Sipariş</span>
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <DataTable data={letters} columns={columns} emptyMessage="Kayıtlı sipariş mektubu bulunamadı." />
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 sm:p-6 overflow-y-auto">
          <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col my-auto h-auto max-h-[95vh] overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50 shrink-0">
              <h2 className="text-xl font-bold text-slate-800">
                {form.id ? 'Siparişi Düzenle' : 'Yeni Sipariş Mektubu'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Konu</label>
                  <input type="text" required value={form.subject || ''} onChange={e => setForm({...form, subject: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" placeholder="Örn: Kırtasiye Malzemesi Alımı" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Firma Adı</label>
                  <input type="text" required value={form.supplierName || ''} onChange={e => setForm({...form, supplierName: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Firma Adresi</label>
                  <input type="text" value={form.supplierAddress || ''} onChange={e => setForm({...form, supplierAddress: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Sipariş Tarihi</label>
                  <input type="date" required value={form.date || ''} onChange={e => setForm({...form, date: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Teslim Edilecek Tarih</label>
                  <input type="date" required value={form.deliveryDate || ''} onChange={e => setForm({...form, deliveryDate: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-slate-700">Sipariş Kalemleri</label>
                  <button type="button" onClick={addItem} className="flex items-center space-x-1 text-sm text-indigo-600 hover:text-indigo-800">
                    <PlusCircle className="w-4 h-4" />
                    <span>Kalem Ekle</span>
                  </button>
                </div>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 border-b">
                      <tr>
                        <th className="px-4 py-2">Mal/Hizmet Cinsi</th>
                        <th className="px-4 py-2 w-24">Miktar</th>
                        <th className="px-4 py-2 w-28">Birim</th>
                        <th className="px-4 py-2 w-32">Birim Fiyat</th>
                        <th className="px-4 py-2 w-16"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {itemsList.map((item, idx) => (
                        <tr key={idx} className="border-b last:border-b-0">
                          <td className="px-2 py-2"><input type="text" value={item.name} onChange={e => updateItem(idx, 'name', e.target.value)} className="w-full px-2 py-1 border rounded" /></td>
                          <td className="px-2 py-2"><input type="number" min="1" value={item.quantity} onChange={e => updateItem(idx, 'quantity', parseInt(e.target.value))} className="w-full px-2 py-1 border rounded" /></td>
                          <td className="px-2 py-2"><input type="text" value={item.unit} onChange={e => updateItem(idx, 'unit', e.target.value)} className="w-full px-2 py-1 border rounded" /></td>
                          <td className="px-2 py-2"><input type="number" step="0.01" value={item.unitPrice} onChange={e => updateItem(idx, 'unitPrice', parseFloat(e.target.value))} className="w-full px-2 py-1 border rounded" /></td>
                          <td className="px-2 py-2 text-center">
                            <button type="button" onClick={() => removeItem(idx)} className="text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4" /></button>
                          </td>
                        </tr>
                      ))}
                      {itemsList.length === 0 && (
                        <tr><td colSpan={5} className="px-4 py-4 text-center text-slate-500">Henüz kalem eklenmemiş.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Not (Opsiyonel)</label>
                <textarea rows={2} value={form.notes || ''} onChange={e => setForm({...form, notes: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" />
              </div>

            </div>

            <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-end space-x-3 shrink-0">
              <button onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-200 rounded-lg">İptal</button>
              <button onClick={handleSave} className="flex items-center space-x-2 px-6 py-2.5 bg-indigo-600 text-white font-medium hover:bg-indigo-700 rounded-lg shadow-sm">
                <Save className="w-5 h-5" />
                <span>Kaydet</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="hidden">
        <OrderLetterPrintTemplate ref={printRef} form={{ ...form, items: JSON.stringify(itemsList) }} />
      </div>

    </div>
  );
}
