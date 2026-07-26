import { useState, useEffect, useRef, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { GraduationCap, Lock, User, ArrowRight, ShieldCheck } from 'lucide-react';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(() => localStorage.getItem('rememberMe') === '1');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
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

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, hsl(222 47% 11%) 0%, hsl(217 32% 17%) 100%)',
        padding: 20,
      }}
    >
      <div
        className="login-card"
        style={{
          background: 'white',
          borderRadius: 16,
          padding: '36px 40px',
          width: '100%',
          maxWidth: 410,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          animation: 'fade-in 0.3s ease-out',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div
            style={{
              width: 52,
              height: 52,
              background: 'linear-gradient(135deg, #3b82f6 0%, #4f46e5 100%)',
              borderRadius: 14,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 14px',
              boxShadow: '0 4px 12px rgba(59,130,246,0.3)',
            }}
          >
            <GraduationCap size={28} color="#ffffff" />
          </div>
          <h1
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: 'hsl(222.2 84% 4.9%)',
              margin: 0,
              letterSpacing: '-0.02em',
            }}
          >
            OkulDesk
          </h1>
          <p
            style={{
              fontSize: 13,
              color: 'var(--text-muted)',
              marginTop: 4,
            }}
          >
            Yönetim Sistemine Giriş Yapın
          </p>
        </div>

        {error && (
          <div
            className="alert alert-error"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 13,
              padding: '10px 14px',
              borderRadius: 8,
              marginBottom: 16,
            }}
          >
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {slowWarning && (
          <div
            className="alert alert-warning"
            style={{
              fontSize: 12,
              padding: '10px 14px',
              borderRadius: 8,
              marginBottom: 16,
            }}
          >
            ⏳ Sunucu uyandırılıyor, lütfen bekleyin (ilk girişte 20–40 saniye sürebilir)...
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: 16 }}>
            <label
              style={{
                display: 'block',
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--text)',
                marginBottom: 6,
              }}
            >
              Kullanıcı Adı
            </label>
            <div style={{ position: 'relative' }}>
              <span
                style={{
                  position: 'absolute',
                  left: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                }}
              >
                <User size={16} />
              </span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Kullanıcı adınızı giriniz"
                required
                ref={usernameRef}
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 36px',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  fontSize: 13,
                  outline: 'none',
                }}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 18 }}>
            <label
              style={{
                display: 'block',
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--text)',
                marginBottom: 6,
              }}
            >
              Şifre
            </label>
            <div style={{ position: 'relative' }}>
              <span
                style={{
                  position: 'absolute',
                  left: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                }}
              >
                <Lock size={16} />
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Şifrenizi giriniz"
                required
                ref={passwordRef}
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 36px',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  fontSize: 13,
                  outline: 'none',
                }}
              />
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 20,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                id="rememberMe"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                style={{
                  width: 16,
                  height: 16,
                  cursor: 'pointer',
                  accentColor: 'var(--primary)',
                }}
              />
              <label
                htmlFor="rememberMe"
                style={{
                  fontSize: 13,
                  color: 'var(--text)',
                  cursor: 'pointer',
                  userSelect: 'none',
                }}
              >
                Beni hatırla
              </label>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-muted)', fontSize: 11 }}>
              <ShieldCheck size={14} />
              <span>Güvenli Oturum</span>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{
              width: '100%',
              padding: '11px 16px',
              fontSize: 14,
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <span>
              {loading
                ? slowWarning
                  ? 'Sunucu uyandırılıyor...'
                  : 'Giriş yapılıyor...'
                : 'Giriş Yap'}
            </span>
            {!loading && <ArrowRight size={16} />}
          </button>
        </form>
      </div>
    </div>
  );
}
