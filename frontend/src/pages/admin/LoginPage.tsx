import { useState, useEffect, useRef, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [slowWarning, setSlowWarning] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSlowWarning(false);
    setLoading(true);

    timerRef.current = setTimeout(() => setSlowWarning(true), 3000);

    try {
      await login(username, password);
      navigate('/admin');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Giriş başarısız. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
      setSlowWarning(false);
      if (timerRef.current) clearTimeout(timerRef.current);
    }
  };

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>🏫 Devamsızlık Sistemi</h1>
        <p>Yönetici girişi yapınız</p>

        {error && <div className="alert alert-error">{error}</div>}

        {slowWarning && (
          <div className="alert" style={{ background: '#fef9c3', color: '#854d0e', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13 }}>
            ⏳ Sunucu uyandırılıyor, lütfen bekleyin (ilk girişte 30–60 saniye sürebilir)...
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Kullanıcı Adı</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Kullanıcı adınızı giriniz"
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label>Şifre</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Şifrenizi giriniz"
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%', marginTop: 8 }}
          >
            {loading ? (slowWarning ? 'Sunucu uyandırılıyor...' : 'Giriş yapılıyor...') : 'Giriş Yap'}
          </button>
        </form>
      </div>
    </div>
  );
}
