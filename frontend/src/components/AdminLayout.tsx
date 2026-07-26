import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Users,
  UserCheck,
  Mail,
  AlertTriangle,
  ShieldAlert,
  TrendingDown,
  Bell,
  FileText,
  FileCheck,
  MessageSquare,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  GraduationCap
} from 'lucide-react';

interface NavItemProps {
  to: string;
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  collapsed: boolean;
  end?: boolean;
}

function NavItem({ to, icon: Icon, label, onClick, collapsed, end }: NavItemProps) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      end={end || to === '/admin'}
      title={collapsed ? label : undefined}
      style={({ isActive }) => ({
        display: 'flex',
        alignItems: 'center',
        gap: collapsed ? 0 : 12,
        justifyContent: collapsed ? 'center' : 'flex-start',
        padding: collapsed ? '10px 0' : '9px 12px',
        borderRadius: 8,
        color: isActive ? '#93c5fd' : 'rgba(255,255,255,0.7)',
        background: isActive ? 'rgba(96,165,250,0.15)' : 'transparent',
        fontWeight: isActive ? 600 : 400,
        fontSize: 13,
        textDecoration: 'none',
        transition: 'all 0.18s ease',
        marginBottom: 2,
      })}
    >
      <Icon
        size={18}
        style={{
          flexShrink: 0,
          color: 'inherit',
          opacity: 0.9,
        }}
      />
      {!collapsed && (
        <span
          style={{
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            lineHeight: 1.2,
          }}
        >
          {label}
        </span>
      )}
    </NavLink>
  );
}

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false); // Mobil drawer için
  const [collapsed, setCollapsed] = useState(false); // Masaüstü yan menü daraltma

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

      <aside
        className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}
        style={{
          width: collapsed ? 76 : 252,
          minWidth: collapsed ? 76 : 252,
          transition: 'width 0.22s ease, min-width 0.22s ease',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          background: 'hsl(222 47% 11%)',
          borderRight: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        {/* Logo / Başlık */}
        <div
          className="sidebar-header"
          style={{
            padding: collapsed ? '18px 14px' : '18px 18px',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'space-between',
            minHeight: 68,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 11, overflow: 'hidden' }}>
            <div
              style={{
                width: 36,
                height: 36,
                background: 'linear-gradient(135deg, #3b82f6 0%, #4f46e5 100%)',
                borderRadius: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                boxShadow: '0 2px 6px rgba(59,130,246,0.3)',
              }}
            >
              <GraduationCap size={20} color="#ffffff" />
            </div>
            {!collapsed && (
              <div style={{ minWidth: 0 }}>
                <h2
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: '#ffffff',
                    margin: 0,
                    letterSpacing: '-0.02em',
                  }}
                >
                  OkulDesk
                </h2>
                <p
                  style={{
                    fontSize: 11,
                    color: 'rgba(255,255,255,0.45)',
                    margin: 0,
                  }}
                >
                  Yönetim Paneli
                </p>
              </div>
            )}
          </div>

          {/* Menü Daraltma Butonu (Masaüstü) */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            title={collapsed ? 'Menüyü Genişlet' : 'Menüyü Daralt'}
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: 'none',
              borderRadius: 6,
              width: 26,
              height: 26,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'rgba(255,255,255,0.6)',
              cursor: 'pointer',
              flexShrink: 0,
              transition: 'background 0.15s, color 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.12)';
              e.currentTarget.style.color = '#fff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
              e.currentTarget.style.color = 'rgba(255,255,255,0.6)';
            }}
          >
            {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
          </button>
        </div>

        {/* Menü Öğeleri */}
        <nav
          className="sidebar-nav"
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: collapsed ? '12px 8px' : '12px 10px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Genel */}
          {!collapsed && <span className="sidebar-group-label">Genel</span>}
          {collapsed && <div style={{ height: 8 }} />}
          <NavItem to="/admin" icon={LayoutDashboard} label="Gösterge Paneli" onClick={closeSidebar} collapsed={collapsed} />
          <NavItem to="/admin/students" icon={Users} label="Öğrenci Listesi" onClick={closeSidebar} collapsed={collapsed} />
          <NavItem to="/admin/staff" icon={UserCheck} label="Personel Yönetimi" onClick={closeSidebar} collapsed={collapsed} />

          {/* Öğrenci İşlemleri */}
          {!collapsed && <span className="sidebar-group-label" style={{ marginTop: 8 }}>Öğrenci İşlemleri</span>}
          {collapsed && <div style={{ height: 12, borderTop: '1px solid rgba(255,255,255,0.08)', margin: '6px 0' }} />}
          <NavItem to="/admin/absenteeism" icon={Mail} label="Devamsızlık Mektubu" onClick={closeSidebar} collapsed={collapsed} />
          <NavItem to="/admin/warnings" icon={AlertTriangle} label="Yazılı Uyarılar" onClick={closeSidebar} collapsed={collapsed} />
          <NavItem to="/admin/violations" icon={ShieldAlert} label="İhlal Takibi" onClick={closeSidebar} collapsed={collapsed} />
          <NavItem to="/admin/grade-reports" icon={TrendingDown} label="Başarısızlık Riski Bildirimi" onClick={closeSidebar} collapsed={collapsed} />
          <NavItem to="/admin/parent-notification" icon={Bell} label="ÖMYK Devamsızlık Bildirimi" onClick={closeSidebar} collapsed={collapsed} />

          {/* Evrak İşlemleri */}
          {!collapsed && <span className="sidebar-group-label" style={{ marginTop: 8 }}>Evrak İşlemleri</span>}
          {collapsed && <div style={{ height: 12, borderTop: '1px solid rgba(255,255,255,0.08)', margin: '6px 0' }} />}
          <NavItem to="/admin/parent-meeting" icon={FileText} label="Veli Toplantısı İmza Sirküsü" onClick={closeSidebar} collapsed={collapsed} />
          <NavItem to="/admin/teblig" icon={FileCheck} label="Tebliğ – Tebellüğ Belgesi" onClick={closeSidebar} collapsed={collapsed} />

          {/* Sistem */}
          {!collapsed && <span className="sidebar-group-label" style={{ marginTop: 8 }}>Sistem</span>}
          {collapsed && <div style={{ height: 12, borderTop: '1px solid rgba(255,255,255,0.08)', margin: '6px 0' }} />}
          <NavItem to="/admin/whatsapp" icon={MessageSquare} label="WhatsApp Bağlantısı" onClick={closeSidebar} collapsed={collapsed} />
          <NavItem to="/admin/settings" icon={Settings} label="Ayarlar" onClick={closeSidebar} collapsed={collapsed} />
        </nav>

        {/* Alt Bilgi & Çıkış */}
        <div
          className="sidebar-footer"
          style={{
            padding: collapsed ? '14px 8px' : '14px 16px',
            borderTop: '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'space-between',
            gap: 8,
          }}
        >
          {!collapsed ? (
            <>
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'rgba(255,255,255,0.9)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {user?.username || 'Yönetici'}
                </div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 1 }}>
                  Yetkili Hesap
                </div>
              </div>
              <button
                onClick={handleLogout}
                title="Çıkış Yap"
                style={{
                  background: 'rgba(239,68,68,0.15)',
                  border: '1px solid rgba(239,68,68,0.3)',
                  borderRadius: 8,
                  color: '#fca5a5',
                  fontSize: 12,
                  padding: '6px 12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(239,68,68,0.25)';
                  e.currentTarget.style.color = '#fff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(239,68,68,0.15)';
                  e.currentTarget.style.color = '#fca5a5';
                }}
              >
                <LogOut size={14} />
                <span>Çıkış</span>
              </button>
            </>
          ) : (
            <button
              onClick={handleLogout}
              title="Çıkış Yap"
              style={{
                background: 'rgba(239,68,68,0.15)',
                border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: 8,
                color: '#fca5a5',
                width: 36,
                height: 36,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <LogOut size={16} />
            </button>
          )}
        </div>
      </aside>

      <main
        className="main-content"
        style={{
          flex: 1,
          padding: '24px 32px',
          overflowY: 'auto',
          background: 'var(--bg)',
        }}
      >
        <Outlet />
      </main>
    </div>
  );
}
