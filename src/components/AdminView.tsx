import { useState, useEffect, useCallback } from 'react';
import { User, Ticket, Category } from '../types';
import { BarChart3, Users, PieChart, TrendingUp, Filter, Plus, Clock, CheckCircle2, AlertCircle, Activity, PlusCircle } from 'lucide-react';
import { motion } from 'motion/react';
import TicketModal from './TicketModal';
import UserManagement from './admin/UserManagement';
import Reports from './admin/Reports';
import Settings from './admin/Settings';

interface AdminViewProps {
  user: User;
  tickets: Ticket[];
  categories: Category[];
  onUpdate: () => void;
  activeSubView: string;
}

interface Stats {
  bySector: { sector: string; count: number }[];
  byCategory: { category: string; count: number }[];
  byStatus: { status: string; count: number }[];
  counts: {
    pending: number;
    in_progress: number;
    on_hold: number;
    resolved: number;
    finished: number;
  };
  byTechnician: { technician: string; count: number }[];
  total: number;
}

export default function AdminView({ user, tickets, categories, onUpdate, activeSubView }: AdminViewProps) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  // Pagination state for monitoring table
  const [monitoringData, setMonitoringData] = useState<{
    tickets: Ticket[];
    totalPages: number;
    currentPage: number;
  }>({ tickets: [], totalPages: 1, currentPage: 1 });
  const [monitoringLoading, setMonitoringLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [monitoringStatus, setMonitoringStatus] = useState<'active' | 'finished'>('active');

  const fetchMonitoringTickets = useCallback(async (page: number, search: string = '', status: string = 'active') => {
    try {
      setMonitoringLoading(true);
      const response = await fetch(`/api/tickets?page=${page}&limit=10&statusFilter=${status}${search ? `&search=${encodeURIComponent(search)}` : ''}`);
      const data = await response.json();
      setMonitoringData(data);
    } catch (err) {
      console.error('Erro ao buscar monitoramento:', err);
    } finally {
      setMonitoringLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeSubView === 'dashboard') {
      fetchMonitoringTickets(monitoringData.currentPage, searchTerm, monitoringStatus);
      const interval = setInterval(() => fetchMonitoringTickets(monitoringData.currentPage, searchTerm, monitoringStatus), 5000);
      return () => clearInterval(interval);
    }
  }, [activeSubView, monitoringData.currentPage, searchTerm, monitoringStatus, fetchMonitoringTickets]);

  const ticketsHash = tickets.map(t => `${t.id}-${t.status}`).join(',');

  useEffect(() => {
    // Only show loading state on initial load to prevent flashing
    if (!stats) setLoading(true);
    
    fetch('/api/stats')
      .then(res => {
        if (!res.ok) throw new Error('Erro na resposta do servidor');
        return res.json();
      })
      .then(data => setStats(data))
      .catch(err => {
        console.error('Erro ao buscar estatísticas:', err);
        if (!stats) {
          setStats({
            bySector: [],
            byCategory: [],
            byStatus: [],
            counts: { pending: 0, in_progress: 0, on_hold: 0, resolved: 0, finished: 0 },
            byTechnician: [],
            total: 0
          });
        }
      })
      .finally(() => setLoading(false));
  }, [ticketsHash]); // Re-fetch only when a ticket is added, removed, or changes status

  if (loading || !stats) return <div className="animate-pulse flex items-center justify-center h-64 text-gray-400 font-bold uppercase tracking-widest">Carregando estatísticas...</div>;

  const renderDashboard = () => (
    <div className="space-y-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
        <div className="bg-brand-blue p-4 md:p-6 rounded-2xl border border-black/5 shadow-lg shadow-brand-blue/20 text-white">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-white/20 rounded-lg text-white">
              <TrendingUp className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold text-white/80 uppercase tracking-widest">Total Geral</span>
          </div>
          <p className="text-3xl md:text-4xl font-black">{tickets.length}</p>
        </div>
        
        <div className="bg-brand-blue p-4 md:p-6 rounded-2xl border border-black/5 shadow-lg shadow-brand-blue/20 text-white">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-white/20 rounded-lg text-white">
              <BarChart3 className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold text-white/80 uppercase tracking-widest">Pendentes</span>
          </div>
          <p className="text-3xl md:text-4xl font-black">
            {stats.counts.pending}
          </p>
        </div>

        <div className="bg-brand-blue p-4 md:p-6 rounded-2xl border border-black/5 shadow-lg shadow-brand-blue/20 text-white">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-white/20 rounded-lg text-white">
              <AlertCircle className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold text-white/80 uppercase tracking-widest">Em Andamento</span>
          </div>
          <p className="text-3xl md:text-4xl font-black">
            {stats.counts.in_progress + stats.counts.on_hold}
          </p>
        </div>

        <div className="bg-brand-blue p-4 md:p-6 rounded-2xl border border-black/5 shadow-lg shadow-brand-blue/20 text-white">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-white/20 rounded-lg text-white">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold text-white/80 uppercase tracking-widest">Resolvidos</span>
          </div>
          <p className="text-3xl md:text-4xl font-black">
            {stats.counts.resolved}
          </p>
        </div>

        <div className="bg-brand-blue p-4 md:p-6 rounded-2xl border border-black/5 shadow-lg shadow-brand-blue/20 text-white sm:col-span-2 lg:col-span-1">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-white/20 rounded-lg text-white">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold text-white/80 uppercase tracking-widest">Finalizados</span>
          </div>
          <p className="text-3xl md:text-4xl font-black">
            {stats.counts.finished}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Sector Distribution */}
        <div className="bg-white p-6 rounded-2xl border border-black/5 shadow-sm">
          <h3 className="font-bold text-gray-700 mb-6 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-gray-400" />
            Chamados por Setor
          </h3>
          <div className="space-y-4">
            {stats.bySector.map((s, idx) => (
              <div key={idx}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-gray-600">{s.sector}</span>
                  <span className="font-bold text-gray-900">{s.count}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${(s.count / tickets.length) * 100}%` }}
                    className="bg-emerald-500 h-2 rounded-full"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Category Distribution */}
        <div className="bg-white p-6 rounded-2xl border border-black/5 shadow-sm">
          <h3 className="font-bold text-gray-700 mb-6 flex items-center gap-2">
            <PieChart className="w-5 h-5 text-gray-400" />
            Principais Categorias
          </h3>
          <div className="space-y-4">
            {stats.byCategory.map((c, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  <span className="text-sm font-medium text-gray-600">{c.category}</span>
                </div>
                <span className="text-sm font-bold bg-gray-100 px-2 py-1 rounded-lg">{c.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity Table */}
      <div className="bg-white rounded-2xl border border-black/5 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-blue/10 rounded-lg text-brand-blue">
              <Activity className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-brand-gray">Monitoramento em Tempo Real</h3>
          </div>
          <div className="flex items-center bg-gray-100 p-1 rounded-xl">
            <button 
              onClick={() => {
                setMonitoringStatus('active');
                setMonitoringData(prev => ({ ...prev, currentPage: 1 }));
              }}
              className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${monitoringStatus === 'active' ? 'bg-brand-orange text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
            >
              Ativos
            </button>
            <button 
              onClick={() => {
                setMonitoringStatus('finished');
                setMonitoringData(prev => ({ ...prev, currentPage: 1 }));
              }}
              className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${monitoringStatus === 'finished' ? 'bg-brand-orange text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
            >
              Finalizados
            </button>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
            <div className="relative">
              <input 
                type="text" 
                placeholder="Buscar por descrição..." 
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setMonitoringData(prev => ({ ...prev, currentPage: 1 }));
                }}
                className="w-full sm:w-64 pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-orange outline-none transition-all"
              />
              <Filter className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>
          </div>
        </div>
        <div className={`hidden md:block overflow-x-auto custom-scrollbar ${monitoringLoading ? 'opacity-50' : ''}`}>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="p-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">ID</th>
                <th className="p-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Solicitante</th>
                <th className="p-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Setor</th>
                <th className="p-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Técnico</th>
                <th className="p-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Status</th>
                <th className="p-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Abertura</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {monitoringData.tickets.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-400 italic">Nenhum chamado encontrado.</td>
                </tr>
              ) : (
                monitoringData.tickets.map((ticket) => (
                  <tr 
                    key={ticket.id} 
                    onClick={() => {
                      setSelectedTicket(ticket);
                      setIsModalOpen(true);
                    }}
                    className="text-sm hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="p-4 font-mono text-xs text-gray-400">#{ticket.id}</td>
                    <td className="p-4 font-medium text-gray-900">{ticket.requester_name}</td>
                    <td className="p-4 text-gray-500">{ticket.sector}</td>
                    <td className="p-4 text-gray-500">{ticket.technician_name || '---'}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${
                        ticket.status === 'finished' ? 'bg-emerald-50 text-emerald-600' :
                        ticket.status === 'resolved' ? 'bg-brand-blue/10 text-brand-blue' :
                        ticket.status === 'pending' ? 'bg-brand-orange/10 text-brand-orange' : 
                        ticket.status === 'on_hold' ? 'bg-orange-50 text-orange-600' :
                        'bg-brand-blue/10 text-brand-blue'
                      }`}>
                        {ticket.status === 'in_progress' ? 'Em Andamento' : 
                         ticket.status === 'pending' ? 'Pendente' :
                         ticket.status === 'on_hold' ? 'Em Espera' :
                         ticket.status === 'resolved' ? 'Resolvido' :
                         ticket.status === 'finished' ? 'Finalizado' : ticket.status}
                      </span>
                    </td>
                    <td className="p-4 text-xs text-gray-400">{new Date(ticket.created_at).toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {monitoringData.totalPages > 1 && (
          <div className="p-4 border-t border-gray-100 flex items-center justify-between bg-gray-50/30">
            <button 
              onClick={() => setMonitoringData(prev => ({ ...prev, currentPage: prev.currentPage - 1 }))}
              disabled={monitoringData.currentPage === 1}
              className="px-4 py-2 text-xs font-bold uppercase tracking-widest text-brand-gray hover:text-brand-orange disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Anterior
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: monitoringData.totalPages }, (_, i) => i + 1).map((pageNum) => (
                <button
                  key={pageNum}
                  onClick={() => setMonitoringData(prev => ({ ...prev, currentPage: pageNum }))}
                  className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${monitoringData.currentPage === pageNum ? 'bg-brand-orange text-white shadow-md scale-110' : 'text-brand-gray hover:bg-gray-200'}`}
                >
                  {pageNum}
                </button>
              ))}
            </div>
            <button 
              onClick={() => setMonitoringData(prev => ({ ...prev, currentPage: prev.currentPage + 1 }))}
              disabled={monitoringData.currentPage === monitoringData.totalPages}
              className="px-4 py-2 text-xs font-bold uppercase tracking-widest text-brand-gray hover:text-brand-orange disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Próximo
            </button>
          </div>
        )}

        {/* Mobile Card View */}
        <div className="md:hidden divide-y divide-gray-100">
          {monitoringData.tickets.map((ticket) => (
            <div 
              key={ticket.id} 
              onClick={() => {
                setSelectedTicket(ticket);
                setIsModalOpen(true);
              }}
              className="p-4 space-y-3 active:bg-gray-50 transition-colors"
            >
              <div className="flex justify-between items-start">
                <span className="font-mono text-[10px] text-gray-400">#{ticket.id}</span>
                <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${
                  ticket.status === 'finished' ? 'bg-emerald-50 text-emerald-600' :
                  ticket.status === 'resolved' ? 'bg-brand-blue/10 text-brand-blue' :
                  ticket.status === 'pending' ? 'bg-brand-orange/10 text-brand-orange' : 
                  ticket.status === 'on_hold' ? 'bg-orange-50 text-orange-600' :
                  'bg-brand-blue/10 text-brand-blue'
                }`}>
                  {ticket.status === 'in_progress' ? 'Em Andamento' : 
                   ticket.status === 'pending' ? 'Pendente' :
                   ticket.status === 'on_hold' ? 'Em Espera' :
                   ticket.status === 'resolved' ? 'Resolvido' :
                   ticket.status === 'finished' ? 'Finalizado' : ticket.status}
                </span>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Solicitante</p>
                <p className="text-sm font-medium text-gray-900">{ticket.requester_name}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Setor</p>
                  <p className="text-sm text-gray-600">{ticket.sector}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Técnico</p>
                  <p className="text-sm text-gray-600">{ticket.technician_name || '---'}</p>
                </div>
              </div>
              <p className="text-[10px] text-gray-400">{new Date(ticket.created_at).toLocaleString()}</p>
            </div>
          ))}
        </div>
        
        {/* Pagination Controls */}
        <div className="p-4 border-t border-gray-100 flex items-center justify-between bg-gray-50/30">
          <button 
            onClick={() => fetchMonitoringTickets(monitoringData.currentPage - 1)}
            disabled={monitoringData.currentPage === 1}
            className="px-4 py-2 text-xs font-bold uppercase tracking-widest text-gray-600 hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Anterior
          </button>
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, monitoringData.totalPages) }, (_, i) => {
              // Show up to 5 pages around current page
              let pageNum = monitoringData.currentPage - 2 + i;
              if (monitoringData.currentPage <= 2) pageNum = i + 1;
              if (monitoringData.currentPage >= monitoringData.totalPages - 1) pageNum = monitoringData.totalPages - 4 + i;
              
              if (pageNum > 0 && pageNum <= monitoringData.totalPages) {
                return (
                  <button
                    key={pageNum}
                    onClick={() => fetchMonitoringTickets(pageNum)}
                    className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${monitoringData.currentPage === pageNum ? 'bg-gray-900 text-white shadow-md scale-110' : 'text-gray-400 hover:bg-gray-200'}`}
                  >
                    {pageNum}
                  </button>
                );
              }
              return null;
            })}
          </div>
          <button 
            onClick={() => fetchMonitoringTickets(monitoringData.currentPage + 1)}
            disabled={monitoringData.currentPage === monitoringData.totalPages}
            className="px-4 py-2 text-xs font-bold uppercase tracking-widest text-gray-600 hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Próximo
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 tracking-tight">
            {activeSubView === 'dashboard' && 'Painel Administrativo'}
            {activeSubView === 'reports' && 'Indicadores de Desempenho'}
            {activeSubView === 'users' && 'Usuários'}
            {activeSubView === 'settings' && 'Configurações do Sistema'}
          </h2>
          <p className="text-gray-500 italic serif">
            {activeSubView === 'dashboard' && 'Gestão Centralizada do Helpdesk'}
            {activeSubView === 'reports' && 'Análise de performance e produtividade em tempo real'}
            {activeSubView === 'users' && 'Controle de acesso e colaboradores'}
            {activeSubView === 'settings' && 'Personalização de categorias e setores'}
          </p>
        </div>
        <div className="flex gap-3">
          {activeSubView === 'dashboard' && (
            <button 
              onClick={() => {
                setSelectedTicket(null);
                setIsModalOpen(true);
              }}
              className="bg-brand-orange text-white px-6 py-3 rounded-xl font-semibold flex items-center gap-2 hover:bg-[#d9511f] transition-all shadow-md"
            >
              <Plus className="w-5 h-5" />
              Abrir Chamado
            </button>
          )}
        </div>
      </header>

      <motion.div
        key={activeSubView}
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
      >
        {activeSubView === 'dashboard' && renderDashboard()}
        {activeSubView === 'reports' && <Reports stats={stats} tickets={tickets} user={user} />}
        {activeSubView === 'users' && <UserManagement />}
        {activeSubView === 'settings' && <Settings categories={categories} onUpdate={onUpdate} />}
      </motion.div>

      {isModalOpen && (
        <TicketModal 
          user={user} 
          categories={categories} 
          ticket={selectedTicket}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedTicket(null);
          }} 
          onSuccess={() => {
            setIsModalOpen(false);
            setSelectedTicket(null);
            onUpdate();
          }} 
        />
      )}
    </div>
  );
}
