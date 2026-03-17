import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

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
        <div className="sidebar-header">
          <h2>Devamsızlık Sistemi</h2>
          <p>Yönetici Paneli</p>
        </div>

        <nav className="sidebar-nav">
          <NavLink to="/admin" end onClick={closeSidebar}>
            📊 Gösterge Paneli
          </NavLink>
          <NavLink to="/admin/students" onClick={closeSidebar}>
            👨‍🎓 Öğrenciler
          </NavLink>
          <NavLink to="/admin/absenteeism" onClick={closeSidebar}>
            📄 Devamsızlık
          </NavLink>
          <NavLink to="/admin/warnings" onClick={closeSidebar}>
            ⚠️ Yazılı Uyarılar
          </NavLink>
          <NavLink to="/admin/violations" onClick={closeSidebar}>
            📷 İhlal Takibi
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          <div style={{ fontSize: 13, opacity: 0.7, marginBottom: 8 }}>
            {user?.username} (Yönetici)
          </div>
          <button className="btn btn-outline btn-sm" onClick={handleLogout} style={{ width: '100%', color: 'white', borderColor: 'rgba(255,255,255,0.2)' }}>
            Çıkış Yap
          </button>
        </div>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
