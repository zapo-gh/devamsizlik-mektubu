import { useState, useEffect } from 'react';
import { PageHeader } from '../../../components/ui/PageHeader';
import { DataTable, Column } from '../../../components/ui/DataTable';
import { ActionModal } from '../../../components/ui/ActionModal';
import api from '../../../services/api';
import { Building2, Plus, Trash2, Edit, AlertCircle, Loader2 } from 'lucide-react';

export default function SupplierPage() {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<any | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    taxNumber: '',
    taxOffice: '',
    address: '',
    phone: '',
    email: '',
    iban: '',
    contactPerson: '',
    isActive: true
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await api.get('/supplier');
      setSuppliers(res.data.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Firmalar yüklenirken hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!formData.name) {
        alert('Firma/Tedarikçi Adı zorunludur.');
        return;
      }

      if (editingSupplier) {
        await api.put(`/supplier/${editingSupplier.id}`, formData);
      } else {
        await api.post('/supplier', formData);
      }

      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Kaydedilirken hata oluştu.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Bu firmayı silmek istediğinize emin misiniz? (Bağlı doğrudan temin kayıtları etkilenebilir)')) return;
    try {
      await api.delete(`/supplier/${id}`);
      fetchData();
    } catch (err: any) {
      alert('Silinemedi.');
    }
  };

  const openAddModal = () => {
    setEditingSupplier(null);
    setFormData({
      name: '', taxNumber: '', taxOffice: '', address: '', phone: '', email: '', iban: '', contactPerson: '', isActive: true
    });
    setIsModalOpen(true);
  };

  const openEditModal = (t: any) => {
    setEditingSupplier(t);
    setFormData({
      name: t.name || '',
      taxNumber: t.taxNumber || '',
      taxOffice: t.taxOffice || '',
      address: t.address || '',
      phone: t.phone || '',
      email: t.email || '',
      iban: t.iban || '',
      contactPerson: t.contactPerson || '',
      isActive: t.isActive !== undefined ? t.isActive : true
    });
    setIsModalOpen(true);
  };

  const columns: Column<any>[] = [
    { header: 'Firma / Tedarikçi Adı', accessor: 'name', render: (row: any) => <span className="font-semibold">{row.name}</span> },
    { header: 'Vergi No / T.C.', accessor: 'taxNumber', render: (row: any) => row.taxNumber || '-' },
    { header: 'İletişim', accessor: 'phone', render: (row: any) => (
      <div>
        <div>{row.phone || '-'}</div>
        <div className="text-xs text-slate-500">{row.contactPerson || ''}</div>
      </div>
    )},
    { header: 'Durum', accessor: 'isActive', render: (row: any) => (
      <span className={`px-2 py-1 rounded-full text-xs ${row.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
        {row.isActive ? 'Aktif' : 'Pasif'}
      </span>
    )},
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

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader 
          title="Firma & Tedarikçi Rehberi" 
          description="Doğrudan Temin işlemleri için fiyat/teklif alınan firmalar" 
          icon={<Building2 size={24} />}
        />
        <button
          onClick={openAddModal}
          className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5" />
          <span>Yeni Firma</span>
        </button>
      </div>

      {error && (
        <div className="flex items-center space-x-2 p-4 bg-red-50 text-red-700 rounded-lg border border-red-200">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <DataTable columns={columns} data={suppliers} emptyMessage="Kayıtlı firma bulunamadı." />
      </div>

      <ActionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingSupplier ? 'Firma Bilgilerini Düzenle' : 'Yeni Firma Ekle'}
        onSubmit={handleSave}
      >
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Firma / Kişi Adı</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Vergi No / T.C.</label>
              <input
                type="text"
                value={formData.taxNumber}
                onChange={(e) => setFormData({ ...formData, taxNumber: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Vergi Dairesi</label>
              <input
                type="text"
                value={formData.taxOffice}
                onChange={(e) => setFormData({ ...formData, taxOffice: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Telefon</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">E-Posta</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">IBAN</label>
            <input
              type="text"
              value={formData.iban}
              onChange={(e) => setFormData({ ...formData, iban: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-sm uppercase"
              placeholder="TR..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">İlgili Kişi (Yetkili)</label>
            <input
              type="text"
              value={formData.contactPerson}
              onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Adres</label>
            <textarea
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              rows={2}
            />
          </div>

          <div className="flex items-center mt-4">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
            />
            <label htmlFor="isActive" className="ml-2 block text-sm text-slate-900">
              Firma Aktif (Yeni teminlerde listelensin)
            </label>
          </div>
        </div>
      </ActionModal>
    </div>
  );
}

