import { useState, useEffect } from 'react';
import { User, Ticket, Category } from '../types';
import { LogOut, User as UserIcon, LayoutDashboard, Ticket as TicketIcon, Settings, BarChart3 } from 'lucide-react';
import ColaboradorView from './ColaboradorView';
import TecnicoView from './TecnicoView';
import AdminView from './AdminView';
import { motion } from 'motion/react';

interface DashboardProps {
  user: User;
  onLogout: () => void;
}

export default function Dashboard({ user, onLogout }: DashboardProps) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSubView, setActiveSubView] = useState<string>('dashboard');

  const fetchTickets = async () => {
    try {
      const response = await fetch(`/api/tickets?userId=${user.id}&role=${user.role}`);
      const data = await response.json();
      setTickets(data);
    } catch (err) {
      console.error('Erro ao buscar chamados');
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories');
      const data = await response.json();
      setCategories(data);
    } catch (err) {
      console.error('Erro ao buscar categorias');
    }
  };

  useEffect(() => {
    Promise.all([fetchTickets(), fetchCategories()]).finally(() => setLoading(false));
    
    // Polling for real-time updates (simulating WebSockets for this environment)
    const interval = setInterval(fetchTickets, 5000);
    return () => clearInterval(interval);
  }, [user]);

  const renderView = () => {
    switch (user.role) {
      case 'admin':
        return <AdminView user={user} tickets={tickets} categories={categories} onUpdate={fetchTickets} activeSubView={activeSubView} />;
      case 'tecnico':
        return <TecnicoView user={user} tickets={tickets} categories={categories} onUpdate={fetchTickets} />;
      default:
        return <ColaboradorView user={user} tickets={tickets} categories={categories} onUpdate={fetchTickets} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F4] flex flex-col md:flex-row font-sans">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-gray-900 text-white p-6 flex flex-col">
        <div className="flex items-center gap-3 mb-10">
          <div className="bg-emerald-500 p-2 rounded-lg">
            <TicketIcon className="w-6 h-6 text-white" />
          </div>
          <span className="font-bold text-lg tracking-tight">Helpdesk IT</span>
        </div>

        <nav className="flex-1 space-y-2">
          {user.role !== 'colaborador' && (
            <button 
              onClick={() => setActiveSubView('dashboard')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeSubView === 'dashboard' ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
            >
              <LayoutDashboard className="w-5 h-5" />
              Dashboard
            </button>
          )}
          
          {user.role === 'admin' && (
            <>
              <button 
                onClick={() => setActiveSubView('reports')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeSubView === 'reports' ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
              >
                <BarChart3 className="w-5 h-5" />
                Relatórios
              </button>
              <button 
                onClick={() => setActiveSubView('users')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeSubView === 'users' ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
              >
                <UserIcon className="w-5 h-5" />
                Cadastro de Usuários
              </button>
            </>
          )}

          {user.role === 'colaborador' && (
            <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-white/10 text-white font-medium transition-colors">
              <TicketIcon className="w-5 h-5" />
              Meus Chamados
            </button>
          )}

          {user.role === 'admin' && (
            <button 
              onClick={() => setActiveSubView('settings')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeSubView === 'settings' ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
            >
              <Settings className="w-5 h-5" />
              Configurações
            </button>
          )}
        </nav>

        <div className="mt-auto pt-6 border-t border-white/10">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
              <UserIcon className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-semibold truncate">{user.name}</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest">{user.role}</p>
            </div>
          </div>
          <button 
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Sair
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
            </div>
          ) : renderView()}
        </motion.div>
      </main>
    </div>
  );
}
