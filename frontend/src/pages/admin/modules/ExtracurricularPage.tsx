import { useSettings } from '../../../context/SettingsContext';
import { useState, useEffect, useRef } from 'react';
import { PageHeader } from '../../../components/ui/PageHeader';
import { DataTable, Column } from '../../../components/ui/DataTable';
import { ActionModal } from '../../../components/ui/ActionModal';
import api from '../../../services/api';
import { Dumbbell, Plus, Trash2, Edit, Printer } from 'lucide-react';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { useReactToPrint } from 'react-to-print';
import { ExtracurricularPrintTemplate } from './print/ExtracurricularPrintTemplate';

const defaultExtraData = {
  onaySayisi: '', onayTarihi: '',
  planlananToplamSaat: '',
  calismaGunleri: '', // e.g. "Pazartesi, Çarşamba"
  calismaSaatleri: '', // e.g. "15:30 - 17:00"
  egzersizYeri: '',
  subeMuduru: '', ilceMemMuduru: '',
  ogrenciler: [] // { no, name, sClass, gender, veliAdi, veliTel }
};

export default function ExtracurricularPage() {
  const [items, setItems] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [studentList, setStudentList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [printingItem, setPrintingItem] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState(0);

  const [formData, setFormData] = useState({
    name: '', type: '', assignedStaffName: '', 
    startDate: '', endDate: '', hoursPerWeek: 0,
    status: 'ONAY_BEKLIYOR',
    ...defaultExtraData
  });

  const { settings } = useSettings();
  const academicYear = settings?.academicYear || '2024-2025';

  useEffect(() => {
    fetchData();
  }, []);

  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: 'Egzersiz_Onay_Belgesi'
  });

  const triggerPrint = (item: any) => {
    setPrintingItem(item);
    setTimeout(() => {
      handlePrint();
    }, 100);
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [res, staffRes, stuRes] = await Promise.all([
        api.get(`/extracurricular?academicYear=${academicYear}`),
        api.get('/staff'),
        api.get('/students')
      ]);
      setItems(res.data.data || []);
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
      if (!formData.name) {
        alert('Egzersiz Adı zorunludur.');
        return;
      }

      const { name, type, assignedStaffName, startDate, endDate, hoursPerWeek, status, ...extra } = formData;
      const payload = {
        name, type, assignedStaffName, startDate, endDate, 
        hoursPerWeek: Number(hoursPerWeek) || 0, status,
        academicYear,
        extraData: JSON.stringify(extra)
      };

      if (editingItem) {
        await api.put(`/extracurricular/${editingItem.id}`, payload);
      } else {
        await api.post('/extracurricular', payload);
      }

      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      alert('Kaydedilirken hata oluştu.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Bu planı silmek istediğinize emin misiniz?')) return;
    try {
      await api.delete(`/extracurricular/${id}`);
      fetchData();
    } catch (err: any) {
      alert('Silinemedi.');
    }
  };

  const openAddModal = () => {
    setEditingItem(null);
    setFormData({
      name: '', type: '', assignedStaffName: '', startDate: '', endDate: '', hoursPerWeek: 0,
      status: 'ONAY_BEKLIYOR', ...defaultExtraData
    });
    setActiveTab(0);
    setIsModalOpen(true);
  };

  const openEditModal = (t: any) => {
    setEditingItem(t);
    let parsedExtra = defaultExtraData;
    try { if (t.extraData) parsedExtra = JSON.parse(t.extraData); } catch (e) {}
    setFormData({
      name: t.name || '', type: t.type || '', assignedStaffName: t.assignedStaffName || '',
      startDate: t.startDate || '', endDate: t.endDate || '', hoursPerWeek: t.hoursPerWeek || 0,
      status: t.status || 'ONAY_BEKLIYOR',
      ...defaultExtraData, ...parsedExtra
    });
    setActiveTab(0);
    setIsModalOpen(true);
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
  };
  const handleRemoveStudent = (index: number) => {
    const newList = [...formData.ogrenciler];
    newList.splice(index, 1);
    updateForm('ogrenciler', newList);
  };

  const columns: Column<any>[] = [
    { header: 'Egzersiz / Kurs Adı', render: (t) => <div><div className="font-bold text-gray-900">{t.name}</div><div className="text-xs text-indigo-600 font-semibold">{t.type}</div></div> },
    { header: 'Görevli Öğretmen', render: (t) => <span className="font-medium">{t.assignedStaffName || '-'}</span> },
    { header: 'Program', render: (t) => <div><div className="text-sm">{t.hoursPerWeek ? `${t.hoursPerWeek} Saat/Hafta` : '-'}</div></div> },
    { header: 'Durum', render: (t) => <StatusBadge status={t.status} colorMap={{'ONAY_BEKLIYOR':'yellow', 'AKTIF':'green', 'PASIF':'gray', 'TAMAMLANDI':'blue'}} /> },
    {
      header: 'İşlemler',
      align: 'right',
      render: (t) => (
        <div className="flex justify-end gap-2">
          <button onClick={() => triggerPrint(t)} className="text-emerald-600 hover:text-emerald-900" title="Yazdır">
            <Printer size={20} />
          </button>
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
          title="Ders Dışı Eğitim (Egzersiz)" 
          description="Öğretmenlerin ders dışı yapacakları egzersiz, kurs ve İYEP çalışmalarının takibi ve onayı."
          icon={<Dumbbell size={24} />}
          actionText="Yeni Plan Ekle"
          onAction={openAddModal}
        />
        <DataTable data={items} columns={columns} loading={loading} emptyMessage="Egzersiz planı bulunmuyor." />
      </div>

      <ActionModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingItem ? 'Egzersiz Düzenle' : 'Yeni Egzersiz Planı Ekle'} width="full">
        <form onSubmit={handleSave} className="space-y-6">
          <div className="flex border-b border-gray-200 gap-4 mb-4">
            {['Genel Bilgiler', 'Program & Onay', 'Öğrenci Listesi'].map((tab, idx) => (
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
                  <label className="block text-sm font-medium text-gray-700">Egzersiz / Kurs Adı (Konusu)</label>
                  <input type="text" required value={formData.name} onChange={(e) => updateForm('name', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Türü / Alanı</label>
                  <input type="text" value={formData.type} onChange={(e) => updateForm('type', e.target.value)} placeholder="Örn: Satranç, Halk Oyunları, İYEP" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Görevli Öğretmen (Ad Soyad)</label>
                  <select value={formData.assignedStaffName} onChange={(e) => updateForm('assignedStaffName', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500">
                    <option value="">-- Seçiniz --</option>
                    {staffList.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Başlangıç Tarihi</label>
                  <input type="date" value={formData.startDate} onChange={(e) => updateForm('startDate', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Bitiş Tarihi</label>
                  <input type="date" value={formData.endDate} onChange={(e) => updateForm('endDate', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Çalışma Yeri</label>
                  <input type="text" value={formData.egzersizYeri} onChange={(e) => updateForm('egzersizYeri', e.target.value)} placeholder="Örn: Okul Kütüphanesi, Spor Salonu" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500" />
                </div>
              </div>
            )}

            {activeTab === 1 && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Haftalık Toplam Saat</label>
                  <input type="number" value={formData.hoursPerWeek} onChange={(e) => updateForm('hoursPerWeek', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Eğitim Planlanan Toplam Saat</label>
                  <input type="number" value={formData.planlananToplamSaat} onChange={(e) => updateForm('planlananToplamSaat', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Çalışma Günleri (Virgülle ayırın)</label>
                  <input type="text" value={formData.calismaGunleri} onChange={(e) => updateForm('calismaGunleri', e.target.value)} placeholder="Örn: Pazartesi, Çarşamba, Cuma" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Çalışma Saatleri (Aralık)</label>
                  <input type="text" value={formData.calismaSaatleri} onChange={(e) => updateForm('calismaSaatleri', e.target.value)} placeholder="Örn: 15:30 - 17:00" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Onay Tarihi</label>
                  <input type="date" value={formData.onayTarihi} onChange={(e) => updateForm('onayTarihi', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Onay Sayısı</label>
                  <input type="text" value={formData.onaySayisi} onChange={(e) => updateForm('onaySayisi', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Şube Müdürü</label>
                  <input type="text" value={formData.subeMuduru} onChange={(e) => updateForm('subeMuduru', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">İl/İlçe Milli Eğitim Müdürü</label>
                  <input type="text" value={formData.ilceMemMuduru} onChange={(e) => updateForm('ilceMemMuduru', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Durum</label>
                  <select value={formData.status} onChange={(e) => updateForm('status', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500">
                    <option value="ONAY_BEKLIYOR">Onay Bekliyor</option>
                    <option value="AKTIF">Aktif Devam Ediyor</option>
                    <option value="TAMAMLANDI">Tamamlandı</option>
                    <option value="PASIF">Pasif / İptal</option>
                  </select>
                </div>
              </div>
            )}

            {activeTab === 2 && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-medium text-gray-700">Öğrenciler ({formData.ogrenciler.length})</h3>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                  <div className="flex gap-2">
                    <select
                      className="flex-1 text-sm rounded border-gray-300"
                      onChange={(e) => {
                        const s = studentList.find(st => st.studentNumber === e.target.value);
                        if(s) {
                          updateForm('ogrenciler', [...formData.ogrenciler, { no: s.studentNumber, name: `${s.firstName} ${s.lastName}`, sClass: s.classRoom, gender: s.gender === 'K' ? 'Kız' : 'Erkek', veliAdi: s.parentName || '', veliTel: s.parentPhone || '' }]);
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
                  {formData.ogrenciler.map((ogr: any, idx: number) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <input type="text" placeholder="Sınıf" value={ogr.sClass} onChange={(e) => handleUpdateStudent(idx, 'sClass', e.target.value)} className="w-16 text-sm rounded border-gray-300" />
                      <input type="text" placeholder="No" value={ogr.no} onChange={(e) => handleUpdateStudent(idx, 'no', e.target.value)} className="w-16 text-sm rounded border-gray-300" />
                      <input type="text" placeholder="Ad Soyad" value={ogr.name} onChange={(e) => handleUpdateStudent(idx, 'name', e.target.value)} className="flex-1 text-sm rounded border-gray-300" />
                      <select value={ogr.gender} onChange={(e) => handleUpdateStudent(idx, 'gender', e.target.value)} className="w-24 text-sm rounded border-gray-300">
                        <option value="Erkek">Erkek</option>
                        <option value="Kız">Kız</option>
                      </select>
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

      {/* GİZLİ YAZDIRMA ŞABLONU */}
      <div className="hidden">
        <ExtracurricularPrintTemplate ref={printRef} printingItem={printingItem} />
      </div>

    </div>
  );
}


