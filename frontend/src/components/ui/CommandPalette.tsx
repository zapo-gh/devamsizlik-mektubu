import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, UserRound, LayoutGrid } from 'lucide-react';
import api from '../../services/api';

const MODULES = [
  { title: 'Gösterge Paneli', path: '/admin' },
  { title: 'Öğrenci Listesi', path: '/admin/students' },
  { title: 'Personel Havuzu', path: '/admin/staff' },
  { title: 'Sınıf Rehber Öğretmenleri', path: '/admin/class-teachers' },
  { title: 'Devamsızlık Mektubu', path: '/admin/absenteeism' },
  { title: 'Yazılı Uyarılar', path: '/admin/warnings' },
  { title: 'İhlal Takibi', path: '/admin/violations' },
  { title: 'Başarısızlık Riski Bildirimi', path: '/admin/grade-reports' },
  { title: 'ÖMYK Devamsızlık Bildirimi', path: '/admin/parent-notification' },
  { title: 'Matbu Evraklar', path: '/admin/matbu-evraklar' },
  { title: 'Veli Toplantısı İmza Sirküsü', path: '/admin/parent-meeting' },
  { title: 'Tebliğ – Tebellüğ Belgesi', path: '/admin/teblig' },
  { title: 'Nöbet Çizelgesi', path: '/admin/duty-schedule' },
  { title: 'Personel İmza Çizelgesi', path: '/admin/attendance-sheet' },
  { title: 'Öğretmenler Kurulu', path: '/admin/board-meeting' },
  { title: 'Kurul ve Komisyonlar', path: '/admin/commission' },
  { title: 'Yıllık Çalışma Planı', path: '/admin/annual-plan' },
  { title: 'Belirli Gün ve Haftalar', path: '/admin/commemorative-days' },
  { title: 'Sosyal Etkinlik Planı', path: '/admin/social-activity' },
  { title: 'Okul Aile Birliği', path: '/admin/parent-association' },
  { title: 'Gezi Planı', path: '/admin/field-trip' },
  { title: 'Ders Dışı Egzersiz Planı', path: '/admin/extracurricular' },
  { title: 'Doğrudan Temin (22/d)', path: '/admin/procurement' },
  { title: 'Firma Rehberi', path: '/admin/supplier' },
  { title: 'Yolluk Hesaplama', path: '/admin/travel-allowance' },
  { title: 'Personel Nakil Bildirimi', path: '/admin/staff-transfer' },
  { title: 'Öğrenci Kulüpleri', path: '/admin/student-club' },
  { title: 'Resmi Tatiller', path: '/admin/holidays' },
  { title: 'WhatsApp Bağlantısı', path: '/admin/whatsapp' },
  { title: 'Ayarlar', path: '/admin/settings' },
];

type StudentResult = {
  id: string;
  fullName: string;
  schoolNumber: string;
  className: string;
  status: string;
  parents?: Array<{ fullName: string; phone: string }>;
};

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [students, setStudents] = useState<StudentResult[]>([]);
  const [studentLoading, setStudentLoading] = useState(false);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const requestId = useRef(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen(open => !open);
        setQuery('');
        setStudents([]);
        setSelectedIndex(0);
      }
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 50);
  }, [isOpen]);

  const filteredModules = MODULES.filter(m =>
    m.title.toLocaleLowerCase('tr-TR').includes(query.toLocaleLowerCase('tr-TR')) ||
    m.path.toLocaleLowerCase('tr-TR').includes(query.toLocaleLowerCase('tr-TR'))
  );

  useEffect(() => {
    setSelectedIndex(0);
    const q = query.trim();
    if (!isOpen || q.length < 2) {
      setStudents([]);
      setStudentLoading(false);
      return;
    }

    const currentRequest = ++requestId.current;
    const timer = window.setTimeout(async () => {
      setStudentLoading(true);
      try {
        const response = await api.get('/students', {
          params: { search: q, page: 1, limit: 8, status: 'ALL' },
        });
        if (currentRequest !== requestId.current) return;
        setStudents(response.data?.data?.students ?? response.data?.students ?? []);
      } catch {
        if (currentRequest === requestId.current) setStudents([]);
      } finally {
        if (currentRequest === requestId.current) setStudentLoading(false);
      }
    }, 250);

    return () => window.clearTimeout(timer);
  }, [query, isOpen]);

  const items = [
    ...students.map(student => ({ type: 'student' as const, path: `/admin/students/${student.id}`, title: student.fullName, subtitle: `${student.schoolNumber} · ${student.className}`, student })),
    ...filteredModules.map(module => ({ type: 'module' as const, path: module.path, title: module.title, subtitle: module.path })),
  ];

  const handleSelect = (path: string) => {
    navigate(path);
    setIsOpen(false);
    setQuery('');
    setStudents([]);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!items.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => (i + 1) % items.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => (i - 1 + items.length) % items.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      handleSelect(items[selectedIndex].path);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] bg-slate-900/50 print:hidden" onClick={() => setIsOpen(false)}>
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border border-slate-200" onClick={e => e.stopPropagation()}>
        <div className="flex items-center px-4 py-3 border-b border-slate-100">
          <Search className="w-5 h-5 text-slate-400 mr-3" />
          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-transparent border-none outline-none text-lg text-slate-800 placeholder-slate-400"
            placeholder="Öğrenci, okul no, sınıf veya modül arayın..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
          />
          <kbd className="hidden sm:inline-flex px-2 py-1 text-[10px] font-semibold text-slate-500 bg-slate-100 border border-slate-200 rounded mr-2">ESC</kbd>
          <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-2">
          {query.trim().length >= 2 && (
            <div className="mb-3">
              <div className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2"><UserRound size={14} /> Öğrenciler</div>
              {studentLoading ? (
                <div className="px-4 py-3 text-sm text-slate-400">Öğrenciler aranıyor...</div>
              ) : students.length ? students.map((student, idx) => (
                <button key={student.id} className={`w-full text-left px-4 py-3 rounded-xl flex items-center justify-between ${idx === selectedIndex ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700 hover:bg-slate-50'}`} onClick={() => handleSelect(`/admin/students/${student.id}`)} onMouseEnter={() => setSelectedIndex(idx)}>
                  <span><span className="block font-medium">{student.fullName}</span><span className="block text-xs text-slate-500 mt-0.5">{student.schoolNumber} · {student.className}</span></span>
                  <span className="text-xs opacity-60">360° Görüntüle</span>
                </button>
              )) : <div className="px-4 py-3 text-sm text-slate-400">Öğrenci bulunamadı.</div>}
            </div>
          )}

          {filteredModules.length > 0 && (
            <div>
              <div className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2"><LayoutGrid size={14} /> Modüller</div>
              {filteredModules.map((mod, idx) => {
                const absoluteIndex = students.length + idx;
                return <button key={mod.path} className={`w-full text-left px-4 py-3 rounded-xl flex items-center justify-between ${absoluteIndex === selectedIndex ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700 hover:bg-slate-50'}`} onClick={() => handleSelect(mod.path)} onMouseEnter={() => setSelectedIndex(absoluteIndex)}>
                  <span className="font-medium">{mod.title}</span><span className="text-xs opacity-50 font-mono">{mod.path}</span>
                </button>;
              })}
            </div>
          )}

          {query.trim().length >= 2 && !studentLoading && students.length === 0 && filteredModules.length === 0 && <div className="p-8 text-center text-slate-500">Sonuç bulunamadı.</div>}
        </div>
        <div className="bg-slate-50 px-4 py-3 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
          <span><kbd className="mr-1.5 px-1.5 py-0.5 rounded border border-slate-300 bg-white shadow-sm">↑</kbd><kbd className="mr-1.5 px-1.5 py-0.5 rounded border border-slate-300 bg-white shadow-sm">↓</kbd> Gezinme · <kbd className="px-1.5 py-0.5 rounded border border-slate-300 bg-white shadow-sm">Enter</kbd> Seç</span>
          <span>Ctrl + K</span>
        </div>
      </div>
    </div>
  );
}
