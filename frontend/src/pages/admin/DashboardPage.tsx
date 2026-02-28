import { useState, useEffect } from 'react';
import api from '../../services/api';

interface Stats {
  totalStudents: number;
  totalAbsenteeisms: number;
  viewedCount: number;
  pendingCount: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({
    totalStudents: 0,
    totalAbsenteeisms: 0,
    viewedCount: 0,
    pendingCount: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [studentsRes, absenteeismRes, statsRes] = await Promise.all([
        api.get('/students?limit=1'),
        api.get('/absenteeism?limit=1'),
        api.get('/absenteeism/stats'),
      ]);

      const statsData = statsRes.data.data;

      setStats({
        totalStudents: studentsRes.data.data.pagination.total,
        totalAbsenteeisms: absenteeismRes.data.data.pagination.total,
        viewedCount: statsData.viewedCount,
        pendingCount: statsData.pendingCount,
      });
    } catch (error) {
      console.error('Stats load error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 40 }}>
        <div className="spinner spinner-dark" />
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1>Gösterge Paneli</h1>
      </div>

      <div className="card-grid">
        <div className="stat-card">
          <div className="stat-value">{stats.totalStudents}</div>
          <div className="stat-label">Toplam Öğrenci</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.totalAbsenteeisms}</div>
          <div className="stat-label">Devamsızlık Kaydı</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--success)' }}>
            {stats.viewedCount}
          </div>
          <div className="stat-label">Veli Tarafından Görüntülenen</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--warning)' }}>
            {stats.pendingCount}
          </div>
          <div className="stat-label">Bekleyen Bildirim</div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 16 }}>Hızlı Başlangıç</h3>
        <ol style={{ paddingLeft: 20, lineHeight: 2 }}>
          <li>e-Okul'dan devamsızlık mektubunu indirin</li>
          <li>Mektubu imzalayıp tarayın (PDF, JPG veya PNG)</li>
          <li>"Devamsızlık" sayfasından dosyayı sisteme yükleyin</li>
          <li>OTP oluşturun ve WhatsApp mesajını veliye gönderin</li>
          <li>Veli bağlantıya tıklayıp şifre ile devamsızlık mektubunu görüntüler</li>
        </ol>
      </div>
    </div>
  );
}
