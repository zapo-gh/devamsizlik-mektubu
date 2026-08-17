import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { PageHeader } from '../../components/ui/PageHeader';
import { FileSignature, CheckSquare, Square, Download, Users, Calendar, BookOpen, UserCheck, Search, Loader2 } from 'lucide-react';

export default function ParentMeetingPage() {
  const [classes,         setClasses]         = useState<string[]>([]);
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [meetingDate,     setMeetingDate]     = useState(new Date().toISOString().slice(0, 10));
  const [schoolYear,      setSchoolYear]      = useState('2025-2026');
  const [term,            setTerm]            = useState('2. DÖNEM');
  const [includeParent,   setIncludeParent]   = useState(true);
  const [loading,         setLoading]         = useState(false);
  const [loadingClasses,  setLoadingClasses]  = useState(true);
  const [error,           setError]           = useState('');
  const [success,         setSuccess]         = useState('');
  const [searchTerm,      setSearchTerm]      = useState('');

  useEffect(() => {
    api.get<{ success: boolean; data: string[] }>('/parent-meeting/classes')
      .then(res => {
        const sorted = [...res.data.data].sort((a, b) =>
          a.localeCompare(b, 'tr', { numeric: true })
        );
        setClasses(sorted);
      })
      .catch(() => setError('Sınıf listesi alınamadı.'))
      .finally(() => setLoadingClasses(false));
  }, []);

  const filteredClasses = classes.filter(c => c.toLowerCase().includes(searchTerm.toLowerCase()));

  const toggleClass = (c: string) =>
    setSelectedClasses(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]);

  const selectAll = () => setSelectedClasses([...filteredClasses]);
  const clearAll  = () => setSelectedClasses([]);

  const handleGenerate = async () => {
    if (selectedClasses.length === 0) { setError('Lütfen en az bir sınıf seçin.'); return; }
    setError(''); setSuccess(''); setLoading(true);
    try {
      const res = await api.post('/parent-meeting/generate-pdf', {
        classNames: selectedClasses, meetingDate, schoolYear, term, includeParentName: includeParent,
      }, { responseType: 'blob' });
      const url  = URL.createObjectURL(res.data);
      const a    = document.createElement('a');
      a.href     = url;
      const fileLabel = selectedClasses.length === 1 ? selectedClasses[0].replace(/[^a-zA-Z0-9]/g, '_') : `${selectedClasses.length}-sinif`;
      a.download = `veli-imza-sirkusu-${fileLabel}.pdf`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setSuccess(selectedClasses.length === 1
        ? `${selectedClasses[0]} sınıfı için imza sirküsü oluşturuldu.`
        : `${selectedClasses.length} sınıf için imza sirküsü oluşturuldu.`);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Bilinmeyen hata');
    } finally {
      setLoading(false);
    }
  };

  // Sınıf gruplama: seviyeye göre (9, 10, 11, 12, diğer)
  const grouped: Record<string, string[]> = {};
  for (const c of filteredClasses) {
    const match = c.match(/^(\d+)/);
    const key = match ? match[1] + '. Sınıf' : 'Diğer';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(c);
  }

  const allSelected  = selectedClasses.length === filteredClasses.length && filteredClasses.length > 0;
  const someSelected = selectedClasses.length > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Veli Toplantısı İmza Sirküsü"
        description="Sınıf seçin, toplantı detaylarını belirleyin ve veli imza sirkülerini PDF olarak indirin."
        icon={<FileSignature size={28} className="text-indigo-600" />}
      />

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-100 text-sm flex items-center gap-2">
          <span className="font-bold">Hata:</span> {error}
        </div>
      )}
      
      {success && (
        <div className="bg-green-50 text-green-700 p-4 rounded-xl border border-green-100 text-sm flex items-center gap-2">
          <span className="font-bold">Başarılı:</span> {success}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">

        {/* SOL: Sınıf Seçimi */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
          <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><Users size={20} /></div>
              Sınıf Seçimi
            </h2>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input 
                  type="text" 
                  placeholder="Sınıf Ara..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 w-full sm:w-48"
                />
              </div>
              <div className="flex gap-2 shrink-0">
                <button 
                  onClick={allSelected ? clearAll : selectAll} 
                  disabled={loadingClasses || filteredClasses.length === 0}
                  className="px-3 py-2 text-sm font-medium border border-gray-300 rounded-lg bg-white hover:bg-gray-50 text-gray-700 disabled:opacity-50 transition"
                >
                  {allSelected ? 'Seçimi Kaldır' : 'Tümünü Seç'}
                </button>
                {someSelected && !allSelected && (
                  <button onClick={clearAll} className="px-3 py-2 text-sm font-medium border border-gray-300 rounded-lg bg-white hover:bg-gray-50 text-red-600 transition">
                    Temizle
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="p-6 flex-1 bg-gray-50/30">
            {loadingClasses ? (
              <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                <Loader2 className="animate-spin mb-3 text-indigo-500" size={32} />
                <p className="text-sm font-medium">Sınıflar yükleniyor...</p>
              </div>
            ) : filteredClasses.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-gray-400 text-sm">
                Kayıtlı sınıf bulunamadı.
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(grouped).map(([grade, gradeClasses]) => {
                  const allGradeSelected = gradeClasses.every(c => selectedClasses.includes(c));
                  return (
                    <div key={grade} className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                      <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
                        <span className="text-sm font-bold text-gray-700 uppercase tracking-wider">{grade}</span>
                        <button 
                          onClick={() => {
                            if (allGradeSelected) {
                              setSelectedClasses(prev => prev.filter(c => !gradeClasses.includes(c)));
                            } else {
                              setSelectedClasses(prev => [...new Set([...prev, ...gradeClasses])]);
                            }
                          }}
                          className={`text-xs px-3 py-1.5 rounded-md font-semibold transition-colors ${
                            allGradeSelected 
                              ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' 
                              : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                          }`}
                        >
                          {allGradeSelected ? 'Kaldır' : 'Tümünü Seç'}
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2.5">
                        {gradeClasses.map(c => {
                          const selected = selectedClasses.includes(c);
                          return (
                            <button
                              key={c}
                              onClick={() => toggleClass(c)}
                              className={`
                                relative px-4 py-2.5 rounded-lg text-sm font-bold transition-all border-2
                                ${selected 
                                  ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm' 
                                  : 'border-gray-200 bg-white text-gray-600 hover:border-indigo-300 hover:bg-indigo-50/50'
                                }
                              `}
                            >
                              <div className="flex items-center gap-2">
                                {selected ? <CheckSquare size={16} className="text-indigo-600" /> : <Square size={16} className="text-gray-400" />}
                                {c}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* SAĞ: Ayarlar + Oluştur */}
        <div className="flex flex-col gap-6">

          {/* Ayarlar kartı */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-gray-100 bg-gray-50/50">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><Calendar size={20} /></div>
                Toplantı Bilgileri
              </h2>
            </div>
            
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Toplantı Tarihi</label>
                <input 
                  type="date"  
                  value={meetingDate} 
                  onChange={e => setMeetingDate(e.target.value)} 
                  className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2"><BookOpen size={16} className="text-gray-400"/> Dönem</label>
                <div className="grid grid-cols-2 gap-2">
                  {['1. DÖNEM', '2. DÖNEM'].map(d => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setTerm(d)}
                      className={`
                        py-2.5 rounded-lg text-sm font-bold transition-all border-2
                        ${term === d 
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm' 
                          : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                        }
                      `}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              <div 
                onClick={() => setIncludeParent(p => !p)}
                className={`
                  flex items-center gap-3 p-4 rounded-xl cursor-pointer border-2 transition-all
                  ${includeParent ? 'border-indigo-200 bg-indigo-50' : 'border-gray-200 bg-white hover:bg-gray-50'}
                `}
              >
                <div className={`
                  w-5 h-5 rounded flex items-center justify-center shrink-0 border-2 transition-colors
                  ${includeParent ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-gray-300'}
                `}>
                  {includeParent && <CheckSquare size={14} className="text-white fill-current" />}
                </div>
                <div>
                  <div className="text-sm font-bold text-gray-900 flex items-center gap-1.5"><UserCheck size={16} className="text-gray-500"/> Veli adını PDF'e ekle</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {includeParent ? 'Kayıtlı veli adı otomatik dolar' : 'Ad sütunu boş bırakılır'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Özet + Oluştur */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-6">
              {someSelected && (
                <div className="mb-5 p-4 bg-green-50 rounded-xl border border-green-100">
                  <div className="text-sm font-bold text-green-800 mb-2">Oluşturulacak Sınıflar:</div>
                  <div className="text-sm text-green-700 leading-relaxed font-medium mb-3">
                    {selectedClasses.join(', ')}
                  </div>
                  <div className="text-xs font-semibold text-green-600/80 bg-green-100 inline-block px-2 py-1 rounded">
                    {selectedClasses.length} sayfa · {term} · {schoolYear}
                  </div>
                </div>
              )}

              <button 
                className="w-full py-3.5 px-4 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:hover:bg-indigo-600 shadow-sm flex justify-center items-center gap-2"
                onClick={handleGenerate}
                disabled={loading || loadingClasses || !someSelected}
              >
                {loading ? (
                  <><Loader2 size={20} className="animate-spin" /> PDF oluşturuluyor...</>
                ) : (
                  <><Download size={20} /> PDF Oluştur ve İndir {someSelected && `(${selectedClasses.length})`}</>
                )}
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
