import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { PageHeader } from '../../components/ui/PageHeader';
import { FileSignature, User, FileText, Calendar, Clock, PenTool, CheckSquare, Square, Download, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}.${mm}.${d.getFullYear()}`;
}

export default function TebligPage() {
  const [schoolName,               setSchoolName]               = useState('');
  const [adiSoyadi,                setAdiSoyadi]                = useState('');
  const [tcKimlikNo,               setTcKimlikNo]               = useState('');
  const [unvani,                   setUnvani]                   = useState('');
  const [gorevYeri,                setGorevYeri]                = useState('');
  const [tebligTarihSayi,          setTebligTarihSayi]          = useState('');
  const [tebligatinKonusu,         setTebligatinKonusu]         = useState('');
  const [evrakYaziKarar,           setEvrakYaziKarar]           = useState(false);
  const [evrakSertifika,           setEvrakSertifika]           = useState(false);
  const [evrakBasariBelgesi,       setEvrakBasariBelgesi]       = useState(false);
  const [evrakAtamaGorevlendirme,  setEvrakAtamaGorevlendirme]  = useState(false);
  const [evrakDiger,               setEvrakDiger]               = useState('');
  const [tebligatTarihi,           setTebligatTarihi]           = useState(new Date().toISOString().slice(0, 10));
  const [tebligatSaati,            setTebligatSaati]            = useState('');
  const [tebligEdenAdSoyad,        setTebligEdenAdSoyad]        = useState('');
  const [tebligEdenUnvani,         setTebligEdenUnvani]         = useState('');
  const [tebligEdenTarih,          setTebligEdenTarih]          = useState(new Date().toISOString().slice(0, 10));
  const [tebellugEdenAdSoyad,      setTebellugEdenAdSoyad]      = useState('');
  const [tebellugEdenUnvani,       setTebellugEdenUnvani]       = useState('');
  const [tebellugEdenTarih,        setTebellugEdenTarih]        = useState(new Date().toISOString().slice(0, 10));

  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [success, setSuccess] = useState('');
  const [staffList, setStaffList] = useState<any[]>([]);

  useEffect(() => {
    api.get('/settings').then((res: any) => {
      const d = res.data?.data || res.data;
      if (d?.schoolName) setSchoolName(d.schoolName);
    }).catch(() => {});

    api.get('/staff').then((res: any) => {
      setStaffList(res.data?.data?.staff || []);
    }).catch(() => {
      setStaffList([]);
    });
  }, []);

  const handleNameChange = (val: string) => {
    setAdiSoyadi(val);
    const found = staffList.find(s => s.name === val);
    if (found) {
      if (found.tcKimlikNo) setTcKimlikNo(found.tcKimlikNo);
      
      const parts = [];
      if (found.unvan) parts.push(found.unvan);
      if (found.brans) parts.push(found.brans);
      const unvanStr = parts.length > 0 ? parts.join(' / ') : '';
      if (unvanStr) {
        setUnvani(unvanStr);
        setTebellugEdenUnvani(unvanStr);
      }
      setTebellugEdenAdSoyad(found.name);
      if (schoolName) setGorevYeri(schoolName);
    }
  };

  const handleTebligEdenChange = (val: string) => {
    setTebligEdenAdSoyad(val);
    const found = staffList.find(s => s.name === val);
    if (found) {
      const parts = [];
      if (found.unvan) parts.push(found.unvan);
      if (found.brans) parts.push(found.brans);
      if (parts.length > 0) setTebligEdenUnvani(parts.join(' / '));
    }
  };

  const handleTebellugEdenChange = (val: string) => {
    setTebellugEdenAdSoyad(val);
    const found = staffList.find(s => s.name === val);
    if (found) {
      const parts = [];
      if (found.unvan) parts.push(found.unvan);
      if (found.brans) parts.push(found.brans);
      if (parts.length > 0) setTebellugEdenUnvani(parts.join(' / '));
    }
  };

  const handleGenerate = async () => {
    if (!adiSoyadi.trim()) {
      setError('Adı Soyadı zorunludur.');
      return;
    }
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const res = await api.post('/teblig/generate-pdf', {
        schoolName,
        adiSoyadi,
        tcKimlikNo,
        unvani,
        gorevYeri,
        tebligTarihSayi,
        tebligatinKonusu,
        evrakYaziKarar,
        evrakSertifika,
        evrakBasariBelgesi,
        evrakAtamaGorevlendirme,
        evrakDiger,
        tebligatTarihi: formatDate(tebligatTarihi),
        tebligatSaati,
        tebligEdenAdSoyad,
        tebligEdenUnvani,
        tebligEdenTarih:   formatDate(tebligEdenTarih),
        tebellugEdenAdSoyad,
        tebellugEdenUnvani,
        tebellugEdenTarih: formatDate(tebellugEdenTarih),
      }, { responseType: 'blob' });

      const url = URL.createObjectURL(res.data);
      const newWin = window.open(url, '_blank');
      if (!newWin) window.location.href = url;
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      setSuccess('Belge başarıyla oluşturuldu, yeni sekmede açılıyor.');
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Bilinmeyen hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const CheckboxItem = ({ checked, onChange, label }: { checked: boolean, onChange: (v: boolean) => void, label: string }) => (
    <label className={`
      flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all select-none flex-1 min-w-[200px]
      ${checked ? 'border-indigo-600 bg-indigo-50 text-indigo-900' : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-700'}
    `}>
      <div className={`
        w-5 h-5 rounded flex items-center justify-center shrink-0 border-2 transition-colors
        ${checked ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-gray-300'}
      `}>
        {checked && <CheckSquare size={14} className="text-white fill-current" />}
      </div>
      <span className="text-sm font-semibold">{label}</span>
    </label>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tebliğ – Tebellüğ Belgesi"
        description="Personele yapılan tebligatı belgeleyen resmi formu PDF olarak oluşturun ve indirin."
        icon={<FileSignature size={28} className="text-indigo-600" />}
      />

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-100 text-sm flex items-center gap-2 shadow-sm">
          <AlertTriangle size={18} className="shrink-0"/> <span className="font-bold">Hata:</span> {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 text-green-700 p-4 rounded-xl border border-green-100 text-sm flex items-center gap-2 shadow-sm">
          <CheckCircle2 size={18} className="shrink-0"/> <span className="font-bold">Başarılı:</span> {success}
        </div>
      )}

      {/* Personel Bilgileri */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100 bg-gray-50/50">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><User size={20} /></div>
            Personel Bilgileri
          </h2>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Adı Soyadı <span className="text-red-500">*</span>
              </label>
              <input 
                className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 transition-shadow"
                value={adiSoyadi}
                onChange={e => handleNameChange(e.target.value)}
                placeholder="Personelin adı ve soyadı"
                list="staff-datalist"
                autoFocus
              />
              <datalist id="staff-datalist">
                {staffList.map(s => (
                  <option key={s.id} value={s.name} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">T.C. Kimlik No</label>
              <input 
                className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 transition-shadow"
                value={tcKimlikNo}
                onChange={e => setTcKimlikNo(e.target.value.replace(/\D/g, '').slice(0, 11))}
                placeholder="00000000000"
                maxLength={11}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Unvanı / Branşı</label>
              <input 
                className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 transition-shadow"
                value={unvani}
                onChange={e => setUnvani(e.target.value)}
                placeholder="Ör: Öğretmen / Matematik"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Görev Yeri</label>
              <input 
                className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 transition-shadow"
                value={gorevYeri}
                onChange={e => setGorevYeri(e.target.value)}
                placeholder="Ör: Okul adı"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Belge Bilgileri */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100 bg-gray-50/50">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><FileText size={20} /></div>
            Belge Bilgileri
          </h2>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Tebliğ Edilen Yazı, Onay veya Kararın Tarih ve Sayısı</label>
              <input 
                className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 transition-shadow"
                value={tebligTarihSayi}
                onChange={e => setTebligTarihSayi(e.target.value)}
                placeholder="Ör: 01.05.2026 tarih, 2026/123 sayılı yazı"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Tebligatın Konusu</label>
              <input 
                className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 transition-shadow"
                value={tebligatinKonusu}
                onChange={e => setTebligatinKonusu(e.target.value)}
                placeholder="Ör: Disiplin soruşturması başlatılması hk."
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">Tebliğ Edilen Evrak</label>
            <div className="flex flex-wrap gap-3">
              <CheckboxItem checked={evrakYaziKarar} onChange={setEvrakYaziKarar} label="Yazı/Karar" />
              <CheckboxItem checked={evrakSertifika} onChange={setEvrakSertifika} label="Sertifika" />
              <CheckboxItem checked={evrakBasariBelgesi} onChange={setEvrakBasariBelgesi} label="Başarı Belgesi" />
              <CheckboxItem checked={evrakAtamaGorevlendirme} onChange={setEvrakAtamaGorevlendirme} label="Atama/Görevlendirme" />
            </div>
            
            <div className="flex items-center gap-3 mt-4 p-3 bg-gray-50 border border-gray-200 rounded-xl">
              <label className="flex items-center gap-3 cursor-pointer text-sm font-semibold text-gray-700 shrink-0">
                <div className={`
                  w-5 h-5 rounded flex items-center justify-center shrink-0 border-2 transition-colors
                  ${evrakDiger ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-gray-300'}
                `}>
                  {!!evrakDiger && <CheckSquare size={14} className="text-white fill-current" />}
                </div>
                <input
                  type="checkbox"
                  checked={!!evrakDiger}
                  onChange={e => { if (!e.target.checked) setEvrakDiger(''); }}
                  className="hidden"
                />
                Diğer:
              </label>
              <input 
                className="w-full md:max-w-md p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 transition-shadow"
                value={evrakDiger}
                onChange={e => setEvrakDiger(e.target.value)}
                placeholder="Belge adını yazın..."
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-100">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5"><Calendar size={16} className="text-gray-400"/> Tebligat Tarihi</label>
              <input 
                type="date"
                className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 transition-shadow"
                value={tebligatTarihi}
                onChange={e => setTebligatTarihi(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5"><Clock size={16} className="text-gray-400"/> Tebligat Saati</label>
              <input 
                type="time"
                className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 transition-shadow"
                value={tebligatSaati}
                onChange={e => setTebligatSaati(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* İmza Bölümü */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-indigo-50/50">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <PenTool size={18} className="text-indigo-600" /> Tebliğ Eden
            </h3>
          </div>
          <div className="p-5 space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Ad Soyad</label>
              <input 
                className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" 
                value={tebligEdenAdSoyad} 
                onChange={e => handleTebligEdenChange(e.target.value)} 
                list="staff-datalist"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Unvanı</label>
              <input className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" value={tebligEdenUnvani} onChange={e => setTebligEdenUnvani(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Tarih</label>
              <input className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" type="date" value={tebligEdenTarih} onChange={e => setTebligEdenTarih(e.target.value)} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-amber-50/50">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <PenTool size={18} className="text-amber-600" /> Tebellüğ Eden
            </h3>
          </div>
          <div className="p-5 space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Ad Soyad</label>
              <input 
                className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" 
                value={tebellugEdenAdSoyad} 
                onChange={e => handleTebellugEdenChange(e.target.value)} 
                list="staff-datalist"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Unvanı</label>
              <input className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" value={tebellugEdenUnvani} onChange={e => setTebellugEdenUnvani(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Tarih</label>
              <input className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" type="date" value={tebellugEdenTarih} onChange={e => setTebellugEdenTarih(e.target.value)} />
            </div>
          </div>
        </div>
      </div>

      <div className="pt-2 pb-8">
        <button 
          className="w-full md:w-auto px-8 py-4 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:hover:bg-indigo-600 shadow-md flex justify-center items-center gap-2"
          onClick={handleGenerate}
          disabled={loading}
        >
          {loading ? (
            <><Loader2 size={20} className="animate-spin" /> PDF Oluşturuluyor...</>
          ) : (
            <><Download size={20} /> Belge Oluştur (PDF)</>
          )}
        </button>
      </div>
    </div>
  );
}
