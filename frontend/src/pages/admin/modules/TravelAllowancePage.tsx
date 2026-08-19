import { useSettings } from '../../../context/SettingsContext';
import { useState, useEffect, useRef } from 'react';
import { PageHeader } from '../../../components/ui/PageHeader';
import { DataTable, Column } from '../../../components/ui/DataTable';
import api from '../../../services/api';
import { Briefcase, Plus, Trash2, Edit, AlertCircle, Loader2, Save, X, Printer, Calculator } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import { TravelAllowancePrintTemplate } from './print/TravelAllowancePrintTemplate';

export default function TravelAllowancePage() {
  const [travels, setTravels] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'info'|'costs'|'print'>('info');

  const [formData, setFormData] = useState({
    staffName: '',
    title: '',
    purpose: '',
    departurePlace: '',
    arrivalPlace: '',
    departureDate: '',
    returnDate: '',
    transportType: 'OTOBÜS',
    transportCost: '0',
    dailyAllowance: '0',
    accommodationCost: '0',
    notes: '',
    gradeStep: '- / -',
    familyStatus: 'Bekar',
    childrenCount: '0',
    distanceKm: '0',
    bankIban: ''
  });

  const { settings } = useSettings();
  const academicYear = settings?.academicYear || '2024-2025';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [res, staffRes] = await Promise.all([
        api.get(`/travel-allowance?academicYear=${academicYear}`),
        api.get('/staff')
      ]);
      setTravels(res.data.data || []);
      setStaffList(staffRes.data.data?.staff || staffRes.data.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Yolluk kayıtları yüklenirken hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const calculateTotal = () => {
    const t = parseFloat(formData.transportCost) || 0;
    const d = parseFloat(formData.dailyAllowance) || 0;
    const a = parseFloat(formData.accommodationCost) || 0;
    // Assuming simple calculation for demo: (Gidiş-Dönüş Yol) + Yevmiye + Konaklama
    // Usually daily allowance is multiplied by days, but let's keep it simple as total allowance entered.
    return t + d + a;
  };

  const handleSave = async () => {
    try {
      if (!formData.staffName || !formData.departureDate) {
        alert('Personel Adı ve Gidiş Tarihi zorunludur.');
        return;
      }

      const payload = {
        ...formData,
        academicYear,
        transportCost: parseFloat(formData.transportCost) || 0,
        dailyAllowance: parseFloat(formData.dailyAllowance) || 0,
        accommodationCost: parseFloat(formData.accommodationCost) || 0,
        extraData: JSON.stringify({
          gradeStep: formData.gradeStep,
          familyStatus: formData.familyStatus,
          childrenCount: parseInt(formData.childrenCount) || 0,
          distanceKm: parseInt(formData.distanceKm) || 0,
          bankIban: formData.bankIban
        })
      };

      if (editingId) {
        await api.put(`/travel-allowance/${editingId}`, payload);
      } else {
        await api.post('/travel-allowance', payload);
      }

      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Kaydedilirken hata oluştu.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Bu kaydı silmek istediğinize emin misiniz?')) return;
    try {
      await api.delete(`/travel-allowance/${id}`);
      fetchData();
    } catch (err: any) {
      alert('Silinemedi.');
    }
  };

  const openAddModal = () => {
    setEditingId(null);
    setActiveTab('info');
    setFormData({
      staffName: '', title: 'Öğretmen', purpose: 'Seminer / Görevlendirme', 
      departurePlace: 'Merkez', arrivalPlace: 'Ankara',
      departureDate: new Date().toISOString().split('T')[0], 
      returnDate: new Date().toISOString().split('T')[0], 
      transportType: 'OTOBÜS',
      transportCost: '0', dailyAllowance: '0', accommodationCost: '0', notes: '',
      gradeStep: '- / -', familyStatus: 'Bekar', childrenCount: '0', distanceKm: '0', bankIban: ''
    });
    setIsModalOpen(true);
  };

  const openEditModal = (t: any) => {
    setEditingId(t.id);
    setActiveTab('info');
    
    let extra = { gradeStep: '- / -', familyStatus: 'Bekar', childrenCount: '0', distanceKm: '0', bankIban: '' };
    try { if (t.extraData) extra = JSON.parse(t.extraData); } catch {}

    setFormData({
      staffName: t.staffName || '', title: t.title || '', purpose: t.purpose || '',
      departurePlace: t.departurePlace || '', arrivalPlace: t.arrivalPlace || '',
      departureDate: t.departureDate || '', returnDate: t.returnDate || '',
      transportType: t.transportType || 'OTOBÜS',
      transportCost: t.transportCost?.toString() || '0',
      dailyAllowance: t.dailyAllowance?.toString() || '0',
      accommodationCost: t.accommodationCost?.toString() || '0',
      notes: t.notes || '',
      gradeStep: extra.gradeStep,
      familyStatus: extra.familyStatus,
      childrenCount: extra.childrenCount?.toString() || '0',
      distanceKm: extra.distanceKm?.toString() || '0',
      bankIban: extra.bankIban || ''
    });
    setIsModalOpen(true);
  };

  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: 'Yolluk_Bildirimi'
  });

  const columns: Column<any>[] = [
    { header: 'Personel', accessor: 'staffName', render: (row: any) => <span className="font-semibold">{row.staffName}</span> },
    { header: 'Gidiş Amacı', accessor: 'purpose' },
    { header: 'Gidiş Tarihi', accessor: 'departureDate' },
    { header: 'Güzergah', accessor: 'route', render: (row: any) => `${row.departurePlace} - ${row.arrivalPlace}` },
    { header: 'Toplam Tutar', accessor: 'totalCost', render: (row: any) => <span className="font-bold text-emerald-600">{row.totalCost || 0} TL</span> },
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
          title="Ödenek & Yolluk İşlemleri" 
          description="Sürekli ve geçici görev yolluğu bildirimi düzenleme" 
          icon={<Briefcase size={24} />}
        />
        <button
          onClick={openAddModal}
          className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5" />
          <span>Yeni Yolluk Kaydı</span>
        </button>
      </div>

      {error && (
        <div className="print:hidden flex items-center space-x-2 p-4 bg-red-50 text-red-700 rounded-lg border border-red-200">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <div className="print:hidden bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <DataTable columns={columns} data={travels} emptyMessage="Kayıtlı yolluk bildirimi bulunamadı." />
      </div>

      {/* MODAL */}
      {isModalOpen && (
        <div className="print:hidden fixed inset-0 z-50 flex items-center justify-center bg-black/60  p-4 sm:p-6">
          <div className="bg-slate-50 w-full max-w-4xl h-full max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200 shrink-0">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                  <Briefcase className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-bold text-slate-800">
                  {editingId ? 'Yolluk Düzenle' : 'Yeni Yolluk Bildirimi'}
                </h2>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex border-b border-slate-200 bg-white px-6 shrink-0 space-x-8">
              {[
                { id: 'info', label: 'Görev & Personel Bilgileri' },
                { id: 'costs', label: 'Masraf & Hesaplamalar' },
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
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-slate-700 mb-1">Personel Adı Soyadı</label>
                        <select
                          value={formData.staffName}
                          onChange={e => {
                            const val = e.target.value;
                            if(val) {
                              const s = staffList.find(st => st.name === val);
                              setFormData({
                                ...formData,
                                staffName: val,
                                title: s?.title || s?.position || 'Öğretmen'
                              });
                            } else {
                              setFormData({...formData, staffName: '', title: ''});
                            }
                          }}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="">-- Seçiniz --</option>
                          {staffList.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Unvanı / Kadrosu</label>
                        <input type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Gidiş Amacı</label>
                        <input type="text" value={formData.purpose} onChange={e => setFormData({...formData, purpose: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-100">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Hareket Yeri (Nereden)</label>
                        <input type="text" value={formData.departurePlace} onChange={e => setFormData({...formData, departurePlace: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Varış Yeri (Nereye)</label>
                        <input type="text" value={formData.arrivalPlace} onChange={e => setFormData({...formData, arrivalPlace: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Gidiş Tarihi</label>
                        <input type="date" value={formData.departureDate} onChange={e => setFormData({...formData, departureDate: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Dönüş Tarihi</label>
                        <input type="date" value={formData.returnDate} onChange={e => setFormData({...formData, returnDate: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-100">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Derece / Kademe</label>
                        <input type="text" value={formData.gradeStep} onChange={e => setFormData({...formData, gradeStep: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" placeholder="Örn: 4 / 1" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Banka IBAN</label>
                        <input type="text" value={formData.bankIban} onChange={e => setFormData({...formData, bankIban: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" placeholder="TR..." />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Aile Durumu</label>
                        <select value={formData.familyStatus} onChange={e => setFormData({...formData, familyStatus: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500">
                          <option value="Bekar">Bekar</option>
                          <option value="Evli (Eş Çalışıyor)">Evli (Eş Çalışıyor)</option>
                          <option value="Evli (Eş Çalışmıyor)">Evli (Eş Çalışmıyor)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Çocuk Sayısı</label>
                        <input type="number" min="0" value={formData.childrenCount} onChange={e => setFormData({...formData, childrenCount: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-slate-700 mb-1">Mesafe (KM) - Sürekli Görev / Nakil için</label>
                        <input type="number" min="0" value={formData.distanceKm} onChange={e => setFormData({...formData, distanceKm: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'costs' && (
                <div className="space-y-6 max-w-2xl">
                  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                    <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-100">
                       <h3 className="font-semibold text-slate-800 flex items-center space-x-2">
                          <Calculator className="w-5 h-5 text-indigo-500" />
                          <span>Masraf Kalemleri</span>
                       </h3>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-slate-700 mb-1">Kullanılan Taşıt / Araç</label>
                        <select value={formData.transportType} onChange={e => setFormData({...formData, transportType: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500">
                          <option value="OTOBÜS">Otobüs</option>
                          <option value="UÇAK">Uçak</option>
                          <option value="TREN">Tren</option>
                          <option value="ÖZEL ARAÇ">Özel Araç</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Yol Masrafı Tutarı (TL)</label>
                        <input type="number" step="0.01" value={formData.transportCost} onChange={e => setFormData({...formData, transportCost: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Gündelik / Yevmiye Toplam (TL)</label>
                        <input type="number" step="0.01" value={formData.dailyAllowance} onChange={e => setFormData({...formData, dailyAllowance: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Konaklama Gideri (TL)</label>
                        <input type="number" step="0.01" value={formData.accommodationCost} onChange={e => setFormData({...formData, accommodationCost: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" />
                      </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-100 bg-indigo-50 p-4 rounded-lg flex justify-between items-center">
                       <span className="font-semibold text-indigo-900">Toplam Ödenecek Tutar:</span>
                       <span className="text-xl font-bold text-indigo-700">{calculateTotal().toFixed(2)} TL</span>
                    </div>

                    <div className="pt-4">
                      <label className="block text-sm font-medium text-slate-700 mb-1">Ek Notlar / Açıklama</label>
                      <textarea rows={2} value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'print' && (
                <div className="flex flex-col items-center space-y-4">
                  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm text-center max-w-sm w-full space-y-4 hover:border-indigo-300">
                     <Printer className="w-12 h-12 text-indigo-500 mx-auto" />
                     <div>
                       <h3 className="font-bold text-slate-800">Yolluk Bildirimi</h3>
                       <p className="text-sm text-slate-500 mt-1">Sürekli/Geçici görev yolluğu bildirimi A4 formu.</p>
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
              {editingId && (
                <button onClick={handlePrint} className="flex items-center space-x-2 px-6 py-2.5 bg-slate-800 text-white font-medium hover:bg-slate-900 rounded-lg transition-colors shadow-sm">
                  <Printer className="w-5 h-5" />
                  <span>Yazdır</span>
                </button>
              )}
              <button onClick={handleSave} className="flex items-center space-x-2 px-6 py-2.5 bg-indigo-600 text-white font-medium hover:bg-indigo-700 rounded-lg transition-colors shadow-sm">
                <Save className="w-5 h-5" />
                <span>Kaydet</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* GİZLİ YAZDIRMA ŞABLONU */}
      {editingId && (
        <div className="hidden">
           <TravelAllowancePrintTemplate ref={printRef} data={{...formData, extraData: JSON.stringify({ gradeStep: formData.gradeStep, familyStatus: formData.familyStatus, childrenCount: formData.childrenCount, distanceKm: formData.distanceKm, bankIban: formData.bankIban })}} />
        </div>
      )}

      {/* YAZDIRMA (PRINT) ALANI */}
      {isModalOpen && (
        <div className="hidden print:block font-serif bg-white text-black" style={{ margin: '0 auto', border: '1px solid #000', padding: '30px', boxSizing: 'border-box', minHeight: '277mm', width: '100%' }}>
          <style>{`
            @media print {
              @page { size: A4 portrait; margin: 5mm; }
              body { background: white; margin: 0; padding: 0; font-size: 14px; }
              table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
              th, td { border: 1px solid #000; padding: 10px; text-align: left; }
              th { width: 35%; background-color: #f3f4f6 !important; -webkit-print-color-adjust: exact; }
            }
          `}</style>
          
          <div className="text-center font-bold text-lg mb-8 leading-tight uppercase underline">
            YURT İÇİ SÜREKLİ / GEÇİCİ GÖREV YOLLUĞU BİLDİRİMİ
          </div>

          <table>
            <tbody>
              <tr><th>Personel Adı Soyadı</th><td>{formData.staffName}</td></tr>
              <tr><th>Unvanı / Kadrosu</th><td>{formData.title || '-'}</td></tr>
              <tr><th>Görev / Gidiş Amacı</th><td>{formData.purpose || '-'}</td></tr>
              <tr><th>Hareket Yeri (Nereden)</th><td>{formData.departurePlace || '-'}</td></tr>
              <tr><th>Varış Yeri (Nereye)</th><td>{formData.arrivalPlace || '-'}</td></tr>
              <tr><th>Gidiş Tarihi</th><td>{formData.departureDate || '-'}</td></tr>
              <tr><th>Dönüş Tarihi</th><td>{formData.returnDate || '-'}</td></tr>
              <tr><th>Kullanılan Taşıt Türü</th><td>{formData.transportType || '-'}</td></tr>
            </tbody>
          </table>
          
          <h3 className="font-bold mb-2 underline">Harcama Kalemleri</h3>
          <table>
            <tbody>
              <tr><th>Yol Masrafı Tutarı</th><td>{parseFloat(formData.transportCost).toFixed(2)} TL</td></tr>
              <tr><th>Gündelik (Yevmiye) Tutarı</th><td>{parseFloat(formData.dailyAllowance).toFixed(2)} TL</td></tr>
              <tr><th>Konaklama Gideri Tutarı</th><td>{parseFloat(formData.accommodationCost).toFixed(2)} TL</td></tr>
              <tr style={{ backgroundColor: '#e5e7eb', fontWeight: 'bold' }}>
                <th style={{ backgroundColor: '#e5e7eb !important' }}>TOPLAM ÖDENECEK TUTAR</th>
                <td>{calculateTotal().toFixed(2)} TL</td>
              </tr>
            </tbody>
          </table>

          {formData.notes && (
             <div className="mb-6">
               <p className="font-bold underline mb-1">Açıklama / Notlar:</p>
               <p className="border border-black p-3 min-h-[60px]">{formData.notes}</p>
             </div>
          )}

          <div className="mt-16 border border-black p-4 text-justify mb-20">
             <p>İşbu yolluk bildiriminde yer alan bilgilerin doğru olduğunu, yapılan harcamaların resmi göreve ilişkin olduğunu beyan ve taahhüt ederim.</p>
          </div>

          <div className="grid grid-cols-2 gap-x-10 text-center">
             <div>
                <p className="font-bold">Beyan Eden Personel</p>
                <p className="mt-1">{formData.staffName}</p>
                <br/><br/>
                <p>İmza : ....................</p>
             </div>
             <div>
                <p className="font-bold">Harcama Yetkilisi / Okul Müdürü</p>
                <p className="mt-1">Tasdik Olunur</p>
                <br/><br/>
                <p>İmza : ....................</p>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}


