import { useState, useEffect } from 'react';
import { User, Ticket, Category } from '../types';
import { BarChart3, Users, PieChart, TrendingUp, Filter, Plus, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
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
}

export default function AdminView({ user, tickets, categories, onUpdate, activeSubView }: AdminViewProps) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  useEffect(() => {
    fetch('/api/stats')
      .then(res => res.json())
      .then(data => setStats(data))
      .finally(() => setLoading(false));
  }, [tickets]);

  if (loading || !stats) return <div className="animate-pulse flex items-center justify-center h-64 text-gray-400 font-bold uppercase tracking-widest">Carregando estatísticas...</div>;

  const renderDashboard = () => (
    <div className="space-y-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-black/5 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
              <TrendingUp className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Total Geral</span>
          </div>
          <p className="text-4xl font-light">{tickets.length}</p>
        </div>
        
        <div className="bg-white p-6 rounded-2xl border border-black/5 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
              <BarChart3 className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Pendentes</span>
          </div>
          <p className="text-4xl font-light text-amber-600">
            {stats.byStatus.find(s => s.status === 'pending')?.count || 0}
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-black/5 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
              <PieChart className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Resolvidos</span>
          </div>
          <p className="text-4xl font-light text-emerald-600">
            {stats.byStatus.find(s => s.status === 'finished')?.count || 0}
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-black/5 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-purple-50 rounded-lg text-purple-600">
              <Users className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Setores Ativos</span>
          </div>
          <p className="text-4xl font-light">{stats.bySector.length}</p>
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
        <div className="p-4 border-b border-gray-100 flex justify-between items-center">
          <h3 className="font-bold text-gray-700">Monitoramento em Tempo Real</h3>
          <button className="text-xs text-emerald-600 font-bold uppercase hover:underline">Ver Todos</button>
        </div>
        <div className="overflow-x-auto">
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
              {tickets.slice(0, 10).map((ticket) => (
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
                      ticket.status === 'pending' ? 'bg-amber-50 text-amber-600' : 
                      ticket.status === 'on_hold' ? 'bg-orange-50 text-orange-600' :
                      'bg-blue-50 text-blue-600'
                    }`}>
                      {ticket.status}
                    </span>
                  </td>
                  <td className="p-4 text-xs text-gray-400">{new Date(ticket.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
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
            {activeSubView === 'reports' && 'Relatórios e Estatísticas'}
            {activeSubView === 'users' && 'Gestão de Usuários'}
            {activeSubView === 'settings' && 'Configurações do Sistema'}
          </h2>
          <p className="text-gray-500 italic serif">
            {activeSubView === 'dashboard' && 'Gestão Centralizada do Helpdesk'}
            {activeSubView === 'reports' && 'Análise de performance e produtividade'}
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
              className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-semibold flex items-center gap-2 hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20"
            >
              <Plus className="w-5 h-5" />
              Abrir Chamado
            </button>
          )}
          <button className="bg-white p-3 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors shadow-sm">
            <Filter className="w-5 h-5" />
          </button>
        </div>
      </header>

      <motion.div
        key={activeSubView}
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
      >
        {activeSubView === 'dashboard' && renderDashboard()}
        {activeSubView === 'reports' && <Reports stats={stats} tickets={tickets} />}
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
