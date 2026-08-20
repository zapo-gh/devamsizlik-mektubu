import React, { useState, useEffect } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Activity, Search, RefreshCw, User, Database, Clock } from 'lucide-react';
import api from '../../services/api';

interface AuditLog {
  id: string;
  userId: string;
  action: string;
  entity: string;
  entityId: string;
  metadata: string | null;
  createdAt: string;
  user?: {
    username: string;
    role: string;
  };
}

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await api.get('/audit/logs?take=100');
      if (res.data.success) {
        setLogs(res.data.data.logs);
      }
    } catch (error) {
      console.error('Audit logs yüklenemedi:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter(log => {
    const searchStr = `${log.action} ${log.entity} ${log.user?.username || ''}`.toLowerCase();
    return searchStr.includes(searchTerm.toLowerCase());
  });

  const getActionColor = (action: string) => {
    if (action.includes('CREATE')) return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    if (action.includes('UPDATE')) return 'bg-blue-100 text-blue-800 border-blue-200';
    if (action.includes('DELETE')) return 'bg-rose-100 text-rose-800 border-rose-200';
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sistem İzlenebilirliği (Audit Logs)"
        description="Sistemdeki tüm kritik veri değiştirme, silme ve oluşturma işlemlerinin dökümü."
        icon={<Activity size={28} className="text-gray-700" />}
        actions={
          <button
            onClick={fetchLogs}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            Yenile
          </button>
        }
      />

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col h-[calc(100vh-220px)]">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between gap-4 bg-gray-50/50">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="İşlem, tablo veya kullanıcı ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all shadow-sm"
            />
          </div>
          <div className="text-sm text-gray-500 font-medium">
            Toplam <span className="text-gray-900">{filteredLogs.length}</span> kayıt gösteriliyor
          </div>
        </div>

        <div className="flex-1 overflow-auto bg-slate-50 p-6">
          <div className="max-w-4xl mx-auto space-y-4">
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
                <Activity size={48} className="mx-auto text-gray-300 mb-3" />
                <h3 className="text-gray-900 font-medium">Kayıt bulunamadı</h3>
                <p className="text-gray-500 text-sm mt-1">Arama kriterlerine uygun işlem logu yok.</p>
              </div>
            ) : (
              filteredLogs.map((log) => (
                <div key={log.id} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex items-center gap-3">
                      <span className={`px-2.5 py-1 rounded-md text-xs font-bold border ${getActionColor(log.action)}`}>
                        {log.action}
                      </span>
                      <span className="flex items-center gap-1.5 text-sm font-medium text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md">
                        <Database size={14} className="text-slate-400" /> {log.entity}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-100">
                      <Clock size={14} />
                      {new Date(log.createdAt).toLocaleString('tr-TR')}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm mt-4 pt-4 border-t border-gray-100">
                    <div className="flex items-center gap-2 text-gray-600">
                      <User size={16} className="text-gray-400" />
                      <span className="font-medium text-gray-900">{log.user?.username || log.userId}</span>
                    </div>
                    <div className="h-4 w-px bg-gray-200"></div>
                    <div className="text-gray-500 font-mono text-xs truncate max-w-md">
                      ID: {log.entityId}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
