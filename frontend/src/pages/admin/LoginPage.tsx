import { useState, useEffect, useRef, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function LoginPage() {
  const [username,    setUsername]    = useState('');
  const [password,    setPassword]    = useState('');
  const [rememberMe,  setRememberMe]  = useState(() => localStorage.getItem('rememberMe') === '1');
  const [error,       setError]       = useState('');
  const [loading,     setLoading]     = useState(false);
  const [slowWarning, setSlowWarning] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const usernameRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  // Kullanıcı adını hatırla; hatırlanmışsa parola alanına focus yap
  useEffect(() => {
    const saved = localStorage.getItem('savedUsername');
    if (saved) {
      setUsername(saved);
      passwordRef.current?.focus();
    } else {
      usernameRef.current?.focus();
    }
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSlowWarning(false);
    setLoading(true);

    timerRef.current = setTimeout(() => setSlowWarning(true), 3000);

    try {
      await login(username, password, rememberMe);
      if (rememberMe) {
        localStorage.setItem('rememberMe', '1');
        localStorage.setItem('savedUsername', username);
      } else {
        localStorage.removeItem('rememberMe');
        localStorage.removeItem('savedUsername');
      }
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
        <h1><img src="/icon.png" alt="OkulDesk" style={{ width: 40, height: 40, verticalAlign: 'middle', marginRight: 10, borderRadius: 8 }} />OkulDesk</h1>
        <p>Yönetici girişi yapınız</p>

        {error && <div className="alert alert-error">{error}</div>}

        {slowWarning && (
          <div className="alert alert-warning">
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
              ref={usernameRef}
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
              ref={passwordRef}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <input
              id="rememberMe"
              type="checkbox"
              checked={rememberMe}
              onChange={e => setRememberMe(e.target.checked)}
              style={{ width: 16, height: 16, cursor: 'pointer', accentColor: 'var(--primary)' }}
            />
            <label htmlFor="rememberMe" style={{ fontSize: 14, color: 'var(--text)', cursor: 'pointer', userSelect: 'none' }}>
              Beni hatırla
            </label>
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
