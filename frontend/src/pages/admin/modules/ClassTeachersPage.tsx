import React, { useEffect, useState, useRef } from 'react';
import api from '../../../services/api';
import { useConfirm } from '../../../hooks/useConfirm';
import { PageHeader } from '../../../components/ui/PageHeader';
import { ActionModal } from '../../../components/ui/ActionModal';
import { UsersRound, Plus, Trash2, Search, Printer, FileText } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import { GuidanceReportPrintTemplate } from './print/GuidanceReportPrintTemplate';

export type StaffRole = 'KURUM_PERSONELI' | 'MUDUR_YARDIMCISI' | 'REHBER_OGRETMEN' | 'SINIF_REHBER_OGRETMEN';

interface StaffMember {
  id: string;
  name: string;
  role: StaffRole;
  className?: string | null;
  unvan?: string | null;
  brans?: string | null;
}

export default function ClassTeachersPage() {
  const { confirm, alert } = useConfirm();
  const [allStaff, setAllStaff] = useState<StaffMember[]>([]);
  const [availableClasses, setAvailableClasses] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [showModal, setShowModal] = useState(false);
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [className, setClassName] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [reportData, setReportData] = useState<any>({ month: 'Eylül', activities: '' });
  const [reportStaff, setReportStaff] = useState<StaffMember | null>(null);

  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: 'Sinif_Rehberlik_Raporu'
  });

  const openPrintModal = (staff: StaffMember) => {
    setReportStaff(staff);
    setReportData({ 
      className: staff.className,
      staffName: staff.name,
      month: 'Eylül', 
      activities: '',
      academicYear: '2025-2026'
    });
    setPrintModalOpen(true);
  };

  const triggerPrint = () => {
    setPrintModalOpen(false);
    setTimeout(() => {
      handlePrint();
    }, 100);
  };

  // Arama / Filtre
  const [searchClass, setSearchClass] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await api.get('/staff');
      setAllStaff(res.data.data.staff || []);
    } catch {
      setError('Veriler yüklenemedi.');
    } finally {
      setLoading(false);
    }
  };

  const fetchClasses = async () => {
    try {
      const res = await api.get('/students?limit=1000');
      const students = res.data?.data?.students || [];
      const classes = Array.from(new Set(students.map((s: any) => s.className).filter(Boolean))) as string[];
      const sortedClasses = classes.sort((a, b) => {
        const numA = parseInt(a.match(/^(\d+)/)?.[1] || '999', 10);
        const numB = parseInt(b.match(/^(\d+)/)?.[1] || '999', 10);
        if (numA !== numB) return numA - numB;
        return a.localeCompare(b);
      });
      setAvailableClasses(sortedClasses);
    } catch (e) {
      // sessiz hata
    }
  };

  useEffect(() => {
    fetchData();
    fetchClasses();
  }, []);

  const classTeachers = allStaff
    .filter(s => s.role === 'SINIF_REHBER_OGRETMEN' || s.className)
    .filter(s => searchClass ? s.className?.toLowerCase().includes(searchClass.toLowerCase()) : true)
    .sort((a, b) => (a.className ?? '').localeCompare(b.className ?? '', 'tr', { numeric: true }));

  const openAdd = () => {
    setClassName('');
    setSelectedStaffId('');
    setFormError('');
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!className.trim()) {
      setFormError('Sınıf adı boş olamaz.');
      return;
    }
    if (!selectedStaffId) {
      setFormError('Lütfen listeden bir öğretmen seçin.');
      return;
    }

    // Seçilen öğretmenin başka sınıfı var mı kontrol et
    const existing = allStaff.find(s => s.id === selectedStaffId && s.className && s.className !== className);
    if (existing) {
      setFormError(`Bu öğretmen zaten "${existing.className}" sınıfının rehber öğretmeni.`);
      return;
    }

    setSaving(true);
    try {
      await api.put(`/staff/${selectedStaffId}`, {
        role: 'SINIF_REHBER_OGRETMEN',
        className: className.trim().toUpperCase()
      });
      setShowModal(false);
      fetchData();
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'İşlem başarısız.');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveRole = async (staff: StaffMember) => {
    if (!await confirm(`${staff.name} isimli öğretmenin Sınıf Rehberliği görevini iptal etmek istediğinize emin misiniz? (Kişi personel havuzunda kalmaya devam edecek)`)) return;
    try {
      await api.put(`/staff/${staff.id}`, {
        role: 'KURUM_PERSONELI',
        className: ''
      });
      fetchData();
    } catch (err: any) {
      await alert('Görev iptal edilemedi.');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          title="Sınıf Rehber Öğretmenleri"
          description="Sınıflara rehber öğretmen atamalarını Merkezi Personel Havuzundan yapın."
          icon={<UsersRound size={28} className="text-indigo-600" />}
        />
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm font-medium"
        >
          <Plus size={20} />
          Sınıf / Öğretmen Ata
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-100 text-sm">{error}</div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="font-semibold text-gray-800">Atanmış Sınıflar ve Öğretmenler</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Sınıf Ara (Örn: 9-A)"
              value={searchClass}
              onChange={e => setSearchClass(e.target.value)}
              className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 w-full sm:w-64"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-0 divide-y divide-gray-100 sm:divide-y-0">
          {classTeachers.length === 0 ? (
            <div className="col-span-full p-8 text-center text-gray-500">
              Kayıtlı sınıf rehber öğretmeni bulunamadı. Lütfen "Öğretmen Ata" butonunu kullanarak Merkezi Personel Havuzundan seçim yapın.
            </div>
          ) : (
            classTeachers.map((s) => (
              <div key={s.id} className="p-4 flex flex-col justify-center hover:bg-slate-50 transition-colors group border-b sm:border-b-0 sm:border-r sm:border-b-gray-100 border-gray-100 relative">
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-md text-sm font-bold min-w-[3.5rem] text-center shrink-0">
                    {s.className}
                  </span>
                  <div className="truncate">
                    <span className="text-sm font-bold text-gray-800 block truncate" title={s.name}>{s.name}</span>
                    <span className="text-xs text-gray-500 truncate">{s.brans || s.unvan || 'Branş Belirtilmemiş'}</span>
                  </div>
                </div>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex space-x-2">
                  <button 
                    onClick={() => openPrintModal(s)} 
                    className="p-1.5 bg-white shadow-sm border border-indigo-100 text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700 rounded-md transition-colors"
                    title="Aylık Rehberlik Raporu Yazdır"
                  >
                    <Printer size={16} />
                  </button>
                  <button 
                    onClick={() => handleRemoveRole(s)} 
                    className="p-1.5 bg-white shadow-sm border border-red-100 text-red-500 hover:bg-red-50 hover:text-red-600 rounded-md transition-colors"
                    title="Görevi İptal Et (Havuza Geri Döner)"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <ActionModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Sınıf Rehber Öğretmeni Ata"
        onSubmit={handleSave}
        submitDisabled={saving}
        submitText="Atamayı Kaydet"
      >
        <div className="space-y-4">
          {formError && (
            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
              {formError}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sınıf Adı</label>
            <input
              type="text"
              list="class-names"
              value={className}
              onChange={(e) => setClassName(e.target.value.toUpperCase())}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 uppercase"
              placeholder="Örn: 9-A (Yazın veya listeden seçin)"
              autoFocus
            />
            <datalist id="class-names">
              {availableClasses.map(c => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rehber Öğretmen Seçin</label>
            <select
              value={selectedStaffId}
              onChange={(e) => setSelectedStaffId(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">-- Personel Havuzundan Seçiniz --</option>
              {allStaff
                .filter(s => s.role !== 'SINIF_REHBER_OGRETMEN' && !s.className) 
                .map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.brans ? `(${s.brans})` : ''}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">Sadece kurum havuzundaki müsait personeller (sınıfı olmayanlar) listelenir.</p>
          </div>
        </div>
    </ActionModal>

      <ActionModal
        isOpen={printModalOpen}
        onClose={() => setPrintModalOpen(false)}
        title="Aylık Rehberlik Raporu"
        onSubmit={(e) => { e.preventDefault(); triggerPrint(); }}
        submitText="Yazdır"
      >
        <div className="space-y-4">
          <div className="p-4 bg-indigo-50 text-indigo-700 rounded-lg flex items-center space-x-3">
            <FileText className="w-5 h-5 flex-shrink-0" />
            <div>
              <p className="font-semibold">{reportStaff?.className} Sınıfı</p>
              <p className="text-sm">Rehber Öğretmeni: {reportStaff?.name}</p>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ait Olduğu Ay</label>
            <select
              value={reportData.month}
              onChange={(e) => setReportData({ ...reportData, month: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              {['Eylül','Ekim','Kasım','Aralık','Ocak','Şubat','Mart','Nisan','Mayıs','Haziran'].map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Yapılan Çalışmalar / Faaliyet Özeti</label>
            <textarea
              value={reportData.activities}
              onChange={(e) => setReportData({ ...reportData, activities: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 min-h-[150px]"
              placeholder="Öğrencilerle yapılan görüşmeler, sınıf etkinlikleri vb."
            />
          </div>
        </div>
      </ActionModal>

      <div className="hidden">
        <GuidanceReportPrintTemplate ref={printRef} data={reportStaff ? reportData : null} />
      </div>

    </div>
  );
}

