import { useSettings } from '../../../context/SettingsContext';
import { useState, useEffect } from 'react';
import { PageHeader } from '../../../components/ui/PageHeader';
import { DataTable, Column } from '../../../components/ui/DataTable';
import { ActionModal } from '../../../components/ui/ActionModal';
import api from '../../../services/api';
import { BusFront, Plus, Trash2, Edit, Printer } from 'lucide-react';
import { StatusBadge } from '../../../components/ui/StatusBadge';

const defaultExtraData = {
  tur: 'il_ici', onaySayisi: '',
  geziTarihiBaslangic: '', geziTarihiBitis: '',
  cikisSaati: '', donusSaati: '', geziYeri: '', takipEdilecekYol: '',
  arac: 'Otobüs', aracPlaka: '', aracModel: '', soforAdi: '',
  acenteAdi: '', isletmeBelgesiNo: '', tursabNo: '', b2d2No: '', srcNo: '', vergiLevhasi: '',
  kafileBaskaniAd: '', kafileBaskaniTel: '',
  gorevliOgretmenler: '', subeMuduru: '', ilceMemMuduru: '',
  geziKonusu: '', geziAmaci: '', incelemeOdevleri: '',
  degerlendirme: '', ilkYardim: 'İlk yardım çantası alınacaktır.',
  ogrenciler: [] // { no, name, sClass, gender, veliAdi, veliTel }
};

export default function FieldTripPage() {
  const [trips, setTrips] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [studentList, setStudentList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTrip, setEditingTrip] = useState<any | null>(null);
  const [printingTrip, setPrintingTrip] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState(0);

  const [formData, setFormData] = useState({
    destination: '', date: '', purpose: '', vehicleInfo: '', assignedStaffName: '', studentCount: 0,
    status: 'PLAN_ASAMASINDA',
    ...defaultExtraData
  });

  const { settings } = useSettings();
  const academicYear = settings?.academicYear || '2024-2025';

  useEffect(() => {
    fetchData();
    const handleAfterPrint = () => setPrintingTrip(null);
    window.addEventListener('afterprint', handleAfterPrint);
    return () => window.removeEventListener('afterprint', handleAfterPrint);
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [res, staffRes, stuRes] = await Promise.all([
        api.get(`/field-trip?academicYear=${academicYear}`),
        api.get('/staff'),
        api.get('/students')
      ]);
      setTrips(res.data.data || []);
      setStaffList(staffRes.data.data?.staff || staffRes.data.data || []);
      setStudentList(stuRes.data.data?.students || stuRes.data.data || []);
    } catch (err: any) {
      alert('Kayıtlar yüklenirken hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!formData.destination || !formData.date) {
        alert('Gidilecek Yer ve Tarih zorunludur.');
        return;
      }

      const { destination, date, purpose, vehicleInfo, assignedStaffName, studentCount, status, ...extra } = formData;
      const payload = {
        destination, date, purpose, vehicleInfo, assignedStaffName, studentCount: Number(studentCount) || 0, status,
        academicYear,
        extraData: JSON.stringify(extra)
      };

      if (editingTrip) {
        await api.put(`/field-trip/${editingTrip.id}`, payload);
      } else {
        await api.post('/field-trip', payload);
      }

      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      alert('Kaydedilirken hata oluştu.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Bu geziyi silmek istediğinize emin misiniz?')) return;
    try {
      await api.delete(`/field-trip/${id}`);
      fetchData();
    } catch (err: any) {
      alert('Silinemedi.');
    }
  };

  const openAddModal = () => {
    setEditingTrip(null);
    setFormData({
      destination: '', date: '', purpose: '', vehicleInfo: '', assignedStaffName: '', studentCount: 0,
      status: 'PLAN_ASAMASINDA', ...defaultExtraData
    });
    setActiveTab(0);
    setIsModalOpen(true);
  };

  const openEditModal = (t: any) => {
    setEditingTrip(t);
    let parsedExtra = defaultExtraData;
    try { if (t.extraData) parsedExtra = JSON.parse(t.extraData); } catch (e) {}
    setFormData({
      destination: t.destination || '', date: t.date || '', purpose: t.purpose || '',
      vehicleInfo: t.vehicleInfo || '', assignedStaffName: t.assignedStaffName || '',
      studentCount: t.studentCount || 0, status: t.status || 'PLAN_ASAMASINDA',
      ...defaultExtraData, ...parsedExtra
    });
    setActiveTab(0);
    setIsModalOpen(true);
  };

  const handlePrint = (t: any) => {
    let parsedExtra = defaultExtraData;
    try { if (t.extraData) parsedExtra = JSON.parse(t.extraData); } catch (e) {}
    setPrintingTrip({ ...t, extra: parsedExtra });
    setTimeout(() => window.print(), 100);
  };

  const updateForm = (key: string, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleAddStudent = () => {
    updateForm('ogrenciler', [...formData.ogrenciler, { no: '', name: '', sClass: '', gender: 'Erkek', veliAdi: '', veliTel: '' }]);
  };
  const handleUpdateStudent = (index: number, key: string, value: string) => {
    const newList = [...formData.ogrenciler] as any[];
    newList[index][key] = value;
    updateForm('ogrenciler', newList);
    updateForm('studentCount', newList.length);
  };
  const handleRemoveStudent = (index: number) => {
    const newList = [...formData.ogrenciler];
    newList.splice(index, 1);
    updateForm('ogrenciler', newList);
    updateForm('studentCount', newList.length);
  };

  const columns: Column<any>[] = [
    { header: 'Gidilecek Yer / Etkinlik', render: (t) => <div className="font-bold text-gray-900">{t.destination}</div> },
    { header: 'Tarih', render: (t) => <span className="font-medium">{t.date ? new Date(t.date).toLocaleDateString('tr-TR') : '-'}</span> },
    { header: 'Sorumlu (Kafile Bşk.)', render: (t) => t.assignedStaffName || '-' },
    { header: 'Öğrenci Sayısı', render: (t) => t.studentCount },
    { header: 'Durum', render: (t) => <StatusBadge status={t.status} colorMap={{'PLAN_ASAMASINDA':'gray', 'ILCE_ONAYINDA':'yellow', 'ONAYLANDI':'blue', 'GERCEKLESTI':'green', 'IPTAL':'red'}} /> },
    {
      header: 'İşlemler',
      align: 'right',
      render: (t) => (
        <div className="flex justify-end gap-2">
          <button onClick={() => handlePrint(t)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"><Printer size={16} /></button>
          <button onClick={() => openEditModal(t)} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded"><Edit size={16} /></button>
          <button onClick={() => handleDelete(t.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 size={16} /></button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-4">
      <div className="print:hidden">
        <PageHeader 
          title="Gezi İşlemleri" 
          description="Sosyal etkinlikler kapsamında düzenlenen okul gezilerinin planlanması ve onay belgelerinin hazırlanması."
          icon={<BusFront size={24} />}
          actionText="Yeni Gezi Planla"
          onAction={openAddModal}
        />
        <DataTable data={trips} columns={columns} loading={loading} emptyMessage="Gezi planı bulunmuyor." />
      </div>

      <ActionModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingTrip ? 'Gezi Planını Düzenle' : 'Yeni Gezi Planı Oluştur'} width="full">
        <form onSubmit={handleSave} className="space-y-6">
          <div className="flex border-b border-gray-200 gap-4 mb-4">
            {['Genel Bilgiler', 'Gezi Detayları', 'Araç & Şoför', 'Öğrenci Listesi'].map((tab, idx) => (
              <button
                key={idx} type="button" onClick={() => setActiveTab(idx)}
                className={`pb-2 text-sm font-medium border-b-2 transition-colors ${activeTab === idx ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="max-h-[60vh] overflow-y-auto px-1 pb-4">
            {activeTab === 0 && (
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Gidilecek Yer / Etkinlik Adı</label>
                  <input type="text" required value={formData.destination} onChange={(e) => updateForm('destination', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Gezi Türü</label>
                  <select value={formData.tur} onChange={(e) => updateForm('tur', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500">
                    <option value="il_ici">İl İçi</option>
                    <option value="il_disi">İl Dışı</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Onay Sayısı / Tarihi</label>
                  <input type="text" value={formData.onaySayisi} onChange={(e) => updateForm('onaySayisi', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Başlangıç Tarihi</label>
                  <input type="date" required value={formData.date} onChange={(e) => updateForm('date', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Bitiş Tarihi (Opsiyonel)</label>
                  <input type="date" value={formData.geziTarihiBitis} onChange={(e) => updateForm('geziTarihiBitis', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Çıkış Saati</label>
                  <input type="time" value={formData.cikisSaati} onChange={(e) => updateForm('cikisSaati', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Dönüş Saati</label>
                  <input type="time" value={formData.donusSaati} onChange={(e) => updateForm('donusSaati', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Takip Edilecek Güzergah</label>
                  <input type="text" value={formData.takipEdilecekYol} onChange={(e) => updateForm('takipEdilecekYol', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Durum</label>
                  <select value={formData.status} onChange={(e) => updateForm('status', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500">
                    <option value="PLAN_ASAMASINDA">Plan Aşamasında</option>
                    <option value="ILCE_ONAYINDA">İlçe Onayında</option>
                    <option value="ONAYLANDI">Onaylandı</option>
                    <option value="GERCEKLESTI">Gerçekleşti</option>
                    <option value="IPTAL">İptal Edildi</option>
                  </select>
                </div>
              </div>
            )}

            {activeTab === 1 && (
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Gezi Konusu</label>
                  <input type="text" value={formData.geziKonusu} onChange={(e) => updateForm('geziKonusu', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Gezinin Amacı</label>
                  <input type="text" value={formData.purpose} onChange={(e) => updateForm('purpose', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700">İnceleme Ödevleri</label>
                  <textarea rows={3} value={formData.incelemeOdevleri} onChange={(e) => updateForm('incelemeOdevleri', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700">İlk Yardım Malzemesi</label>
                  <input type="text" value={formData.ilkYardim} onChange={(e) => updateForm('ilkYardim', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Kafile Başkanı Ad Soyad</label>
                  <select value={formData.assignedStaffName} onChange={(e) => updateForm('assignedStaffName', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500">
                    <option value="">-- Seçiniz --</option>
                    {staffList.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Kafile Başkanı Tel</label>
                  <input type="text" value={formData.kafileBaskaniTel} onChange={(e) => updateForm('kafileBaskaniTel', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Görevli Öğretmenler</label>
                  <div className="flex gap-2">
                    <select
                      className="mt-1 block flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                      onChange={(e) => {
                        if(e.target.value) {
                          const current = formData.gorevliOgretmenler;
                          const newVal = current ? `${current}, ${e.target.value}` : e.target.value;
                          updateForm('gorevliOgretmenler', newVal);
                          e.target.value = '';
                        }
                      }}
                      defaultValue=""
                    >
                      <option value="" disabled>-- Öğretmen Seçerek Listeye Ekle --</option>
                      {staffList.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                    </select>
                    <input type="text" value={formData.gorevliOgretmenler} onChange={(e) => updateForm('gorevliOgretmenler', e.target.value)} className="mt-1 block flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500" placeholder="Veya manuel yazın..." />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 2 && (
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700">Araç Türü</label><input type="text" value={formData.arac} onChange={(e) => updateForm('arac', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" /></div>
                <div><label className="block text-sm font-medium text-gray-700">Plaka</label><input type="text" value={formData.aracPlaka} onChange={(e) => updateForm('aracPlaka', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" /></div>
                <div><label className="block text-sm font-medium text-gray-700">Şoför Adı</label><input type="text" value={formData.soforAdi} onChange={(e) => updateForm('soforAdi', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" /></div>
                <div><label className="block text-sm font-medium text-gray-700">Acente Adı</label><input type="text" value={formData.acenteAdi} onChange={(e) => updateForm('acenteAdi', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" /></div>
                <div><label className="block text-sm font-medium text-gray-700">TÜRSAB Belge No</label><input type="text" value={formData.tursabNo} onChange={(e) => updateForm('tursabNo', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" /></div>
                <div><label className="block text-sm font-medium text-gray-700">D2 Belge No</label><input type="text" value={formData.b2d2No} onChange={(e) => updateForm('b2d2No', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" /></div>
              </div>
            )}

            {activeTab === 3 && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-medium text-gray-700">Öğrenciler ({formData.ogrenciler.length})</h3>
                  <div className="flex gap-2">
                    <select
                      className="flex-1 text-sm rounded border-gray-300"
                      onChange={(e) => {
                        const s = studentList.find(st => st.studentNumber === e.target.value);
                        if(s) {
                          const newList = [...formData.ogrenciler, { no: s.studentNumber, name: `${s.firstName} ${s.lastName}`, sClass: s.classRoom, gender: s.gender === 'K' ? 'Kız' : 'Erkek', veliAdi: s.parentName || '', veliTel: s.parentPhone || '' }];
                          updateForm('ogrenciler', newList);
                          updateForm('studentCount', newList.length);
                          e.target.value = '';
                        }
                      }}
                      defaultValue=""
                    >
                      <option value="" disabled>-- Sistemden Öğrenci Seçerek Ekle --</option>
                      {studentList.map(s => <option key={s.id} value={s.studentNumber}>{s.studentNumber} - {s.firstName} {s.lastName} ({s.classRoom})</option>)}
                    </select>
                    <button type="button" onClick={handleAddStudent} className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded hover:bg-indigo-100 text-sm whitespace-nowrap">Manuel Ekle</button>
                  </div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                  {formData.ogrenciler.map((ogr: any, idx: number) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <input type="text" placeholder="Sınıf" value={ogr.sClass} onChange={(e) => handleUpdateStudent(idx, 'sClass', e.target.value)} className="w-16 text-sm rounded border-gray-300" />
                      <input type="text" placeholder="No" value={ogr.no} onChange={(e) => handleUpdateStudent(idx, 'no', e.target.value)} className="w-16 text-sm rounded border-gray-300" />
                      <input type="text" placeholder="Ad Soyad" value={ogr.name} onChange={(e) => handleUpdateStudent(idx, 'name', e.target.value)} className="flex-1 text-sm rounded border-gray-300" />
                      <input type="text" placeholder="Veli Adı" value={ogr.veliAdi} onChange={(e) => handleUpdateStudent(idx, 'veliAdi', e.target.value)} className="flex-1 text-sm rounded border-gray-300" />
                      <input type="text" placeholder="Veli Tel" value={ogr.veliTel} onChange={(e) => handleUpdateStudent(idx, 'veliTel', e.target.value)} className="w-32 text-sm rounded border-gray-300" />
                      <button type="button" onClick={() => handleRemoveStudent(idx)} className="text-red-500"><Trash2 size={16} /></button>
                    </div>
                  ))}
                  {formData.ogrenciler.length === 0 && <div className="text-sm text-gray-500 text-center py-4">Öğrenci listesi boş.</div>}
                </div>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm text-gray-700 bg-white border rounded-md">İptal</button>
            <button type="submit" className="px-4 py-2 text-sm text-white bg-indigo-600 rounded-md">Kaydet</button>
          </div>
        </form>
      </ActionModal>

      {/* PRINT TEMPLATE */}
      {printingTrip && (
        <div className="hidden print:block font-serif bg-white text-black" style={{ maxWidth: '100%', boxSizing: 'border-box' }}>
          <style>{`
            @media print {
              @page { size: A4 portrait; margin: 10mm; }
              body { -webkit-print-color-adjust: exact; margin: 0; padding: 0; line-height: 1.3; font-size: 11px; }
            }
            .nk-table { width: 99.5%; margin: 0 auto; border-collapse: collapse; table-layout: fixed; border: 2px solid #000; }
            .nk-table th, .nk-table td { border: 1px solid #000; padding: 4px 6px; vertical-align: top; }
            .nk-header { text-align: center; font-weight: bold; font-size: 14px; padding-bottom: 10px; }
          `}</style>
          <div className="nk-header">EĞİTİM KURUMU GEZİ ÇALIŞMA PLANI</div>
          <table className="nk-table">
            <tbody>
              <tr><td style={{ width: '30%', fontWeight: 'bold' }}>1- Gezinin Adı / Konusu</td><td>{printingTrip.destination} {printingTrip.extra?.geziKonusu && `- ${printingTrip.extra.geziKonusu}`}</td></tr>
              <tr><td style={{ fontWeight: 'bold' }}>2- Gezinin Amacı</td><td>{printingTrip.purpose}</td></tr>
              <tr>
                <td style={{ fontWeight: 'bold' }}>3- Gezi Tarihi ve Saati</td>
                <td>
                  Çıkış: {printingTrip.date ? new Date(printingTrip.date).toLocaleDateString('tr-TR') : ''} {printingTrip.extra?.cikisSaati} 
                  &nbsp; - &nbsp; Dönüş: {printingTrip.extra?.geziTarihiBitis ? new Date(printingTrip.extra.geziTarihiBitis).toLocaleDateString('tr-TR') : ''} {printingTrip.extra?.donusSaati}
                </td>
              </tr>
              <tr><td style={{ fontWeight: 'bold' }}>4- Gezinin Yeri / Güzergahı</td><td>{printingTrip.extra?.takipEdilecekYol}</td></tr>
              <tr><td style={{ fontWeight: 'bold' }}>5- Araç ve Şoför Bilgileri</td><td>Tür: {printingTrip.extra?.arac} | Plaka: {printingTrip.extra?.aracPlaka} | Şoför: {printingTrip.extra?.soforAdi}</td></tr>
              <tr><td style={{ fontWeight: 'bold' }}>6- Acente Bilgileri</td><td>Firma: {printingTrip.extra?.acenteAdi} | Belge No: {printingTrip.extra?.tursabNo}</td></tr>
              <tr><td style={{ fontWeight: 'bold' }}>7- Kafile Bşk. ve Görevliler</td><td>Bşk: {printingTrip.assignedStaffName} (Tel: {printingTrip.extra?.kafileBaskaniTel})<br/>Görevliler: {printingTrip.extra?.gorevliOgretmenler}</td></tr>
              <tr><td style={{ fontWeight: 'bold' }}>8- İnceleme Ödevleri</td><td>{printingTrip.extra?.incelemeOdevleri}</td></tr>
              <tr><td style={{ fontWeight: 'bold' }}>9- İlk Yardım Malzemesi</td><td>{printingTrip.extra?.ilkYardim}</td></tr>
            </tbody>
          </table>
          <div style={{ marginTop: '20px', fontWeight: 'bold' }}>Öğrenci Listesi ({printingTrip.studentCount} Kişi)</div>
          <table className="nk-table" style={{ marginTop: '5px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f0f0f0' }}>
                <th style={{ width: '5%' }}>#</th><th style={{ width: '15%' }}>Sınıf/No</th><th style={{ width: '30%' }}>Adı Soyadı</th><th style={{ width: '15%' }}>Cinsiyet</th><th style={{ width: '35%' }}>Veli Adı ve Tel</th>
              </tr>
            </thead>
            <tbody>
              {printingTrip.extra?.ogrenciler?.map((ogr: any, idx: number) => (
                <tr key={idx}><td style={{ textAlign: 'center' }}>{idx + 1}</td><td>{ogr.sClass} - {ogr.no}</td><td>{ogr.name}</td><td>{ogr.gender}</td><td>{ogr.veliAdi} ({ogr.veliTel})</td></tr>
              ))}
            </tbody>
          </table>
          <div style={{ marginTop: '40px', display: 'flex', justifyContent: 'space-between', textAlign: 'center' }}>
            <div>{printingTrip.assignedStaffName}<br/>Kafile Başkanı (Öğretmen)</div>
            <div>UYGUNDUR<br/>..../..../20...<br/><br/>Okul Müdürü</div>
            {(printingTrip.extra?.subeMuduru || printingTrip.extra?.ilceMemMuduru) && (
              <div>OLUR<br/>..../..../20...<br/><br/>{printingTrip.extra?.ilceMemMuduru ? 'İl/İlçe MEM Müdürü' : 'Şube Müdürü'}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


