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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-5" >
      <div className="bg-white rounded-2xl py-9 px-10 w-full max-w-[410px] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.35)] animate-[fade-in_0.3s_ease-out]" >
        
        <div className="text-center mb-7" >
          <div className="w-[52px] h-[52px] bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center mx-auto mb-3.5 shadow-[0_4px_12px_rgba(59,130,246,0.3)]" >
            <GraduationCap className="text-white"  size={28}  />
          </div>
          <h1 className="text-[22px] font-bold text-slate-900 m-0 tracking-tight" >
            OkulDesk
          </h1>
          <p className="text-[13px] text-slate-500 mt-1" >
            Yönetim Sistemine Giriş Yapın
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-[13px] px-3.5 py-2.5 rounded-lg mb-4 bg-red-50 text-red-700 border border-red-200" >
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {slowWarning && (
          <div className="text-xs px-3.5 py-2.5 rounded-lg mb-4 bg-yellow-50 text-yellow-700 border border-yellow-200" >
            ⏳ Sunucu uyandırılıyor, lütfen bekleyin (ilk girişte 20–40 saniye sürebilir)...
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4" >
            <label className="block text-[13px] font-semibold text-slate-900 mb-1.5" >
              Kullanıcı Adı
            </label>
            <div className="relative" >
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" >
                <User size={16} />
              </span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Kullanıcı adınızı giriniz"
                required
                ref={usernameRef}
                className="w-full py-2.5 pr-3 pl-9 rounded-lg border border-slate-200 text-[13px] outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>

          <div className="mb-6" >
            <label className="block text-[13px] font-semibold text-slate-900 mb-1.5" >
              Şifre
            </label>
            <div className="relative" >
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" >
                <Lock size={16} />
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Şifrenizi giriniz"
                required
                ref={passwordRef}
                className="w-full py-2.5 pr-3 pl-9 rounded-lg border border-slate-200 text-[13px] outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>

          <div className="flex items-center justify-between mb-5" >
            <div className="flex items-center gap-2" >
              <input
                id="rememberMe"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 cursor-pointer accent-blue-600"
              />
              <label className="text-[13px] text-slate-900 cursor-pointer select-none"
                htmlFor="rememberMe"
                
              >
                Beni hatırla
              </label>
            </div>
            <div className="flex items-center gap-1 text-slate-500 text-[11px]" >
              <ShieldCheck size={14} />
              <span>Güvenli Oturum</span>
            </div>
          </div>

          <button className="w-full py-2.5 px-4 text-[14px] rounded-lg flex items-center justify-center gap-2 bg-blue-600 text-white font-medium transition-colors hover:bg-blue-700 focus:ring-4 focus:ring-blue-100 disabled:opacity-70 disabled:cursor-not-allowed"
            type="submit"
            disabled={loading}
            
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
