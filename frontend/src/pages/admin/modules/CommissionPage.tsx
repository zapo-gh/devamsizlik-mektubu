import { useState, useEffect } from 'react';
import { PageHeader } from '../../../components/ui/PageHeader';
import { DataTable, Column } from '../../../components/ui/DataTable';
import api from '../../../services/api';
import { Network, Plus, Trash2, Edit, AlertCircle, Loader2, Save, X, Printer, PlusCircle, Users } from 'lucide-react';
import { useSettings } from '../../../context/SettingsContext';

export default function CommissionPage() {
  const [commissions, setCommissions] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { settings } = useSettings();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'info'|'members'|'print'>('info');

  const [formData, setFormData] = useState<any>({
    name: '',
    description: '',
    status: 'AKTIF',
    roles: []
  });

  const academicYear = settings?.academicYear || '2025-2026';

  useEffect(() => {
    fetchData();
  }, [academicYear]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [commRes, staffRes] = await Promise.all([
        api.get(`/commission?academicYear=${academicYear}`),
        api.get('/staff')
      ]);
      
      const parsedData = (commRes.data.data || []).map((item: any) => {
        let extra = { roles: [] };
        if (item.extraData) {
          try { extra = JSON.parse(item.extraData); } catch (e) {}
        }
        return { ...item, extra };
      });
      
      setCommissions(parsedData);
      setStaff(staffRes.data.data?.staff || staffRes.data.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Veriler yüklenirken hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      if (!formData.name) {
        alert('Komisyon adı zorunludur.');
        return;
      }
      
      const payload = {
        name: formData.name,
        description: formData.description,
        status: formData.status,
        academicYear,
        sortOrder: 1, // backend constraint workaround
        extraData: JSON.stringify({
          roles: formData.roles
        })
      };

      if (editingId) {
        await api.put(`/commission/${editingId}`, payload);
      } else {
        await api.post('/commission', payload);
      }

      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Kaydedilirken hata oluştu.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Komisyonu silmek istediğinize emin misiniz?')) return;
    try {
      await api.delete(`/commission/${id}`);
      fetchData();
    } catch (err: any) {
      alert('Silinemedi.');
    }
  };

  const openAddModal = () => {
    setEditingId(null);
    setActiveTab('info');
    setFormData({
      name: '',
      description: '',
      status: 'AKTIF',
      roles: [
        { id: crypto.randomUUID(), roleName: 'Başkan', staffName: '' },
        { id: crypto.randomUUID(), roleName: 'Asil Üye', staffName: '' },
        { id: crypto.randomUUID(), roleName: 'Asil Üye', staffName: '' },
        { id: crypto.randomUUID(), roleName: 'Yedek Üye', staffName: '' }
      ]
    });
    setIsModalOpen(true);
  };

  const openEditModal = (comm: any) => {
    setEditingId(comm.id);
    setActiveTab('info');
    setFormData({
      name: comm.name || '',
      description: comm.description || '',
      status: comm.status || 'AKTIF',
      roles: comm.extra?.roles || []
    });
    setIsModalOpen(true);
  };

  const addRole = () => {
    setFormData({
      ...formData,
      roles: [...formData.roles, { id: crypto.randomUUID(), roleName: 'Üye', staffName: '' }]
    });
  };

  const updateRole = (id: string, field: string, value: string) => {
    setFormData({
      ...formData,
      roles: formData.roles.map((item: any) => item.id === id ? { ...item, [field]: value } : item)
    });
  };

  const removeRole = (id: string) => {
    setFormData({
      ...formData,
      roles: formData.roles.filter((item: any) => item.id !== id)
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const columns: Column<any>[] = [
    { header: 'Komisyon Adı', accessor: 'name', render: (row: any) => (
      <div>
         <span className="font-semibold block">{row.name}</span>
         <span className="text-xs text-slate-500">{row.description}</span>
      </div>
    )},
    { header: 'Durum', accessor: 'status', render: (row: any) => (
      <span className="px-2 py-1 rounded-full text-xs bg-indigo-100 text-indigo-800 font-medium">
        {row.status}
      </span>
    )},
    { header: 'Üye Sayısı', accessor: 'counts', render: (row: any) => <span className="text-slate-500 text-sm">{row.extra?.roles?.length || 0} Kişi</span> },
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
          title="Kurul & Komisyonlar" 
          description={`Okul içi komisyonların tanımlanması, üyelerin atanması ve onay yazıları ${academicYear ? `(${academicYear})` : ''}`} 
          icon={<Network size={24} />}
        />
        <button
          onClick={openAddModal}
          className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5" />
          <span>Yeni Komisyon</span>
        </button>
      </div>

      {error && (
        <div className="print:hidden flex items-center space-x-2 p-4 bg-red-50 text-red-700 rounded-lg border border-red-200">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <div className="print:hidden bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <DataTable columns={columns} data={commissions} emptyMessage="Kayıtlı komisyon bulunamadı." exportable exportFilename="Komisyon_Listesi" />
      </div>

      {/* MODAL */}
      {isModalOpen && (
        <div className="print:hidden fixed inset-0 z-50 flex items-center justify-center bg-black/60  p-4 sm:p-6">
          <div className="bg-slate-50 w-full max-w-4xl h-full max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200 shrink-0">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                  <Network className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-bold text-slate-800">
                  {editingId ? 'Komisyon Düzenle' : 'Yeni Komisyon'}
                </h2>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex border-b border-slate-200 bg-white px-6 shrink-0 space-x-8">
              {[
                { id: 'info', label: 'Komisyon Bilgileri' },
                { id: 'members', label: 'Üyeler ve Görevler' },
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
                      <label className="block text-sm font-medium text-slate-700 mb-1">Komisyon Adı</label>
                      <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" placeholder="Örn: Satınalma Komisyonu" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Açıklama / Görev Kapsamı</label>
                      <textarea rows={3} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" placeholder="Bu komisyonun ne iş yaptığına dair kısa bilgi..." />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Durum</label>
                      <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500">
                        <option value="AKTIF">Aktif</option>
                        <option value="PASIF">Pasif</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'members' && (
                <div className="space-y-4 max-w-3xl">
                  <div className="flex justify-end">
                     <button onClick={addRole} className="flex items-center space-x-1 text-sm bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg hover:bg-indigo-100 font-medium">
                        <PlusCircle className="w-4 h-4" />
                        <span>Yeni Görev / Üye Ekle</span>
                     </button>
                  </div>
                  {formData.roles.map((item: any, idx: number) => (
                    <div key={item.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-4 relative group">
                      
                      <div className="flex-1">
                        <label className="block text-xs font-medium text-slate-500 mb-1">Görev Adı</label>
                        <input type="text" value={item.roleName} onChange={(e) => updateRole(item.id, 'roleName', e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Örn: Başkan" />
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs font-medium text-slate-500 mb-1">Personel Seçimi</label>
                        <select 
                          value={item.staffName} 
                          onChange={(e) => updateRole(item.id, 'staffName', e.target.value)}
                          className="w-full px-3 py-2 border rounded-lg text-sm"
                        >
                          <option value="">-- Seçiniz --</option>
                          {staff.map(s => <option key={s.id} value={s.name}>{s.name} ({s.title || s.role})</option>)}
                        </select>
                      </div>

                      <button onClick={() => removeRole(item.id)} className="mt-5 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                  {formData.roles.length === 0 && (
                    <div className="text-center py-10 bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl text-slate-500">
                      Henüz üye eklenmedi.
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'print' && (
                <div className="flex flex-col items-center space-y-4">
                  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm text-center max-w-sm w-full space-y-4 hover:border-indigo-300">
                     <Printer className="w-12 h-12 text-indigo-500 mx-auto" />
                     <div>
                       <h3 className="font-bold text-slate-800">Görevlendirme Onayı</h3>
                       <p className="text-sm text-slate-500 mt-1">Okul müdürlüğü onaylı komisyon görevlendirme yazısı.</p>
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

      {/* YAZDIRMA (PRINT) ALANI - Sadece yazdırılırken görünür */}
      {isModalOpen && (
        <div className="hidden print:block font-serif bg-white text-black" style={{ margin: '0 auto', border: 'none', padding: '10px', boxSizing: 'border-box', minHeight: '277mm', width: '100%' }}>
          <style>{`
            @media print {
              @page { size: A4 portrait; margin: 5mm; }
              body { background: white; margin: 0; padding: 0; }
            }
          `}</style>
          
          <div className="text-center font-bold text-lg mb-12 leading-tight">
            T.C.<br/>
            MİLLİ EĞİTİM BAKANLIĞI<br/>
            ... LİSESİ MÜDÜRLÜĞÜ<br/>
          </div>

          <table className="w-full mb-10 border-collapse font-bold">
            <tbody>
              <tr><td className="w-24">Sayı</td><td>: ..........................</td></tr>
              <tr><td>Konu</td><td>: {formData.name} Görevlendirmesi</td></tr>
            </tbody>
          </table>

          <div className="text-center mb-10">
             <h2 className="font-bold text-xl underline uppercase">GÖREVLENDİRME ONAYI</h2>
          </div>

          <div className="mb-12 text-justify leading-relaxed">
            <p className="indent-8 mb-4">
               Milli Eğitim Bakanlığı mevzuatları ve okul işleyişi gereği kurumumuzda yürütülmesi gereken <strong>"{formData.description}"</strong> ile ilgili işlemlerin takibi ve sonuçlandırılması amacıyla <strong>{formData.academicYear}</strong> eğitim öğretim yılı için <strong>{formData.name}</strong> oluşturulmasına ihtiyaç duyulmuştur.
            </p>
            <p className="indent-8">
               Bu kapsamda, aşağıda isimleri ve görevleri yazılı personelin ilgili komisyonda görevlendirilmesi hususunu;
            </p>
            <p className="indent-8 mt-4">Makamlarınızın Olur'larına arz ederim.</p>
          </div>

          <div className="mb-16">
            <table className="w-full border-collapse text-sm">
               <thead>
                 <tr>
                    <th className="border border-black py-2 px-4 bg-gray-100 w-16">S.No</th>
                    <th className="border border-black py-2 px-4 bg-gray-100">Görevi</th>
                    <th className="border border-black py-2 px-4 bg-gray-100">Adı Soyadı</th>
                    <th className="border border-black py-2 px-4 bg-gray-100 w-32">İmza</th>
                 </tr>
               </thead>
               <tbody>
                 {formData.roles.map((item: any, idx: number) => (
                   <tr key={item.id}>
                     <td className="border border-black py-4 px-4 text-center">{idx + 1}</td>
                     <td className="border border-black py-4 px-4 text-center">{item.roleName}</td>
                     <td className="border border-black py-4 px-4 font-semibold pl-4">{item.staffName || '....................'}</td>
                     <td className="border border-black py-4 px-4"></td>
                   </tr>
                 ))}
               </tbody>
            </table>
          </div>

          <div className="mt-32">
             <div className="text-center">
                <p>O L U R</p>
                <p className="mt-2 font-bold">Okul Müdürü</p>
                <br/><br/>
                <p>....................</p>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
