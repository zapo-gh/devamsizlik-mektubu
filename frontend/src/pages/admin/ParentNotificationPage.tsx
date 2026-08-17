import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { PageHeader } from '../../components/ui/PageHeader';
import { FileText, Users, User, Calendar, CheckSquare, Square, Download, AlertTriangle, UserCheck, Loader2, Info } from 'lucide-react';

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
  const [classes,         setClasses]         = useState<string[]>([]);
  const [selectedClass,   setSelectedClass]   = useState('');
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
        const uniqueClasses = Array.from(new Set(list.map(s => s.className))).sort((a, b) =>
          a.localeCompare(b, 'tr', { numeric: true }),
        );
        setClasses(uniqueClasses);
        if (uniqueClasses.length > 0) setSelectedClass(uniqueClasses[0]);
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

  const filteredStudents = students.filter(s => s.className === selectedClass);
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

      const url      = URL.createObjectURL(res.data);
      const a        = document.createElement('a');
      a.href         = url;
      const safeName = selectedStudent.fullName.replace(/\s+/g, '-').toLocaleLowerCase('tr-TR');
      a.download     = `veli-bildirim-tutanagi-${safeName}-${absenceDay}.pdf`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setSuccess(`${selectedStudent.fullName} için ${absenceDay}. gün Veli Bildirim Tutanağı oluşturuldu.`);
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
    <div className="space-y-6">
      <PageHeader
        title="ÖMYK Veli Devamsızlık Bildirimi"
        description="Öğrenci seçin, devamsızlık bilgilerini girin ve veli bildirim tutanağını PDF olarak oluşturun."
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

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">

        {/* SOL: Sınıf + Öğrenci Seçimi */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col min-h-[600px]">
          <div className="p-5 border-b border-gray-100 bg-gray-50/50">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><Users size={20} /></div>
              Öğrenci Seçimi
            </h2>
          </div>

          <div className="p-6 flex flex-col h-full bg-gray-50/30">
            {loadingStudents ? (
              <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                <Loader2 className="animate-spin mb-3 text-indigo-500" size={32} />
                <p className="text-sm font-medium">Öğrenciler yükleniyor...</p>
              </div>
            ) : (
              <>
                {/* Sınıf chip'leri */}
                <div className="flex flex-wrap gap-2 mb-6">
                  {classes.map(c => {
                    const active = selectedClass === c;
                    return (
                      <button
                        key={c}
                        onClick={() => { setSelectedClass(c); setSelectedStudent(null); }}
                        className={`
                          px-4 py-2 rounded-lg text-sm font-bold transition-all border-2
                          ${active 
                            ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm' 
                            : 'border-transparent bg-white text-gray-600 hover:border-indigo-200 shadow-sm'
                          }
                        `}
                      >
                        {c}
                      </button>
                    );
                  })}
                </div>

                {/* Öğrenci listesi */}
                <div className="bg-white rounded-xl border border-gray-200 p-2 flex-1 overflow-y-auto max-h-[500px]">
                  {filteredStudents.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-32 text-gray-400 text-sm">
                      Bu sınıfta aktif öğrenci bulunamadı.
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {filteredStudents.map(s => {
                        const selected = selectedStudent?.id === s.id;
                        return (
                          <button
                            key={s.id}
                            onClick={() => selectStudent(s)}
                            className={`
                              w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all border
                              ${selected 
                                ? 'border-indigo-600 bg-indigo-50 shadow-sm' 
                                : 'border-transparent hover:bg-gray-50 hover:border-gray-200'
                              }
                            `}
                          >
                            <div className={`
                              w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-sm font-bold
                              ${selected ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-500'}
                            `}>
                              {s.fullName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className={`text-sm truncate ${selected ? 'font-bold text-indigo-900' : 'font-semibold text-gray-700'}`}>
                                {s.fullName}
                              </div>
                              <div className={`text-xs mt-0.5 ${selected ? 'text-indigo-600 font-medium' : 'text-gray-500'}`}>
                                No: {s.schoolNumber}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* SAĞ: Ayarlar + Oluştur */}
        <div className="flex flex-col gap-5">

          {/* Seçili öğrenci özeti */}
          {selectedStudent ? (
            <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-xl flex items-center gap-4 shadow-sm">
              <div className="w-12 h-12 rounded-full bg-indigo-600 text-white flex items-center justify-center text-lg font-bold shrink-0 shadow-sm">
                {selectedStudent.fullName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="text-base font-bold text-indigo-900">{selectedStudent.fullName}</div>
                <div className="text-sm text-indigo-700 font-medium">{selectedStudent.className} · No: {selectedStudent.schoolNumber}</div>
              </div>
            </div>
          ) : (
             <div className="bg-gray-50 border border-gray-200 border-dashed p-4 rounded-xl flex items-center gap-4 text-gray-400">
               <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                 <User size={24}/>
               </div>
               <div className="text-sm font-medium">Lütfen sol taraftan bir öğrenci seçin</div>
             </div>
          )}

          {/* Ayarlar kartı */}
          <div className={`bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden transition-opacity ${!selectedStudent ? 'opacity-50 pointer-events-none' : ''}`}>
            <div className="p-5 border-b border-gray-100 bg-gray-50/50">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><Calendar size={20} /></div>
                Tutanak Bilgileri
              </h2>
            </div>

            <div className="p-5 space-y-6">
              {/* Devamsızlık günü */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Devamsızlık Günü</label>
                <div className="grid grid-cols-3 gap-2">
                  {absenceDayOptions.map(opt => {
                    const active = absenceDay === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setAbsenceDay(opt.value)}
                        className={`
                          py-3 px-1 rounded-lg text-center transition-all border-2 flex flex-col items-center justify-center
                          ${active 
                            ? 'border-indigo-600 bg-indigo-50 shadow-sm' 
                            : 'border-gray-200 bg-white hover:bg-gray-50'
                          }
                        `}
                      >
                        <div className={`text-sm ${active ? 'font-bold text-indigo-700' : 'font-semibold text-gray-700'}`}>{opt.label}</div>
                        <div className={`text-[10px] mt-1 ${active ? 'text-indigo-600 font-medium' : 'text-gray-500'}`}>{opt.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tarih */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Tutanak Tarihi</label>
                <input 
                  type="date"  
                  value={meetingDate} 
                  onChange={e => setMeetingDate(e.target.value)} 
                  className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Devamsızlık gün sayıları */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Devamsızlık Bilgileri</label>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1 text-center font-medium">Özürlü (gün)</label>
                    <input 
                      type="number" min="0" placeholder="0" 
                      value={excusedDays} onChange={e => setExcusedDays(e.target.value)}
                      className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 text-center font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1 text-center font-medium">Özürsüz (gün)</label>
                    <input 
                      type="number" min="0" placeholder="0" 
                      value={unexcusedDays} onChange={e => setUnexcusedDays(e.target.value)}
                      className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 text-center font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1 text-center font-medium">Toplam</label>
                    <div className={`
                      h-11 flex items-center justify-center rounded-lg border text-sm font-bold
                      ${totalDays > 0 ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-gray-50 border-gray-200 text-gray-400'}
                    `}>
                      {totalDays > 0 ? totalDays : '—'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Veli bilgisi */}
              <div className="pt-2 border-t border-gray-100">
                <div 
                  onClick={() => setIncludeParent(p => !p)}
                  className={`
                    flex items-center gap-3 p-3.5 rounded-xl cursor-pointer border-2 transition-all
                    ${includeParent ? 'border-indigo-200 bg-indigo-50 mb-3' : 'border-gray-200 bg-white hover:bg-gray-50'}
                  `}
                >
                  <div className={`
                    w-5 h-5 rounded flex items-center justify-center shrink-0 border-2 transition-colors
                    ${includeParent ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-gray-300'}
                  `}>
                    {includeParent && <CheckSquare size={14} className="text-white fill-current" />}
                  </div>
                  <div className="text-sm font-bold text-gray-900 flex items-center gap-2"><UserCheck size={16} className="text-gray-500"/> Veli bilgisini PDF'e ekle</div>
                </div>

                {includeParent && (
                  <div onClick={e => e.stopPropagation()} className="pl-2 pr-1 animate-in fade-in slide-in-from-top-2">
                    {selectedStudent && studentParents.length > 0 ? (
                      <div className="space-y-3">
                        <select 
                          value={selectedParentId}
                          onChange={e => { setSelectedParentId(e.target.value); setCustomParentName(''); }}
                          className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 bg-white"
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
                            className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 bg-white"
                            autoFocus
                          />
                        )}
                      </div>
                    ) : (
                      <input 
                        type="text" 
                        placeholder={selectedStudent ? 'Kayıtlı veli yok — manuel girin' : 'Öğrenci seçince otomatik dolar'}
                        value={customParentName}
                        onChange={e => setCustomParentName(e.target.value)}
                        disabled={!selectedStudent}
                        className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 bg-white"
                      />
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Oluştur butonu */}
          <button 
            className="w-full py-4 px-4 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:hover:bg-indigo-600 shadow-sm flex justify-center items-center gap-2"
            onClick={handleGenerate}
            disabled={loading || loadingStudents || !canGenerate}
          >
            {loading ? (
              <><Loader2 size={20} className="animate-spin" /> PDF Oluşturuluyor...</>
            ) : (
              <><Download size={20} /> PDF Oluştur ve İndir</>
            )}
          </button>

          {/* Bilgi notu */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm text-gray-600 flex gap-3">
            <Info size={20} className="text-gray-400 shrink-0"/>
            <div>
              <strong className="text-gray-900 font-bold block mb-1">Otomatik doldurulanlar:</strong>
              <ul className="list-disc pl-4 space-y-0.5 text-xs text-gray-500 font-medium">
                <li>Sınıf Rehber Öğretmeni</li>
                <li>Okul Rehber Öğretmeni</li>
                <li>Müdür Yardımcısı</li>
              </ul>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
