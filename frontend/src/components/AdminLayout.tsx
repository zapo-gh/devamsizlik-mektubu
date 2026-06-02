import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function NavItem({ to, icon, label, onClick }: { to: string; icon: string; label: string; onClick: () => void; end?: boolean }) {
  return (
    <NavLink to={to} onClick={onClick} end={to === '/admin'}>
      <span className="nav-icon">{icon}</span>
      {label}
    </NavLink>
  );
}

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="app-container">
      {/* Mobile hamburger button */}
      <button
        className="hamburger-btn"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        aria-label="Menüyü aç"
      >
        <span className="hamburger-icon">{sidebarOpen ? '✕' : '☰'}</span>
      </button>

      {/* Overlay for mobile */}
      {sidebarOpen && <div className="sidebar-overlay" onClick={closeSidebar} />}

      <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        {/* Logo / Başlık */}
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <img src="/icon.png" alt="OkulDesk" style={{ width: 28, height: 28, objectFit: 'contain', display: 'block' }} />
          </div>
          <div className="sidebar-logo-text">
            <h2>OkulDesk</h2>
            <p>Yönetici Paneli</p>
          </div>
        </div>

        <nav className="sidebar-nav">

          {/* Genel */}
          <span className="sidebar-group-label">Genel</span>
          <NavItem to="/admin"        icon="▣"  label="Gösterge Paneli"    onClick={closeSidebar} />
          <NavItem to="/admin/students" icon="⊞" label="Öğrenci Listesi"  onClick={closeSidebar} />
          <NavItem to="/admin/staff"  icon="⊟"  label="Personel Yönetimi" onClick={closeSidebar} />

          {/* Öğrenci İşlemleri */}
          <span className="sidebar-group-label">Öğrenci İşlemleri</span>
          <NavItem to="/admin/absenteeism"        icon="✉" label="Devamsızlık Mektubu"          onClick={closeSidebar} />
          <NavItem to="/admin/warnings"           icon="△" label="Yazılı Uyarılar"              onClick={closeSidebar} />
          <NavItem to="/admin/violations"         icon="◉" label="İhlal Takibi"                 onClick={closeSidebar} />
          <NavItem to="/admin/grade-reports"      icon="↘" label="Başarısızlık Riski Bildirimi" onClick={closeSidebar} />
          <NavItem to="/admin/parent-notification" icon="◈" label="ÖMYK Devamsızlık Bildirimi" onClick={closeSidebar} />

          {/* Evrak İşlemleri */}
          <span className="sidebar-group-label">Evrak İşlemleri</span>
          <NavItem to="/admin/parent-meeting" icon="▤" label="Veli Toplantısı İmza Sirküsü" onClick={closeSidebar} />
          <NavItem to="/admin/teblig"         icon="▦" label="Tebliğ – Tebellüğ Belgesi"   onClick={closeSidebar} />

          {/* Sistem */}
          <span className="sidebar-group-label">Sistem</span>
          <NavItem to="/admin/whatsapp" icon="◌" label="WhatsApp Bağlantısı" onClick={closeSidebar} />
          <NavItem to="/admin/settings" icon="◎" label="Ayarlar"             onClick={closeSidebar} />

        </nav>

        <div className="sidebar-footer">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.85)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.username}
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 1 }}>
                Yönetici
              </div>
            </div>
            <button
              onClick={handleLogout}
              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, color: 'rgba(255,255,255,0.6)', fontSize: 11, padding: '5px 10px', cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' }}
            >
              Çıkış Yap
            </button>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
