import { useState, useEffect } from 'react';
import { User, Ticket, Category } from '../types';
import { LogOut, User as UserIcon, LayoutDashboard, Ticket as TicketIcon, Settings, BarChart3, Menu, X } from 'lucide-react';
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchTickets = async (search: string = searchTerm) => {
    try {
      const response = await fetch(`/api/tickets?userId=${user.id}&role=${user.role}${search ? `&search=${encodeURIComponent(search)}` : ''}`);
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
    Promise.all([fetchTickets(searchTerm), fetchCategories()]).finally(() => setLoading(false));
    
    // Polling for real-time updates (simulating WebSockets for this environment)
    const interval = setInterval(() => fetchTickets(searchTerm), 5000);
    return () => clearInterval(interval);
  }, [user, searchTerm]);

  const renderView = () => {
    switch (user.role) {
      case 'admin':
        return <AdminView user={user} tickets={tickets} categories={categories} onUpdate={() => { fetchTickets(searchTerm); fetchCategories(); }} activeSubView={activeSubView} />;
      case 'tecnico':
        return <TecnicoView user={user} tickets={tickets} categories={categories} onUpdate={() => fetchTickets(searchTerm)} onSearch={setSearchTerm} />;
      default:
        return <ColaboradorView user={user} tickets={tickets} categories={categories} onUpdate={() => fetchTickets(searchTerm)} onSearch={setSearchTerm} />;
    }
  };

  return (
    <div className="min-h-screen bg-brand-beige flex flex-col md:flex-row font-sans overflow-x-hidden">
      {/* Mobile Header */}
      <header className="md:hidden bg-brand-blue text-white p-4 flex items-center justify-between sticky top-0 z-50 shadow-md">
        <div className="flex items-center gap-2">
          <div className="bg-brand-orange p-1.5 rounded-lg">
            <TicketIcon className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-base tracking-tight">HELPDESK</span>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
        >
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </header>

      {/* Sidebar Overlay for Mobile */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-brand-blue text-white p-6 flex flex-col transform transition-transform duration-300 ease-in-out
        md:relative md:translate-x-0
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="hidden md:flex items-center gap-3 mb-10">
          <div className="bg-brand-orange p-2 rounded-lg shadow-lg shadow-brand-orange/20">
            <TicketIcon className="w-6 h-6 text-white" />
          </div>
          <span className="font-bold text-xl tracking-tight">HELPDESK</span>
        </div>

        <nav className="flex-1 space-y-2">
          {user.role !== 'colaborador' && (
            <button 
              onClick={() => {
                setActiveSubView('dashboard');
                setIsMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeSubView === 'dashboard' ? 'bg-white/10 text-white' : 'text-white/60 hover:bg-white/5 hover:text-white'}`}
            >
              <LayoutDashboard className="w-5 h-5" />
              Dashboard
            </button>
          )}
          
          {user.role === 'admin' && (
            <>
              <button 
                onClick={() => {
                  setActiveSubView('reports');
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeSubView === 'reports' ? 'bg-white/10 text-white' : 'text-white/60 hover:bg-white/5 hover:text-white'}`}
              >
                <BarChart3 className="w-5 h-5" />
                Indicadores
              </button>
              <button 
                onClick={() => {
                  setActiveSubView('users');
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeSubView === 'users' ? 'bg-white/10 text-white' : 'text-white/60 hover:bg-white/5 hover:text-white'}`}
              >
                <UserIcon className="w-5 h-5" />
                Usuários
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
              onClick={() => {
                setActiveSubView('settings');
                setIsMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeSubView === 'settings' ? 'bg-white/10 text-white' : 'text-white/60 hover:bg-white/5 hover:text-white'}`}
            >
              <Settings className="w-5 h-5" />
              Configurações
            </button>
          )}
        </nav>

        <div className="mt-auto pt-6 border-t border-white/10">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
              <UserIcon className="w-5 h-5 text-white" />
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-semibold truncate">{user.name}</p>
              <p className="text-[10px] text-white/50 uppercase tracking-widest">{user.role}</p>
            </div>
          </div>
          <button 
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-300 hover:bg-red-500/10 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Sair
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto w-full max-w-full">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-orange"></div>
            </div>
          ) : renderView()}
        </motion.div>
      </main>
    </div>
  );
}
