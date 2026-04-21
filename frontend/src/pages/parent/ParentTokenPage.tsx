import { useState, useEffect, FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';

interface TokenInfo {
  isExpired: boolean;
  isUsed: boolean;
  studentName: string;
  className: string;
}

export default function ParentTokenPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [pageError, setPageError] = useState('');

  useEffect(() => {
    if (!token) {
      setPageError('Geçersiz bağlantı.');
      setPageLoading(false);
      return;
    }

    api
      .get(`/otp/info/${token}`)
      .then((res) => {
        setTokenInfo(res.data.data);
      })
      .catch(() => {
        setPageError('Bu bağlantı geçersiz veya bulunamadı.');
      })
      .finally(() => {
        setPageLoading(false);
      });
  }, [token]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await api.post('/otp/verify', { token, code });
      const { absenteeism } = res.data.data;

      sessionStorage.setItem('parentAbsenteeism', JSON.stringify(absenteeism));
      sessionStorage.setItem('parentOtpToken', token!);
      navigate('/veli-panel');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Doğrulama başarısız. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  if (pageLoading) {
    return (
      <div className="login-container">
        <div className="login-card" style={{ textAlign: 'center' }}>
          <div className="spinner spinner-dark" />
          <p style={{ marginTop: 16, color: 'var(--text-muted)' }}>Bağlantı kontrol ediliyor...</p>
        </div>
      </div>
    );
  }

  if (pageError) {
    return (
      <div className="login-container">
        <div className="login-card" style={{ textAlign: 'center' }}>
          <h1>❌ Geçersiz Bağlantı</h1>
          <p style={{ color: 'var(--text-muted)', marginBottom: 16 }}>{pageError}</p>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Sorun yaşıyorsanız okul idaresi ile iletişime geçiniz.
          </p>
        </div>
      </div>
    );
  }

  if (tokenInfo?.isExpired) {
    return (
      <div className="login-container">
        <div className="login-card" style={{ textAlign: 'center' }}>
          <h1>⏰ Süre Doldu</h1>
          <p style={{ color: 'var(--text-muted)' }}>
            Bu bağlantının süresi dolmuştur.
          </p>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 12 }}>
            Okul idaresinden yeni bağlantı talep ediniz.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>📋 Devamsızlık Bildirimi</h1>

        {tokenInfo && (
          <div
            style={{
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: 'var(--radius)',
              padding: '12px 16px',
              marginBottom: 16,
              fontSize: 14,
            }}
          >
            <strong>{tokenInfo.studentName}</strong> — {tokenInfo.className}
          </div>
        )}

        <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 16 }}>
          Devamsızlık mektubunu görüntülemek için size WhatsApp ile gönderilen şifreyi giriniz.
        </p>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Tek Kullanımlık Şifre (OTP)</label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              placeholder="● ● ● ●"
              maxLength={4}
              required
              autoFocus
              style={{ fontSize: 28, letterSpacing: 12, textAlign: 'center', fontWeight: 600, caretColor: 'var(--primary)' }}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading || code.length !== 4}
            style={{ width: '100%', marginTop: 8 }}
          >
            {loading ? <span className="spinner" /> : 'Doğrula ve Görüntüle'}
          </button>
        </form>

        <div style={{ marginTop: 24, textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>
          <p>⏰ Şifre 24 saat geçerlidir.</p>
          <p>Sorun yaşıyorsanız okul idaresi ile iletişime geçiniz.</p>
        </div>
      </div>
    </div>
  );
}
