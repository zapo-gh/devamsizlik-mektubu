import React, { useState, useEffect, useRef } from 'react';
import api from '../../services/api';
import { useConfirm } from '../../hooks/useConfirm';
import { PageHeader } from '../../components/ui/PageHeader';
import { MessageCircle, Link, Unlink, QrCode, Smartphone, CheckCircle2, Info, Loader2, AlertTriangle } from 'lucide-react';

type WAStatus = 'disconnected' | 'qr' | 'connecting' | 'connected';

interface WAState {
  status: WAStatus;
  qrBase64: string | null;
  error: string | null;
}

const STATUS_LABELS: Record<WAStatus, string> = {
  disconnected: 'Bağlı Değil',
  connecting: 'Bağlanıyor...',
  qr: 'QR Kod Bekleniyor',
  connected: 'Bağlı',
};

export default function WhatsAppPage() {
  const { confirm, alert, confirmModal } = useConfirm();
  const [waState, setWaState] = useState<WAState>({ status: 'disconnected', qrBase64: null, error: null });
  const [actionLoading, setActionLoading] = useState(false);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchStatus = async () => {
    try {
      const res = await api.get('/whatsapp/status');
      setWaState(res.data.data);
    } catch { /* ignore */ }
  };

  useEffect(() => {
    fetchStatus();
    const iv = setInterval(fetchStatus, 3000);
    pollIntervalRef.current = iv;
    return () => clearInterval(iv);
  }, []);

  const handleConnect = async () => {
    setActionLoading(true);
    try {
      await api.post('/whatsapp/connect');
    } catch (err: any) {
      await alert(err.response?.data?.message || 'Bağlantı başlatılamadı.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!await confirm('WhatsApp oturumunu kapatmak istediğinize emin misiniz? Yeniden bağlanmak için QR kodu tekrar okutmanız gerekir.')) return;
    setActionLoading(true);
    try {
      await api.post('/whatsapp/disconnect');
      setWaState({ status: 'disconnected', qrBase64: null, error: null });
    } catch (err: any) {
      await alert(err.response?.data?.message || 'Bağlantı kesilemedi.');
    } finally {
      setActionLoading(false);
    }
  };

  const statusColors: Record<WAStatus, { bg: string, border: string, text: string, icon: React.ReactNode }> = {
    disconnected: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', icon: <Unlink size={24} className="text-red-500"/> },
    connecting:   { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', icon: <Loader2 size={24} className="text-amber-500 animate-spin"/> },
    qr:           { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', icon: <QrCode size={24} className="text-blue-500"/> },
    connected:    { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', icon: <CheckCircle2 size={24} className="text-green-500"/> },
  };

  const currentTheme = statusColors[waState.status];

  return (
    <div className="space-y-6">
      <PageHeader
        title="WhatsApp Entegrasyonu"
        description="Okul WhatsApp hesabını bağlayarak velilere otomatik PDF belge ve metin mesajı gönderin."
        icon={<MessageCircle size={28} className="text-emerald-600" />}
      />

      {/* Durum Kartı */}
      <div className={`rounded-xl border ${currentTheme.border} ${currentTheme.bg} p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm transition-colors duration-300`}>
        <div className="flex items-center gap-4">
          <div className="p-3 bg-white rounded-full shadow-sm">
            {currentTheme.icon}
          </div>
          <div>
            <div className={`text-xl font-bold ${currentTheme.text}`}>{STATUS_LABELS[waState.status]}</div>
            {waState.error && <div className="text-red-500 text-sm mt-1 font-semibold flex items-center gap-1"><AlertTriangle size={14}/> {waState.error}</div>}
          </div>
        </div>
        
        <div>
          {(waState.status === 'disconnected') && (
            <button 
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
              onClick={handleConnect}
              disabled={actionLoading}
            >
              {actionLoading ? <><Loader2 size={18} className="animate-spin"/> Başlatılıyor...</> : <><Link size={18}/> Bağlan</>}
            </button>
          )}
          {(waState.status === 'connected') && (
            <button 
              className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
              onClick={handleDisconnect}
              disabled={actionLoading}
            >
              {actionLoading ? <><Loader2 size={18} className="animate-spin"/> Bekleyin...</> : <><Unlink size={18}/> Oturumu Kapat</>}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sol Kolon: Bilgi ve Talimatlar */}
        <div className="space-y-6">
          {waState.status === 'disconnected' && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-gray-100 bg-gray-50/50">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  <Info size={20} className="text-indigo-600" /> Nasıl Çalışır?
                </h3>
              </div>
              <div className="p-6 text-sm text-gray-700">
                <ol className="space-y-4 list-decimal list-inside">
                  <li><strong className="text-gray-900 font-semibold">Bağlan</strong> butonuna tıklayın.</li>
                  <li>QR kod görüntülendiğinde telefonda WhatsApp'ı açın.</li>
                  <li><span className="bg-gray-100 px-2 py-0.5 rounded font-mono text-xs">Ayarlar → Bağlı Cihazlar → Cihaz Bağla</span> menüsünden ekrandaki QR kodu okutun.</li>
                  <li>Bağlantı kurulduktan sonra <strong className="text-gray-900">Devamsızlık</strong> ve <strong className="text-gray-900">Yazılı Uyarılar</strong> sayfalarında "📱 WhatsApp Gönder" butonları aktif olur.</li>
                  <li>Butona basınca ilgili belge veya mesaj <strong className="text-indigo-600 font-bold">otomatik olarak</strong> velinin telefonuna gönderilir.</li>
                </ol>
                <div className="mt-6 p-4 bg-indigo-50 border border-indigo-100 rounded-lg text-indigo-800 text-xs font-medium flex gap-2">
                  <Smartphone size={16} className="shrink-0"/>
                  Oturum bilgisi kaydedilir. Programı kapatıp açtığınızda otomatik olarak tekrar bağlanır.
                </div>
              </div>
            </div>
          )}

          {waState.status === 'connected' && (
            <div className="bg-white rounded-xl border border-green-200 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-green-100 bg-green-50">
                <h3 className="font-bold text-green-900 flex items-center gap-2">
                  <CheckCircle2 size={20} className="text-green-600" /> Bağlantı Aktif
                </h3>
              </div>
              <div className="p-6">
                <p className="text-gray-800 text-sm mb-4 leading-relaxed">
                  WhatsApp hesabınız başarıyla bağlandı. <strong className="font-bold">Devamsızlık</strong> ve <strong className="font-bold">Yazılı Uyarılar</strong> sayfalarındaki
                  <span className="inline-flex items-center gap-1 bg-green-100 text-green-800 px-2 py-0.5 rounded font-bold text-xs mx-1">
                    <MessageCircle size={12}/> WhatsApp Gönder
                  </span>
                  butonunu kullanarak velilere otomatik mesaj gönderebilirsiniz.
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
                    <div className="font-bold text-gray-900 text-xs uppercase mb-1">Devamsızlık Mektupları</div>
                    <div className="text-gray-500 text-xs">Mektup PDF dosyası olarak belge halinde gönderilir.</div>
                  </div>
                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
                    <div className="font-bold text-gray-900 text-xs uppercase mb-1">Yazılı Uyarılar</div>
                    <div className="text-gray-500 text-xs">Şablon dahilinde standart metin mesajı olarak gönderilir.</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sağ Kolon: QR Kod (Sadece bekleniyorsa gösterilir) */}
        {waState.status === 'qr' && waState.qrBase64 && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col items-center justify-center p-8 animate-in fade-in zoom-in duration-500">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-full mb-4">
              <QrCode size={32} />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">QR Kodu Okutun</h3>
            <p className="text-gray-500 text-sm text-center mb-6 max-w-xs">
              Telefonunuzda WhatsApp'ı açın <br/> 
              <strong className="text-gray-700">Ayarlar → Bağlı Cihazlar → Cihaz Bağla</strong>
            </p>
            <div className="p-2 bg-white border-2 border-gray-100 rounded-xl shadow-sm">
              <img 
                className="w-64 h-64 object-contain" 
                src={waState.qrBase64}
                alt="WhatsApp QR Kodu"
              />
            </div>
            <div className="mt-6 flex items-center gap-2 text-xs font-semibold text-gray-400">
              <Loader2 size={14} className="animate-spin"/> QR kod 60 saniyede bir yenilenir
            </div>
          </div>
        )}
      </div>

      {confirmModal}
    </div>
  );
}
