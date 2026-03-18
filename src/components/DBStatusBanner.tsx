import { useState, useEffect } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

export default function DBStatusBanner() {
  const [status, setStatus] = useState<{ db: string; error: string | null } | null>(null);
  const [loading, setLoading] = useState(true);

  const checkStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/health');
      const data = await res.json();
      setStatus(data);
    } catch (err) {
      setStatus({ db: 'disconnected', error: 'Não foi possível conectar ao servidor' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, []);

  if (loading && !status) return null;
  if (status?.db === 'connected') return null;

  return (
    <div className="bg-red-50 border-b border-red-200 p-4 sticky top-0 z-[100]">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 text-red-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <div>
            <p className="font-bold text-sm">Erro de Conexão com o Banco de Dados</p>
            <p className="text-xs opacity-90">
              {status?.error || 'Verifique as configurações do PostgreSQL no AI Studio.'}
            </p>
          </div>
        </div>
        <button 
          onClick={checkStatus}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Tentar Novamente
        </button>
      </div>
    </div>
  );
}
