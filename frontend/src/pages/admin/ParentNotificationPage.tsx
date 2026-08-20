import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { printPdfBlob } from '../../utils/printPdf';
import { PageHeader } from '../../components/ui/PageHeader';
import { FileText, Users, User, Calendar, CheckSquare, Square, Download, AlertTriangle, UserCheck, Loader2, Info, Search } from 'lucide-react';

interface Student {
  id: string;
  fullName: string;
  className: string;
  schoolNumber: string;
  status: string;
}

interface Parent {
  id: string;
  fullName: string;
  phone: string;
}

export default function ParentNotificationPage() {
  const [students,        setStudents]        = useState<Student[]>([]);
  const [searchQuery,     setSearchQuery]     = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [absenceDay,      setAbsenceDay]      = useState<5 | 15 | 25>(5);
  const [meetingDate,     setMeetingDate]      = useState(new Date().toISOString().slice(0, 10));
  const [excusedDays,     setExcusedDays]     = useState('');
  const [unexcusedDays,   setUnexcusedDays]   = useState('');
  const [includeParent,   setIncludeParent]   = useState(false);
  const [selectedParentId,setSelectedParentId]= useState('');
  const [customParentName,setCustomParentName]= useState('');
  const [studentParents,  setStudentParents]  = useState<Parent[]>([]);
  const [loading,         setLoading]         = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [error,           setError]           = useState('');
  const [success,         setSuccess]         = useState('');

  useEffect(() => {
    api.get<{ success: boolean; data: { students: Student[] } }>('/students?limit=1000&status=ACTIVE')
      .then(res => {
        const list = res.data.data?.students || [];
        setStudents(list);
      })
      .catch(() => setError('Öğrenci listesi alınamadı.'))
      .finally(() => setLoadingStudents(false));
  }, []);

  useEffect(() => {
    setStudentParents([]);
    setSelectedParentId('');
    setCustomParentName('');
    if (!selectedStudent) return;
    api.get<{ success: boolean; data: Student & { parents: Parent[] } }>(`/students/${selectedStudent.id}`)
      .then(res => {
        const parents = res.data.data?.parents || [];
        setStudentParents(parents);
        if (parents.length > 0) setSelectedParentId(parents[0].id);
      })
      .catch(() => {});
  }, [selectedStudent]);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const filteredStudents = students.filter(s => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return s.fullName.toLowerCase().includes(q) || s.schoolNumber.includes(q) || s.className.toLowerCase().includes(q);
  }).slice(0, 100);

  const totalDays = (parseInt(excusedDays) || 0) + (parseInt(unexcusedDays) || 0);

  const selectStudent = (s: Student) => {
    setSelectedStudent(s);
    setError('');
    setSuccess('');
  };

  const handleGenerate = async () => {
    if (!selectedStudent) { setError('Lütfen bir öğrenci seçin.'); return; }
    if (excusedDays === '') { setError('Özürlü devamsızlık günü zorunludur.'); return; }
    if (unexcusedDays === '') { setError('Özürsüz devamsızlık günü zorunludur.'); return; }
    if (includeParent && studentParents.length === 0 && !customParentName.trim()) {
      setError('Lütfen veli adını girin.'); return;
    }
    if (includeParent && selectedParentId === '__other__' && !customParentName.trim()) {
      setError('Lütfen veli adını girin.'); return;
    }

    setError(''); setSuccess(''); setLoading(true);

    const parentName = includeParent
      ? (studentParents.length === 0 || selectedParentId === '__other__'
          ? customParentName.trim()
          : (studentParents.find(p => p.id === selectedParentId)?.fullName ?? ''))
      : '';

    try {
      const res = await api.post('/parent-notification/generate-pdf', {
        studentId: selectedStudent.id,
        absenceDay,
        meetingDate,
        parentName,
        absenceData: { excusedDays, unexcusedDays, totalDays: String(totalDays) },
      }, { responseType: 'blob' });

      printPdfBlob(res.data);
      setSuccess(`${selectedStudent.fullName} için ${absenceDay}. gün Veli Bildirim Tutanağı yazdırılıyor...`);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Bilinmeyen hata');
    } finally {
      setLoading(false);
    }
  };

  const absenceDayOptions: { value: 5 | 15 | 25; label: string; desc: string }[] = [
    { value: 5,  label: '5. Gün',  desc: '1. tebligat' },
    { value: 15, label: '15. Gün', desc: '2. tebligat + Komisyon' },
    { value: 25, label: '25. Gün', desc: '3. tebligat + Komisyon' },
  ];

  const canGenerate = !!selectedStudent && excusedDays !== '' && unexcusedDays !== '';

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title="ÖMYK Veli Devamsızlık Bildirimi"
        description="Öğrenci arayın, devamsızlık bilgilerini girin ve veli bildirim tutanağını PDF olarak oluşturun."
        icon={<FileText size={28} className="text-indigo-600" />}
      />

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-100 text-sm flex items-center gap-2">
          <AlertTriangle size={18} className="shrink-0"/> <span className="font-bold">Hata:</span> {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 text-green-700 p-4 rounded-xl border border-green-100 text-sm flex items-center gap-2">
          <CheckSquare size={18} className="shrink-0"/> <span className="font-bold">Başarılı:</span> {success}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-visible">
        
        {/* Adım 1: Öğrenci Seçimi */}
        <div className="p-6 border-b border-gray-100 bg-gray-50/50">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><Users size={20} /></div>
            1. Öğrenci Seçimi
          </h2>

          <div className="relative z-50">
            {!selectedStudent ? (
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  {loadingStudents ? <Loader2 size={18} className="text-indigo-500 animate-spin" /> : <Search size={18} className="text-gray-400" />}
                </div>
                <input
                  type="text"
                  placeholder="Öğrenci adı, numarası veya sınıfı ara..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  disabled={loadingStudents}
                  className="w-full pl-11 pr-4 py-4 border-2 border-indigo-100 rounded-xl text-sm font-medium focus:border-indigo-500 focus:ring-0 shadow-sm transition-colors bg-white text-gray-900 placeholder:text-gray-400"
                />

                {/* Dropdown Arama Sonuçları */}
                {searchQuery.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl border border-gray-200 shadow-xl max-h-80 overflow-y-auto z-50">
                    {filteredStudents.length === 0 ? (
                      <div className="p-4 text-center text-sm text-gray-500">Sonuç bulunamadı.</div>
                    ) : (
                      <div className="p-2 space-y-1">
                        {filteredStudents.map(s => (
                          <button
                            key={s.id}
                            onClick={() => { selectStudent(s); setSearchQuery(''); }}
                            className="w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all hover:bg-indigo-50 border border-transparent hover:border-indigo-100"
                          >
                            <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-sm font-bold bg-indigo-100 text-indigo-600">
                              {s.fullName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-bold text-gray-800">{s.fullName}</div>
                              <div className="text-xs text-gray-500">Sınıf: {s.className} · No: {s.schoolNumber}</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-xl flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-indigo-600 text-white flex items-center justify-center text-lg font-bold shrink-0 shadow-sm">
                    {selectedStudent.fullName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-base font-bold text-indigo-900">{selectedStudent.fullName}</div>
                    <div className="text-sm text-indigo-700 font-medium">Sınıf: {selectedStudent.className} · No: {selectedStudent.schoolNumber}</div>
                  </div>
                </div>
                <button 
                  onClick={() => { setSelectedStudent(null); setSearchQuery(''); }}
                  className="px-4 py-2 bg-white border border-indigo-200 text-indigo-600 text-sm font-bold rounded-lg hover:bg-indigo-100 transition-colors shadow-sm"
                >
                  Değiştir
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Adım 2: Tutanak Bilgileri (Öğrenci seçiliyse aktif) */}
        <div className={`transition-all duration-300 relative z-10 ${!selectedStudent ? 'opacity-40 pointer-events-none grayscale-[0.5]' : ''}`}>
          <div className="p-6 md:p-8">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-6">
              <div className="p-2 bg-orange-50 text-orange-600 rounded-lg"><Calendar size={20} /></div>
              2. Tutanak ve Devamsızlık Bilgileri
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Devamsızlık Günü Seçimi */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">Tebligat Kademesi</label>
                <div className="flex flex-col gap-3">
                  {absenceDayOptions.map(opt => {
                    const active = absenceDay === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setAbsenceDay(opt.value)}
                        className={`
                          py-3.5 px-4 rounded-xl text-left transition-all border-2 flex items-center justify-between
                          ${active 
                            ? 'border-indigo-600 bg-indigo-50 shadow-sm' 
                            : 'border-gray-200 bg-white hover:border-indigo-200'
                          }
                        `}
                      >
                        <div>
                          <div className={`text-base ${active ? 'font-bold text-indigo-800' : 'font-semibold text-gray-700'}`}>{opt.label}</div>
                          <div className={`text-xs mt-0.5 ${active ? 'text-indigo-600 font-medium' : 'text-gray-500'}`}>{opt.desc}</div>
                        </div>
                        {active && <CheckSquare size={20} className="text-indigo-600" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-6">
                {/* Tarih */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Tutanak Tarihi</label>
                  <input 
                    type="date"  
                    value={meetingDate} 
                    onChange={e => setMeetingDate(e.target.value)} 
                    className="w-full p-3 border-2 border-gray-200 rounded-xl text-sm font-medium focus:border-indigo-500 focus:ring-0 transition-colors"
                  />
                </div>

                {/* Gün Sayıları */}
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <label className="block text-sm font-semibold text-gray-700 mb-3">Devamsızlık Günleri</label>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1 text-center font-medium">Özürlü</label>
                      <input 
                        type="number" min="0" placeholder="0" 
                        value={excusedDays} onChange={e => setExcusedDays(e.target.value)}
                        className="w-full p-2.5 border-2 border-gray-200 rounded-lg text-base focus:border-indigo-500 focus:ring-0 text-center font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1 text-center font-medium">Özürsüz</label>
                      <input 
                        type="number" min="0" placeholder="0" 
                        value={unexcusedDays} onChange={e => setUnexcusedDays(e.target.value)}
                        className="w-full p-2.5 border-2 border-gray-200 rounded-lg text-base focus:border-indigo-500 focus:ring-0 text-center font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1 text-center font-medium">Toplam</label>
                      <div className={`
                        h-[46px] flex items-center justify-center rounded-lg border-2 text-base font-black
                        ${totalDays > 0 ? 'bg-indigo-100 border-indigo-200 text-indigo-700' : 'bg-white border-gray-200 text-gray-400'}
                      `}>
                        {totalDays > 0 ? totalDays : '—'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Adım 3: Veli & Oluştur */}
          <div className="p-6 md:p-8 border-t border-gray-100 bg-gray-50/50">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-6">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><UserCheck size={20} /></div>
              3. Veli Bilgisi ve Sonuç
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-6 items-end">
              <div>
                <div 
                  onClick={() => setIncludeParent(p => !p)}
                  className={`
                    flex items-center gap-3 p-3.5 rounded-xl cursor-pointer border-2 transition-all mb-3
                    ${includeParent ? 'border-emerald-300 bg-emerald-50' : 'border-gray-200 bg-white hover:bg-gray-50'}
                  `}
                >
                  <div className={`
                    w-5 h-5 rounded flex items-center justify-center shrink-0 border-2 transition-colors
                    ${includeParent ? 'bg-emerald-600 border-emerald-600' : 'bg-white border-gray-300'}
                  `}>
                    {includeParent && <CheckSquare size={14} className="text-white fill-current" />}
                  </div>
                  <div className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    Veli bilgisini PDF'e ekle (İsteğe Bağlı)
                  </div>
                </div>

                {includeParent && (
                  <div onClick={e => e.stopPropagation()} className="animate-in fade-in slide-in-from-top-2 ml-2">
                    {selectedStudent && studentParents.length > 0 ? (
                      <div className="flex flex-col sm:flex-row gap-3">
                        <select 
                          value={selectedParentId}
                          onChange={e => { setSelectedParentId(e.target.value); setCustomParentName(''); }}
                          className="flex-1 p-3 border-2 border-gray-200 rounded-xl text-sm font-medium focus:border-emerald-500 focus:ring-0 bg-white"
                        >
                          {studentParents.map(p => (
                            <option key={p.id} value={p.id}>{p.fullName} (Sistemdeki Veli)</option>
                          ))}
                          <option value="__other__">Diğer (Manuel Giriş)</option>
                        </select>
                        {selectedParentId === '__other__' && (
                          <input 
                            type="text" 
                            placeholder="Veli adı soyadı girin"
                            value={customParentName}
                            onChange={e => setCustomParentName(e.target.value)}
                            className="flex-1 p-3 border-2 border-gray-200 rounded-xl text-sm font-medium focus:border-emerald-500 focus:ring-0 bg-white"
                            autoFocus
                          />
                        )}
                      </div>
                    ) : (
                      <input 
                        type="text" 
                        placeholder={selectedStudent ? 'Kayıtlı veli yok — veli adını manuel girin' : 'Öğrenci seçince otomatik dolar'}
                        value={customParentName}
                        onChange={e => setCustomParentName(e.target.value)}
                        disabled={!selectedStudent}
                        className="w-full p-3 border-2 border-gray-200 rounded-xl text-sm font-medium focus:border-emerald-500 focus:ring-0 bg-white"
                      />
                    )}
                  </div>
                )}
              </div>

              <button 
                className="w-full md:w-[260px] py-4 px-6 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 hover:shadow-lg transition-all disabled:opacity-50 disabled:hover:bg-indigo-600 disabled:hover:shadow-none shadow-md flex justify-center items-center gap-2"
                onClick={handleGenerate}
                disabled={loading || loadingStudents || !canGenerate}
              >
                {loading ? (
                  <><Loader2 size={20} className="animate-spin" /> Hazırlanıyor...</>
                ) : (
                  <><Download size={20} /> Oluştur ve Yazdır</>
                )}
              </button>
            </div>
            
            {/* Alt Bilgi */}
            <div className="mt-6 flex items-center justify-between text-xs text-gray-500 font-medium">
              <div className="flex items-center gap-1.5"><Info size={14}/> Sınıf ve Okul Rehber Öğretmeni bilgileri otomatik dolar.</div>
              <div>Gizlilik & KVKK Uyumlu</div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
