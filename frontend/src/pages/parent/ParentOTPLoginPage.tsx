import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

export default function ParentOTPLoginPage() {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await api.post('/otp/verify', { phone, code });
      const { absenteeism } = res.data.data;

      // Store absenteeism data in sessionStorage for the dashboard
      sessionStorage.setItem('parentAbsenteeism', JSON.stringify(absenteeism));
      navigate('/veli-panel');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Doğrulama başarısız. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>📋 Devamsızlık Bildirimi</h1>
        <p>
          Devamsızlık mektubunu görüntülemek için telefon numaranızı ve size
          gönderilen tek kullanımlık şifreyi giriniz.
        </p>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Telefon Numarası</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="905551234567"
              required
              autoFocus
            />
            <small style={{ color: 'var(--text-muted)' }}>
              Ülke kodu ile birlikte giriniz
            </small>
          </div>

          <div className="form-group">
            <label>Tek Kullanımlık Şifre (OTP)</label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="4 haneli şifre"
              maxLength={4}
              required
              style={{ fontSize: 20, letterSpacing: 8, textAlign: 'center' }}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
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
