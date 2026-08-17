import { useState, useEffect, useRef } from 'react';
import { PageHeader } from '../../../components/ui/PageHeader';
import { DataTable, Column } from '../../../components/ui/DataTable';
import api from '../../../services/api';
import { FileSignature, Plus, Trash2, Edit, AlertCircle, Loader2, Save, X, Printer, CheckCircle2 } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import { ProcurementPrintTemplate } from './print/ProcurementPrintTemplate';

export default function ProcurementPage() {
  const [procurements, setProcurements] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form (Tam Ekran/Geniş Modal State'i)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'info'|'items'|'offers'|'print'>('info');

  const [formData, setFormData] = useState<any>({
    title: '',
    date: new Date().toISOString().split('T')[0],
    status: 'ONAY_BEKLIYOR',
    commissionMembers: [
      { role: 'Harcama Yetkilisi', name: '', title: 'Okul Müdürü' },
      { role: 'Komisyon Başkanı', name: '', title: 'Müdür Yardımcısı' },
      { role: 'Üye', name: '', title: 'Öğretmen' },
      { role: 'Üye', name: '', title: 'Öğretmen' }
    ],
    items: [],
    offers: []
  });

  const academicYear = '2025-2026';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [procRes, suppRes, staffRes] = await Promise.all([
        api.get('/procurement'),
        api.get('/supplier'),
        api.get('/staff')
      ]);
      setProcurements(procRes.data.data || []);
      // Sadece aktif firmalar
      setSuppliers((suppRes.data.data || []).filter((s: any) => s.isActive));
      setStaff(staffRes.data.data?.staff || staffRes.data.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Veriler yüklenirken hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      if (!formData.title) {
        alert('İşin Adı (Temin Konusu) zorunludur.');
        return;
      }
      
      const payload = {
        ...formData,
        academicYear,
        procedureType: '22/d'
      };

      if (editingId) {
        await api.put(`/procurement/${editingId}`, payload);
      } else {
        await api.post('/procurement', payload);
      }

      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Kaydedilirken hata oluştu.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Bu Doğrudan Temin dosyasını ve tüm içeriklerini tamamen silmek istediğinize emin misiniz?')) return;
    try {
      await api.delete(`/procurement/${id}`);
      fetchData();
    } catch (err: any) {
      alert('Silinemedi.');
    }
  };

  const openAddModal = () => {
    setEditingId(null);
    setActiveTab('info');
    setFormData({
      title: '',
      date: new Date().toISOString().split('T')[0],
      status: 'ONAY_BEKLIYOR',
      commissionMembers: [
        { role: 'Harcama Yetkilisi', name: '', title: 'Okul Müdürü' },
        { role: 'Komisyon Başkanı', name: '', title: 'Müdür Yardımcısı' },
        { role: 'Üye', name: '', title: 'Öğretmen' },
        { role: 'Üye', name: '', title: 'Öğretmen' }
      ],
      items: [],
      offers: []
    });
    setIsModalOpen(true);
  };

  const openEditModal = async (id: string) => {
    try {
      const res = await api.get(`/procurement/${id}`);
      const data = res.data.data;
      setEditingId(id);
      setActiveTab('info');
      setFormData({
        title: data.title,
        date: data.date,
        status: data.status,
        commissionMembers: data.commissionMembers?.length > 0 ? data.commissionMembers : [
          { role: 'Harcama Yetkilisi', name: '', title: 'Okul Müdürü' },
          { role: 'Komisyon Başkanı', name: '', title: 'Müdür Yardımcısı' },
          { role: 'Üye', name: '', title: 'Öğretmen' },
          { role: 'Üye', name: '', title: 'Öğretmen' }
        ],
        // tempId mapping
        items: data.items.map((i: any) => ({ ...i, tempId: i.id })),
        offers: data.offers.map((o: any) => ({ ...o, tempItemId: o.itemId }))
      });
      setIsModalOpen(true);
    } catch (err) {
      alert('Detaylar getirilemedi.');
    }
  };

  // --- ITEMS LOGIC ---
  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { tempId: crypto.randomUUID(), name: '', quantity: 1, unit: 'Adet', estimatedUnitPrice: 0 }]
    });
  };
  const updateItem = (tempId: string, field: string, value: any) => {
    setFormData({
      ...formData,
      items: formData.items.map((i: any) => i.tempId === tempId ? { ...i, [field]: value } : i)
    });
  };
  const removeItem = (tempId: string) => {
    setFormData({
      ...formData,
      items: formData.items.filter((i: any) => i.tempId !== tempId),
      offers: formData.offers.filter((o: any) => o.tempItemId !== tempId) // Kalem silinince teklifleri de sil
    });
  };

  // --- OFFERS LOGIC ---
  const getOffer = (itemId: string, supplierId: string) => {
    return formData.offers.find((o: any) => o.tempItemId === itemId && o.supplierId === supplierId);
  };
  const updateOffer = (itemId: string, supplierId: string, price: string) => {
    const existing = getOffer(itemId, supplierId);
    let newOffers = [...formData.offers];
    if (existing) {
      existing.offeredPrice = price;
    } else {
      newOffers.push({ tempItemId: itemId, supplierId, offeredPrice: price, isWinner: false });
    }
    setFormData({ ...formData, offers: newOffers });
  };
  const setWinner = (itemId: string, supplierId: string) => {
    // Aynı kalemdeki diğer firmaların winner flag'ini kaldır, bunu winner yap
    const newOffers = formData.offers.map((o: any) => {
      if (o.tempItemId === itemId) {
        return { ...o, isWinner: o.supplierId === supplierId };
      }
      return o;
    });
    setFormData({ ...formData, offers: newOffers });
  };
  
  const getWinnerSupplierNameForPrint = (itemId: string) => {
     const winner = formData.offers.find((o:any) => o.tempItemId === itemId && o.isWinner);
     if(!winner) return '-';
     const sup = suppliers.find(s => s.id === winner.supplierId);
     return sup ? sup.name : '-';
  };
  const getWinnerPriceForPrint = (itemId: string) => {
    const winner = formData.offers.find((o:any) => o.tempItemId === itemId && o.isWinner);
    if(!winner) return 0;
    return Number(winner.offeredPrice) || 0;
  }

  const columns: Column<any>[] = [
    { header: 'Dosya Adı / Konusu', accessor: 'title', render: (row: any) => <span className="font-semibold">{row.title}</span> },
    { header: 'Tarih', accessor: 'date' },
    { header: 'Durum', accessor: 'status', render: (row: any) => (
      <span className="px-2 py-1 rounded-full text-xs bg-indigo-100 text-indigo-800 font-medium">
        {row.status.replace('_', ' ')}
      </span>
    )},
    { header: 'Kalem/Firma', accessor: 'counts', render: (row: any) => <span className="text-slate-500 text-sm">{row.itemCount} Kalem / {row.supplierCount} Firma</span> },
    { header: 'Yaklaşık Maliyet', accessor: 'estimatedCost', render: (row: any) => <span className="font-bold text-emerald-700">{Number(row.estimatedCost).toLocaleString('tr-TR')} TL</span> },
    { 
      header: 'İşlemler',
      align: 'right',
      render: (row: any) => (
        <div className="flex justify-end space-x-2">
          <button onClick={() => openEditModal(row.id)} className="text-blue-600 hover:text-blue-900" title="Detay / Düzenle">
            <Edit className="w-5 h-5" />
          </button>
          <button onClick={() => handleDelete(row.id)} className="text-red-600 hover:text-red-900" title="Sil">
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      )
    }
  ];

  // PRINT FONKSİYONLARI (react-to-print)
  const onayBelgesiRef = useRef<HTMLDivElement>(null);
  const piyasaArastirmaRef = useRef<HTMLDivElement>(null);
  const muayeneKabulRef = useRef<HTMLDivElement>(null);

  const printOnayBelgesi = useReactToPrint({
    contentRef: onayBelgesiRef,
    documentTitle: 'Onay_Belgesi_' + formData.title
  });

  const printPiyasaArastirma = useReactToPrint({
    contentRef: piyasaArastirmaRef,
    documentTitle: 'Piyasa_Arastirma_' + formData.title
  });

  const printMuayeneKabul = useReactToPrint({
    contentRef: muayeneKabulRef,
    documentTitle: 'Muayene_Kabul_' + formData.title
  });


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
          title="Doğrudan Temin (22/d)" 
          description="Satınalma, piyasa araştırması ve onay belgeleri yönetimi" 
          icon={<FileSignature size={24} />}
        />
        <button
          onClick={openAddModal}
          className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5" />
          <span>Yeni Dosya</span>
        </button>
      </div>

      {error && (
        <div className="flex items-center space-x-2 p-4 bg-red-50 text-red-700 rounded-lg border border-red-200">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <DataTable columns={columns} data={procurements} emptyMessage="Kayıtlı doğrudan temin dosyası bulunamadı." />
      </div>

      {/* FULL SCREEN MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60  p-4 sm:p-6">
          <div className="bg-slate-50 w-full max-w-6xl h-full max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200 shrink-0">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                  <FileSignature className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-bold text-slate-800">
                  {editingId ? 'Doğrudan Temin Dosyasını Düzenle' : 'Yeni Doğrudan Temin Dosyası'}
                </h2>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tabs Header */}
            <div className="flex border-b border-slate-200 bg-white px-6 shrink-0 space-x-8">
              {[
                { id: 'info', label: 'Genel Bilgiler' },
                { id: 'items', label: 'İhtiyaç Listesi (Kalemler)' },
                { id: 'offers', label: 'Piyasa Araştırması (Teklifler)' },
                { id: 'print', label: 'Evraklar & Çıktılar' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-4 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.id 
                      ? 'border-indigo-600 text-indigo-600' 
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
              
              {/* TAB: INFO */}
              {activeTab === 'info' && (
                <div className="space-y-6 max-w-4xl">
                  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                    <h3 className="font-semibold text-slate-800 border-b pb-2">Temel Bilgiler</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-slate-700 mb-1">İşin / Teminin Adı</label>
                        <input type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" placeholder="Örn: 2024 Yılı Kırtasiye Alımı" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Tarih</label>
                        <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Durum</label>
                        <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500">
                          <option value="ONAY_BEKLIYOR">Onay Bekliyor</option>
                          <option value="TEKLIF_ASAMASINDA">Teklif Aşamasında</option>
                          <option value="TAMAMLANDI">Tamamlandı</option>
                          <option value="IPTAL">İptal Edildi</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                    <h3 className="font-semibold text-slate-800 border-b pb-2">Komisyon ve İlgili Kişiler</h3>
                    {formData.commissionMembers.map((member: any, idx: number) => (
                      <div key={idx} className="flex space-x-4 items-center">
                        <div className="w-48 font-medium text-sm text-slate-600">{member.role}</div>
                        <select 
                          value={member.name} 
                          onChange={(e) => {
                            const newMembers = [...formData.commissionMembers];
                            const selectedStaff = staff.find(s => s.name === e.target.value);
                            newMembers[idx].name = e.target.value;
                            if (selectedStaff && selectedStaff.title) {
                              newMembers[idx].title = selectedStaff.title;
                            }
                            setFormData({...formData, commissionMembers: newMembers});
                          }}
                          className="flex-1 px-3 py-2 border rounded-lg"
                        >
                          <option value="">-- Personel Seçin --</option>
                          {staff.map(s => <option key={s.id} value={s.name}>{s.name} ({s.title})</option>)}
                        </select>
                        <input 
                          type="text" 
                          placeholder="Unvan (Örn: Öğretmen)" 
                          value={member.title}
                          onChange={(e) => {
                            const newMembers = [...formData.commissionMembers];
                            newMembers[idx].title = e.target.value;
                            setFormData({...formData, commissionMembers: newMembers});
                          }}
                          className="flex-1 px-3 py-2 border rounded-lg"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB: ITEMS */}
              {activeTab === 'items' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200">
                    <p className="text-sm text-slate-600">Alınacak mal veya hizmetleri bu listeye ekleyin.</p>
                    <button onClick={addItem} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg text-sm flex items-center space-x-1">
                      <Plus className="w-4 h-4"/> <span>Kalem Ekle</span>
                    </button>
                  </div>
                  
                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                        <tr>
                          <th className="px-4 py-3 w-12 text-center">#</th>
                          <th className="px-4 py-3">Mal / Hizmet Cinsi</th>
                          <th className="px-4 py-3 w-32">Miktar</th>
                          <th className="px-4 py-3 w-32">Birim</th>
                          <th className="px-4 py-3 w-16 text-center">İşlem</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {formData.items.length === 0 ? (
                          <tr><td colSpan={5} className="py-8 text-center text-slate-400">Henüz kalem eklenmemiş.</td></tr>
                        ) : formData.items.map((item: any, idx: number) => (
                          <tr key={item.tempId} className="hover:bg-slate-50">
                            <td className="px-4 py-2 text-center font-medium text-slate-400">{idx + 1}</td>
                            <td className="px-4 py-2">
                              <input type="text" value={item.name} onChange={e => updateItem(item.tempId, 'name', e.target.value)} className="w-full px-2 py-1 border border-slate-200 rounded focus:border-indigo-500 outline-none bg-transparent" placeholder="Örn: Mavi Klasör"/>
                            </td>
                            <td className="px-4 py-2">
                              <input type="number" min="1" value={item.quantity} onChange={e => updateItem(item.tempId, 'quantity', e.target.value)} className="w-full px-2 py-1 border border-slate-200 rounded focus:border-indigo-500 outline-none bg-transparent"/>
                            </td>
                            <td className="px-4 py-2">
                              <input type="text" value={item.unit} onChange={e => updateItem(item.tempId, 'unit', e.target.value)} className="w-full px-2 py-1 border border-slate-200 rounded focus:border-indigo-500 outline-none bg-transparent"/>
                            </td>
                            <td className="px-4 py-2 text-center">
                              <button onClick={() => removeItem(item.tempId)} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4"/></button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB: OFFERS (Piyasa Araştırması) */}
              {activeTab === 'offers' && (
                <div className="space-y-4">
                  {formData.items.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-xl border border-slate-200 text-slate-500">
                      Önce <strong>İhtiyaç Listesi (Kalemler)</strong> sekmesinden malzeme eklemelisiniz.
                    </div>
                  ) : suppliers.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-xl border border-slate-200 text-slate-500">
                      Sistemde aktif "Firma/Tedarikçi" bulunmuyor. Lütfen Firma Rehberine firma ekleyin.
                    </div>
                  ) : (
                    <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-sm pb-8">
                      <table className="w-full text-left text-sm border-collapse min-w-max">
                        <thead className="bg-slate-800 text-slate-100">
                          <tr>
                            <th className="px-4 py-3 border-r border-slate-700 sticky left-0 z-10 bg-slate-900 w-64">Malzeme / Kalem Adı</th>
                            <th className="px-4 py-3 border-r border-slate-700 w-24 text-center">Miktar</th>
                            {suppliers.map(sup => (
                              <th key={sup.id} className="px-4 py-3 border-r border-slate-700 min-w-[200px] text-center">
                                <div className="font-semibold truncate">{sup.name}</div>
                                <div className="text-[10px] text-slate-400 font-normal mt-1">Birim Fiyat Teklifi</div>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {formData.items.map((item: any) => (
                            <tr key={item.tempId} className="hover:bg-slate-50 group">
                              <td className="px-4 py-3 border-r border-slate-200 sticky left-0 z-10 bg-white group-hover:bg-slate-50">
                                <div className="font-medium text-slate-800 truncate" title={item.name}>{item.name || '-'}</div>
                              </td>
                              <td className="px-4 py-3 border-r border-slate-200 text-center text-slate-600">
                                {item.quantity} {item.unit}
                              </td>
                              {suppliers.map(sup => {
                                const offer = getOffer(item.tempId, sup.id);
                                const isWinner = offer?.isWinner;
                                return (
                                  <td key={sup.id} className={`px-4 py-2 border-r border-slate-200 text-center relative transition-colors ${isWinner ? 'bg-emerald-50/50' : ''}`}>
                                    <div className="flex items-center justify-center space-x-2">
                                      <input 
                                        type="number" 
                                        min="0" step="0.01" 
                                        placeholder="0.00"
                                        value={offer?.offeredPrice || ''}
                                        onChange={(e) => updateOffer(item.tempId, sup.id, e.target.value)}
                                        className="w-24 px-2 py-1.5 text-right border border-slate-300 rounded focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none text-sm"
                                      />
                                      <span className="text-slate-400">₺</span>
                                      
                                      <button 
                                        onClick={() => setWinner(item.tempId, sup.id)}
                                        title="Bu firmayı kazanan (uygun) seç"
                                        className={`ml-2 p-1.5 rounded-full transition-colors ${isWinner ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
                                      >
                                        <CheckCircle2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* TAB: PRINT */}
              {activeTab === 'print' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center text-center space-y-4 hover:border-indigo-300 transition-colors">
                      <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center">
                        <Printer className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800 mb-1">Onay Belgesi (22/d)</h4>
                        <p className="text-xs text-slate-500 px-4">Harcama yetkilisi ve komisyon başkanı imzalı satın alma onay yazısı.</p>
                      </div>
                      <button onClick={printOnayBelgesi} className="w-full mt-auto py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 text-sm font-medium">
                        Yazdır
                      </button>
                    </div>

                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center text-center space-y-4 hover:border-indigo-300 transition-colors">
                      <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center">
                        <Printer className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800 mb-1">Piyasa Fiyat Araştırması</h4>
                        <p className="text-xs text-slate-500 px-4">Tüm kalemlerin ve komisyonca uygun görülen firmaların döküm tablosu.</p>
                      </div>
                      <button onClick={printPiyasaArastirma} className="w-full mt-auto py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 text-sm font-medium">
                        Yazdır
                      </button>
                    </div>

                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center text-center space-y-4 hover:border-indigo-300 transition-colors">
                      <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center">
                        <FileSignature className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800 mb-1">Muayene ve Kabul Tutanağı</h4>
                        <p className="text-xs text-slate-500 px-4">Malzemelerin teslim alındığına dair komisyon onay tutanağı.</p>
                      </div>
                      <button onClick={printMuayeneKabul} className="w-full mt-auto py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 text-sm font-medium">
                        Yazdır
                      </button>
                    </div>

                  </div>
                </div>
              )}

            {/* Gizli Yazdırma Şablonları */}
            <div className="hidden">
              <ProcurementPrintTemplate ref={onayBelgesiRef} type="onay_belgesi" formData={formData} suppliers={suppliers} />
              <ProcurementPrintTemplate ref={piyasaArastirmaRef} type="piyasa_arastirma" formData={formData} suppliers={suppliers} />
              <ProcurementPrintTemplate ref={muayeneKabulRef} type="muayene_kabul" formData={formData} suppliers={suppliers} />
            </div>
            </div>

            {/* Footer */}
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
    </div>
  );
}
