import { useState, useEffect } from 'react';
import { FileText, Printer, Download, Search, FileSymlink } from 'lucide-react';
import api from '../../services/api';
import { PageHeader } from '../../components/ui/PageHeader';
import { AlanTercihFormuPrint } from '../../components/print/AlanTercihFormuPrint';
import { SecmeliDersDilekcesiPrint } from '../../components/print/SecmeliDersDilekcesiPrint';
import { OgleArasiDilekcesiPrint } from '../../components/print/OgleArasiDilekcesiPrint';
import { VeliOkulSozlesmesiPrint } from '../../components/print/VeliOkulSozlesmesiPrint';

const DOCUMENTS = [
  {
    id: 1,
    title: 'Alan Tercih Formu',
    description: 'Öğrencilerin alan seçimleri için doldurması gereken standart form.',
    file: '/docs/alan-tercih-formu.pdf',
    component: AlanTercihFormuPrint
  },
  {
    id: 2,
    title: 'Seçmeli Ders Dilekçesi',
    description: 'Öğrencilerin seçmeli ders tercihlerini bildirdiği dilekçe örneği.',
    file: '/docs/secmeli-ders-dilekcesi.pdf',
    component: SecmeliDersDilekcesiPrint
  },
  {
    id: 3,
    title: 'Öğle Arası Dilekçesi',
    description: 'Öğle arasında okul dışına çıkmak isteyen öğrenciler için veli izin dilekçesi.',
    file: '/docs/ogle-arasi-dilekcesi.pdf',
    component: OgleArasiDilekcesiPrint
  },
  {
    id: 4,
    title: 'Öğrenci Veli Okul Sözleşmesi',
    description: 'Kayıt sırasında veya dönem başında veli ile imzalanan standart sözleşme.',
    file: '/docs/ogrenci-veli-okul-sozlesmesi.pdf',
    component: VeliOkulSozlesmesiPrint
  }
];

export default function MatbuEvraklarPage() {
  const [schoolName, setSchoolName] = useState('');
  const [principalName, setPrincipalName] = useState('');
  const [assistantPrincipalName, setAssistantPrincipalName] = useState('');
  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [activeDocId, setActiveDocId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    // Okul adını ve müdür adını ayarlardan çek
    api.get('/settings').then((res: any) => {
      const d = res.data?.data || res.data;
      if (d?.schoolName) setSchoolName(d.schoolName);
      if (d?.principalName) setPrincipalName(d.principalName);
    }).catch(() => {});

    // Müdür yardımcısını personelden çek
    api.get('/staff').then((res: any) => {
      const allStaff = res.data?.data?.staff || [];
      const asstPrincipal = allStaff.find((s: any) => s.role === 'MUDUR_YARDIMCISI');
      if (asstPrincipal) setAssistantPrincipalName(asstPrincipal.name);
    }).catch(() => {});

    // Öğrenci listesini çek (Tümünü veya max 500)
    api.get('/students?limit=1000').then((res: any) => {
      const fetchedStudents = res.data?.data?.students || [];
      // Sınıf adına göre mantıksal sıralama (9. sınıflar 10. sınıflardan önce gelsin)
      const sortedStudents = fetchedStudents.sort((a: any, b: any) => {
        const classA = a.className || '';
        const classB = b.className || '';
        
        const numA = parseInt(classA.match(/^(\d+)/)?.[1] || '999', 10);
        const numB = parseInt(classB.match(/^(\d+)/)?.[1] || '999', 10);
        
        if (numA !== numB) return numA - numB;
        return classA.localeCompare(classB);
      });
      setStudents(sortedStudents);
    }).catch(() => {
      setStudents([]);
    });
  }, []);

  const handlePrint = (docId: number) => {
    setActiveDocId(docId);
    // Component'in render olması için kısa bir süre bekleyip yazdır
    setTimeout(() => {
      window.print();
      // Yazdırma penceresi kapandıktan sonra aktif dökümanı sıfırlayabiliriz (isteğe bağlı)
      setTimeout(() => setActiveDocId(null), 1000);
    }, 100);
  };

  const handleDownload = async (fileUrl: string, fileName: string) => {
    try {
      const response = await fetch(fileUrl);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('İndirme hatası:', error);
      alert('Dosya indirilirken bir hata oluştu.');
    }
  };

  const selectedStudent = Array.isArray(students) ? students.find(s => s.id === selectedStudentId) || null : null;

  return (
    <div className="space-y-6">
      <div className="print:hidden">
        <PageHeader
          title="Matbu Evraklar"
          description="Standart okul formlarını yazdırın veya indirin"
          icon={<FileSymlink size={28} className="text-gray-700" />}
        />
      </div>

      {/* Öğrenci Seçim Kartı */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 print:hidden">
        <div className="flex items-start gap-4">
          <div className="bg-indigo-50 p-3 rounded-lg text-indigo-600">
            <Search size={24} />
          </div>
          <div className="flex-1 relative">
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Öğrenci Seçin (Otomatik Doldurma İçin)
            </label>
            <div className="relative w-full md:max-w-md">
              <input
                type="text"
                placeholder="Öğrenci numarası veya adıyla arayın..."
                value={selectedStudent ? `${selectedStudent.className ? selectedStudent.className + ' - ' : ''}${selectedStudent.schoolNumber} - ${selectedStudent.fullName}` : searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSelectedStudentId('');
                  setIsDropdownOpen(true);
                }}
                onFocus={() => setIsDropdownOpen(true)}
                onBlur={() => setTimeout(() => setIsDropdownOpen(false), 200)}
                className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
              />
              
              {isDropdownOpen && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  <div 
                    className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 cursor-pointer"
                    onClick={() => {
                      setSelectedStudentId('');
                      setSearchQuery('');
                      setIsDropdownOpen(false);
                    }}
                  >
                    -- Öğrenci Seçimini Temizle --
                  </div>
                  {Array.isArray(students) && students
                    .filter(s => `${s.className || ''} ${s.schoolNumber || ''} ${s.fullName || ''}`.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map(s => (
                    <div 
                      key={s.id} 
                      className="px-4 py-2 text-sm hover:bg-indigo-50 cursor-pointer text-gray-700"
                      onClick={() => {
                        setSelectedStudentId(s.id);
                        setSearchQuery('');
                        setIsDropdownOpen(false);
                      }}
                    >
                      {s.className ? `${s.className} - ` : ''} {s.schoolNumber} - {s.fullName}
                    </div>
                  ))}
                  {Array.isArray(students) && students.filter(s => `${s.className || ''} ${s.schoolNumber || ''} ${s.fullName || ''}`.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
                    <div className="px-4 py-2 text-sm text-gray-500 italic">
                      Öğrenci bulunamadı.
                    </div>
                  )}
                </div>
              )}
            </div>
            <p className="mt-2 text-sm text-gray-500">
              Listeden bir öğrenci seçtiğinizde formdaki bilgiler (ad, soyad, sınıf vb.) otomatik doldurulur.
            </p>
          </div>
        </div>
      </div>

      {/* Evrak Kartları */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 print:hidden">
        {DOCUMENTS.map((doc) => (
          <div key={doc.id} className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-6 flex flex-col">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-indigo-50 p-2.5 rounded-lg text-indigo-600">
                <FileText size={22} />
              </div>
              <h3 className="m-0 text-base font-bold text-gray-900 leading-tight">
                {doc.title}
              </h3>
            </div>
            
            <p className="text-gray-500 text-sm mb-6 flex-1">
              {doc.description}
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => handlePrint(doc.id)}
                className="flex-1 flex justify-center items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition"
              >
                <Printer size={16} />
                Yazdır
              </button>
              
              <button
                onClick={() => handleDownload(doc.file, `${doc.title}.pdf`)}
                className="flex justify-center items-center px-4 py-2 text-gray-600 bg-gray-100 border border-gray-200 rounded-lg hover:bg-gray-200 transition"
                title="İndir (Orijinal Boş PDF)"
              >
                <Download size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Yazdırma Modülü - Ekranda gizli, CSS ile @media print'te görünür olacak */}
      <div id="print-root">
        {activeDocId && (() => {
          const ActiveComponent = DOCUMENTS.find(d => d.id === activeDocId)?.component as React.ElementType;
          return ActiveComponent ? (
            <ActiveComponent 
              schoolName={schoolName} 
              student={selectedStudent} 
              principalName={principalName}
              assistantPrincipalName={assistantPrincipalName}
            />
          ) : null;
        })()}
      </div>
    </div>
  );
}
