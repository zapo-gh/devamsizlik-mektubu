import { useSettings } from '../../../context/SettingsContext';
import { useState, useEffect, useRef } from 'react';
import { PageHeader } from '../../../components/ui/PageHeader';
import { DataTable, Column } from '../../../components/ui/DataTable';
import api from '../../../services/api';
import { Users, Plus, Trash2, Edit, AlertCircle, Loader2, Save, X, Printer, PlusCircle, Calendar, UserPlus } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import { StudentClubPrintTemplate } from './print/StudentClubPrintTemplate';

export default function StudentClubPage() {
  const [clubs, setClubs] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'info'|'activities'|'members'|'print'>('info');

  const [formData, setFormData] = useState<any>({
    name: '',
    description: '',
    assignedStaffId: '',
    assignedStaffName: '',
    meetingDay: '',
    meetingTime: '',
    maxMembers: '30',
    activities: []
  });

  const [clubMembers, setClubMembers] = useState<any[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');

  const { settings } = useSettings();
  const academicYear = settings?.academicYear || '2024-2025';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [clubRes, staffRes, studentRes] = await Promise.all([
        api.get(`/student-club?academicYear=${academicYear}`),
        api.get('/staff'),
        api.get('/students')
      ]);
      
      const parsedData = (clubRes.data.data || []).map((item: any) => {
        let extra = { activities: [] };
        if (item.extraData) {
          try { extra = JSON.parse(item.extraData); } catch (e) {}
        }
        return { ...item, extra };
      });
      
      setClubs(parsedData);
      setStaff(staffRes.data.data?.staff || staffRes.data.data || []);
      setAllStudents(studentRes.data.data?.students || studentRes.data.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Veriler yüklenirken hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      if (!formData.name) {
        alert('Kulüp adı zorunludur.');
        return;
      }
      
      const payload = {
        name: formData.name,
        description: formData.description,
        assignedStaffId: formData.assignedStaffId,
        assignedStaffName: formData.assignedStaffName,
        meetingDay: formData.meetingDay,
        meetingTime: formData.meetingTime,
        maxMembers: parseInt(formData.maxMembers) || 30,
        academicYear,
        extraData: JSON.stringify({
          activities: formData.activities
        })
      };

      if (editingId) {
        await api.put(`/student-club/${editingId}`, payload);
      } else {
        await api.post('/student-club', payload);
      }

      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Kaydedilirken hata oluştu.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Kulübü silmek istediğinize emin misiniz?')) return;
    try {
      await api.delete(`/student-club/${id}`);
      fetchData();
    } catch (err: any) {
      alert('Silinemedi.');
    }
  };

  const openAddModal = () => {
    setEditingId(null);
    setActiveTab('info');
    setFormData({
      name: 'Kızılay ve Kan Bağışı Kulübü',
      description: 'Yardımlaşma ve dayanışma faaliyetleri',
      assignedStaffId: '',
      assignedStaffName: '',
      meetingDay: 'Cuma',
      meetingTime: '15:30',
      maxMembers: '30',
      activities: [
        { id: crypto.randomUUID(), month: 'Ekim', description: 'Kulüp genel kurulunun toplanması ve görev dağılımı' },
        { id: crypto.randomUUID(), month: 'Kasım', description: 'Kızılay Haftası panosu hazırlanması' }
      ]
    });
    setClubMembers([]);
    setIsModalOpen(true);
  };

  const openEditModal = async (club: any) => {
    setEditingId(club.id);
    setActiveTab('info');
    setFormData({
      name: club.name || '',
      description: club.description || '',
      assignedStaffId: club.assignedStaffId || '',
      assignedStaffName: club.assignedStaffName || '',
      meetingDay: club.meetingDay || '',
      meetingTime: club.meetingTime || '',
      maxMembers: club.maxMembers?.toString() || '30',
      activities: club.extra?.activities || []
    });
    
    // Üyeleri çek
    try {
      const res = await api.get(`/student-club/${club.id}/members`);
      setClubMembers(res.data.data || []);
    } catch (e) {
      console.error('Üyeler çekilemedi:', e);
      setClubMembers([]);
    }
    
    setIsModalOpen(true);
  };

  const addActivity = () => {
    setFormData({
      ...formData,
      activities: [...formData.activities, { id: crypto.randomUUID(), month: '', description: '' }]
    });
  };

  const updateActivity = (id: string, field: string, value: string) => {
    setFormData({
      ...formData,
      activities: formData.activities.map((item: any) => item.id === id ? { ...item, [field]: value } : item)
    });
  };

  const removeActivity = (id: string) => {
    setFormData({
      ...formData,
      activities: formData.activities.filter((item: any) => item.id !== id)
    });
  };

  const handleAddMember = async () => {
    if (!selectedStudentId || !editingId) {
      alert("Lütfen bir öğrenci seçin ve kulübün kaydedilmiş olduğundan emin olun (Önce kaydedip sonra üye ekleyin).");
      return;
    }
    try {
      await api.post('/student-club/members', {
        clubId: editingId,
        studentId: selectedStudentId
      });
      // Yenile
      const res = await api.get(`/student-club/${editingId}/members`);
      setClubMembers(res.data.data || []);
      setSelectedStudentId('');
      fetchData(); // Arka planda listeyi güncelle
    } catch (err: any) {
      alert(err.response?.data?.message || 'Öğrenci eklenemedi.');
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!window.confirm('Öğrenciyi kulüpten çıkarmak istediğinize emin misiniz?')) return;
    try {
      await api.delete(`/student-club/members/${memberId}`);
      if (editingId) {
        const res = await api.get(`/student-club/${editingId}/members`);
        setClubMembers(res.data.data || []);
        fetchData();
      }
    } catch (e) {
      alert('Silinemedi.');
    }
  };

  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: 'Kulup_Faaliyet_Raporu'
  });

  const columns: Column<any>[] = [
    { header: 'Kulüp Adı', accessor: 'name', render: (row: any) => <span className="font-semibold">{row.name}</span> },
    { header: 'Danışman Öğretmen', accessor: 'assignedStaffName', render: (row: any) => row.assignedStaffName || '-' },
    { header: 'Toplantı Günü', accessor: 'meetingDay', render: (row: any) => row.meetingDay || '-' },
    { header: 'Üye Sayısı', accessor: 'memberCount', render: (row: any) => <span className="font-medium text-emerald-700">{row.memberCount || 0} / {row.maxMembers}</span> },
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
          title="Öğrenci Kulüpleri" 
          description="Eğitici kulüp faaliyetleri, kulüp öğrencileri ve toplantı günleri" 
          icon={<Users size={24} />}
        />
        <button
          onClick={openAddModal}
          className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5" />
          <span>Yeni Kulüp</span>
        </button>
      </div>

      {error && (
        <div className="print:hidden flex items-center space-x-2 p-4 bg-red-50 text-red-700 rounded-lg border border-red-200">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <div className="print:hidden bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <DataTable columns={columns} data={clubs} emptyMessage="Kayıtlı kulüp bulunamadı." />
      </div>

      {/* MODAL */}
      {isModalOpen && (
        <div className="print:hidden fixed inset-0 z-50 flex items-center justify-center bg-black/60  p-4 sm:p-6">
          <div className="bg-slate-50 w-full max-w-5xl h-full max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200 shrink-0">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                  <Users className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-bold text-slate-800">
                  {editingId ? 'Kulüp Düzenle' : 'Yeni Öğrenci Kulübü'}
                </h2>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex border-b border-slate-200 bg-white px-6 shrink-0 space-x-8">
              {[
                { id: 'info', label: 'Genel Bilgiler' },
                { id: 'activities', label: 'Faaliyet Planı' },
                { id: 'members', label: 'Üye Öğrenciler' },
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
                      <label className="block text-sm font-medium text-slate-700 mb-1">Kulüp Adı</label>
                      <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Kulüp Amacı / Açıklama</label>
                      <textarea rows={3} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-slate-700 mb-1">Danışman Öğretmen</label>
                        <select 
                          value={formData.assignedStaffId} 
                          onChange={(e) => {
                            const staffId = e.target.value;
                            const staffObj = staff.find(s => s.id === staffId);
                            setFormData({...formData, assignedStaffId: staffId, assignedStaffName: staffObj ? staffObj.name : ''});
                          }}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="">-- Danışman Öğretmen Seçiniz --</option>
                          {staff.map(s => <option key={s.id} value={s.id}>{s.name} ({s.title || s.role})</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Toplantı Günü</label>
                        <input type="text" value={formData.meetingDay} onChange={e => setFormData({...formData, meetingDay: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" placeholder="Örn: Cuma" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Toplantı Saati</label>
                        <input type="time" value={formData.meetingTime} onChange={e => setFormData({...formData, meetingTime: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Maksimum Üye Sayısı</label>
                        <input type="number" value={formData.maxMembers} onChange={e => setFormData({...formData, maxMembers: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'activities' && (
                <div className="space-y-4 max-w-4xl">
                  <div className="flex justify-end">
                     <button onClick={addActivity} className="flex items-center space-x-1 text-sm bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg hover:bg-indigo-100 font-medium">
                        <PlusCircle className="w-4 h-4" />
                        <span>Yeni Faaliyet Ekle</span>
                     </button>
                  </div>
                  {formData.activities.map((item: any, idx: number) => (
                    <div key={item.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-4 relative group">
                      <div className="w-1/4">
                        <label className="block text-xs font-medium text-slate-500 mb-1">Aylar / Dönem</label>
                        <input type="text" value={item.month} onChange={(e) => updateActivity(item.id, 'month', e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Örn: Ekim Ayı" />
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs font-medium text-slate-500 mb-1">Faaliyet Konusu</label>
                        <input type="text" value={item.description} onChange={(e) => updateActivity(item.id, 'description', e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Yapılacak faaliyet..." />
                      </div>
                      <button onClick={() => removeActivity(item.id)} className="mt-5 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                  {formData.activities.length === 0 && (
                    <div className="text-center py-10 bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl text-slate-500">
                      Faaliyet planı henüz eklenmedi.
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'members' && (
                <div className="space-y-6 max-w-4xl">
                  {!editingId ? (
                     <div className="text-center py-12 bg-white rounded-xl border border-slate-200 text-slate-500">
                        Öğrenci ekleyebilmek için önce kulübü kaydetmelisiniz. (Aşağıdan Kaydet butonuna basınız)
                     </div>
                  ) : (
                    <>
                      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex space-x-4 items-end">
                        <div className="flex-1">
                          <label className="block text-sm font-medium text-slate-700 mb-1">Öğrenci Seç</label>
                          <select 
                            value={selectedStudentId} 
                            onChange={(e) => setSelectedStudentId(e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                          >
                            <option value="">-- Öğrenci Seçin --</option>
                            {allStudents.map(s => <option key={s.id} value={s.id}>{s.schoolNumber} - {s.fullName} ({s.className})</option>)}
                          </select>
                        </div>
                        <button 
                          onClick={handleAddMember}
                          className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium flex items-center space-x-2"
                        >
                          <UserPlus className="w-4 h-4" />
                          <span>Ekle</span>
                        </button>
                      </div>

                      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                        <table className="w-full text-left text-sm border-collapse">
                          <thead className="bg-slate-50 text-slate-600">
                            <tr>
                              <th className="px-4 py-3 border-b border-slate-200">Öğrenci No</th>
                              <th className="px-4 py-3 border-b border-slate-200">Adı Soyadı</th>
                              <th className="px-4 py-3 border-b border-slate-200">Sınıfı</th>
                              <th className="px-4 py-3 border-b border-slate-200">Görevi</th>
                              <th className="px-4 py-3 border-b border-slate-200 w-24"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {clubMembers.map((member: any) => (
                              <tr key={member.id} className="hover:bg-slate-50">
                                <td className="px-4 py-3 font-medium">{member.student?.schoolNumber}</td>
                                <td className="px-4 py-3">{member.student?.fullName}</td>
                                <td className="px-4 py-3">{member.student?.className}</td>
                                <td className="px-4 py-3">{member.role}</td>
                                <td className="px-4 py-3 text-right">
                                  <button onClick={() => handleRemoveMember(member.id)} className="p-1 text-red-500 hover:bg-red-50 rounded">
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                            {clubMembers.length === 0 && (
                              <tr>
                                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">Bu kulübe henüz öğrenci kaydedilmemiş.</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </div>
              )}

              {activeTab === 'print' && (
                <div className="flex flex-col items-center space-y-4">
                  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm text-center max-w-sm w-full space-y-4 hover:border-indigo-300">
                     <Printer className="w-12 h-12 text-indigo-500 mx-auto" />
                     <div>
                       <h3 className="font-bold text-slate-800">Kulüp Faaliyet Raporu</h3>
                       <p className="text-sm text-slate-500 mt-1">Kulüp bilgileri, faaliyet planı ve üye öğrenci listesini içeren resmi belge.</p>
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
                Kapat
              </button>
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
           <StudentClubPrintTemplate ref={printRef} formData={formData} clubMembers={clubMembers} />
        </div>
      )}

    </div>
  );
}


