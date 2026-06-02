import { useState, useEffect, useRef } from 'react';
import api from '../../services/api';
import { useConfirm } from '../../hooks/useConfirm';

type WAStatus = 'disconnected' | 'qr' | 'connecting' | 'connected';

interface WAState {
  status: WAStatus;
  qrBase64: string | null;
  error: string | null;
}

const STATUS_LABELS: Record<WAStatus, string> = {
  disconnected: '🔴 Bağlı Değil',
  connecting: '🟡 Bağlanıyor...',
  qr: '📱 QR Kod Bekleniyor',
  connected: '🟢 Bağlı',
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

  const statusColor: Record<WAStatus, string> = {
    disconnected: '#fee2e2',
    connecting: '#fef9c3',
    qr: '#dbeafe',
    connected: '#dcfce7',
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">📱 WhatsApp Entegrasyonu</h1>
          <p className="page-subtitle">Okul WhatsApp hesabı bağlanarak velilere otomatik mesaj gönderilir.</p>
        </div>
      </div>

      {/* Durum Kartı */}
      <div className="card" style={{ marginBottom: 24, background: statusColor[waState.status], border: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{STATUS_LABELS[waState.status]}</div>
            {waState.error && <div style={{ color: 'var(--danger)', fontSize: 13, marginTop: 4 }}>{waState.error}</div>}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {(waState.status === 'disconnected') && (
              <button
                className="btn btn-primary"
                onClick={handleConnect}
                disabled={actionLoading}
              >
                {actionLoading ? 'Başlatılıyor...' : '🔌 Bağlan'}
              </button>
            )}
            {(waState.status === 'connected') && (
              <button
                className="btn btn-danger"
                onClick={handleDisconnect}
                disabled={actionLoading}
              >
                {actionLoading ? '...' : '🔴 Oturumu Kapat'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* QR Kod */}
      {waState.status === 'qr' && waState.qrBase64 && (
        <div className="card" style={{ textAlign: 'center', maxWidth: 380, margin: '0 auto 24px' }}>
          <h3 style={{ marginBottom: 8 }}>QR Kodu Okutun</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 16 }}>
            Telefonunuzda WhatsApp'ı açın → Ayarlar → Bağlı Cihazlar → Cihaz Bağla
          </p>
          <img
            src={waState.qrBase64}
            alt="WhatsApp QR Kodu"
            style={{ width: 280, height: 280, border: '2px solid var(--border)', borderRadius: 8 }}
          />
          <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 12 }}>
            QR kod 60 saniyede bir yenilenir.
          </p>
        </div>
      )}

      {/* Bağlantı talimatları */}
      {waState.status === 'disconnected' && (
        <div className="card">
          <h3>Nasıl Çalışır?</h3>
          <ol style={{ paddingLeft: 20, lineHeight: 2, color: 'var(--text)' }}>
            <li><strong>Bağlan</strong> butonuna tıklayın.</li>
            <li>QR kod görüntülendiğinde telefonda WhatsApp'ı açın.</li>
            <li>Ayarlar → Bağlı Cihazlar → Cihaz Bağla ile QR kodu okutun.</li>
            <li>Bağlantı kurulduktan sonra <strong>Devamsızlık</strong> ve <strong>Yazılı Uyarı</strong> sayfalarında "📱 WhatsApp Gönder" butonları aktif olur.</li>
            <li>Butona basınca PDF belgesi ve mesaj <strong>otomatik olarak</strong> velinin WhatsApp'ına gönderilir.</li>
          </ol>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 8 }}>
            Oturum bilgisi kaydedilir. Sonraki program başlatmalarında otomatik bağlanır.
          </p>
        </div>
      )}

      {waState.status === 'connected' && (
        <div className="card">
          <h3>✅ Bağlantı Aktif</h3>
          <p style={{ color: 'var(--text)' }}>
            WhatsApp bağlı. <strong>Devamsızlık</strong> ve <strong>Yazılı Uyarılar</strong> sayfalarındaki
            <strong> "📱 WhatsApp Gönder"</strong> butonunu kullanarak velilere otomatik mesaj gönderebilirsiniz.
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
            Devamsızlık mektupları PDF belgesiyle, yazılı uyarılar ise metin mesajı olarak otomatik gönderilir.
          </p>
        </div>
      )}
      {confirmModal}
    </div>
  );
}
