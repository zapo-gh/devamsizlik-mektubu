import React, { useEffect, useState, useRef } from 'react';
import api from '../../../services/api';
import toast from 'react-hot-toast';
import { Printer, FileText } from 'lucide-react';
import { PageHeader } from '../../../components/ui/PageHeader';
import { useReactToPrint } from 'react-to-print';
import { AttendanceSheetPrintTemplate } from './print/AttendanceSheetPrintTemplate';

interface Staff {
  id: string;
  name: string;
  role: string;
  unvan?: string;
  brans?: string;
  gorev?: string;
}

export default function AttendanceSheetPage() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUnvans, setSelectedUnvans] = useState<string[]>([]);
  const [selectedPrincipal, setSelectedPrincipal] = useState('');
  const [selectedVicePrincipal, setSelectedVicePrincipal] = useState('');

  // Form State
  const [documentSubject, setDocumentSubject] = useState('');
  const [documentDateNumber, setDocumentDateNumber] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [staffRes, settingsRes] = await Promise.all([
        api.get('/staff'),
        api.get('/settings')
      ]);
      const staffData = staffRes.data.data?.staff || [];
      const principalName = settingsRes.data.data?.principalName || '';
      
      setStaff(staffData);
      const unvans = Array.from(new Set(staffData.map((s: Staff) => s.unvan || 'Belirtilmemiş'))) as string[];
      const defaultSelected = unvans.filter(u => u.toLowerCase().includes('öğretmen'));
      setSelectedUnvans(defaultSelected);

      // Otomatik Müdür ve Müdür Yardımcısı bulma
      if (principalName) {
        setSelectedPrincipal(principalName);
      } else {
        const principals = staffData.filter((s: Staff) => {
          const text = (s.unvan || '') + ' ' + (s.gorev || '');
          const lower = text.toLowerCase();
          return lower.includes('müdür') && !lower.includes('yardımcı');
        });
        if (principals.length > 0) setSelectedPrincipal(principals[0].name);
      }
      
      const vicePrincipals = staffData.filter((s: Staff) => {
        const text = (s.unvan || '') + ' ' + (s.gorev || '');
        const lower = text.toLowerCase();
        return lower.includes('müdür') && lower.includes('yardımcı');
      });
      // if (vicePrincipals.length > 0) setSelectedVicePrincipal(vicePrincipals[0].name);
    } catch {
      toast.error('Kayıtlar yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: 'Personel_Imza_Sirkusu'
  });

  return (
    <div className="space-y-4">
      <PageHeader 
        title="Personel İmza Sirküsü (Okundu Belgesi)" 
        description="Resmi yazı, genelge veya kararların personele tebliğ edildiğine dair toplu imza sirküsü oluşturun."
        icon={<FileText size={24} />}
        actionText="Sirküyü Yazdır"
        onAction={handlePrint}
      />

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-4 print:hidden">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-semibold text-gray-700 mb-1">Belge Konusu / Özeti</label>
            <input 
              type="text" 
              value={documentSubject} 
              onChange={(e) => setDocumentSubject(e.target.value)}
              placeholder="Örn: 2026-2027 Eğitim Öğretim Yılı Sene Başı Öğretmenler Kurulu Toplantı Tutanağı"
              className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 transition-shadow"
            />
          </div>
          <div className="md:w-1/3">
            <label className="block text-sm font-semibold text-gray-700 mb-1">Tarih ve Sayı</label>
            <input 
              type="text" 
              value={documentDateNumber} 
              onChange={(e) => setDocumentDateNumber(e.target.value)}
              placeholder="Örn: 15.08.2026 tarih ve 12345 sayılı yazı"
              className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 transition-shadow"
            />
          </div>
        </div>

        {/* Unvan Filtreleri */}
        {staff.length > 0 && (
          <div className="border-t pt-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Gösterilecek Unvanlar</label>
            <div className="flex flex-wrap gap-4">
              {Array.from(new Set(staff.map(s => s.unvan || 'Belirtilmemiş')))
                .sort((a, b) => {
                  const aIsTeacher = a.toLowerCase().includes('öğretmen') ? 0 : 1;
                  const bIsTeacher = b.toLowerCase().includes('öğretmen') ? 0 : 1;
                  if (aIsTeacher !== bIsTeacher) return aIsTeacher - bIsTeacher;
                  return a.localeCompare(b, 'tr');
                })
                .map(unvan => (
                <label key={unvan} className="flex items-center gap-2 text-sm cursor-pointer hover:text-indigo-600 transition-colors">
                  <input 
                    type="checkbox" 
                    checked={selectedUnvans.includes(unvan)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedUnvans(prev => [...prev, unvan]);
                      } else {
                        setSelectedUnvans(prev => prev.filter(u => u !== unvan));
                      }
                    }}
                    className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  {unvan}
                </label>
              ))}
            </div>
          </div>
        )}

        {/* İmza Sahipleri */}
        <div className="border-t pt-4 flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-semibold text-gray-700 mb-1">Müdür Yardımcısı</label>
            <input
              type="text"
              list="vp-list"
              value={selectedVicePrincipal}
              onChange={(e) => setSelectedVicePrincipal(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 transition-shadow"
              placeholder="Müdür Yardımcısı Seçiniz"
            />
            <datalist id="vp-list">
              {staff.filter(s => {
                const text = (s.unvan || '') + ' ' + (s.gorev || '');
                const lower = text.toLowerCase();
                return lower.includes('müdür') && lower.includes('yardımcı');
              }).map(vp => (
                <option key={vp.id} value={vp.name} />
              ))}
            </datalist>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-semibold text-gray-700 mb-1">Okul Müdürü</label>
            <input
              type="text"
              list="principal-list"
              value={selectedPrincipal}
              onChange={(e) => setSelectedPrincipal(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 transition-shadow"
              placeholder="Okul Müdürü Adı"
            />
            <datalist id="principal-list">
              {staff.filter(s => {
                const text = (s.unvan || '') + ' ' + (s.gorev || '');
                const lower = text.toLowerCase();
                return lower.includes('müdür') && !lower.includes('yardımcı');
              }).map(p => (
                <option key={p.id} value={p.name} />
              ))}
            </datalist>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-center text-gray-500 animate-pulse">Yükleniyor...</div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto p-4">
          <table className="w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-50">
                <th className="border border-gray-300 p-2 text-center w-12">S.N</th>
                <th className="border border-gray-300 p-2 text-left w-1/3">Adı Soyadı</th>
                <th className="border border-gray-300 p-2 text-left w-1/3">Branşı</th>
                <th className="border border-gray-300 p-2 text-center w-1/4">İmza</th>
              </tr>
            </thead>
            <tbody>
              {staff
                .filter(person => selectedUnvans.includes(person.unvan || 'Belirtilmemiş'))
                .map((person, index) => {
                const unvanStr = person.brans || '-';

                return (
                  <tr key={person.id} className="hover:bg-gray-50/50">
                    <td className="border border-gray-300 p-1.5 text-center font-medium">{index + 1}</td>
                    <td className="border border-gray-300 p-1.5 font-semibold">{person.name}</td>
                    <td className="border border-gray-300 p-1.5 text-gray-800">{unvanStr}</td>
                    <td className="border border-gray-300 p-1.5 h-10"></td>
                  </tr>
                );
              })}
              {staff.filter(person => selectedUnvans.includes(person.unvan || 'Belirtilmemiş')).length === 0 && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-gray-500">
                    Sisteme kayıtlı personel bulunmuyor.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* GİZLİ YAZDIRMA ŞABLONU */}
      <div className="hidden">
        <AttendanceSheetPrintTemplate
          ref={printRef}
          documentSubject={documentSubject}
          documentDateNumber={documentDateNumber}
          staffList={staff}
          selectedUnvans={selectedUnvans}
          selectedVicePrincipal={selectedVicePrincipal}
          selectedPrincipal={selectedPrincipal}
        />
      </div>

    </div>
  );
}
